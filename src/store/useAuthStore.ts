import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import Storage from '@utils/storage'; // Uses EncryptedStorage now
import {User} from '@customtypes/index';
import {AuthService}  from '@services/authService'; // Assuming AuthService still handles mock login/logout & storage of token/user
import {JwtUtils} from '@services/jwtUtils';
import Logger from '@utils/logger'; 
import { LOG_EVENT_TYPES, STORAGE_KEYS } from '@constants/index';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  hasGivenConsent: boolean | null; // null: unknown, true: given, false: declined (or not given yet)
  
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setIsLoadingAuth: (loading: boolean) => void;
  checkInitialAuth: () => Promise<void>;
  updateUser: (updatedUserData: Partial<User>) => void;
  setConsentStatus: (status: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoadingAuth: true, // Start as true until checkInitialAuth completes
      hasGivenConsent: null, 

      login: async (user, token) => {
        set({user, token, isAuthenticated: true, isLoadingAuth: false});
        // The persist middleware handles saving the entire store state, including user, token.
        // For a new login, consent should typically be re-evaluated or start as null/false.
        // We'll reset it to null here to force re-check/prompt for the new user.
        set({ hasGivenConsent: null }); 
        await Storage.removeItem(STORAGE_KEYS.USER_CONSENT_STATUS); // Clear any lingering global consent status for previous user
        Logger.logAuditEvent(LOG_EVENT_TYPES.LOGIN_SUCCESS, { userId: user.id });
      },

      logout: async () => {
        const userId = get().user?.id;
        Logger.logAuditEvent(LOG_EVENT_TYPES.LOGOUT, { userId });
        
        await AuthService.logout(); // This should clear token/user from its own storage (e.g. 'authToken', 'authUser' if AuthService uses them directly)
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoadingAuth: false,
          hasGivenConsent: null, // Reset consent status for the session
        });
        // Clear the persisted consent status specifically from EncryptedStorage for this store.
        // The main 'auth-storage' key for Zustand will also be cleared by persist if items are removed.
        await Storage.removeItem(STORAGE_KEYS.USER_CONSENT_STATUS); 
      },
      
      updateUser: (updatedUserData) => {
        set((state) => {
          if (state.user) {
            const newUser = { ...state.user, ...updatedUserData };
            // Persist middleware handles user update within the main auth-storage item.
            return { user: newUser };
          }
          return {};
        });
      },

      setUser: user => set({user}),
      setToken: token => set({token, isAuthenticated: !!token}),
      setIsLoadingAuth: loading => set({isLoadingAuth: loading}),
      
      setConsentStatus: async (status) => {
        const currentUser = get().user;
        if (!currentUser) {
            Logger.warn("setConsentStatus: No user session active. Cannot persist user-specific consent.");
            set({ hasGivenConsent: status }); // Update in-memory state anyway
            return;
        }
        set({ hasGivenConsent: status });
        // Also persist this specific status outside the main Zustand object if needed for direct access,
        // though it's already part of the persisted 'auth-storage'.
        // This is good for explicitness if other parts of app read it directly.
        await Storage.setObject(STORAGE_KEYS.USER_CONSENT_STATUS, { userId: currentUser.id, consentGiven: status, timestamp: Date.now() });
        Logger.info('User consent status updated in store and explicitly in storage.', { userId: currentUser.id, consentGiven: status });
      },

      checkInitialAuth: async () => {
        Logger.debug("checkInitialAuth: Starting initial authentication check.");
        set({ isLoadingAuth: true });
        try {
          // The `persist` middleware automatically rehydrates user and token from 'auth-storage'.
          // We just need to validate the rehydrated token and load specific consent status.
          const rehydratedState = get();

          if (rehydratedState.token && rehydratedState.user) {
            if (!JwtUtils.isTokenExpired(rehydratedState.token)) {
              // Token is valid, user is already set from rehydration.
              // Now, load the specific consent status for this user.
              const consentRecord = await Storage.getObject<{userId: string; consentGiven: boolean; timestamp: number}>(STORAGE_KEYS.USER_CONSENT_STATUS);
              
              let userSpecificConsent: boolean | null = null;
              if (consentRecord && consentRecord.userId === rehydratedState.user.id) {
                userSpecificConsent = consentRecord.consentGiven;
              } else if (consentRecord && consentRecord.userId !== rehydratedState.user.id) {
                // Consent record from a different user, discard it for this session
                Logger.warn("checkInitialAuth: Found consent record for a different user. Discarding.", { currentUserId: rehydratedState.user.id, recordUserId: consentRecord.userId });
                await Storage.removeItem(STORAGE_KEYS.USER_CONSENT_STATUS); // Remove stale record
              }
              
              set({ isAuthenticated: true, hasGivenConsent: userSpecificConsent });
              Logger.info('User authenticated from rehydrated state.', { userId: rehydratedState.user.id, consentGiven: userSpecificConsent });
            } else {
              Logger.warn('Auth token from storage expired. Logging out.', { userId: rehydratedState.user.id });
              await get().logout(); // This will clear the state
            }
          } else {
             // No token/user found in rehydrated state, ensure clean state.
             set({user: null, token: null, isAuthenticated: false, hasGivenConsent: null});
             Logger.info("checkInitialAuth: No existing session found or state was clean.");
          }
        } catch (error) {
          Logger.error("Error during checkInitialAuth:", error);
          // Ensure a clean state on error
          set({user: null, token: null, isAuthenticated: false, hasGivenConsent: null});
        } finally {
          set({ isLoadingAuth: false });
          Logger.debug("checkInitialAuth: Finished initial authentication check.");
        }
      },
    }),
    {
      name: STORAGE_KEYS.AUTH_STORE, // Main key for the auth store in EncryptedStorage
      storage: createJSONStorage(() => Storage), // Uses EncryptedStorage via our wrapper
      onRehydrateStorage: (state) => { // state is the new state after rehydration
        Logger.info('Auth store attempting rehydration from EncryptedStorage.');
        return (rehydratedState, error) => {
          if (error) {
            Logger.error('Failed to rehydrate auth store from EncryptedStorage:', error);
             useAuthStore.getState().setIsLoadingAuth(false); // Ensure loading stops
          } else {
            Logger.info('Auth store rehydrated successfully.');
            // After rehydration, call checkInitialAuth to validate token and load specific consent.
            // This ensures logic like token expiry and consent loading is run with the rehydrated data.
            // The `rehydratedState` here is the state object that Zustand is setting.
            // `get()` inside checkInitialAuth will have the rehydrated values.
            if (rehydratedState) { // Check if state was actually rehydrated
              // checkInitialAuth is now more robust and will be called after persist has loaded state
              // it verifies the token and user-specific consent.
            } else {
              // No state was rehydrated (e.g. first run, or storage was empty)
              useAuthStore.getState().setIsLoadingAuth(false);
            }
            // Call checkInitialAuth *after* rehydration logic has potentially set user/token
            useAuthStore.getState().checkInitialAuth();
          }
        };
      },
      // We persist the whole auth state by default.
      // If you want to persist only specific parts:
      // partialize: (state) => ({ token: state.token, user: state.user, hasGivenConsent: state.hasGivenConsent }),
    },
  ),
);

// Trigger initial auth check once the store is defined and rehydrated.
// This is now primarily handled by onRehydrateStorage calling checkInitialAuth.
// If onRehydrateStorage isn't called (e.g. storage empty), checkInitialAuth will still run from the callback.
// If the app starts and nothing is in storage, checkInitialAuth() will set isLoadingAuth to false.
if (typeof window !== 'undefined') { // Check if in a client-side environment
    // Ensure checkInitialAuth is called after the store has had a chance to rehydrate.
    // setTimeout is a common way to push execution to after the current event loop cycle.
    // setTimeout(() => {
    //     if (!useAuthStore.getState().isLoadingAuth && !useAuthStore.getState().isAuthenticated) {
    //         // If not loading and not authenticated after hydration, means no valid session was found.
    //         // This would be the case if initial state from persist middleware is empty.
    //         // The checkInitialAuth will properly set isLoadingAuth to false.
    //     }
    // }, 0);
}