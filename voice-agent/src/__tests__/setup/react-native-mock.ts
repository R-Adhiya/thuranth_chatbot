/**
 * React Native Mock Setup
 * 
 * Sets up mock implementations for React Native modules and APIs
 * that are not available in the Node.js test environment.
 */

// Mock React Native core modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '14.0',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
    prompt: jest.fn(),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  AsyncStorage: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
  NetInfo: {
    isConnected: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      fetch: jest.fn(() => Promise.resolve(true)),
    },
    getConnectionInfo: jest.fn(() => Promise.resolve({
      type: 'wifi',
      effectiveType: '4g',
    })),
  },
  DeviceInfo: {
    getModel: jest.fn(() => 'iPhone'),
    getSystemVersion: jest.fn(() => '14.0'),
    getBundleId: jest.fn(() => 'com.example.voiceagent'),
    getVersion: jest.fn(() => '1.0.0'),
    getBuildNumber: jest.fn(() => '1'),
    getDeviceId: jest.fn(() => 'mock-device-id'),
    isEmulator: jest.fn(() => Promise.resolve(false)),
    getFreeDiskStorage: jest.fn(() => Promise.resolve(1000000000)),
    getTotalMemory: jest.fn(() => Promise.resolve(4000000000)),
    getUsedMemory: jest.fn(() => Promise.resolve(2000000000)),
    getBatteryLevel: jest.fn(() => Promise.resolve(0.85)),
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
      WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    request: jest.fn(() => Promise.resolve('granted')),
    check: jest.fn(() => Promise.resolve(true)),
    requestMultiple: jest.fn(() => Promise.resolve({})),
  },
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  BackHandler: {
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    removeEventListener: jest.fn(),
    exitApp: jest.fn(),
  },
  Keyboard: {
    addListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    dismiss: jest.fn(),
  },
  StatusBar: {
    setBarStyle: jest.fn(),
    setBackgroundColor: jest.fn(),
    setHidden: jest.fn(),
  },
  // Mock React Native components
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  TouchableHighlight: 'TouchableHighlight',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  SectionList: 'SectionList',
  Image: 'Image',
  Modal: 'Modal',
  ActivityIndicator: 'ActivityIndicator',
  Switch: 'Switch',
  Slider: 'Slider',
  Picker: 'Picker',
  DatePickerIOS: 'DatePickerIOS',
  SegmentedControlIOS: 'SegmentedControlIOS',
  ProgressViewIOS: 'ProgressViewIOS',
  ProgressBarAndroid: 'ProgressBarAndroid',
  RefreshControl: 'RefreshControl',
  SafeAreaView: 'SafeAreaView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
}));

// Mock React Native Voice
jest.mock('react-native-voice', () => {
  const mockVoice = require('../__mocks__/react-native-voice').default;
  return mockVoice;
});

// Mock React Native TTS
jest.mock('react-native-tts', () => {
  const mockTTS = require('../__mocks__/react-native-tts').default;
  return mockTTS;
});

// Mock React Native Sound
jest.mock('react-native-sound', () => {
  return class MockSound {
    static setCategory = jest.fn();
    static MAIN_BUNDLE = 'MAIN_BUNDLE';
    static DOCUMENT = 'DOCUMENT';
    static LIBRARY = 'LIBRARY';
    static CACHES = 'CACHES';
    
    constructor(filename: string, basePath: string, callback?: Function) {
      if (callback) {
        setTimeout(() => callback(null), 100);
      }
    }
    
    play = jest.fn((callback?: Function) => {
      if (callback) {
        setTimeout(() => callback(true), 100);
      }
    });
    
    pause = jest.fn();
    stop = jest.fn();
    release = jest.fn();
    setVolume = jest.fn();
    getVolume = jest.fn((callback: Function) => callback(1.0));
    setSpeed = jest.fn();
    setPitch = jest.fn();
    getDuration = jest.fn(() => 1000);
    getCurrentTime = jest.fn((callback: Function) => callback(0));
    setCurrentTime = jest.fn();
  };
});

// Mock React Native Geolocation
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn((success, error, options) => {
    setTimeout(() => {
      success({
        coords: {
          latitude: 34.0522,
          longitude: -118.2437,
          accuracy: 10,
          altitude: 0,
          altitudeAccuracy: 0,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });
    }, 100);
  }),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));

// Mock React Native Contacts
jest.mock('react-native-contacts', () => ({
  getAll: jest.fn(() => Promise.resolve([])),
  getContactById: jest.fn(() => Promise.resolve(null)),
  addContact: jest.fn(() => Promise.resolve()),
  updateContact: jest.fn(() => Promise.resolve()),
  deleteContact: jest.fn(() => Promise.resolve()),
  requestPermission: jest.fn(() => Promise.resolve('authorized')),
  checkPermission: jest.fn(() => Promise.resolve('authorized')),
}));

