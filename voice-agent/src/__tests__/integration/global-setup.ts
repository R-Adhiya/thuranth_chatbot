/**
 * Global Setup for Integration Tests
 * 
 * Performs one-time setup before all integration tests run.
 * Sets up test environment, mock services, and shared resources.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export default async function globalSetup(): Promise<void> {
  console.log('🚀 Setting up integration test environment...');
  
  try {
    // Create test directories
    const testDirs = [
      'test-reports',
      'test-reports/coverage',
      'test-reports/screenshots',
      'test-reports/logs'
    ];
    
    for (const dir of testDirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
    
    // Set up test environment variables
    process.env.NODE_ENV = 'test';
    process.env.VOICE_AGENT_TEST_MODE = 'true';
    process.env.MOCK_API_ENABLED = 'true';
    process.env.TEST_TIMEOUT = '30000';
    
    // Create test configuration file
    const testConfig = {
      environment: 'integration-test',
      mockServices: {
        voiceRecognition: true,
        textToSpeech: true,
        apiClient: true,
        hostSystem: true
      },
      testData: {
        defaultPartnerId: 'test_partner_123',
        mockDeliveries: 5,
        mockCustomers: 10
      },
      performance: {
        maxResponseTime: 2000,
        maxMemoryUsage: 512, // MB
        maxConcurrentOperations: 10
      },
      network: {
        simulateLatency: true,
        defaultLatency: 100, // ms
        simulateFailures: true,
        failureRate: 0.05 // 5%
      }
    };
    
    const configPath = join(process.cwd(), 'test-config.json');
    writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
    console.log(`⚙️  Created test configuration: ${configPath}`);
    
    // Initialize mock services
    await initializeMockServices();
    
    // Set up test data
    await setupTestData();
    
    // Configure test logging
    setupTestLogging();
    
    console.log('✅ Integration test environment setup complete');
    
  } catch (error) {
    console.error('❌ Failed to set up integration test environment:', error);
    throw error;
  }
}

/**
 * Initialize mock services for testing
 */
async function initializeMockServices(): Promise<void> {
  console.log('🔧 Initializing mock services...');
  
  // Mock React Native modules
  const mockModules = {
    'react-native-voice': {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
      removeAllListeners: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true),
      getSpeechRecognitionServices: jest.fn().mockResolvedValue(['mock-service'])
    },
    'react-native-tts': {
      speak: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      setDefaultLanguage: jest.fn(),
      setDefaultRate: jest.fn(),
      setDefaultPitch: jest.fn(),
      getInitStatus: jest.fn().mockResolvedValue('success')
    }
  };
  
  // Store mock modules globally for tests to access
  (global as any).__MOCK_MODULES__ = mockModules;
  
  console.log('✅ Mock services initialized');
}

/**
 * Set up test data and fixtures
 */
async function setupTestData(): Promise<void> {
  console.log('📊 Setting up test data...');
  
  const testData = {
    deliveryPartners: [
      {
        id: 'partner_001',
        name: 'John Doe',
        vehicle: 'van',
        status: 'active'
      },
      {
        id: 'partner_002',
        name: 'Jane Smith',
        vehicle: 'bike',
        status: 'active'
      }
    ],
    deliveries: [
      {
        id: 'delivery_001',
        partnerId: 'partner_001',
        status: 'pending',
        pickup: {
          address: '123 Main St, Downtown, CA 90210',
          coordinates: { lat: 34.0522, lng: -118.2437 }
        },
        delivery: {
          address: '456 Oak Ave, Uptown, CA 90211',
          coordinates: { lat: 34.0622, lng: -118.2537 }
        },
        customer: {
          name: 'Alice Johnson',
          phone: '+1-555-0123'
        }
      },
      {
        id: 'delivery_002',
        partnerId: 'partner_001',
        status: 'picked_up',
        pickup: {
          address: '789 Pine St, Midtown, CA 90212',
          coordinates: { lat: 34.0722, lng: -118.2637 }
        },
        delivery: {
          address: '321 Elm St, Westside, CA 90213',
          coordinates: { lat: 34.0822, lng: -118.2737 }
        },
        customer: {
          name: 'Bob Wilson',
          phone: '+1-555-0456'
        }
      }
    ],
    voiceCommands: [
      'What is my next delivery?',
      'Navigate to pickup location',
      'Send message reached pickup location',
      'Mark order as picked up',
      'Navigate to delivery location',
      'Call customer',
      'Send message reached delivery location',
      'Mark order as delivered',
      'What deliveries do I have left?'
    ],
    chatMessages: [
      'Show me my delivery status',
      'What is the customer address?',
      'Get directions to next stop',
      'Send quick message delayed',
      'Update delivery status'
    ]
  };
  
  const testDataPath = join(process.cwd(), 'test-data.json');
  writeFileSync(testDataPath, JSON.stringify(testData, null, 2));
  
  // Store test data globally
  (global as any).__TEST_DATA__ = testData;
  
  console.log('✅ Test data setup complete');
}

/**
 * Configure logging for tests
 */
function setupTestLogging(): void {
  console.log('📝 Setting up test logging...');
  
  // Create custom logger for tests
  const testLogger = {
    info: (message: string, ...args: any[]) => {
      if (process.env.VERBOSE_LOGGING === 'true') {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
      }
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
    },
    debug: (message: string, ...args: any[]) => {
      if (process.env.DEBUG_LOGGING === 'true') {
        console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
      }
    }
  };
  
  // Store logger globally
  (global as any).__TEST_LOGGER__ = testLogger;
  
  // Override console methods for test logging
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  
  console.log = (...args: any[]) => {
    if (process.env.SUPPRESS_CONSOLE !== 'true') {
      originalConsoleLog(...args);
    }
    // Log to file if needed
    logToFile('INFO', args.join(' '));
  };
  
  console.error = (...args: any[]) => {
    if (process.env.SUPPRESS_CONSOLE !== 'true') {
      originalConsoleError(...args);
    }
    // Log to file if needed
    logToFile('ERROR', args.join(' '));
  };
  
  console.log('✅ Test logging configured');
}

/**
 * Log messages to file for later analysis
 */
function logToFile(level: string, message: string): void {
  if (process.env.LOG_TO_FILE === 'true') {
    const logDir = join(process.cwd(), 'test-reports', 'logs');
    const logFile = join(logDir, `integration-tests-${new Date().toISOString().split('T')[0]}.log`);
    
    const logEntry = `${new Date().toISOString()} [${level}] ${message}\n`;
    
    try {
      const fs = require('fs');
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      // Ignore file logging errors to not interfere with tests
    }
  }
}

/**
 * Validate test environment requirements
 */
async function validateEnvironment(): Promise<void> {
  console.log('🔍 Validating test environment...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 14) {
    throw new Error(`Node.js version ${nodeVersion} is not supported. Please use Node.js 14 or higher.`);
  }
  
  // Check available memory
  const memoryUsage = process.memoryUsage();
  const availableMemory = memoryUsage.heapTotal / 1024 / 1024; // MB
  
  if (availableMemory < 100) {
    console.warn(`⚠️  Low memory available: ${availableMemory.toFixed(1)}MB`);
  }
  
  // Check required environment variables
  const requiredEnvVars = ['NODE_ENV'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Required environment variable ${envVar} is not set`);
    }
  }
  
  console.log('✅ Environment validation passed');
}

// Export for use in tests
export { initializeMockServices, setupTestData, setupTestLogging };