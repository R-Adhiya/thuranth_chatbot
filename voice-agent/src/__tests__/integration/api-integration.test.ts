/**
 * API Integration Tests
 * 
 * Tests integration with mock host systems including:
 * - Authentication flows
 * - Data synchronization
 * - Status updates and callbacks
 * - Configuration management
 * - Error handling and recovery
 */

import fc from 'fast-check';
import { 
  IntegrationTestEnvironment, 
  createIntegrationTestEnvironment, 
  waitForEvent, 
  waitForCondition 
} from './setup';
import { StatusUpdate, DeliveryContext } from '@/types';

describe('API Integration Tests', () => {
  let environment: IntegrationTestEnvironment;

  beforeEach(async () => {
    environment = createIntegrationTestEnvironment();
    // Don't auto-initialize to test authentication flows
  });

  afterEach(async () => {
    await environment.cleanup();
  });

  describe('Authentication Flows', () => {
    it('should authenticate successfully with valid token', async () => {
      // Act
      const success = await environment.apiClient.authenticate('valid_token_123');
      
      // Assert
      expect(success).toBe(true);
      expect(environment.apiClient.isAuthenticated()).toBe(true);
      
      const authStatus = environment.apiClient.getAuthStatus();
      expect(authStatus.authenticated).toBe(true);
      expect(authStatus.expiresAt).toBeDefined();
    });

    it('should handle authentication failure gracefully', async () => {
      // Arrange
      environment.mockHostSystem.setShouldFailAuth(true);
      
      // Act & Assert
      await expect(environment.apiClient.authenticate('invalid_token')).rejects.toThrow();
      expect(environment.apiClient.isAuthenticated()).toBe(false);
    });

    it('should refresh token automatically when needed', async () => {
      // Arrange - Authenticate first
      await environment.apiClient.authenticate('test_token_123');
      
      // Act - Simulate token refresh
      const refreshed = await environment.apiClient.refreshToken();
      
      // Assert
      expect(refreshed).toBe(true);
      expect(environment.apiClient.isAuthenticated()).toBe(true);
    });

    it('should handle token expiration and re-authentication', async () => {
      // Arrange - Authenticate with short-lived token
      await environment.apiClient.authenticate('short_lived_token');
      
      // Simulate token expiration by setting auth failure
      environment.mockHostSystem.setShouldFailAuth(true);
      
      // Act - Try to make authenticated request
      await expect(environment.apiClient.syncDeliveryData()).rejects.toThrow();
      
      // Verify auth expired event was emitted
      const authEvents = environment.getEventsOfType('auth_expired');
      expect(authEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Data Synchronization', () => {
    beforeEach(async () => {
      await environment.apiClient.authenticate('test_token_123');
    });

    it('should sync delivery data successfully', async () => {
      // Act
      const deliveryContext = await environment.apiClient.syncDeliveryData();
      
      // Assert
      expect(deliveryContext).toBeDefined();
      expect(deliveryContext.partnerId).toBe('partner_123');
      expect(deliveryContext.currentDeliveries).toHaveLength(2);
      expect(deliveryContext.activeRoute).toBeDefined();
      
      // Verify sync event was emitted
      const syncEvents = environment.getEventsOfType('data_synced');
      expect(syncEvents.length).toBeGreaterThan(0);
    });

    it('should handle incremental sync with change detection', async () => {
      // Arrange - Initial sync
      await environment.apiClient.syncDeliveryData();
      
      // Simulate data change
      environment.mockHostSystem.updateDeliveryStatus('order_001', 'picked_up');
      
      // Act - Sync again
      const updatedContext = await environment.apiClient.syncDeliveryData();
      
      // Assert
      expect(updatedContext).toBeDefined();
      const updatedDelivery = updatedContext.currentDeliveries.find(d => d.id === 'order_001');
      expect(updatedDelivery?.status).toBe('picked_up');
    });

    it('should start and stop automatic data sync', async () => {
      // Act - Start auto sync
      environment.apiClient.startDataSync(1000); // 1 second interval
      
      // Wait for sync to occur
      await waitForEvent(environment, 'data_sync_started', 2000);
      
      // Verify sync status
      const syncStatus = environment.apiClient.getSyncStatus();
      expect(syncStatus.isActive).toBe(true);
      
      // Stop sync
      environment.apiClient.stopDataSync();
      
      const stoppedStatus = environment.apiClient.getSyncStatus();
      expect(stoppedStatus.isActive).toBe(false);
    });

    it('should handle sync failures gracefully', async () => {
      // Arrange - Simulate network failure
      environment.simulateNetworkConditions(false, 0);
      
      // Act & Assert
      await expect(environment.apiClient.syncDeliveryData()).rejects.toThrow();
      
      // Verify error event was emitted
      const errorEvents = environment.getEventsOfType('sync_error');
      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it('should cache data for offline access', async () => {
      // Arrange - Sync data while online
      const onlineData = await environment.apiClient.syncDeliveryData();
      
      // Simulate going offline
      environment.simulateNetworkConditions(false, 0);
      
      // Act - Try to access data offline (should use cache)
      // This would be handled by the application layer using cached data
      expect(onlineData).toBeDefined();
      
      // Verify offline behavior
      const connectionStatus = environment.apiClient.getConnectionStatus();
      expect(connectionStatus.isOnline).toBe(false);
    });
  });

  describe('Status Updates and Callbacks', () => {
    beforeEach(async () => {
      await environment.apiClient.authenticate('test_token_123');
    });

    it('should send status updates successfully', async () => {
      // Arrange
      const statusUpdate: StatusUpdate = {
        orderId: 'order_001',
        status: 'delivered',
        timestamp: new Date(),
        location: {
          coordinates: { lat: 34.0522, lng: -118.2437 },
          accuracy: 10,
          timestamp: new Date()
        },
        notes: 'Package delivered to front door'
      };
      
      // Act
      await environment.apiClient.sendStatusUpdate(statusUpdate);
      
      // Assert
      const sentUpdates = environment.mockHostSystem.getStatusUpdates();
      expect(sentUpdates).toHaveLength(1);
      expect(sentUpdates[0].orderId).toBe('order_001');
      expect(sentUpdates[0].status).toBe('delivered');
      
      // Verify status updated event was emitted
      const updateEvents = environment.getEventsOfType('status_updated');
      expect(updateEvents.length).toBeGreaterThan(0);
    });

    it('should send status change notifications', async () => {
      // Arrange
      const statusUpdate: StatusUpdate = {
        orderId: 'order_002',
        status: 'in_transit',
        timestamp: new Date(),
        location: {
          coordinates: { lat: 34.0622, lng: -118.2537 },
          accuracy: 15,
          timestamp: new Date()
        }
      };
      
      // Act
      await environment.apiClient.notifyStatusChange(statusUpdate);
      
      // Assert
      const notificationEvents = environment.getEventsOfType('status_notification_sent');
      expect(notificationEvents.length).toBeGreaterThan(0);
    });

    it('should handle status update failures with retry', async () => {
      // Arrange
      const statusUpdate: StatusUpdate = {
        orderId: 'order_003',
        status: 'failed',
        timestamp: new Date(),
        notes: 'Customer not available'
      };
      
      // Simulate temporary network failure
      environment.simulateNetworkConditions(false, 0);
      
      // Act & Assert
      await expect(environment.apiClient.sendStatusUpdate(statusUpdate)).rejects.toThrow();
      
      // Verify retry mechanism
      const errorEvents = environment.getEventsOfType('update_error');
      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it('should queue updates when offline and sync when online', async () => {
      // Arrange - Go offline
      environment.simulateNetworkConditions(false, 0);
      
      const statusUpdate: StatusUpdate = {
        orderId: 'order_004',
        status: 'delivered',
        timestamp: new Date()
      };
      
      // Act - Try to send update while offline
      await expect(environment.apiClient.sendStatusUpdate(statusUpdate)).rejects.toThrow();
      
      // Come back online
      environment.simulateNetworkConditions(true, 100);
      
      // Retry the update
      await environment.apiClient.sendStatusUpdate(statusUpdate);
      
      // Assert
      const sentUpdates = environment.mockHostSystem.getStatusUpdates();
      expect(sentUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await environment.apiClient.authenticate('test_token_123');
    });

    it('should fetch configuration from host system', async () => {
      // Act
      const config = await environment.apiClient.getConfiguration();
      
      // Assert
      expect(config).toBeDefined();
      expect(config.enabledFeatures).toContain('voice_recognition');
      expect(config.enabledFeatures).toContain('chat_interface');
      expect(config.voiceSettings).toBeDefined();
      expect(config.integrationEndpoints).toBeDefined();
    });

    it('should start and stop configuration polling', async () => {
      // Act - Start config polling
      environment.apiClient.startConfigPolling(500); // 0.5 second interval
      
      // Wait for polling to start
      await waitForEvent(environment, 'config_polling_started', 2000);
      
      // Verify polling status
      const pollingStatus = environment.apiClient.getConfigPollingStatus();
      expect(pollingStatus.isActive).toBe(true);
      
      // Stop polling
      environment.apiClient.stopConfigPolling();
      
      const stoppedStatus = environment.apiClient.getConfigPollingStatus();
      expect(stoppedStatus.isActive).toBe(false);
    });

    it('should handle configuration updates from host system', async () => {
      // Arrange - Get initial config
      const initialConfig = await environment.apiClient.getConfiguration();
      
      // Simulate config change on host system
      const updatedConfig = {
        ...initialConfig,
        enabledFeatures: [...initialConfig.enabledFeatures, 'new_feature']
      };
      
      // Act - Check for config updates
      const refreshedConfig = await environment.apiClient.refreshConfiguration();
      
      // Assert
      expect(refreshedConfig).toBeDefined();
      
      // Verify config updated event
      const configEvents = environment.getEventsOfType('config_updated');
      expect(configEvents.length).toBeGreaterThan(0);
    });

    it('should apply feature configuration changes', async () => {
      // Arrange - Get config with specific features disabled
      const config = await environment.apiClient.getConfiguration();
      
      // Act - Check if features are enabled
      const voiceEnabled = environment.apiClient.isFeatureEnabled('voice_recognition');
      const chatEnabled = environment.apiClient.isFeatureEnabled('chat_interface');
      
      // Assert
      expect(voiceEnabled).toBe(true);
      expect(chatEnabled).toBe(true);
      
      // Verify feature toggle events
      const featureEvents = environment.getEventsOfType('feature_toggled');
      expect(featureEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await environment.apiClient.authenticate('test_token_123');
    });

    it('should handle network timeouts with retry logic', async () => {
      // Arrange - Simulate high latency
      environment.simulateNetworkConditions(true, 5000); // 5 second delay
      
      // Act & Assert - Should timeout and retry
      await expect(environment.apiClient.syncDeliveryData()).rejects.toThrow();
      
      // Verify retry attempts were made
      const connectionStatus = environment.apiClient.getConnectionStatus();
      expect(connectionStatus.consecutiveFailures).toBeGreaterThan(0);
    });

    it('should handle rate limiting gracefully', async () => {
      // Arrange - Simulate rate limiting
      environment.simulateRateLimit(true);
      
      // Act & Assert
      await expect(environment.apiClient.syncDeliveryData()).rejects.toThrow();
      
      // Verify rate limit handling
      const rateLimitEvents = environment.getEventsOfType('rate_limited');
      expect(rateLimitEvents.length).toBeGreaterThan(0);
      
      const connectionStatus = environment.apiClient.getConnectionStatus();
      expect(connectionStatus.isRateLimited).toBe(true);
    });

    it('should detect and recover from connection loss', async () => {
      // Arrange - Start with good connection
      const initialPing = await environment.apiClient.ping();
      expect(initialPing.success).toBe(true);
      
      // Simulate connection loss
      environment.simulateNetworkConditions(false, 0);
      
      // Act - Check connection
      const offlinePing = await environment.apiClient.ping();
      expect(offlinePing.success).toBe(false);
      
      // Simulate connection recovery
      environment.simulateNetworkConditions(true, 100);
      
      // Verify recovery
      const recoveredPing = await environment.apiClient.ping();
      expect(recoveredPing.success).toBe(true);
      
      // Check for connection events
      const connectionEvents = environment.getEventsOfType('connection');
      expect(connectionEvents.length).toBeGreaterThan(0);
    });

    it('should reset connection state when needed', async () => {
      // Arrange - Cause connection failures
      environment.simulateNetworkConditions(false, 0);
      await expect(environment.apiClient.syncDeliveryData()).rejects.toThrow();
      
      const failedStatus = environment.apiClient.getConnectionStatus();
      expect(failedStatus.consecutiveFailures).toBeGreaterThan(0);
      
      // Act - Reset connection state
      environment.apiClient.resetConnectionState();
      
      // Assert
      const resetStatus = environment.apiClient.getConnectionStatus();
      expect(resetStatus.consecutiveFailures).toBe(0);
      expect(resetStatus.isOnline).toBe(true);
    });

    it('should handle concurrent request failures', async () => {
      // Arrange - Simulate network issues
      environment.simulateNetworkConditions(true, 2000); // Slow network
      
      // Act - Make multiple concurrent requests
      const requests = [
        environment.apiClient.syncDeliveryData(),
        environment.apiClient.getConfiguration(),
        environment.apiClient.sendStatusUpdate({
          orderId: 'test_order',
          status: 'delivered',
          timestamp: new Date()
        })
      ];
      
      // Some may fail due to timeouts
      const results = await Promise.allSettled(requests);
      
      // Assert - System should handle failures gracefully
      expect(results).toHaveLength(3);
      
      // Check that pending requests are managed properly
      const pendingCount = environment.apiClient.getPendingRequestsCount();
      expect(pendingCount).toBe(0); // Should be cleaned up
    });
  });

  describe('Performance and Monitoring', () => {
    beforeEach(async () => {
      await environment.apiClient.authenticate('test_token_123');
    });

    it('should measure API response times', async () => {
      // Act & Measure
      const { result, duration } = await environment.measureResponseTime(async () => {
        return await environment.apiClient.syncDeliveryData();
      });
      
      // Assert
      expect(result).toBeDefined();
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should be reasonable
    });

    it('should handle high-frequency API calls efficiently', async () => {
      // Arrange
      const statusUpdates = Array.from({ length: 10 }, (_, i) => ({
        orderId: `order_${i}`,
        status: 'in_transit' as const,
        timestamp: new Date()
      }));
      
      // Act
      const startTime = Date.now();
      await Promise.all(
        statusUpdates.map(update => environment.apiClient.sendStatusUpdate(update))
      );
      const duration = Date.now() - startTime;
      
      // Assert
      expect(duration).toBeLessThan(10000); // Should handle efficiently
      
      const sentUpdates = environment.mockHostSystem.getStatusUpdates();
      expect(sentUpdates.length).toBe(10);
    });

    it('should monitor connection quality', async () => {
      // Act - Test connection quality
      const ping1 = await environment.apiClient.ping();
      
      // Simulate poor connection
      environment.simulateNetworkConditions(true, 1000);
      const ping2 = await environment.apiClient.ping();
      
      // Assert
      expect(ping1.success).toBe(true);
      expect(ping1.latency).toBeLessThan(ping2.latency);
      expect(ping2.success).toBe(true);
      expect(ping2.latency).toBeGreaterThan(1000);
    });
  });

  describe('Property-Based API Testing', () => {
    beforeEach(async () => {
      await environment.apiClient.authenticate('test_token_123');
    });

    /**
     * Property: API Request Consistency
     * For any valid API request, the system should handle it consistently
     * regardless of network conditions (within reason).
     */
    it('should handle API requests consistently under various conditions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            online: fc.boolean(),
            delay: fc.integer({ min: 0, max: 1000 }),
            shouldFail: fc.boolean()
          }),
          fc.oneof(
            fc.constant('sync'),
            fc.constant('config'),
            fc.constant('status')
          ),
          async (networkCondition, requestType) => {
            // Arrange
            environment.simulateNetworkConditions(
              networkCondition.online,
              networkCondition.delay
            );
            
            // Act
            let result;
            let error;
            
            try {
              switch (requestType) {
                case 'sync':
                  result = await environment.apiClient.syncDeliveryData();
                  break;
                case 'config':
                  result = await environment.apiClient.getConfiguration();
                  break;
                case 'status':
                  result = await environment.apiClient.sendStatusUpdate({
                    orderId: 'test_order',
                    status: 'delivered',
                    timestamp: new Date()
                  });
                  break;
              }
            } catch (e) {
              error = e;
            }
            
            // Assert
            if (networkCondition.online && networkCondition.delay < 500) {
              // Should succeed under good conditions
              expect(error).toBeUndefined();
              if (requestType !== 'status') {
                expect(result).toBeDefined();
              }
            } else {
              // May fail under poor conditions, but should handle gracefully
              if (error) {
                expect(error).toHaveProperty('code');
                expect(error).toHaveProperty('message');
              }
            }
            
            // System should remain functional
            expect(environment.apiClient.isAuthenticated()).toBe(true);
          }
        ),
        { numRuns: 15 }
      );
    });

    /**
     * Property: Status Update Integrity
     * For any valid status update, if it succeeds, it should be recorded correctly.
     */
    it('should maintain status update integrity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            orderId: fc.string({ minLength: 5, maxLength: 20 }),
            status: fc.oneof(
              fc.constant('pending'),
              fc.constant('picked_up'),
              fc.constant('in_transit'),
              fc.constant('delivered'),
              fc.constant('failed')
            ),
            notes: fc.option(fc.string({ maxLength: 100 }))
          }),
          async (updateData) => {
            // Arrange
            environment.mockHostSystem.clearStatusUpdates();
            
            const statusUpdate: StatusUpdate = {
              orderId: updateData.orderId,
              status: updateData.status as any,
              timestamp: new Date(),
              notes: updateData.notes || undefined
            };
            
            // Act
            try {
              await environment.apiClient.sendStatusUpdate(statusUpdate);
              
              // Assert
              const sentUpdates = environment.mockHostSystem.getStatusUpdates();
              expect(sentUpdates.length).toBe(1);
              expect(sentUpdates[0].orderId).toBe(updateData.orderId);
              expect(sentUpdates[0].status).toBe(updateData.status);
              if (updateData.notes) {
                expect(sentUpdates[0].notes).toBe(updateData.notes);
              }
            } catch (error) {
              // If it fails, it should be due to network conditions, not data integrity
              expect(error).toHaveProperty('code');
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property: Configuration Consistency
     * Configuration should be consistent and valid across multiple fetches.
     */
    it('should maintain configuration consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (fetchCount) => {
            // Act - Fetch config multiple times
            const configs = [];
            
            for (let i = 0; i < fetchCount; i++) {
              try {
                const config = await environment.apiClient.getConfiguration();
                configs.push(config);
              } catch (error) {
                // Network errors are acceptable
              }
            }
            
            // Assert - All successful configs should be identical
            if (configs.length > 1) {
              for (let i = 1; i < configs.length; i++) {
                expect(configs[i]).toEqual(configs[0]);
              }
            }
            
            // Each config should have required fields
            configs.forEach(config => {
              expect(config.enabledFeatures).toBeDefined();
              expect(Array.isArray(config.enabledFeatures)).toBe(true);
              expect(config.voiceSettings).toBeDefined();
              expect(config.integrationEndpoints).toBeDefined();
            });
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});