// Mock React Native Camera
jest.mock('react-native-camera', () => ({
  RNCamera: {
    Constants: {
      Aspect: { fill: 'fill', fit: 'fit', stretch: 'stretch' },
      BarCodeType: { qr: 'QR_CODE' },
      CaptureMode: { still: 'still', video: 'video' },
      CaptureQuality: { high: 'high', medium: 'medium', low: 'low' },
      CaptureTarget: { cameraRoll: 'cameraRoll', disk: 'disk', temp: 'temp' },
      Orientation: { auto: 'auto', portrait: 'portrait', landscape: 'landscape' },
      FlashMode: { off: 'off', on: 'on', auto: 'auto', torch: 'torch' },
      TorchMode: { off: 'off', on: 'on', auto: 'auto' },
      Type: { front: 'front', back: 'back' },
    },
  },
}));

// Mock React Native Maps
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: 'MapView',
  Marker: 'Marker',
  Polyline: 'Polyline',
  Polygon: 'Polygon',
  Circle: 'Circle',
  Callout: 'Callout',
  CalloutSubview: 'CalloutSubview',
  AnimatedRegion: jest.fn(),
  PROVIDER_GOOGLE: 'google',
  PROVIDER_DEFAULT: 'default',
}));

// Mock React Native Vector Icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/FontAwesome', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock React Native Haptic Feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: {
    selection: 'selection',
    impactLight: 'impactLight',
    impactMedium: 'impactMedium',
    impactHeavy: 'impactHeavy',
    notificationSuccess: 'notificationSuccess',
    notificationWarning: 'notificationWarning',
    notificationError: 'notificationError',
  },
}));

// Mock React Native Orientation
jest.mock('react-native-orientation-locker', () => ({
  lockToPortrait: jest.fn(),
  lockToLandscape: jest.fn(),
  lockToLandscapeLeft: jest.fn(),
  lockToLandscapeRight: jest.fn(),
  unlockAllOrientations: jest.fn(),
  getOrientation: jest.fn((callback) => callback('portrait')),
  addOrientationListener: jest.fn(),
  removeOrientationListener: jest.fn(),
}));

// Mock React Native Keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(() => Promise.resolve()),
  getInternetCredentials: jest.fn(() => Promise.resolve({ username: 'test', password: 'test' })),
  resetInternetCredentials: jest.fn(() => Promise.resolve()),
  setGenericPassword: jest.fn(() => Promise.resolve()),
  getGenericPassword: jest.fn(() => Promise.resolve({ username: 'test', password: 'test' })),
  resetGenericPassword: jest.fn(() => Promise.resolve()),
  getSupportedBiometryType: jest.fn(() => Promise.resolve('TouchID')),
  canImplyAuthentication: jest.fn(() => Promise.resolve(true)),
}));

// Mock React Native Biometrics
jest.mock('react-native-biometrics', () => ({
  isSensorAvailable: jest.fn(() => Promise.resolve({ available: true, biometryType: 'TouchID' })),
  createKeys: jest.fn(() => Promise.resolve({ publicKey: 'mock-public-key' })),
  deleteKeys: jest.fn(() => Promise.resolve()),
  createSignature: jest.fn(() => Promise.resolve({ success: true, signature: 'mock-signature' })),
  simplePrompt: jest.fn(() => Promise.resolve({ success: true })),
}));

// Mock React Native File System
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  CachesDirectoryPath: '/mock/caches',
  ExternalDirectoryPath: '/mock/external',
  TemporaryDirectoryPath: '/mock/temp',
  readDir: jest.fn(() => Promise.resolve([])),
  readFile: jest.fn(() => Promise.resolve('')),
  writeFile: jest.fn(() => Promise.resolve()),
  appendFile: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
  exists: jest.fn(() => Promise.resolve(true)),
  stat: jest.fn(() => Promise.resolve({ size: 0, isFile: () => true, isDirectory: () => false })),
  mkdir: jest.fn(() => Promise.resolve()),
  downloadFile: jest.fn(() => ({
    jobId: 1,
    promise: Promise.resolve({ statusCode: 200 }),
  })),
}));

// Global test utilities
(global as any).mockReactNative = {
  // Utility to reset all mocks
  resetAllMocks: () => {
    jest.clearAllMocks();
  },
  
  // Utility to simulate device conditions
  simulateDeviceConditions: (conditions: {
    lowMemory?: boolean;
    lowBattery?: boolean;
    offline?: boolean;
    backgroundMode?: boolean;
  }) => {
    if (conditions.lowMemory) {
      require('react-native').DeviceInfo.getUsedMemory.mockResolvedValue(3800000000); // 95% usage
    }
    if (conditions.lowBattery) {
      require('react-native').DeviceInfo.getBatteryLevel.mockResolvedValue(0.15); // 15% battery
    }
    if (conditions.offline) {
      require('react-native').NetInfo.isConnected.fetch.mockResolvedValue(false);
    }
    if (conditions.backgroundMode) {
      require('react-native').AppState.currentState = 'background';
    }
  },
  
  // Utility to simulate permissions
  simulatePermissions: (permissions: Record<string, 'granted' | 'denied'>) => {
    const PermissionsAndroid = require('react-native').PermissionsAndroid;
    PermissionsAndroid.check.mockImplementation((permission: string) => 
      Promise.resolve(permissions[permission] === 'granted')
    );
    PermissionsAndroid.request.mockImplementation((permission: string) => 
      Promise.resolve(permissions[permission] || 'denied')
    );
  },
};

console.log('✅ React Native mocks initialized for integration tests');