module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '@testing-library/jest-native/extend-expect'
  ],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest', // Keep babel-jest for JS/JSX
    '^.+\\.(ts|tsx)$': ['ts-jest', { // Use ts-jest for TS/TSX
      tsconfig: 'tsconfig.jest.json', // Optional: separate tsconfig for tests
      babelConfig: true, // Allow ts-jest to use babel config for features like module-resolver
    }],
  },
  transformIgnorePatterns: [
    // Update this regex to be more inclusive of libraries that need transformation
    // This pattern tries to allow transformation for most react-native related libraries
    // and common libraries that might ship ES6+ code.
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|react-native-reanimated|react-native-gesture-handler|tailwind-rn|@sentry/react-native|@notifee/react-native|lucide-react-native|react-native-vector-icons|uuid|react-native-document-picker|react-native-webrtc|socket.io-client|react-native-get-random-values|react-native-localize|react-native-biometrics|jail-monkey|@react-native-async-storage/async-storage|react-native-encrypted-storage)/)',
  ],
  moduleNameMapper: {
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@i18n/(.*)$': '<rootDir>/src/i18n/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@customtypes/(.*)$': '<rootDir>/src/types/$1',
    '^@env$': '<rootDir>/__mocks__/@env.js' // Mock for @env
  },
  testEnvironment: 'node', // Keep as node, ensure comprehensive mocks
  globals: {
    // ts-jest configuration is now within the transform block
  },
  // verbose: true, // Optional: for more detailed test output
};
