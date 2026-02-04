/**
 * Integration Test Setup
 * 
 * This file configures the integration testing environment for end-to-end testing
 * of the Voice Agent module with mock host systems and real-world scenarios.
 */

import { VoiceManagerService } from '@/services/VoiceManagerService';
import { ChatManagerService } from '@/services/ChatManagerService';
import { IntentProcessorService } from '@/services/IntentProcessorService';
import { DomainControllerService } from '@/services/DomainControllerService';
import { QuickMessageHandlerService } from '@/services/QuickMessageHandlerService';
import { IntegrationAPIClientService } from '@/services/IntegrationAPIClient';
import { PerformanceMonitorService } from '@/services/PerformanceMonitorService';
import { SafetyManagerService } from '@/services/SafetyManagerService';
import { DeliveryContext, VoiceAgentConfig } from '@/types';

// Mock host system API server
export class MockHostSystem {
  private deliveryData: DeliveryContext;
  private config: VoiceAgentConfig;
  private statusUpdates: any[] = [];
  private isOnline: boolean = true;
  private responseDelay: number = 100;
  private shouldFailAuth: boolean = false;
  private shouldRateLimit: boolean = false;

  constructor() {
    this.deliveryData = this.createMockDeliveryContext();
    this.config = this.createMockConfig();
  }

  // Mock delivery context
  createMockDeliveryContext(): DeliveryContext {
    return {
      partnerId: 'partner_123',
      currentDeliveries: [
        {
          id: 'order_001',
          status: 'pending',
          pickupLocation: {
            street: '123 Main St',
            city: 'Downtown',
            state: 'CA',
            zipCode: '90210',
            coordinates: { lat: 34.0522, lng: -118.2437 }
          },
          deliveryLocation: {
            street: '456 Oak Ave',
            city: 'Uptown',
            state: 'CA',
            zipCode: '90211',
            coordinates: { lat: 34.0622, lng: -118.2537 }
          },
          customerInfo: {
            name: 'John Doe',
            phone: '+1-555-0123',
            notes: 'Ring doorbell twice'
          },
          estimatedTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
          specialInstructions: 'Handle with care'
        },
        {
          id: 'order_002',
          status: 'picked_up',
          pickupLocation: {
            street: '789 Pine St',
            city: 'Midtown',
            state: 'CA',
            zipCode: '90212',
            coordinates: { lat: 34.0722, lng: -118.2637 }
          },
          deliveryLocation: {
            street: '321 Elm St',
            city: 'Westside',
            state: 'CA',
            zipCode: '90213',
            coordinates: { lat: 34.0822, lng: -118.2737 }
          },
          customerInfo: {
            name: 'Jane Smith',
            phone: '+1-555-0456',
            notes: 'Leave at front door'
          },
          estimatedTime: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes from now
        }
      ],
      activeRoute: {
        id: 'route_001',
        stops: [
          { orderId: 'order_001', type: 'pickup', estimatedTime: new Date(Date.now() + 15 * 60 * 1000) },
          { orderId: 'order_001', type: 'delivery', estimatedTime: new Date(Date.now() + 30 * 60 * 1000) },
          { orderId: 'order_002', type: 'delivery', estimatedTime: new Date(Date.now() + 45 * 60 * 1000) }
        ],
        totalDistance: 25.5,
        estimatedDuration: 60
      },
      vehicleStatus: {
        id: 'vehicle_001',
        type: 'van',
        batteryLevel: 0.85,
        fuelLevel: 0.70,
        isMoving: false,
        speed: 0
      },
      location: {
        coordinates: { lat: 34.0522, lng: -118.2437 },
        accuracy: 10,
        timestamp: new Date()
      },
      workingHours: {
        start: new Date(Date.now() - 2 * 60 * 60 * 1000), // Started 2 hours ago
        end: new Date(Date.now() + 6 * 60 * 60 * 1000) // Ends in 6 hours
      }
    };
  }

