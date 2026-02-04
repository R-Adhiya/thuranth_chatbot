/**
 * Test Setup Configuration
 * 
 * This file configures the testing environment for the Voice Agent module.
 */

// Mock react-native-voice
jest.mock('@react-native-voice/voice', () => ({
  default: {
    onSpeechStart: jest.fn(),
    onSpeechRecognized: jest.fn(),
    onSpeechEnd: jest.fn(),
    onSpeechError: jest.fn(),
    onSpeechResults: jest.fn(),
    onSpeechPartialResults: jest.fn(),
    onSpeechVolumeChanged: jest.fn(),
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    cancel: jest.fn(() => Promise.resolve()),
    destroy: jest.fn(() => Promise.resolve()),
    removeAllListeners: jest.fn(),
    isAvailable: jest.fn(() => Promise.resolve(true)),
    getSpeechRecognitionServices: jest.fn(() => Promise.resolve([])),
  },
}));

// Mock react-native-tts
jest.mock('react-native-tts', () => ({
  default: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    speak: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    pause: jest.fn(() => Promise.resolve()),
    resume: jest.fn(() => Promise.resolve()),
    setDefaultLanguage: jest.fn(),
    setDefaultRate: jest.fn(),
    setDefaultPitch: jest.fn(),
    getInitStatus: jest.fn(() => Promise.resolve()),
    voices: jest.fn(() => Promise.resolve([])),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    ANDROID: {
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
    },
    IOS: {
      MICROPHONE: 'ios.permission.MICROPHONE',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
  },
  request: jest.fn(() => Promise.resolve('granted')),
  check: jest.fn(() => Promise.resolve('granted')),
}));

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getBatteryLevel: jest.fn(() => Promise.resolve(0.8)),
  isEmulator: jest.fn(() => Promise.resolve(false)),
  getDeviceId: jest.fn(() => 'test-device-id'),
  getSystemVersion: jest.fn(() => '14.0'),
  getModel: jest.fn(() => 'Test Device'),
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
}));

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set up fake timers
jest.useFakeTimers();