import 'react-native-gesture-handler/jestSetup'; // For react-navigation

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock EncryptedStorage
jest.mock('react-native-encrypted-storage', () => {
  let store = {};
  return {
    setItem: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    getItem: jest.fn(key => {
      return Promise.resolve(store[key] || null);
    }),
    removeItem: jest.fn(key => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => { // Mock clear, as EncryptedStorage doesn't have it, but our Storage wrapper might simulate.
      store = {};
      return Promise.resolve();
    }),
  };
});


// Mock react-native-localize
jest.mock('react-native-localize', () => ({
  getLocales: () => [{countryCode: 'US', languageTag: 'en-US', languageCode: 'en', isRTL: false}],
  findBestAvailableLanguage: () => ({languageTag: 'en-US', isRTL: false}),
  getTimeZone: () => 'Etc/UTC',
  getCountry: () => 'US',
  getCurrencies: () => ['USD'],
  getTemperatureUnit: () => 'celsius',
  uses24HourClock: () => true,
  usesMetricSystem: () => true,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock react-native-get-random-values
jest.mock('react-native-get-random-values', () => ({
  getRandomBase64: jest.fn(),
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: jest.fn(component => component),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  ReactNavigationInstrumentation: jest.fn().mockImplementation(() => {
    return { registerNavigationContainer: jest.fn() };
  }),
  ReactNativeTracing: jest.fn().mockImplementation(() => ({})),
}));

// Mock Notifee
jest.mock('@notifee/react-native', () => ({
  requestPermission: jest.fn(() => Promise.resolve({ authorizationStatus: 1 })),
  createChannel: jest.fn(() => Promise.resolve('channel-id')),
  getChannel: jest.fn(() => Promise.resolve(null)),
  displayNotification: jest.fn(() => Promise.resolve('notification-id')),
  createTriggerNotification: jest.fn(() => Promise.resolve('trigger-notification-id')),
  cancelNotification: jest.fn(() => Promise.resolve()),
  cancelAllNotifications: jest.fn(() => Promise.resolve()),
  getTriggerNotifications: jest.fn(() => Promise.resolve([])),
  onForegroundEvent: jest.fn(() => jest.fn()), // Returns an unsubscribe function
  onBackgroundEvent: jest.fn(),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  EventType: { PRESS: 1, ACTION_PRESS: 4, DISMISSED: 0 }, // Simplified from actual enum
  AndroidImportance: { HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
  TriggerType: { TIMESTAMP: 0, INTERVAL: 1 },
}));

// Mock JailMonkey
jest.mock('jail-monkey', () => ({
  isJailBroken: jest.fn(() => false),
  trustFall: jest.fn(() => false),
  canMockLocation: jest.fn(() => false),
  isOnExternalStorage: jest.fn(() => false),
  AdbEnabled: jest.fn(() => false),
}));

// Mock react-native-biometrics
jest.mock('react-native-biometrics', () => {
  const rnBiometrics = {
    isSensorAvailable: jest.fn(() => Promise.resolve({ available: true, biometryType: 'Biometrics' })),
    simplePrompt: jest.fn(() => Promise.resolve({success: true})),
    // Add other methods if your app uses them
  };
  // For the constructor usage in useBiometrics hook
  return jest.fn(() => rnBiometrics);
});

// Mock react-native-webrtc
const mockMediaStreamTrack = {
  stop: jest.fn(),
  release: jest.fn(),
  enabled: true,
  id: 'mockTrackId',
  kind: 'video', // or 'audio'
  label: 'mockTrackLabel',
  muted: false,
  readonly: false,
  readyState: 'live',
  remote: false,
  _switchCamera: jest.fn(), // react-native-webrtc specific
  applyConstraints: jest.fn(() => Promise.resolve()),
  clone: jest.fn(() => mockMediaStreamTrack),
  getCapabilities: jest.fn(() => ({})),
  getConstraints: jest.fn(() => ({})),
  getSettings: jest.fn(() => ({})),
  onended: null,
  onmute: null,
  onunmute: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
};

const mockMediaStream = {
  id: 'mockStreamId',
  active: true,
  addTrack: jest.fn(),
  clone: jest.fn(() => mockMediaStream),
  getAudioTracks: jest.fn(() => [mockMediaStreamTrack]),
  getTrackById: jest.fn(() => mockMediaStreamTrack),
  getTracks: jest.fn(() => [mockMediaStreamTrack]),
  getVideoTracks: jest.fn(() => [mockMediaStreamTrack]),
  removeTrack: jest.fn(),
  toURL: jest.fn(() => 'mock-stream-url'),
  release: jest.fn(),
  onactive: null,
  onaddtrack: null,
  oninactive: null,
  onremovetrack: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
};

jest.mock('react-native-webrtc', () => ({
  RTCPeerConnection: jest.fn().mockImplementation(() => ({
    addStream: jest.fn(),
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
    createOffer: jest.fn(() => Promise.resolve({ type: 'offer', sdp: 'mockOfferSdp' })),
    createAnswer: jest.fn(() => Promise.resolve({ type: 'answer', sdp: 'mockAnswerSdp' })),
    setLocalDescription: jest.fn(() => Promise.resolve()),
    setRemoteDescription: jest.fn(() => Promise.resolve()),
    addIceCandidate: jest.fn(() => Promise.resolve()),
    close: jest.fn(),
    onicecandidate: null,
    onaddstream: null, // Deprecated, use ontrack
    ontrack: null,
    oniceconnectionstatechange: null,
    onsignalingstatechange: null,
    onconnectionstatechange: null,
    iceConnectionState: 'new',
    signalingState: 'stable',
    connectionState: 'new',
    getLocalStreams: jest.fn(() => [mockMediaStream]),
    getRemoteStreams: jest.fn(() => [mockMediaStream]), // Deprecated
    getConfiguration: jest.fn(() => ({ iceServers: [] })),
    getSenders: jest.fn(() => []),
    getReceivers: jest.fn(() => []),
    getTransceivers: jest.fn(() => []),
  })),
  RTCIceCandidate: jest.fn().mockImplementation(candidate => candidate),
  RTCSessionDescription: jest.fn().mockImplementation(description => description),
  mediaDevices: {
    getUserMedia: jest.fn(() => Promise.resolve(mockMediaStream)),
    getDisplayMedia: jest.fn(() => Promise.resolve(mockMediaStream)),
    enumerateDevices: jest.fn(() => Promise.resolve([])),
    setAudioOutput: jest.fn(() => Promise.resolve()), // Web API, might not be relevant for RN testing
  },
  MediaStream: jest.fn().mockImplementation(() => mockMediaStream),
  MediaStreamTrack: jest.fn().mockImplementation(() => mockMediaStreamTrack),
  RTCView: jest.fn(({ streamURL, ...props }) => <div {...props} data-stream-url={streamURL} />), // Simple div for testing
  // Add other exports if your app uses them (e.g., MediaStreamConstraints, etc.)
}));


// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    id: 'mockSocketId',
    connected: false, // Default to not connected
    disconnected: true,
  };
  // Mock the default export `io`
  return {
    io: jest.fn(() => mockSocket), // `io()` function
    // If you use named exports from socket.io-client, mock them here too.
    // e.g. Manager: jest.fn(), Socket: jest.fn(() => mockSocket)
  };
});

// Mock react-native-document-picker
jest.mock('react-native-document-picker', () => ({
  pick: jest.fn(() => Promise.resolve([{ uri: 'mock-file-uri', name: 'mock-file.pdf', type: 'application/pdf', size: 12345 }])),
  pickMultiple: jest.fn(() => Promise.resolve([{ uri: 'mock-file-uri', name: 'mock-file.pdf', type: 'application/pdf', size: 12345 }])),
  isCancel: jest.fn(err => err && err.code === 'DOCUMENT_PICKER_CANCELED'),
  types: {
    allFiles: '*/*',
    images: 'image/*',
    pdf: 'application/pdf',
    // Add other types if used
  },
}));

// Mock for @env if not already globally mocked
// This is typically done in jest.config.js moduleNameMapper, which user has.
// So, __mocks__/@env.js would be used.
// If not, it can be added here as:
// jest.mock('@env', () => ({
//   API_URL: 'mock_api_url',
//   SENTRY_DSN: 'mock_sentry_dsn',
//   API_KEY: 'mock_api_key',
// }), { virtual: true });