  // Mock configuration
  createMockConfig(): VoiceAgentConfig {
    return {
      enabledFeatures: [
        'voice_recognition',
        'text_to_speech',
        'chat_interface',
        'quick_messages',
        'auto_sync',
        'config_polling'
      ],
      voiceSettings: {
        language: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8
      },
      integrationEndpoints: {
        baseUrl: 'https://mock-api.test.com',
        authEndpoint: '/auth/token',
        deliveryEndpoint: '/delivery/context',
        statusEndpoint: '/delivery/status'
      },
      domainRestrictions: {
        allowedIntents: [
          'delivery_status',
          'navigation',
          'communication',
          'quick_message'
        ],
        blockedKeywords: ['weather', 'news', 'entertainment']
      }
    };
  }

  // Simulate API responses
  async authenticate(token: string): Promise<{ success: boolean; data?: any; error?: string }> {
    await this.delay(this.responseDelay);
    
    if (this.shouldFailAuth) {
      return { success: false, error: 'Invalid token' };
    }

    return {
      success: true,
      data: {
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        refreshToken: 'refresh_token_123'
      }
    };
  }

  async getDeliveryContext(): Promise<{ success: boolean; data?: any; error?: string }> {
    await this.delay(this.responseDelay);
    
    if (!this.isOnline) {
      throw new Error('Network error');
    }

    if (this.shouldRateLimit) {
      throw new Error('Rate limited');
    }

    return {
      success: true,
      data: this.deliveryData
    };
  }

  async sendStatusUpdate(update: any): Promise<{ success: boolean; data?: any; error?: string }> {
    await this.delay(this.responseDelay);
    
    if (!this.isOnline) {
      throw new Error('Network error');
    }

    this.statusUpdates.push({
      ...update,
      receivedAt: new Date()
    });

    return { success: true, data: { id: `update_${this.statusUpdates.length}` } };
  }

  async getConfiguration(): Promise<{ success: boolean; data?: any; error?: string }> {
    await this.delay(this.responseDelay);
    
    if (!this.isOnline) {
      throw new Error('Network error');
    }

    return {
      success: true,
      data: this.config
    };
  }

  // Test utilities
  setOnline(online: boolean): void {
    this.isOnline = online;
  }

  setResponseDelay(delay: number): void {
    this.responseDelay = delay;
  }

  setShouldFailAuth(fail: boolean): void {
    this.shouldFailAuth = fail;
  }

  setShouldRateLimit(rateLimit: boolean): void {
    this.shouldRateLimit = rateLimit;
  }

  getStatusUpdates(): any[] {
    return [...this.statusUpdates];
  }

  clearStatusUpdates(): void {
    this.statusUpdates = [];
  }

  updateDeliveryStatus(orderId: string, status: string): void {
    const delivery = this.deliveryData.currentDeliveries.find(d => d.id === orderId);
    if (delivery) {
      delivery.status = status as any;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Integration test environment
export class IntegrationTestEnvironment {
  public voiceManager: VoiceManagerService;
  public chatManager: ChatManagerService;
  public intentProcessor: IntentProcessorService;
  public domainController: DomainControllerService;
  public quickMessageHandler: QuickMessageHandlerService;
  public apiClient: IntegrationAPIClientService;
  public performanceMonitor: PerformanceMonitorService;
  public safetyManager: SafetyManagerService;
  public mockHostSystem: MockHostSystem;

  private eventLog: Array<{ event: string; data: any; timestamp: Date }> = [];

  constructor() {
    this.mockHostSystem = new MockHostSystem();
    this.setupServices();
    this.setupEventLogging();
  }

  private setupServices(): void {
    // Initialize services in dependency order
    this.performanceMonitor = new PerformanceMonitorService();
    this.domainController = new DomainControllerService();
    this.intentProcessor = new IntentProcessorService(this.domainController);
    this.quickMessageHandler = new QuickMessageHandlerService();
    
    // Initialize API client with mock endpoints from the start
    const mockConfig = this.mockHostSystem.createMockConfig();
    this.apiClient = new IntegrationAPIClientService(mockConfig.integrationEndpoints);
    
    this.chatManager = new ChatManagerService(this.intentProcessor);
    this.voiceManager = new VoiceManagerService();
    this.safetyManager = new SafetyManagerService();
  }

  private setupEventLogging(): void {
    // Log all events from all services for integration testing
    const services = [
      { name: 'voiceManager', service: this.voiceManager },
      { name: 'chatManager', service: this.chatManager },
      { name: 'intentProcessor', service: this.intentProcessor },
      { name: 'domainController', service: this.domainController },
      { name: 'quickMessageHandler', service: this.quickMessageHandler },
      { name: 'apiClient', service: this.apiClient },
      { name: 'performanceMonitor', service: this.performanceMonitor },
      { name: 'safetyManager', service: this.safetyManager }
    ];

    services.forEach(({ name, service }) => {
      if (service && typeof service.addEventListener === 'function') {
        // Listen to all possible events
        const events = [
          'voice_started', 'voice_stopped', 'voice_result', 'voice_error',
          'message_sent', 'context_updated', 'intent_processed',
          'domain_violation', 'quick_message_sent',
          'authenticated', 'data_synced', 'status_updated', 'config_updated',
          'performance_warning', 'safety_alert'
        ];

        events.forEach(event => {
          try {
            service.addEventListener(event, (eventName: string, data: any) => {
              this.logEvent(`${name}.${eventName}`, data);
            });
          } catch (error) {
            // Some services might not support all events
          }
        });
      }
    });
  }

  private logEvent(event: string, data: any): void {
    this.eventLog.push({
      event,
      data,
      timestamp: new Date()
    });
  }

  // Test utilities
  async initialize(): Promise<void> {
    // Initialize all services
    await this.authenticateWithMockSystem();
    await this.syncInitialData();
  }

  logEvent(event: string, data: any): void {
    this.eventLog.push({
      event,
      data,
      timestamp: new Date()
    });
  }

  async waitForEvent(eventType: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, timeout);

      const checkForEvent = () => {
        const events = this.getEventsOfType(eventType);
        if (events.length > 0) {
          clearTimeout(timeoutId);
          resolve(events[events.length - 1]);
        } else {
          setTimeout(checkForEvent, 50);
        }
      };

      checkForEvent();
    });
  }

