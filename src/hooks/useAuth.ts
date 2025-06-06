
import {useCallback} from 'react';
import {useAuthStore} from '@store/useAuthStore';
import {AuthService} from '@services/authService';
import {User} from '@customtypes/index';

// This hook can be used for more complex auth-related UI logic
// or interactions not directly fitting into the Zustand store actions.
// For simple cases, directly using useAuthStore might be sufficient.

export const useAuth = () => {
  const {user, token, isAuthenticated, login, logout, setIsLoadingAuth} = useAuthStore();

  const attemptLogin = useCallback(async (email: string, pass: string): Promise<User | null> => {
    setIsLoadingAuth(true);
    try {
      const {user: loggedInUser, token: authToken} = await AuthService.login(email, pass);
      await login(loggedInUser, authToken);
      return loggedInUser;
    } catch (error) {
      console.error("Login attempt failed in useAuth:", error);
      // The store or service should handle more specific error states
      throw error; // Re-throw for the component to handle
    } finally {
      setIsLoadingAuth(false);
    }
  }, [login, setIsLoadingAuth]);

  const attemptLogout = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      // Perform any server-side logout if necessary
      // await AuthService.logout(token); // Example
      await logout();
    } catch (error) {
      console.error("Logout attempt failed:", error);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [logout, setIsLoadingAuth]);

  // Add other auth-related functions here if needed,
  // e.g., refreshToken, checkAuthStatus, etc.

  return {
    user,
    token,
    isAuthenticated,
    isLoadingAuth: useAuthStore().isLoadingAuth, // Ensure fresh state
    attemptLogin,
    attemptLogout,
    // Expose other actions/state from useAuthStore if wrapped here
  };
};
