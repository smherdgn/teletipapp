
import { AuthService } from '@services/authService';
import { useAuthStore } from '@store/useAuthStore';
import { User } from '@customtypes/index';
import Storage from '@utils/storage'; // Mocked in jest.setup.js
import { JwtUtils } from '@services/jwtUtils';
import { LOG_EVENT_TYPES, STORAGE_KEYS } from '@constants/index';
import Logger from '@utils/logger'; // Mocked Sentry calls within logger

// Mock AuthService and its methods
jest.mock('@services/authService');
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

// Mock JwtUtils
jest.mock('@services/jwtUtils');
const mockJwtUtils = JwtUtils as jest.Mocked<typeof JwtUtils>;

// Mock Storage module for more control over its methods like getObject
jest.mock('@utils/storage');
const mockStorage = Storage as jest.Mocked<typeof Storage>;


// Spy on Logger methods if needed for verifying audit logs, or mock SentryService directly
jest.spyOn(Logger, 'logAuditEvent');
jest.spyOn(Logger, 'info'); // Also spy on info if specific messages are checked
jest.spyOn(Logger, 'warn'); // Also spy on warn


const mockUser: User = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'patient',
};
const mockToken = 'mock-jwt-token';

describe('Auth Tests', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoadingAuth: false,
      hasGivenConsent: null,
    });
    // Reset mocks
    jest.clearAllMocks();

    // Default mock implementations for services
    mockAuthService.login.mockResolvedValue({ user: mockUser, token: mockToken });
    mockAuthService.logout.mockResolvedValue(undefined);
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser); // Or null if no session
    
    mockJwtUtils.isTokenExpired.mockReturnValue(false); // Assume token is not expired by default
    mockJwtUtils.decodeToken.mockReturnValue({ userId: mockUser.id, role: mockUser.role, exp: Date.now()/1000 + 3600 } as any);

    // Default mock implementations for Storage (if methods are called directly in tests)
    // Note: If Storage methods are only called through AuthService, those mocks are primary.
    // If checkInitialAuth directly calls Storage.getObject, we need to mock it here.
    mockStorage.getObject.mockResolvedValue(null); // Default to no consent record
    mockStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('useAuthStore login', () => {
    it('should update state correctly on successful login', async () => {
      const { login } = useAuthStore.getState();
      await login(mockUser, mockToken);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoadingAuth).toBe(false); // login action sets this
      expect(state.hasGivenConsent).toBeNull(); // Login resets consent for new user session
      expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_CONSENT_STATUS);
      expect(Logger.logAuditEvent).toHaveBeenCalledWith(LOG_EVENT_TYPES.LOGIN_SUCCESS, { userId: mockUser.id });
    });
  });

  describe('useAuthStore logout', () => {
    it('should clear auth state and call AuthService.logout on logout', async () => {
      // Setup initial logged-in state
      useAuthStore.setState({ user: mockUser, token: mockToken, isAuthenticated: true, isLoadingAuth: false, hasGivenConsent: true });

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoadingAuth).toBe(false);
      expect(state.hasGivenConsent).toBeNull();

      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
      expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_CONSENT_STATUS);
      expect(Logger.logAuditEvent).toHaveBeenCalledWith(LOG_EVENT_TYPES.LOGOUT, { userId: mockUser.id });
    });
  });

  describe('useAuthStore checkInitialAuth', () => {
    it('should authenticate user if valid token and user data are in storage', async () => {
      // Simulate persisted state that persist middleware would load
      useAuthStore.setState({ user: mockUser, token: mockToken, isAuthenticated: false, isLoadingAuth: true, hasGivenConsent: null });
      mockJwtUtils.isTokenExpired.mockReturnValue(false); // Token is not expired
      // Simulate consent record in storage for this user
      mockStorage.getObject.mockResolvedValueOnce({ userId: mockUser.id, consentGiven: true, timestamp: Date.now() });


      await useAuthStore.getState().checkInitialAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
      expect(state.hasGivenConsent).toBe(true);
      expect(state.isLoadingAuth).toBe(false);
      expect(Logger.info).toHaveBeenCalledWith('User authenticated from rehydrated state.', expect.objectContaining({ userId: mockUser.id, consentGiven: true }));
    });

    it('should log out user if token is expired', async () => {
      useAuthStore.setState({ user: mockUser, token: mockToken, isAuthenticated: false, isLoadingAuth: true, hasGivenConsent: null });
      mockJwtUtils.isTokenExpired.mockReturnValue(true); // Token IS expired

      // Spy on the logout action within the store
      const logoutSpy = jest.spyOn(useAuthStore.getState(), 'logout') as jest.MockInstance<Promise<void>, []>;


      await useAuthStore.getState().checkInitialAuth();

      expect(logoutSpy).toHaveBeenCalled(); // logout should have been called

      const state = useAuthStore.getState(); // Fetch state *after* checkInitialAuth and potential logout
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isLoadingAuth).toBe(false);
      expect(Logger.warn).toHaveBeenCalledWith('Auth token from storage expired. Logging out.', { userId: mockUser.id });

      logoutSpy.mockRestore();
    });

    it('should not authenticate if no token is found', async () => {
       useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoadingAuth: true, hasGivenConsent: null });

      await useAuthStore.getState().checkInitialAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoadingAuth).toBe(false);
       expect(Logger.info).toHaveBeenCalledWith("checkInitialAuth: No existing session found or state was clean.");
    });

    it('should correctly handle consent status from storage', async () => {
      useAuthStore.setState({ user: mockUser, token: mockToken, isAuthenticated: false, isLoadingAuth: true, hasGivenConsent: null });
      mockJwtUtils.isTokenExpired.mockReturnValue(false);

      // Case 1: Consent given
      mockStorage.getObject.mockResolvedValueOnce({ userId: mockUser.id, consentGiven: true, timestamp: Date.now() });
      await useAuthStore.getState().checkInitialAuth();
      expect(useAuthStore.getState().hasGivenConsent).toBe(true);

      // Reset for Case 2
      useAuthStore.setState({ user: mockUser, token: mockToken, isAuthenticated: false, isLoadingAuth: true, hasGivenConsent: null });
      mockStorage.getObject.mockResolvedValueOnce({ userId: mockUser.id, consentGiven: false, timestamp: Date.now() });
      await useAuthStore.getState().checkInitialAuth();
      expect(useAuthStore.getState().hasGivenConsent).toBe(false);

      // Reset for Case 3: No consent record
      useAuthStore.setState({ user: mockUser, token: mockToken, isAuthenticated: false, isLoadingAuth: true, hasGivenConsent: null });
      mockStorage.getObject.mockResolvedValueOnce(null);
      await useAuthStore.getState().checkInitialAuth();
      expect(useAuthStore.getState().hasGivenConsent).toBeNull();

      // Reset for Case 4: Consent record for different user
      useAuthStore.setState({ user: mockUser, token: mockToken, isAuthenticated: false, isLoadingAuth: true, hasGivenConsent: null });
      mockStorage.getObject.mockResolvedValueOnce({ userId: 'other-user', consentGiven: true, timestamp: Date.now() });
      await useAuthStore.getState().checkInitialAuth();
      expect(useAuthStore.getState().hasGivenConsent).toBeNull();
      expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_CONSENT_STATUS); // Stale record removed
    });
  });

  // Additional tests for other AuthService methods or complex scenarios could be added here
});
