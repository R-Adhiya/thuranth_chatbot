/**
 * Integration API Client Service Tests
 * 
 * Tests for REST API communication, authentication, and data synchronization.
 */

import * as fc from 'fast-check';
import { IntegrationAPIClientService } from '../../services/IntegrationAPIClient';
import { DeliveryContext, StatusUpdate, VoiceAgentConfig, APIEndpoints } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock axios
jest.mock('axios');
const mockAxios = require('axios');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('IntegrationAPIClientService', () => {
  let apiClient: IntegrationAPIClientService;
  let mockHttpClient: any;

  const mockEndpoints: APIEndpoints = {
    baseUrl: 'https://test-api.example.com',
    authEndpoint: '/auth/token',
    deliveryEndpoint: '/delivery/context',
    statusEndpoint: '/delivery/status',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup axios mock
    mockHttpClient = {
      post: jest.fn(),
      get: jest.fn(),
      defaults: { headers: { common: {} } },
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };
    
    mockAxios.create.mockReturnValue(mockHttpClient);
    
    // Setup AsyncStorage mocks
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    
    apiClient = new IntegrationAPIClientService(mockEndpoints);
  });

  describe('Unit Tests for Core Functionality', () => {
    it('should initialize with default endpoints when none provided', () => {
      const defaultClient = new IntegrationAPIClientService();
      expect(mockAxios.create).toHaveBeenCalled();
    });

    it('should create HTTP client with correct configuration', () => {
      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: mockEndpoints.baseUrl,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
    });

    it('should authenticate successfully with valid token', async () => {
      const token = 'valid-token-123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            refreshToken: 'refresh-token-123',
          },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await apiClient.authenticate(token);

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/token', { token });
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should fail authentication with invalid token', async () => {
      const token = 'invalid-token';
      const mockResponse = {
        data: {
          success: false,
          error: 'Invalid token',
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await apiClient.authenticate(token);

      expect(result).toBe(false);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should sync delivery data successfully', async () => {
      // Setup authentication
      const mockAuthResponse = {
        data: {
          success: true,
          data: {
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
        },
      };
      mockHttpClient.post.mockResolvedValue(mockAuthResponse);
      await apiClient.authenticate('test-token');

      // Setup delivery data response
      const mockDeliveryContext: DeliveryContext = {
        partnerId: 'partner-123',
        currentDeliveries: [],
        activeRoute: {
          id: 'route-1',
          stops: [],
          estimatedDuration: 60,
          distance: 10,
        },
        vehicleStatus: {
          id: 'vehicle-1',
          type: 'car',
          isMoving: false,
          speed: 0,
        },
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        workingHours: {
          start: new Date(),
          end: new Date(),
        },
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockDeliveryContext,
        },
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await apiClient.syncDeliveryData();

      expect(result).toEqual(mockDeliveryContext);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/delivery/context');
    });

    it('should send status update successfully', async () => {
      // Setup authentication
      const mockAuthResponse = {
        data: {
          success: true,
          data: {
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
        },
      };
      mockHttpClient.post.mockResolvedValue(mockAuthResponse);
      await apiClient.authenticate('test-token');

      const statusUpdate: StatusUpdate = {
        deliveryId: 'delivery-123',
        status: 'delivered',
        timestamp: new Date(),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        notes: 'Package delivered successfully',
      };

      const mockResponse = {
        data: {
          success: true,
        },
      };

      mockHttpClient.post.mockResolvedValueOnce(mockResponse);

      await apiClient.sendStatusUpdate(statusUpdate);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/delivery/status', statusUpdate);
    });

    it('should get configuration successfully', async () => {
      // Setup authentication
      const mockAuthResponse = {
        data: {
          success: true,
          data: {
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
        },
      };
      mockHttpClient.post.mockResolvedValue(mockAuthResponse);
      await apiClient.authenticate('test-token');

      const mockConfig: VoiceAgentConfig = {
        enabledFeatures: ['voice', 'chat', 'quick_messages'],
        voiceSettings: {
          language: 'en-US',
          speechRate: 1.0,
          pitch: 1.0,
          volume: 0.8,
        },
        integrationEndpoints: mockEndpoints,
        domainRestrictions: {
          allowedIntents: ['delivery_status', 'navigation'],
          blockedKeywords: ['entertainment', 'personal'],
          rejectionMessage: 'I can help only with delivery-related tasks',
        },
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockConfig,
        },
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getConfiguration();

      expect(result).toEqual(mockConfig);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/config');
    });

    it('should register and trigger event callbacks', () => {
      const mockCallback = jest.fn();
      const eventData = { test: 'data' };

      apiClient.registerEventCallback('test_event', mockCallback);
      
      // Trigger event by calling a method that emits events
      apiClient['emitEvent']('test_event', eventData);

      expect(mockCallback).toHaveBeenCalledWith(eventData);
    });

    it('should unregister event callbacks', () => {
      const mockCallback = jest.fn();

      apiClient.registerEventCallback('test_event', mockCallback);
      apiClient.unregisterEventCallback('test_event', mockCallback);
      
      // Trigger event - callback should not be called
      apiClient['emitEvent']('test_event', { test: 'data' });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should check authentication status correctly', async () => {
      // Initially not authenticated
      expect(apiClient.isAuthenticated()).toBe(false);

      // Authenticate
      const mockResponse = {
        data: {
          success: true,
          data: {
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
        },
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);
      await apiClient.authenticate('test-token');

      // Should be authenticated
      expect(apiClient.isAuthenticated()).toBe(true);

      const authStatus = apiClient.getAuthStatus();
      expect(authStatus.authenticated).toBe(true);
      expect(authStatus.expiresAt).toBeInstanceOf(Date);
    });

    it('should handle authentication errors', async () => {
      const error = new Error('Network error');
      mockHttpClient.post.mockRejectedValue(error);

      try {
        await apiClient.authenticate('test-token');
        fail('Expected method to throw');
      } catch (thrownError: any) {
        expect(thrownError.message).toBe('Network error');
      }
    });

    it('should handle sync errors when not authenticated', async () => {
      try {
        await apiClient.syncDeliveryData();
        fail('Expected method to throw');
      } catch (error: any) {
        expect(error.message).toContain('Authentication required');
        expect(error.code).toBe('AUTH_REQUIRED');
      }
    });

    it('should handle status update errors when not authenticated', async () => {
      const statusUpdate: StatusUpdate = {
        deliveryId: 'delivery-123',
        status: 'delivered',
        timestamp: new Date(),
      };

      try {
        await apiClient.sendStatusUpdate(statusUpdate);
        fail('Expected method to throw');
      } catch (error: any) {
        expect(error.message).toContain('Authentication required');
        expect(error.code).toBe('AUTH_REQUIRED');
      }
    });

    it('should update endpoints configuration', async () => {
      const newEndpoints: APIEndpoints = {
        baseUrl: 'https://new-api.example.com',
        authEndpoint: '/v2/auth',
        deliveryEndpoint: '/v2/delivery',
        statusEndpoint: '/v2/status',
      };

      await apiClient.updateEndpoints(newEndpoints);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'voice_agent_endpoints',
        JSON.stringify(newEndpoints)
      );
    });

    it('should reset client state', async () => {
      // First authenticate
      const mockResponse = {
        data: {
          success: true,
          data: {
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
        },
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);
      await apiClient.authenticate('test-token');

      expect(apiClient.isAuthenticated()).toBe(true);

      // Reset
      await apiClient.reset();

      expect(apiClient.isAuthenticated()).toBe(false);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('voice_agent_auth');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('voice_agent_endpoints');
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors correctly', async () => {
      const httpError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { message: 'Server error occurred' },
        },
      };

      mockHttpClient.post.mockRejectedValue(httpError);

      try {
        await apiClient.authenticate('test-token');
        fail('Expected method to throw');
      } catch (error: any) {
        expect(error.code).toBe('HTTP_500');
        expect(error.message).toBe('Server error occurred');
        expect(error.details).toEqual(httpError.response.data);
      }
    });

    it('should handle network errors correctly', async () => {
      const networkError = {
        request: {},
        message: 'Network Error',
      };

      mockHttpClient.post.mockRejectedValue(networkError);

      try {
        await apiClient.authenticate('test-token');
        fail('Expected method to throw');
      } catch (error: any) {
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.message).toBe('Network connection failed');
      }
    });

    it('should handle timeout errors correctly', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      };

      mockHttpClient.post.mockRejectedValue(timeoutError);

      try {
        await apiClient.authenticate('test-token');
        fail('Expected method to throw');
      } catch (error: any) {
        expect(error.code).toBe('TIMEOUT_ERROR');
        expect(error.message).toBe('Request timeout');
      }
    });
  });

  describe('Token Management', () => {
    it('should refresh token when available', async () => {
      // Setup initial authentication with refresh token
      const mockAuthResponse = {
        data: {
          success: true,
          data: {
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            refreshToken: 'refresh-token-123',
          },
        },
      };
      mockHttpClient.post.mockResolvedValueOnce(mockAuthResponse);
      await apiClient.authenticate('test-token');

      // Setup refresh response
      const mockRefreshResponse = {
        data: {
          success: true,
          data: {
            token: 'new-token-456',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
        },
      };
      mockHttpClient.post.mockResolvedValueOnce(mockRefreshResponse);

      const result = await apiClient.refreshToken();

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'refresh-token-123',
      });
    });

    it('should fail to refresh token when not available', async () => {
      const result = await apiClient.refreshToken();
      expect(result).toBe(false);
    });
  });

  describe('Property 11: Context Synchronization', () => {
    beforeEach(async () => {
      // Setup authentication for sync tests
      const mockAuthResponse = {
        data: {
          success: true,
          data: {
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
        },
      };
      mockHttpClient.post.mockResolvedValue(mockAuthResponse);
      await apiClient.authenticate('test-token');
    });

    // Generator for delivery context updates
    const deliveryContextArbitrary = fc.record({
      partnerId: fc.string({ minLength: 1, maxLength: 50 }),
      currentDeliveries: fc.array(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          status: fc.oneof(
            fc.constant('pending' as const),
            fc.constant('picked_up' as const),
            fc.constant('in_transit' as const),
            fc.constant('delivered' as const),
            fc.constant('failed' as const)
          ),
          pickupLocation: fc.record({
            street: fc.string({ minLength: 1, maxLength: 100 }),
            city: fc.string({ minLength: 1, maxLength: 50 }),
            state: fc.string({ minLength: 2, maxLength: 2 }),
            zipCode: fc.string({ minLength: 5, maxLength: 10 }),
            coordinates: fc.record({
              latitude: fc.float({ min: Math.fround(-90), max: Math.fround(90) }),
              longitude: fc.float({ min: Math.fround(-180), max: Math.fround(180) }),
            }),
          }),
          deliveryLocation: fc.record({
            street: fc.string({ minLength: 1, maxLength: 100 }),
            city: fc.string({ minLength: 1, maxLength: 50 }),
            state: fc.string({ minLength: 2, maxLength: 2 }),
            zipCode: fc.string({ minLength: 5, maxLength: 10 }),
            coordinates: fc.record({
              latitude: fc.float({ min: Math.fround(-90), max: Math.fround(90) }),
              longitude: fc.float({ min: Math.fround(-180), max: Math.fround(180) }),
            }),
          }),
          customerInfo: fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            email: fc.option(fc.emailAddress()),
            notes: fc.option(fc.string({ maxLength: 200 })),
          }),
          estimatedTime: fc.date(),
          specialInstructions: fc.option(fc.string({ maxLength: 200 })),
        }),
        { minLength: 0, maxLength: 10 }
      ),
      activeRoute: fc.record({
        id: fc.string({ minLength: 1, maxLength: 20 }),
        stops: fc.array(
          fc.record({
            street: fc.string({ minLength: 1, maxLength: 100 }),
            city: fc.string({ minLength: 1, maxLength: 50 }),
            state: fc.string({ minLength: 2, maxLength: 2 }),
            zipCode: fc.string({ minLength: 5, maxLength: 10 }),
            coordinates: fc.record({
              latitude: fc.float({ min: Math.fround(-90), max: Math.fround(90) }),
              longitude: fc.float({ min: Math.fround(-180), max: Math.fround(180) }),
            }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        estimatedDuration: fc.integer({ min: 1, max: 480 }),
        distance: fc.float({ min: Math.fround(0.1), max: Math.fround(500) }),
      }),
      vehicleStatus: fc.record({
        id: fc.string({ minLength: 1, maxLength: 20 }),
        type: fc.oneof(
          fc.constant('car' as const),
          fc.constant('bike' as const),
          fc.constant('truck' as const),
          fc.constant('van' as const)
        ),
        isMoving: fc.boolean(),
        speed: fc.float({ min: Math.fround(0), max: Math.fround(120) }),
        fuelLevel: fc.option(fc.float({ min: Math.fround(0), max: Math.fround(100) })),
        batteryLevel: fc.option(fc.float({ min: Math.fround(0), max: Math.fround(100) })),
      }),
      location: fc.record({
        latitude: fc.float({ min: Math.fround(-90), max: Math.fround(90) }),
        longitude: fc.float({ min: Math.fround(-180), max: Math.fround(180) }),
        accuracy: fc.option(fc.float({ min: Math.fround(1), max: Math.fround(100) })),
      }),
      workingHours: fc.record({
        start: fc.date(),
        end: fc.date(),
      }),
    });

    /**
     * **Feature: voice-agent, Property 11: Context Synchronization**
     * **Validates: Requirements 5.2, 8.1, 8.2**
     * 
     * For any delivery data update from the host system, the Voice_Agent should 
     * update its internal context and reflect changes in responses
     */
    it('should update internal context and reflect changes for any delivery data update', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          deliveryContextArbitrary,
          async (initialContext, updatedContext) => {
            // Arrange - Setup initial context sync
            const initialResponse = {
              data: {
                success: true,
                data: {
                  deliveryContext: initialContext,
                  hasChanges: true,
                  timestamp: new Date().toISOString(),
                },
              },
            };

            mockHttpClient.get.mockResolvedValueOnce(initialResponse);

            // Track context changes through callbacks
            const contextChanges: DeliveryContext[] = [];
            apiClient.onDeliveryDataChange((context) => {
              contextChanges.push(context);
            });

            // Act - Initial sync
            const syncedContext1 = await apiClient.syncDeliveryData();

            // Arrange - Setup updated context sync
            const updatedResponse = {
              data: {
                success: true,
                data: {
                  deliveryContext: updatedContext,
                  hasChanges: true,
                  timestamp: new Date().toISOString(),
                },
              },
            };

            mockHttpClient.get.mockResolvedValueOnce(updatedResponse);

            // Act - Updated sync
            const syncedContext2 = await apiClient.syncDeliveryData();

            // Assert - Context should be updated and reflected
            expect(syncedContext1).toEqual(initialContext);
            expect(syncedContext2).toEqual(updatedContext);
            
            // Verify that context changes were properly tracked
            expect(contextChanges).toHaveLength(2);
            expect(contextChanges[0]).toEqual(initialContext);
            expect(contextChanges[1]).toEqual(updatedContext);

            // Verify that the API was called with correct endpoints
            expect(mockHttpClient.get).toHaveBeenCalledWith('/delivery/context');
            expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle context synchronization with no changes detected', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          async (context) => {
            // Arrange - Setup response with no changes
            const noChangesResponse = {
              data: {
                success: true,
                data: {
                  deliveryContext: context,
                  hasChanges: false,
                  timestamp: new Date().toISOString(),
                },
              },
            };

            mockHttpClient.get.mockResolvedValue(noChangesResponse);

            // Track context changes
            const contextChanges: DeliveryContext[] = [];
            apiClient.onDeliveryDataChange((context) => {
              contextChanges.push(context);
            });

            // Act - Sync with no changes
            const result = await apiClient['performDataSync']();

            // Assert - Should return null when no changes
            expect(result).toBeNull();
            
            // Verify no context change callbacks were triggered
            expect(contextChanges).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain sync status consistency for any sync operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          fc.boolean(), // hasChanges flag
          async (context, hasChanges) => {
            // Arrange
            const response = {
              data: {
                success: true,
                data: {
                  deliveryContext: context,
                  hasChanges,
                  timestamp: new Date().toISOString(),
                },
              },
            };

            mockHttpClient.get.mockResolvedValue(response);

            // Act - Check sync status before and after
            const statusBefore = apiClient.getSyncStatus();
            expect(statusBefore.inProgress).toBe(false);

            const syncPromise = apiClient['performDataSync']();
            
            // During sync, status should show in progress
            // Note: This is a race condition test, so we check immediately
            const statusDuring = apiClient.getSyncStatus();
            
            const result = await syncPromise;
            
            const statusAfter = apiClient.getSyncStatus();

            // Assert - Sync status should be consistent
            expect(statusAfter.inProgress).toBe(false);
            
            if (hasChanges) {
              expect(result).toEqual(context);
              expect(statusAfter.lastSync).toBeInstanceOf(Date);
            } else {
              expect(result).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle concurrent sync operations gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          deliveryContextArbitrary,
          async (context1, context2) => {
            // Arrange - Setup responses for concurrent calls
            const response1 = {
              data: {
                success: true,
                data: {
                  deliveryContext: context1,
                  hasChanges: true,
                  timestamp: new Date().toISOString(),
                },
              },
            };

            const response2 = {
              data: {
                success: true,
                data: {
                  deliveryContext: context2,
                  hasChanges: true,
                  timestamp: new Date().toISOString(),
                },
              },
            };

            mockHttpClient.get
              .mockResolvedValueOnce(response1)
              .mockResolvedValueOnce(response2);

            // Act - Start concurrent sync operations
            const sync1Promise = apiClient['performDataSync']();
            const sync2Promise = apiClient['performDataSync']();

            const [result1, result2] = await Promise.all([sync1Promise, sync2Promise]);

            // Assert - One should succeed, one should return null (due to sync in progress)
            const results = [result1, result2];
            const successfulResults = results.filter(r => r !== null);
            const nullResults = results.filter(r => r === null);

            expect(successfulResults.length).toBe(1);
            expect(nullResults.length).toBe(1);
            expect(successfulResults[0]).toEqual(context1);
          }
        ),
        { numRuns: 50 } // Reduced runs for concurrent testing
      );
    });
  });

  describe('Property 12: Status Change Notification', () => {
    beforeEach(async () => {
      // Setup authentication for notification tests
      const mockAuthResponse = {
        data: {
          success: true,
          data: {
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
        },
      };
      mockHttpClient.post.mockResolvedValue(mockAuthResponse);
      await apiClient.authenticate('test-token');
    });

    // Generator for status updates
    const statusUpdateArbitrary = fc.record({
      deliveryId: fc.string({ minLength: 1, maxLength: 50 }),
      status: fc.oneof(
        fc.constant('pending' as const),
        fc.constant('picked_up' as const),
        fc.constant('in_transit' as const),
        fc.constant('delivered' as const),
        fc.constant('failed' as const)
      ),
      timestamp: fc.date(),
      location: fc.option(fc.record({
        latitude: fc.float({ min: Math.fround(-90), max: Math.fround(90) }),
        longitude: fc.float({ min: Math.fround(-180), max: Math.fround(180) }),
        accuracy: fc.option(fc.float({ min: Math.fround(1), max: Math.fround(100) })),
      })),
      notes: fc.option(fc.string({ maxLength: 200 })),
      metadata: fc.option(fc.record({
        driverId: fc.string({ minLength: 1, maxLength: 20 }),
        vehicleId: fc.string({ minLength: 1, maxLength: 20 }),
        routeId: fc.string({ minLength: 1, maxLength: 20 }),
      })),
    });

    /**
     * **Feature: voice-agent, Property 12: Status Change Notification**
     * **Validates: Requirements 5.4**
     * 
     * For any delivery status change initiated through the Voice_Agent, the system 
     * should notify the host application via API callbacks
     */
    it('should notify host application for any delivery status change', async () => {
      await fc.assert(
        fc.asyncProperty(
          statusUpdateArbitrary,
          async (statusUpdate) => {
            // Arrange - Setup successful notification response
            const mockNotificationResponse = {
              data: {
                success: true,
              },
            };

            const mockStatusResponse = {
              data: {
                success: true,
              },
            };

            // Setup mocks for both status update and notification
            mockHttpClient.post
              .mockResolvedValueOnce(mockStatusResponse)
              .mockResolvedValueOnce(mockNotificationResponse);

            // Track notification events
            const notificationEvents: any[] = [];
            apiClient.registerEventCallback('status_notification_sent', (data) => {
              notificationEvents.push(data);
            });

            // Act - Send status update (which should trigger notification)
            await apiClient.sendStatusUpdate(statusUpdate);

            // Assert - Verify both status update and notification were sent
            expect(mockHttpClient.post).toHaveBeenCalledWith('/delivery/status', statusUpdate);
            
            expect(mockHttpClient.post).toHaveBeenCalledWith(
              '/delivery/status/notify',
              expect.objectContaining({
                deliveryId: statusUpdate.deliveryId,
                status: statusUpdate.status,
                source: 'voice_agent',
                notificationType: 'status_change',
                timestamp: statusUpdate.timestamp.toISOString(),
                location: statusUpdate.location,
                notes: statusUpdate.notes,
                metadata: statusUpdate.metadata,
              })
            );

            // Verify notification event was emitted
            expect(notificationEvents).toHaveLength(1);
            expect(notificationEvents[0]).toEqual({
              update: statusUpdate,
              success: true,
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle notification failures gracefully while still updating status', async () => {
      await fc.assert(
        fc.asyncProperty(
          statusUpdateArbitrary,
          async (statusUpdate) => {
            // Arrange - Status update succeeds but notification fails
            const mockStatusResponse = {
              data: {
                success: true,
              },
            };

            const notificationError = new Error('Notification service unavailable');

            mockHttpClient.post
              .mockResolvedValueOnce(mockStatusResponse)
              .mockRejectedValueOnce(notificationError);

            // Track notification errors
            const notificationErrors: any[] = [];
            apiClient.registerEventCallback('status_notification_error', (error) => {
              notificationErrors.push(error);
            });

            // Act - Send status update (notification should fail but not throw)
            await apiClient.sendStatusUpdate(statusUpdate);

            // Assert - Status update should succeed despite notification failure
            expect(mockHttpClient.post).toHaveBeenCalledWith('/delivery/status', statusUpdate);
            expect(mockHttpClient.post).toHaveBeenCalledWith(
              '/delivery/status/notify',
              expect.objectContaining({
                deliveryId: statusUpdate.deliveryId,
                status: statusUpdate.status,
                source: 'voice_agent',
                notificationType: 'status_change',
              })
            );

            // Notification error should be tracked but not thrown
            expect(notificationErrors).toHaveLength(1);
            expect(notificationErrors[0].message).toBe('Notification service unavailable');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include all required fields in status change notifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          statusUpdateArbitrary,
          async (statusUpdate) => {
            // Arrange
            const mockNotificationResponse = {
              data: {
                success: true,
              },
            };

            const mockStatusResponse = {
              data: {
                success: true,
              },
            };

            mockHttpClient.post
              .mockResolvedValueOnce(mockStatusResponse)
              .mockResolvedValueOnce(mockNotificationResponse);

            // Act
            await apiClient.sendStatusUpdate(statusUpdate);

            // Assert - Verify notification payload contains all required fields
            const notificationCall = mockHttpClient.post.mock.calls.find(
              call => call[0] === '/delivery/status/notify'
            );

            expect(notificationCall).toBeDefined();
            const notificationPayload = notificationCall![1];

            // Verify required fields are present
            expect(notificationPayload).toHaveProperty('deliveryId', statusUpdate.deliveryId);
            expect(notificationPayload).toHaveProperty('status', statusUpdate.status);
            expect(notificationPayload).toHaveProperty('source', 'voice_agent');
            expect(notificationPayload).toHaveProperty('notificationType', 'status_change');
            expect(notificationPayload).toHaveProperty('timestamp');
            
            // Verify timestamp is properly formatted ISO string
            expect(typeof notificationPayload.timestamp).toBe('string');
            expect(new Date(notificationPayload.timestamp)).toEqual(statusUpdate.timestamp);

            // Verify optional fields are preserved
            if (statusUpdate.location) {
              expect(notificationPayload).toHaveProperty('location', statusUpdate.location);
            }
            if (statusUpdate.notes) {
              expect(notificationPayload).toHaveProperty('notes', statusUpdate.notes);
            }
            if (statusUpdate.metadata) {
              expect(notificationPayload).toHaveProperty('metadata', statusUpdate.metadata);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Data Synchronization and Callbacks', () => {
    beforeEach(async () => {
      // Setup authentication for sync tests
      const mockAuthResponse = {
        data: {
          success: true,
          data: {
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
        },
      };
      mockHttpClient.post.mockResolvedValue(mockAuthResponse);
      await apiClient.authenticate('test-token');
    });

    it('should start and stop data synchronization', () => {
      expect(apiClient.getSyncStatus().isActive).toBe(false);

      apiClient.startDataSync(1000);
      expect(apiClient.getSyncStatus().isActive).toBe(true);

      apiClient.stopDataSync();
      expect(apiClient.getSyncStatus().isActive).toBe(false);
    });

    it('should send status change notifications', async () => {
      const statusUpdate: StatusUpdate = {
        deliveryId: 'delivery-123',
        status: 'delivered',
        timestamp: new Date(),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        notes: 'Package delivered successfully',
      };

      const mockNotificationResponse = {
        data: {
          success: true,
        },
      };

      mockHttpClient.post.mockResolvedValue(mockNotificationResponse);

      await apiClient.notifyStatusChange(statusUpdate);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/delivery/status/notify',
        expect.objectContaining({
          deliveryId: statusUpdate.deliveryId,
          status: statusUpdate.status,
          source: 'voice_agent',
          notificationType: 'status_change',
        })
      );
    });

    it('should start and stop configuration polling', () => {
      expect(apiClient.getConfigPollingStatus().isActive).toBe(false);

      apiClient.startConfigPolling(5000);
      expect(apiClient.getConfigPollingStatus().isActive).toBe(true);

      apiClient.stopConfigPolling();
      expect(apiClient.getConfigPollingStatus().isActive).toBe(false);
    });

    it('should check if features are enabled', async () => {
      const mockConfig: VoiceAgentConfig = {
        enabledFeatures: ['voice_recognition', 'chat_interface'],
        voiceSettings: {
          language: 'en-US',
          speechRate: 1.0,
          pitch: 1.0,
          volume: 0.8,
        },
        integrationEndpoints: mockEndpoints,
        domainRestrictions: {
          allowedIntents: ['delivery_status'],
          blockedKeywords: [],
          rejectionMessage: 'I can help only with delivery-related tasks',
        },
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            config: mockConfig,
            hasChanges: true,
            timestamp: new Date().toISOString(),
          },
        },
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);
      
      // Trigger config update to load the configuration
      await apiClient['checkConfigurationUpdates']();

      expect(apiClient.isFeatureEnabled('voice_recognition')).toBe(true);
      expect(apiClient.isFeatureEnabled('quick_messages')).toBe(false);
    });

    it('should register delivery data change callbacks', async () => {
      const mockCallback = jest.fn();
      apiClient.onDeliveryDataChange(mockCallback);

      const mockDeliveryContext: DeliveryContext = {
        partnerId: 'partner-123',
        currentDeliveries: [],
        activeRoute: {
          id: 'route-1',
          stops: [],
          estimatedDuration: 60,
          distance: 10,
        },
        vehicleStatus: {
          id: 'vehicle-1',
          type: 'car',
          isMoving: false,
          speed: 0,
        },
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        workingHours: {
          start: new Date(),
          end: new Date(),
        },
      };

      // Simulate data sync event with changes
      apiClient['emitEvent']('data_synced', {
        context: mockDeliveryContext,
        hasChanges: true,
        timestamp: new Date(),
      });

      expect(mockCallback).toHaveBeenCalledWith(mockDeliveryContext);
    });

    it('should register configuration change callbacks', () => {
      const mockCallback = jest.fn();
      apiClient.onConfigurationChange(mockCallback);

      const mockConfig: VoiceAgentConfig = {
        enabledFeatures: ['voice_recognition'],
        voiceSettings: {
          language: 'en-US',
          speechRate: 1.0,
          pitch: 1.0,
          volume: 0.8,
        },
        integrationEndpoints: mockEndpoints,
        domainRestrictions: {
          allowedIntents: ['delivery_status'],
          blockedKeywords: [],
          rejectionMessage: 'I can help only with delivery-related tasks',
        },
      };

      // Simulate config update event with changes
      apiClient['emitEvent']('config_updated', {
        config: mockConfig,
        hasChanges: true,
        timestamp: new Date(),
      });

      expect(mockCallback).toHaveBeenCalledWith(mockConfig);
    });

    it('should register feature toggle callbacks', () => {
      const mockCallback = jest.fn();
      apiClient.onFeatureToggle(mockCallback);

      // Simulate feature toggle event
      apiClient['emitEvent']('feature_toggled', {
        feature: 'voice_recognition',
        enabled: false,
      });

      expect(mockCallback).toHaveBeenCalledWith('voice_recognition', false);
    });

    it('should refresh configuration from host system', async () => {
      const mockConfig: VoiceAgentConfig = {
        enabledFeatures: ['voice_recognition', 'chat_interface'],
        voiceSettings: {
          language: 'en-US',
          speechRate: 1.0,
          pitch: 1.0,
          volume: 0.8,
        },
        integrationEndpoints: mockEndpoints,
        domainRestrictions: {
          allowedIntents: ['delivery_status'],
          blockedKeywords: [],
          rejectionMessage: 'I can help only with delivery-related tasks',
        },
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockConfig,
        },
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await apiClient.refreshConfiguration();

      expect(result).toEqual(mockConfig);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/config', { params: {} });
    });
  });
});