/**
 * End-to-End Voice Command Integration Tests
 * 
 * Tests complete voice-to-action workflows including:
 * - Voice recognition → Intent processing → Action execution
 * - Error handling and recovery
 * - Performance under various conditions
 * - Real-world delivery scenarios
 */

import fc from 'fast-check';
import { 
  IntegrationTestEnvironment, 
  createIntegrationTestEnvironment, 
  waitForEvent, 
  waitForCondition 
} from './setup';

describe('Voice-to-Action Integration Tests', () => {
  let environment: IntegrationTestEnvironment;

  beforeEach(async () => {
    environment = createIntegrationTestEnvironment();
    await environment.initialize();
  });

  afterEach(async () => {
    await environment.cleanup();
  });

  describe('Complete Voice Command Workflows', () => {
    it('should process delivery status query from voice to response', async () => {
      // Arrange
      const voiceCommand = "What is my next delivery?";
      
      // Act
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput(voiceCommand, 0.95);
      
      // Wait for processing chain to complete
      const intentEvent = await waitForEvent(environment, 'intent_processed', 3000);
      
      // Assert
      expect(intentEvent).toBeDefined();
      expect(intentEvent.data.intent.type).toBe('delivery_status');
      expect(intentEvent.data.intent.action).toBe('get_next_delivery');
      
      // Verify response was generated
      const events = environment.getEventLog();
      const responseEvents = events.filter(e => e.event.includes('response') || e.event.includes('message_sent'));
      expect(responseEvents.length).toBeGreaterThan(0);
    });

    it('should handle navigation commands end-to-end', async () => {
      // Arrange
      const voiceCommand = "Navigate to next stop";
      
      // Act
      await environment.voiceManager.startListening('push-to-talk');
      environment.simulateVoiceInput(voiceCommand, 0.88);
      
      // Wait for processing
      const intentEvent = await waitForEvent(environment, 'intent_processed', 3000);
      
      // Assert
      expect(intentEvent.data.intent.type).toBe('navigation');
      expect(intentEvent.data.intent.action).toBe('navigate_to_next_stop');
      
      // Verify navigation action was triggered
      const events = environment.getEventLog();
      const navigationEvents = events.filter(e => e.event.includes('navigation') || e.event.includes('route'));
      expect(navigationEvents.length).toBeGreaterThan(0);
    });

    it('should process quick message commands', async () => {
      // Arrange
      const voiceCommand = "Send message reached pickup location";
      
      // Act
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput(voiceCommand, 0.92);
      
      // Wait for processing
      const quickMessageEvent = await waitForEvent(environment, 'quick_message_sent', 3000);
      
      // Assert
      expect(quickMessageEvent).toBeDefined();
      expect(quickMessageEvent.data.messageType).toBe('reached_pickup');
      
      // Verify message was sent to host system
      const statusUpdates = environment.mockHostSystem.getStatusUpdates();
      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(statusUpdates[0].type).toBe('quick_message');
    });

    it('should handle customer communication commands', async () => {
      // Arrange
      const voiceCommand = "Call customer";
      
      // Act
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput(voiceCommand, 0.90);
      
      // Wait for processing
      const intentEvent = await waitForEvent(environment, 'intent_processed', 3000);
      
      // Assert
      expect(intentEvent.data.intent.type).toBe('communication');
      expect(intentEvent.data.intent.action).toBe('call_customer');
      
      // Verify customer info was accessed
      const events = environment.getEventLog();
      const communicationEvents = events.filter(e => e.event.includes('communication') || e.event.includes('customer'));
      expect(communicationEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle low confidence voice recognition gracefully', async () => {
      // Arrange
      const voiceCommand = "mumbled unclear command";
      
      // Act
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput(voiceCommand, 0.3); // Low confidence
      
      // Wait for error handling
      const errorEvent = await waitForEvent(environment, 'voice_error', 3000);
      
      // Assert
      expect(errorEvent).toBeDefined();
      expect(errorEvent.data.code).toBe('VOICE_LOW_CONFIDENCE');
      
      // Verify retry mechanism was triggered
      await waitForCondition(() => {
        const events = environment.getEventLog();
        return events.some(e => e.event.includes('voice_started') && e.timestamp > errorEvent.timestamp);
      }, 5000);
    });

    it('should handle network failures during API calls', async () => {
      // Arrange
      environment.simulateNetworkConditions(false, 0); // Offline
      const voiceCommand = "What is my delivery status?";
      
      // Act
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput(voiceCommand, 0.95);
      
      // Wait for network error
      const networkErrorEvent = await waitForEvent(environment, 'network_error', 3000);
      
      // Assert
      expect(networkErrorEvent).toBeDefined();
      
      // Verify fallback behavior
      const events = environment.getEventLog();
      const fallbackEvents = events.filter(e => e.event.includes('fallback') || e.event.includes('cached'));
      expect(fallbackEvents.length).toBeGreaterThan(0);
    });

    it('should handle domain violations appropriately', async () => {
      // Arrange
      const offTopicCommand = "What's the weather like today?";
      
      // Act
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput(offTopicCommand, 0.95);
      
      // Wait for domain violation
      const domainViolationEvent = await waitForEvent(environment, 'domain_violation', 3000);
      
      // Assert
      expect(domainViolationEvent).toBeDefined();
      expect(domainViolationEvent.data.reason).toContain('off-topic');
      
      // Verify rejection response
      const events = environment.getEventLog();
      const rejectionEvents = events.filter(e => e.event.includes('rejection') || e.event.includes('redirect'));
      expect(rejectionEvents.length).toBeGreaterThan(0);
    });

    it('should recover from authentication failures', async () => {
      // Arrange
      environment.simulateAuthFailure(true);
      const voiceCommand = "Send status update";
      
      // Act
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput(voiceCommand, 0.95);
      
      // Wait for auth error
      const authErrorEvent = await waitForEvent(environment, 'auth_error', 3000);
      
      // Assert
      expect(authErrorEvent).toBeDefined();
      
      // Simulate auth recovery
      environment.simulateAuthFailure(false);
      await environment.authenticateWithMockSystem();
      
      // Verify recovery
      const recoveryEvent = await waitForEvent(environment, 'authenticated', 3000);
      expect(recoveryEvent.data.success).toBe(true);
    });
  });

  describe('Performance Under Various Conditions', () => {
    it('should maintain response times under normal conditions', async () => {
      // Arrange
      const voiceCommand = "What is my next delivery?";
      
      // Act & Assert
      const { result, duration } = await environment.measureResponseTime(async () => {
        await environment.voiceManager.startListening('tap-to-speak');
        environment.simulateVoiceInput(voiceCommand, 0.95);
        return await waitForEvent(environment, 'intent_processed', 5000);
      });
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle high latency network conditions', async () => {
      // Arrange
      environment.simulateNetworkConditions(true, 1500); // High latency
      const voiceCommand = "Send message delayed due to traffic";
      
      // Act & Assert
      const { result, duration } = await environment.measureResponseTime(async () => {
        await environment.voiceManager.startListening('tap-to-speak');
        environment.simulateVoiceInput(voiceCommand, 0.95);
        return await waitForEvent(environment, 'quick_message_sent', 8000);
      });
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(8000); // Should handle gracefully with retries
    });

    it('should maintain performance with multiple concurrent operations', async () => {
      // Arrange
      const commands = [
        "What is my next delivery?",
        "Show customer address",
        "Get directions",
        "What is my delivery status?"
      ];
      
      // Act
      const startTime = Date.now();
      const promises = commands.map(async (command, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 100)); // Stagger slightly
        await environment.voiceManager.startListening('tap-to-speak');
        environment.simulateVoiceInput(command, 0.95);
        return await waitForEvent(environment, 'intent_processed', 5000);
      });
      
      const results = await Promise.all(promises);
      const totalDuration = Date.now() - startTime;
      
      // Assert
      expect(results).toHaveLength(commands.length);
      results.forEach(result => expect(result).toBeDefined());
      expect(totalDuration).toBeLessThan(10000); // Should handle concurrent operations efficiently
    });

    it('should monitor memory usage during extended operations', async () => {
      // Arrange
      const initialMemory = await environment.measureMemoryUsage();
      
      // Act - Simulate extended usage
      for (let i = 0; i < 10; i++) {
        const command = environment.generateRandomVoiceCommand();
        await environment.voiceManager.startListening('tap-to-speak');
        environment.simulateVoiceInput(command, 0.9);
        await waitForEvent(environment, 'intent_processed', 3000);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const finalMemory = await environment.measureMemoryUsage();
      
      // Assert
      const memoryIncrease = finalMemory.used - initialMemory.used;
      expect(memoryIncrease).toBeLessThan(50); // Should not leak significant memory
    });
  });

  describe('Real-World Scenario Testing', () => {
    it('should handle typical delivery partner workflow', async () => {
      // Arrange - Simulate a typical delivery sequence
      const workflow = [
        { command: "What is my next delivery?", expectedIntent: 'delivery_status' },
        { command: "Navigate to pickup location", expectedIntent: 'navigation' },
        { command: "Send message reached pickup location", expectedIntent: 'quick_message' },
        { command: "Navigate to delivery location", expectedIntent: 'navigation' },
        { command: "Call customer", expectedIntent: 'communication' },
        { command: "Mark order as delivered", expectedIntent: 'delivery_status' }
      ];
      
      // Act & Assert
      for (const step of workflow) {
        await environment.voiceManager.startListening('tap-to-speak');
        environment.simulateVoiceInput(step.command, 0.9);
        
        const intentEvent = await waitForEvent(environment, 'intent_processed', 3000);
        expect(intentEvent.data.intent.type).toBe(step.expectedIntent);
        
        // Brief pause between commands
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Verify complete workflow was logged
      const events = environment.getEventLog();
      const intentEvents = events.filter(e => e.event.includes('intent_processed'));
      expect(intentEvents).toHaveLength(workflow.length);
    });

    it('should handle emergency scenarios', async () => {
      // Arrange
      const emergencyCommand = "Emergency - unable to complete delivery";
      
      // Act
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput(emergencyCommand, 0.95);
      
      // Wait for safety alert
      const safetyEvent = await waitForEvent(environment, 'safety_alert', 3000);
      
      // Assert
      expect(safetyEvent).toBeDefined();
      expect(safetyEvent.data.priority).toBe('high');
      
      // Verify emergency protocols were triggered
      const events = environment.getEventLog();
      const emergencyEvents = events.filter(e => e.event.includes('emergency') || e.event.includes('safety'));
      expect(emergencyEvents.length).toBeGreaterThan(0);
    });

    it('should handle context switching during delivery', async () => {
      // Arrange - Start with one delivery context
      const initialCommand = "What is my current delivery?";
      
      // Act
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput(initialCommand, 0.95);
      await waitForEvent(environment, 'intent_processed', 3000);
      
      // Simulate delivery context change (new order assigned)
      const newDeliveryContext = environment.generateRandomDeliveryScenario();
      environment.intentProcessor.updateContext(newDeliveryContext);
      environment.chatManager.updateDeliveryContext(newDeliveryContext);
      
      // Query again with new context
      const followupCommand = "What is my next delivery?";
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput(followupCommand, 0.95);
      
      const contextEvent = await waitForEvent(environment, 'context_updated', 3000);
      
      // Assert
      expect(contextEvent).toBeDefined();
      
      // Verify responses reflect new context
      const events = environment.getEventLog();
      const contextEvents = events.filter(e => e.event.includes('context_updated'));
      expect(contextEvents.length).toBeGreaterThan(1);
    });
  });

  describe('Property-Based Voice Command Testing', () => {
    /**
     * Property: Voice Command Processing Consistency
     * For any valid delivery-related voice command, the system should process it consistently
     * and produce appropriate responses regardless of phrasing variations.
     */
    it('should process delivery commands consistently across variations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('What is my next delivery?'),
            fc.constant('Show me my next delivery'),
            fc.constant('Tell me about my next delivery'),
            fc.constant('Next delivery information'),
            fc.constant('What delivery is next?')
          ),
          fc.float({ min: 0.7, max: 1.0 }), // Confidence level
          async (command, confidence) => {
            // Arrange
            environment.clearEventLog();
            
            // Act
            await environment.voiceManager.startListening('tap-to-speak');
            environment.simulateVoiceInput(command, confidence);
            
            // Wait for processing
            const intentEvent = await waitForEvent(environment, 'intent_processed', 3000);
            
            // Assert
            expect(intentEvent.data.intent.type).toBe('delivery_status');
            expect(intentEvent.data.intent.confidence).toBeGreaterThan(0.5);
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property: Error Recovery Consistency
     * For any error condition, the system should recover gracefully and maintain functionality.
     */
    it('should recover consistently from various error conditions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            online: fc.boolean(),
            delay: fc.integer({ min: 0, max: 2000 }),
            shouldFail: fc.boolean()
          }),
          fc.oneof(
            fc.constant('Send status update'),
            fc.constant('Get delivery information'),
            fc.constant('Update order status')
          ),
          async (networkCondition, command) => {
            // Arrange
            environment.clearEventLog();
            environment.simulateNetworkConditions(
              networkCondition.online, 
              networkCondition.delay
            );
            environment.simulateAuthFailure(networkCondition.shouldFail);
            
            // Act
            await environment.voiceManager.startListening('tap-to-speak');
            environment.simulateVoiceInput(command, 0.9);
            
            // Wait for either success or error handling
            try {
              await waitForEvent(environment, 'intent_processed', 5000);
            } catch (error) {
              // Error is expected in some conditions
            }
            
            // Assert - System should remain functional
            const events = environment.getEventLog();
            const errorEvents = events.filter(e => e.event.includes('error'));
            const recoveryEvents = events.filter(e => e.event.includes('recovery') || e.event.includes('retry'));
            
            // If there were errors, there should be recovery attempts
            if (errorEvents.length > 0) {
              expect(recoveryEvents.length).toBeGreaterThan(0);
            }
            
            // System should not crash
            expect(environment.voiceManager.isCurrentlyListening).toBeDefined();
          }
        ),
        { numRuns: 15 }
      );
    });

    /**
     * Property: Performance Consistency
     * For any valid command under normal conditions, response time should be within acceptable limits.
     */
    it('should maintain consistent performance across command types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('delivery_status'),
            fc.constant('navigation'),
            fc.constant('communication'),
            fc.constant('quick_message')
          ),
          async (intentType) => {
            // Arrange
            const commandMap = {
              delivery_status: 'What is my delivery status?',
              navigation: 'Navigate to next stop',
              communication: 'Call customer',
              quick_message: 'Send message reached pickup'
            };
            
            const command = commandMap[intentType];
            environment.clearEventLog();
            environment.simulateNetworkConditions(true, 100); // Normal conditions
            
            // Act & Measure
            const { result, duration } = await environment.measureResponseTime(async () => {
              await environment.voiceManager.startListening('tap-to-speak');
              environment.simulateVoiceInput(command, 0.95);
              return await waitForEvent(environment, 'intent_processed', 5000);
            });
            
            // Assert
            expect(result).toBeDefined();
            expect(duration).toBeLessThan(3000); // Should respond within 3 seconds
            expect(result.data.intent.type).toBe(intentType);
          }
        ),
        { numRuns: 12 }
      );
    });
  });
});