  async waitForCondition(condition: () => boolean, timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout waiting for condition'));
      }, timeout);

      const checkCondition = () => {
        if (condition()) {
          clearTimeout(timeoutId);
          resolve();
        } else {
          setTimeout(checkCondition, 50);
        }
      };

      checkCondition();
    });
  }

  async authenticateWithMockSystem(): Promise<void> {
    try {
      const authResult = await this.mockHostSystem.authenticate('test_token_123');
      if (authResult.success && this.apiClient) {
        await this.apiClient.authenticate('test_token_123');
      }
    } catch (error) {
      // In test environment, we can continue without authentication
      console.warn('Mock authentication failed, continuing with test:', error);
    }
  }

  async syncInitialData(): Promise<void> {
    try {
      const deliveryContext = await this.mockHostSystem.getDeliveryContext();
      if (deliveryContext.success) {
        this.intentProcessor.updateContext(deliveryContext.data);
        this.chatManager.updateDeliveryContext(deliveryContext.data);
      }
    } catch (error) {
      // In test environment, we can continue without initial sync
      console.warn('Mock data sync failed, continuing with test:', error);
    }
  }

  getEventLog(): Array<{ event: string; data: any; timestamp: Date }> {
    return [...this.eventLog];
  }

  clearEventLog(): void {
    this.eventLog = [];
  }

  getEventsOfType(eventType: string): Array<{ event: string; data: any; timestamp: Date }> {
    return this.eventLog.filter(log => log.event.includes(eventType));
  }

  async cleanup(): Promise<void> {
    // Stop any running intervals
    if (this.apiClient) {
      this.apiClient.stopDataSync();
      this.apiClient.stopConfigPolling();
    }
    
    // Cleanup all services safely
    try {
      if (this.voiceManager && typeof this.voiceManager.destroy === 'function') {
        await this.voiceManager.destroy();
      }
    } catch (error) {
      // Ignore cleanup errors in tests
    }
    
    try {
      if (this.apiClient && typeof this.apiClient.reset === 'function') {
        await this.apiClient.reset();
      }
    } catch (error) {
      // Ignore cleanup errors in tests
    }
    
    this.clearEventLog();
  }

  // Simulation utilities
  simulateVoiceInput(transcript: string, confidence: number = 0.9): void {
    // Simulate voice recognition result
    if (this.voiceManager.onSpeechResults) {
      this.voiceManager.onSpeechResults({ value: [transcript] });
    }
  }

  simulateNetworkConditions(online: boolean, delay: number = 100): void {
    this.mockHostSystem.setOnline(online);
    this.mockHostSystem.setResponseDelay(delay);
  }

  simulateAuthFailure(shouldFail: boolean): void {
    this.mockHostSystem.setShouldFailAuth(shouldFail);
  }

  simulateRateLimit(shouldRateLimit: boolean): void {
    this.mockHostSystem.setShouldRateLimit(shouldRateLimit);
  }

  // Performance testing utilities
  async measureResponseTime(operation: () => Promise<any>): Promise<{ result: any; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    return { result, duration };
  }

  async measureMemoryUsage(): Promise<{ used: number; total: number }> {
    // Mock memory measurement for React Native environment
    return {
      used: Math.random() * 100, // MB
      total: 512 // MB
    };
  }

  // Scenario generators for property-based testing
  generateRandomDeliveryScenario(): DeliveryContext {
    const scenarios = [
      this.mockHostSystem.createMockDeliveryContext(),
      // Add more varied scenarios
      {
        ...this.mockHostSystem.createMockDeliveryContext(),
        currentDeliveries: [], // No deliveries
      },
      {
        ...this.mockHostSystem.createMockDeliveryContext(),
        currentDeliveries: Array.from({ length: 5 }, (_, i) => ({
          id: `order_${i + 1}`,
          status: ['pending', 'picked_up', 'in_transit'][Math.floor(Math.random() * 3)] as any,
          pickupLocation: {
            street: `${Math.floor(Math.random() * 999)} Test St`,
            city: 'TestCity',
            state: 'CA',
            zipCode: '90210',
            coordinates: { lat: 34.0522 + Math.random() * 0.1, lng: -118.2437 + Math.random() * 0.1 }
          },
          deliveryLocation: {
            street: `${Math.floor(Math.random() * 999)} Delivery Ave`,
            city: 'TestCity',
            state: 'CA',
            zipCode: '90211',
            coordinates: { lat: 34.0622 + Math.random() * 0.1, lng: -118.2537 + Math.random() * 0.1 }
          },
          customerInfo: {
            name: `Customer ${i + 1}`,
            phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          },
          estimatedTime: new Date(Date.now() + Math.random() * 120 * 60 * 1000), // Random time within 2 hours
        }))
      }
    ];

    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }

  generateRandomVoiceCommand(): string {
    const commands = [
      'What is my next delivery?',
      'Mark order as delivered',
      'Send message delayed due to traffic',
      'Navigate to next stop',
      'Show customer address',
      'What is my delivery status?',
      'Reached pickup location',
      'Reached delivery location',
      'Unable to contact customer',
      'Call customer',
      'Get directions to next stop',
      'Update delivery status',
      'How many deliveries do I have left?',
      'Show me the customer phone number',
      'Send quick message traffic delay'
    ];

    return commands[Math.floor(Math.random() * commands.length)];
  }

  generateRandomNetworkCondition(): { online: boolean; delay: number; shouldFail: boolean } {
    const conditions = [
      { online: true, delay: 50, shouldFail: false }, // Good connection
      { online: true, delay: 200, shouldFail: false }, // Slow connection
      { online: true, delay: 1000, shouldFail: false }, // Very slow connection
      { online: false, delay: 0, shouldFail: false }, // Offline
      { online: true, delay: 100, shouldFail: true }, // Connection with failures
    ];

    return conditions[Math.floor(Math.random() * conditions.length)];
  }
}

// Global test utilities
export const createIntegrationTestEnvironment = (): IntegrationTestEnvironment => {
  return new IntegrationTestEnvironment();
};

export const waitForEvent = (
  environment: IntegrationTestEnvironment,
  eventType: string,
  timeout: number = 5000
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventType}`));
    }, timeout);

    const checkForEvent = () => {
      const events = environment.getEventsOfType(eventType);
      if (events.length > 0) {
        clearTimeout(timeoutId);
        resolve(events[events.length - 1]);
      } else {
        setTimeout(checkForEvent, 50);
      }
    };

    checkForEvent();
  });
};

export const waitForCondition = (
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 50
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout waiting for condition'));
    }, timeout);

    const checkCondition = () => {
      if (condition()) {
        clearTimeout(timeoutId);
        resolve();
      } else {
        setTimeout(checkCondition, interval);
      }
    };

    checkCondition();
  });
};