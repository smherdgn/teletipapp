

// API Endpoints (base URL is in api.ts or .env)
export const API_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  USER_PROFILE: '/users/me',
  GET_USER_BY_ID: (userId: string) => `/users/${userId}`,
};

// Socket Event Names
// Client -> Server
export const CLIENT_SOCKET_EVENTS = {
  JOIN_ROOM: 'join-room',      // (data: { roomId: string; userId: string }, callback)
  LEAVE_ROOM: 'leave-room',     // (data: { roomId: string; userId: string })
  OFFER: 'offer',             // (data: { sdp, callId, to, from }) - WebRTC offer
  ANSWER: 'answer',            // (data: { sdp, callId, to, from }) - WebRTC answer
  ICE_CANDIDATE: 'ice-candidate',// (data: { candidate, callId, to, from }) - WebRTC ICE
  END_CALL: 'end-call',        // (data: { callId, to })
  CHAT_MESSAGE: 'chat-message',  // (data: ChatMessage & { roomId: string })
  // Direct call model (if used)
  DIAL: 'dial',
  ACCEPT_CALL: 'accept-call',
  DECLINE_CALL: 'decline-call',
};

// Server -> Client
export const SERVER_SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_FAILED: 'reconnect_failed',

  USER_JOINED: 'user-joined',    // (data: { userId: string; roomId: string; user: User })
  USER_LEFT: 'user-left',      // (data: { userId: string; roomId: string })
  ROOM_FULL: 'room-full',        // (data: { roomId: string })
  JOIN_ROOM_FAILED: 'join-room-failed', // (data: { roomId: string; reason: string })
  
  OFFER: 'offer',             // (data: { sdp, callId, from })
  ANSWER: 'answer',            // (data: { sdp, callId, from })
  ICE_CANDIDATE: 'ice-candidate',// (data: { candidate, callId, from })
  
  CALL_ENDED: 'call-ended',      // (data: { callId: string; reason?: string })
  CHAT_MESSAGE: 'chat-message',  // (message: ChatMessage)
  USER_STATUS_CHANGED: 'user-status-changed', // (data: { userId, online, roomId? })
  ERROR_MESSAGE: 'error-message', // (data: { message, details?, code? })
  
  // Direct call model (if used)
  INCOMING_CALL: 'incoming-call',
  CALL_ACCEPTED: 'call-accepted',
  CALL_DECLINED: 'call-declined',
};


// AsyncStorage / EncryptedStorage Keys
export const STORAGE_KEYS = {
  // Keys used by AuthService mock or direct storage interactions (legacy, try to avoid direct use)
  AUTH_TOKEN: 'authToken_legacy', 
  AUTH_USER: 'authUser_legacy',   
  
  // Keys used by Zustand persist middleware (defined in the store configs)
  AUTH_STORE: 'auth-storage', 
  APP_STORE: 'app-storage',
  
  // Specific key for user consent status, managed explicitly alongside Zustand store
  USER_CONSENT_STATUS: 'userConsentStatus', 
};

// Log Event Types (for structured logging, especially audit events)
export const LOG_EVENT_TYPES = {
  // Authentication
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTRATION_SUCCESS: 'REGISTRATION_SUCCESS',
  REGISTRATION_FAILURE: 'REGISTRATION_FAILURE',
  
  // Consent Management
  CONSENT_VIEWED: 'CONSENT_VIEWED',
  CONSENT_GIVEN: 'CONSENT_GIVEN',
  CONSENT_DECLINED: 'CONSENT_DECLINED',
  CONSENT_UPDATED: 'CONSENT_UPDATED', // If consent can be changed later

  // Call Management
  CALL_INITIATED: 'CALL_INITIATED',
  CALL_ACCEPTED: 'CALL_ACCEPTED',
  CALL_DECLINED_LOCAL: 'CALL_DECLINED_LOCAL', // User actively declined an incoming call
  CALL_DECLINED_REMOTE: 'CALL_DECLINED_REMOTE', // Remote user declined call
  CALL_ENDED_LOCAL: 'CALL_ENDED_LOCAL', // User actively ended call
  CALL_ENDED_REMOTE: 'CALL_ENDED_REMOTE', // Remote user ended call
  CALL_FAILED: 'CALL_FAILED', // Call failed due to technical reasons
  
  // Room Management
  ROOM_JOIN_SUCCESS: 'ROOM_JOIN_SUCCESS',
  ROOM_JOIN_FAILURE: 'ROOM_JOIN_FAILURE',
  ROOM_LEFT: 'ROOM_LEFT',

  // Security
  DEVICE_SECURITY_CHECK_PASSED: 'DEVICE_SECURITY_CHECK_PASSED',
  DEVICE_SECURITY_COMPROMISED: 'DEVICE_SECURITY_COMPROMISED',
  BIOMETRIC_AUTH_SUCCESS: 'BIOMETRIC_AUTH_SUCCESS',
  BIOMETRIC_AUTH_FAILURE: 'BIOMETRIC_AUTH_FAILURE',

  // Data Access / PII (use with extreme caution and only when absolutely necessary for audit)
  // Example: SENSITIVE_DATA_ACCESSED: 'SENSITIVE_DATA_ACCESSED', // (detail what, why, by whom - ensure this log itself is secure)
};