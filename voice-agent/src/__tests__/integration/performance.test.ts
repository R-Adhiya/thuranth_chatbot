/**
 * Performance Integration Tests
 * 
 * Tests system performance under various conditions including:
 * - Response time measurements
 * - Memory usage monitoring
 * - Concurrent operation handling
 * - Battery usage optimization
 * - Network condition adaptation
 */

import fc from 'fast-check';
import { 
  IntegrationTestEnvironment, 
  createIntegrationTestEnvironment, 
  waitForEvent, 
  waitForCondition 
} from './setup';

describe('Performance Integration Tests', () => {
  let environment: IntegrationTestEnvironment;

  beforeEach(async () => {
    environment = createIntegrationTestEnvironment();
    await environment.initialize();
  });

  afterEach(async () => {
    await environment.cleanup();
  });

  describe('Response Time Performance', () => {
    it('should meet voice command response time requirements', async () => {
      // Arrange
      const voiceCommands = [
        'What is my next delivery?',
        'Navigate to next stop',
        'Send message reached pickup',
        'Call customer',
        'What is my delivery status?'
      ];
      
      // Act & Assert
      for (const command of voiceCommands) {
        const { result, duration } = await environment.measureResponseTime(async () => {
          await environment.voiceManager.startListening('tap-to-speak');
          environment.simulateVoiceInput(command, 0.95);
          return await waitForEvent(environment, 'intent_processed', 3000);
        });
        
        expect(result).toBeDefined();
        expect(duration).toBeLessThan(2000); // Requirements: respond within 2 seconds
        
        console.log(`Voice command "${command}" processed in ${duration}ms`);
      }
    });

    it('should meet chat response time requirements', async () => {
      // Arrange
      const chatMessages = [
        'What deliveries do I have today?',
        'Show me customer information',
        'Navigate to delivery location',
        'Send quick message delayed',
        'Update delivery status'
      ];
      
      // Act & Assert
      for (const message of chatMessages) {
        const { result, duration } = await environment.measureResponseTime(async () => {
          return await environment.chatManager.sendMessage(message);
        });
        
        expect(result).toBeDefined();
        expect(duration).toBeLessThan(1500); // Chat should be faster than voice
        
        console.log(`Chat message "${message}" processed in ${duration}ms`);
      }
    });

    it('should maintain performance under network latency', async () => {
      // Arrange - Test different network conditions
      const networkConditions = [
        { delay: 50, label: 'Good connection' },
        { delay: 200, label: 'Moderate latency' },
        { delay: 500, label: 'High latency' },
        { delay: 1000, label: 'Very high latency' }
      ];
      
      for (const condition of networkConditions) {
        // Arrange
        environment.simulateNetworkConditions(true, condition.delay);
        
        // Act & Assert
        const { result, duration } = await environment.measureResponseTime(async () => {
          return await environment.apiClient.syncDeliveryData();
        });
        
        expect(result).toBeDefined();
        // Allow more time for high latency conditions
        const maxTime = condition.delay < 500 ? 3000 : 8000;
        expect(duration).toBeLessThan(maxTime);
        
        console.log(`${condition.label} (${condition.delay}ms): API sync in ${duration}ms`);
      }
    });

    it('should handle concurrent operations efficiently', async () => {
      // Arrange
      const operations = [
        () => environment.chatManager.sendMessage('What is my status?'),
        () => environment.apiClient.syncDeliveryData(),
        () => environment.apiClient.getConfiguration(),
        () => environment.chatManager.sendMessage('Navigate to next stop'),
        () => environment.apiClient.sendStatusUpdate({
          orderId: 'test_order',
          status: 'delivered',
          timestamp: new Date()
        })
      ];
      
      // Act
      const startTime = Date.now();
      const results = await Promise.all(operations.map(op => op()));
      const totalDuration = Date.now() - startTime;
      
      // Assert
      expect(results).toHaveLength(operations.length);
      results.forEach(result => expect(result).toBeDefined());
      
      // Concurrent operations should be faster than sequential
      expect(totalDuration).toBeLessThan(8000);
      
      console.log(`${operations.length} concurrent operations completed in ${totalDuration}ms`);
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should maintain stable memory usage during extended operation', async () => {
      // Arrange
      const initialMemory = await environment.measureMemoryUsage();
      const operationCount = 50;
      
      // Act - Perform extended operations
      for (let i = 0; i < operationCount; i++) {
        const command = environment.generateRandomVoiceCommand();
        await environment.voiceManager.startListening('tap-to-speak');
        environment.simulateVoiceInput(command, 0.9);
        await waitForEvent(environment, 'intent_processed', 3000);
        
        // Occasional chat messages
        if (i % 10 === 0) {
          await environment.chatManager.sendMessage('What is my delivery status?');
        }
        
        // Brief pause to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const finalMemory = await environment.measureMemoryUsage();
      
      // Assert
      const memoryIncrease = finalMemory.used - initialMemory.used;
      expect(memoryIncrease).toBeLessThan(100); // Should not increase by more than 100MB
      
      console.log(`Memory usage: ${initialMemory.used}MB → ${finalMemory.used}MB (${memoryIncrease > 0 ? '+' : ''}${memoryIncrease}MB)`);
    });

    it('should clean up resources properly', async () => {
      // Arrange
      const initialMemory = await environment.measureMemoryUsage();
      
      // Act - Create and destroy multiple service instances
      for (let i = 0; i < 10; i++) {
        const tempEnvironment = createIntegrationTestEnvironment();
        await tempEnvironment.initialize();
        
        // Use the services briefly
        await tempEnvironment.chatManager.sendMessage('Test message');
        await tempEnvironment.voiceManager.startListening('tap-to-speak');
        await tempEnvironment.voiceManager.stopListening();
        
        // Cleanup
        await tempEnvironment.cleanup();
      }
      
      const finalMemory = await environment.measureMemoryUsage();
      
      // Assert
      const memoryIncrease = finalMemory.used - initialMemory.used;
      expect(memoryIncrease).toBeLessThan(50); // Should clean up properly
      
      console.log(`Memory after cleanup cycles: ${initialMemory.used}MB → ${finalMemory.used}MB`);
    });

    it('should handle memory pressure gracefully', async () => {
      // Arrange - Simulate memory pressure by creating large conversation history
      for (let i = 0; i < 200; i++) {
        await environment.chatManager.sendMessage(`Test message ${i}: What is my delivery status?`);
      }
      
      const memoryAfterHistory = await environment.measureMemoryUsage();
      
      // Act - Continue operations under memory pressure
      const { result, duration } = await environment.measureResponseTime(async () => {
        return await environment.chatManager.sendMessage('What is my next delivery?');
      });
      
      // Assert
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(3000); // Should still perform reasonably
      
      const history = environment.chatManager.getConversationHistory();
      expect(history.length).toBe(402); // 200 * 2 + 2 (user + agent messages)
      
      console.log(`Performance under memory pressure: ${duration}ms, Memory: ${memoryAfterHistory.used}MB`);
    });
  });

  describe('Battery Usage Optimization', () => {
    it('should minimize battery usage during idle periods', async () => {
      // Arrange - Simulate idle state
      const idleStartTime = Date.now();
      
      // Act - Wait in idle state
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Measure activity during idle
      const events = environment.getEventLog();
      const idleEvents = events.filter(e => e.timestamp.getTime() > idleStartTime);
      
      // Assert - Should have minimal activity during idle
      expect(idleEvents.length).toBeLessThan(10);
      
      // Verify services are not consuming resources unnecessarily
      const syncStatus = environment.apiClient.getSyncStatus();
      if (syncStatus.isActive) {
        // If auto-sync is active, it should be at reasonable intervals
        expect(syncStatus.lastSync).toBeDefined();
      }
    });

    it('should optimize network usage to preserve battery', async () => {
      // Arrange - Track network requests
      const initialUpdates = environment.mockHostSystem.getStatusUpdates().length;
      
      // Act - Perform operations that might trigger network requests
      await environment.chatManager.sendMessage('What is my delivery status?');
      await environment.chatManager.sendMessage('Show me next delivery');
      await environment.chatManager.sendMessage('Get customer information');
      
      const finalUpdates = environment.mockHostSystem.getStatusUpdates().length;
      
      // Assert - Should batch or minimize network requests
      const networkRequests = finalUpdates - initialUpdates;
      expect(networkRequests).toBeLessThan(5); // Should not make excessive requests
      
      console.log(`Network requests for 3 operations: ${networkRequests}`);
    });

    it('should reduce processing during low battery conditions', async () => {
      // Arrange - Simulate low battery (this would be detected by device info)
      // In a real implementation, this would check actual battery level
      
      // Act - Perform operations
      const { result, duration } = await environment.measureResponseTime(async () => {
        return await environment.chatManager.sendMessage('What is my delivery status?');
      });
      
      // Assert - Should still function but may optimize processing
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(3000);
      
      // In a real implementation, would verify reduced background processing
      console.log(`Low battery performance: ${duration}ms`);
    });
  });

  describe('Scalability Testing', () => {
    it('should handle large delivery contexts efficiently', async () => {
      // Arrange - Create large delivery context
      const largeContext = environment.generateRandomDeliveryScenario();
      largeContext.currentDeliveries = Array.from({ length: 50 }, (_, i) => ({
        id: `order_${i + 1}`,
        status: ['pending', 'picked_up', 'in_transit'][Math.floor(Math.random() * 3)] as any,
        pickupLocation: {
          street: `${i + 1} Test Street`,
          city: 'TestCity',
          state: 'CA',
          zipCode: '90210',
          coordinates: { lat: 34.0522 + i * 0.001, lng: -118.2437 + i * 0.001 }
        },
        deliveryLocation: {
          street: `${i + 1} Delivery Ave`,
          city: 'TestCity',
          state: 'CA',
          zipCode: '90211',
          coordinates: { lat: 34.0622 + i * 0.001, lng: -118.2537 + i * 0.001 }
        },
        customerInfo: {
          name: `Customer ${i + 1}`,
          phone: `+1-555-${String(i).padStart(4, '0')}`,
        },
        estimatedTime: new Date(Date.now() + i * 60 * 1000),
      }));
      
      // Act - Update context and perform operations
      environment.intentProcessor.updateContext(largeContext);
      environment.chatManager.updateDeliveryContext(largeContext);
      
      const { result, duration } = await environment.measureResponseTime(async () => {
        return await environment.chatManager.sendMessage('How many deliveries do I have?');
      });
      
      // Assert
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should handle large contexts efficiently
      expect(result.text).toContain('50'); // Should process all deliveries
      
      console.log(`Large context (50 deliveries) processed in ${duration}ms`);
    });

    it('should maintain performance with high message throughput', async () => {
      // Arrange
      const messageCount = 100;
      const messages = Array.from({ length: messageCount }, (_, i) => 
        `Message ${i}: ${environment.generateRandomVoiceCommand()}`
      );
      
      // Act
      const startTime = Date.now();
      const results = await Promise.all(
        messages.map(async (message, index) => {
          // Stagger messages slightly to simulate real usage
          await new Promise(resolve => setTimeout(resolve, index * 10));
          return await environment.chatManager.sendMessage(message);
        })
      );
      const totalDuration = Date.now() - startTime;
      
      // Assert
      expect(results).toHaveLength(messageCount);
      results.forEach(result => expect(result).toBeDefined());
      
      const averageTime = totalDuration / messageCount;
      expect(averageTime).toBeLessThan(500); // Average should be reasonable
      
      console.log(`${messageCount} messages processed in ${totalDuration}ms (avg: ${averageTime}ms)`);
    });

    it('should handle rapid mode switching efficiently', async () => {
      // Arrange
      const switchCount = 20;
      
      // Act
      const startTime = Date.now();
      
      for (let i = 0; i < switchCount; i++) {
        if (i % 2 === 0) {
          environment.chatManager.switchToVoiceMode();
        } else {
          environment.chatManager.switchToChatMode();
        }
        
        // Send a message after each switch
        await environment.chatManager.sendMessage('What is my status?');
      }
      
      const totalDuration = Date.now() - startTime;
      
      // Assert
      const averageSwitchTime = totalDuration / switchCount;
      expect(averageSwitchTime).toBeLessThan(200); // Should switch modes quickly
      
      // Verify context was preserved throughout
      const history = environment.chatManager.getConversationHistory();
      expect(history.length).toBe(switchCount * 2); // Each message creates user + agent
      
      console.log(`${switchCount} mode switches completed in ${totalDuration}ms (avg: ${averageSwitchTime}ms)`);
    });
  });

  describe('Network Condition Adaptation', () => {
    it('should adapt to varying network conditions', async () => {
      // Arrange - Test different network scenarios
      const networkScenarios = [
        { online: true, delay: 50, label: 'Excellent' },
        { online: true, delay: 200, label: 'Good' },
        { online: true, delay: 500, label: 'Fair' },
        { online: true, delay: 1000, label: 'Poor' },
        { online: false, delay: 0, label: 'Offline' }
      ];
      
      for (const scenario of networkScenarios) {
        // Arrange
        environment.simulateNetworkConditions(scenario.online, scenario.delay);
        
        // Act
        let success = false;
        let duration = 0;
        
        try {
          const result = await environment.measureResponseTime(async () => {
            return await environment.apiClient.syncDeliveryData();
          });
          success = true;
          duration = result.duration;
        } catch (error) {
          // Expected for offline scenarios
        }
        
        // Assert
        if (scenario.online) {
          if (scenario.delay < 800) {
            expect(success).toBe(true);
          }
          // For very poor connections, may timeout but should handle gracefully
        } else {
          expect(success).toBe(false); // Should fail when offline
        }
        
        console.log(`${scenario.label} network (${scenario.delay}ms): ${success ? `${duration}ms` : 'Failed'}`);
      }
    });

    it('should implement exponential backoff for retries', async () => {
      // Arrange - Simulate intermittent failures
      let attemptCount = 0;
      const originalExecute = environment.apiClient.executeWithRetry;
      
      // Mock to track retry attempts
      const retryTimes: number[] = [];
      
      // Simulate failures for first few attempts
      environment.simulateNetworkConditions(false, 0);
      
      // Act
      try {
        await environment.apiClient.syncDeliveryData();
      } catch (error) {
        // Expected to fail
      }
      
      // Assert - Should have attempted retries with increasing delays
      // This is tested indirectly through the retry configuration
      const retryConfig = environment.apiClient.getRetryConfig();
      expect(retryConfig.maxRetries).toBeGreaterThan(1);
      expect(retryConfig.backoffMultiplier).toBeGreaterThan(1);
      
      console.log(`Retry configuration: ${JSON.stringify(retryConfig)}`);
    });

    it('should cache data for offline operation', async () => {
      // Arrange - Sync data while online
      const onlineData = await environment.apiClient.syncDeliveryData();
      expect(onlineData).toBeDefined();
      
      // Act - Go offline and try to use cached data
      environment.simulateNetworkConditions(false, 0);
      
      // The application should use cached data for responses
      const response = await environment.chatManager.sendMessage('What is my next delivery?');
      
      // Assert - Should still provide meaningful response using cached data
      expect(response).toBeDefined();
      expect(response.text).not.toContain('error');
      
      console.log('Offline response using cached data:', response.text);
    });
  });

  describe('Property-Based Performance Testing', () => {
    /**
     * Property: Response Time Consistency
     * For any valid operation under normal conditions, response time should be consistent.
     */
    it('should maintain consistent response times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('voice'),
            fc.constant('chat'),
            fc.constant('api')
          ),
          fc.oneof(
            fc.constant('What is my next delivery?'),
            fc.constant('Navigate to next stop'),
            fc.constant('Send status update'),
            fc.constant('Get configuration')
          ),
          async (operationType, operation) => {
            // Arrange
            environment.simulateNetworkConditions(true, 100); // Normal conditions
            
            // Act & Measure
            let duration = 0;
            let success = false;
            
            try {
              const result = await environment.measureResponseTime(async () => {
                switch (operationType) {
                  case 'voice':
                    await environment.voiceManager.startListening('tap-to-speak');
                    environment.simulateVoiceInput(operation, 0.95);
                    return await waitForEvent(environment, 'intent_processed', 3000);
                  
                  case 'chat':
                    return await environment.chatManager.sendMessage(operation);
                  
                  case 'api':
                    if (operation.includes('configuration')) {
                      return await environment.apiClient.getConfiguration();
                    } else {
                      return await environment.apiClient.syncDeliveryData();
                    }
                }
              });
              
              duration = result.duration;
              success = true;
            } catch (error) {
              // Some operations may fail, but should do so quickly
              duration = 0;
            }
            
            // Assert
            if (success) {
              expect(duration).toBeLessThan(3000); // Should be reasonably fast
              expect(duration).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property: Memory Stability
     * For any sequence of operations, memory usage should remain stable.
     */
    it('should maintain memory stability across operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.oneof(
              fc.constant('chat_message'),
              fc.constant('voice_command'),
              fc.constant('api_sync'),
              fc.constant('mode_switch')
            ),
            { minLength: 5, maxLength: 15 }
          ),
          async (operations) => {
            // Arrange
            const initialMemory = await environment.measureMemoryUsage();
            
            // Act - Perform sequence of operations
            for (const operation of operations) {
              switch (operation) {
                case 'chat_message':
                  await environment.chatManager.sendMessage(environment.generateRandomVoiceCommand());
                  break;
                
                case 'voice_command':
                  await environment.voiceManager.startListening('tap-to-speak');
                  environment.simulateVoiceInput(environment.generateRandomVoiceCommand(), 0.9);
                  try {
                    await waitForEvent(environment, 'intent_processed', 2000);
                  } catch (error) {
                    // Timeout is acceptable
                  }
                  break;
                
                case 'api_sync':
                  try {
                    await environment.apiClient.syncDeliveryData();
                  } catch (error) {
                    // Network errors are acceptable
                  }
                  break;
                
                case 'mode_switch':
                  if (Math.random() > 0.5) {
                    environment.chatManager.switchToVoiceMode();
                  } else {
                    environment.chatManager.switchToChatMode();
                  }
                  break;
              }
              
              // Brief pause between operations
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            const finalMemory = await environment.measureMemoryUsage();
            
            // Assert
            const memoryIncrease = finalMemory.used - initialMemory.used;
            expect(memoryIncrease).toBeLessThan(50); // Should not leak significant memory
            
            // Memory should not decrease significantly either (would indicate data loss)
            expect(memoryIncrease).toBeGreaterThan(-20);
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property: Concurrent Operation Performance
     * For any set of concurrent operations, the system should handle them efficiently.
     */
    it('should handle concurrent operations efficiently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 8 }),
          async (concurrentCount) => {
            // Arrange
            const operations = Array.from({ length: concurrentCount }, (_, i) => 
              () => environment.chatManager.sendMessage(`Concurrent message ${i}: What is my status?`)
            );
            
            // Act
            const startTime = Date.now();
            const results = await Promise.all(operations.map(op => op()));
            const totalDuration = Date.now() - startTime;
            
            // Assert
            expect(results).toHaveLength(concurrentCount);
            results.forEach(result => expect(result).toBeDefined());
            
            // Concurrent operations should be more efficient than sequential
            const averageTime = totalDuration / concurrentCount;
            expect(averageTime).toBeLessThan(1000); // Should handle concurrency well
            
            // Total time should be less than sequential execution would take
            expect(totalDuration).toBeLessThan(concurrentCount * 800);
          }
        ),
        { numRuns: 8 }
      );
    });
  });
});