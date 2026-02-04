/**
 * Comprehensive Integration Test Suite
 * 
 * Tests complete end-to-end scenarios that combine multiple components:
 * - Complete voice-to-action workflows
 * - Complete chat-to-action workflows  
 * - API integration scenarios
 * - Real-world delivery partner workflows
 * - Cross-component integration
 * - System resilience and recovery
 * - Edge cases and error conditions
 * 
 * **Validates: All requirements**
 */

import fc from 'fast-check';
import { 
  IntegrationTestEnvironment, 
  createIntegrationTestEnvironment, 
  waitForEvent, 
  waitForCondition 
} from './setup';

describe('Comprehensive Integration Tests', () => {
  let environment: IntegrationTestEnvironment;

  beforeEach(async () => {
    environment = createIntegrationTestEnvironment();
    await environment.initialize();
  }, 15000); // Increase timeout to 15 seconds

  afterEach(async () => {
    await environment.cleanup();
  });

  describe('Complete Voice-to-Action Workflows', () => {
    it('should process complete voice command workflow from recognition to action', async () => {
      // Arrange
      const voiceCommands = [
        { command: 'What is my next delivery?', expectedIntent: 'delivery_status', expectedAction: 'get_next_delivery' },
        { command: 'Navigate to pickup location', expectedIntent: 'navigation', expectedAction: 'navigate_to_pickup' },
        { command: 'Send message reached pickup location', expectedIntent: 'quick_message', expectedAction: 'send_quick_message' },
        { command: 'Call customer', expectedIntent: 'communication', expectedAction: 'call_customer' },
        { command: 'Mark order as delivered', expectedIntent: 'delivery_status', expectedAction: 'update_delivery_status' }
      ];

      // Act & Assert - Test each voice command end-to-end
      for (const { command, expectedIntent, expectedAction } of voiceCommands) {
        environment.clearEventLog();
        
        // Start voice recognition
        await environment.voiceManager.startListening('tap-to-speak');
        
        // Simulate voice input
        environment.simulateVoiceInput(command, 0.95);
        
        // Wait for complete processing chain
        const intentEvent = await waitForEvent(environment, 'intent_processed', 3000);
        
        // Verify intent processing
        expect(intentEvent).toBeDefined();
        expect(intentEvent.data.intent.type).toBe(expectedIntent);
        expect(intentEvent.data.intent.action).toBe(expectedAction);
        
        // Verify action execution
        const events = environment.getEventLog();
        const actionEvents = events.filter(e => 
          e.event.includes('action_executed') || 
          e.event.includes('message_sent') ||
          e.event.includes('navigation_started') ||
          e.event.includes('status_updated')
        );
        expect(actionEvents.length).toBeGreaterThan(0);
        
        // Brief pause between commands
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    it('should handle voice recognition errors and recovery', async () => {
      // Arrange - Test various voice recognition error scenarios
      const errorScenarios = [
        { input: 'mumbled unclear speech', confidence: 0.2, expectedError: 'VOICE_LOW_CONFIDENCE' },
        { input: '', confidence: 0.0, expectedError: 'VOICE_NO_INPUT' },
        { input: 'very long rambling sentence that goes on and on without clear intent or purpose and should trigger timeout', confidence: 0.8, expectedError: 'VOICE_TIMEOUT' }
      ];

      for (const scenario of errorScenarios) {
        environment.clearEventLog();
        
        // Act
        await environment.voiceManager.startListening('tap-to-speak');
        environment.simulateVoiceInput(scenario.input, scenario.confidence);
        
        // Wait for error handling
        const errorEvent = await waitForEvent(environment, 'voice_error', 3000);
        
        // Assert
        expect(errorEvent).toBeDefined();
        expect(errorEvent.data.code).toBe(scenario.expectedError);
        
        // Verify recovery mechanism
        const recoveryEvent = await waitForEvent(environment, 'voice_recovery_started', 2000);
        expect(recoveryEvent).toBeDefined();
      }
    });

    it('should maintain voice context across multiple interactions', async () => {
      // Arrange - Build context through voice interactions
      const contextualCommands = [
        'What deliveries do I have today?',
        'Tell me about the first one',
        'Navigate there',
        'What is the customer phone number?'
      ];

      // Act - Execute contextual conversation
      for (const command of contextualCommands) {
        await environment.voiceManager.startListening('tap-to-speak');
        environment.simulateVoiceInput(command, 0.9);
        await waitForEvent(environment, 'intent_processed', 3000);
        
        // Brief pause for context processing
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Assert - Verify context was maintained
      const contextEvents = environment.getEventsOfType('context_updated');
      expect(contextEvents.length).toBeGreaterThan(0);
      
      // Verify final context contains delivery information
      const finalContext = environment.intentProcessor.getCurrentContext();
      expect(finalContext.currentDeliveries.length).toBeGreaterThan(0);
    });
  });

  describe('Complete Chat-to-Action Workflows', () => {
    it('should process complete chat workflow from text input to action', async () => {
      // Arrange
      const chatMessages = [
        { message: 'Show me my delivery status', expectedIntent: 'delivery_status' },
        { message: 'Get directions to next stop', expectedIntent: 'navigation' },
        { message: 'Send quick message on the way', expectedIntent: 'quick_message' },
        { message: 'What is the customer address?', expectedIntent: 'delivery_status' },
        { message: 'Mark this delivery as complete', expectedIntent: 'delivery_status' }
      ];

      // Act & Assert - Test each chat message end-to-end
      for (const { message, expectedIntent } of chatMessages) {
        const response = await environment.chatManager.sendMessage(message);
        
        // Verify response
        expect(response).toBeDefined();
        expect(response.sender).toBe('agent');
        expect(response.intent?.type).toBe(expectedIntent);
        expect(response.text.length).toBeGreaterThan(0);
        
        // Verify action was executed
        const events = environment.getEventLog();
        const recentEvents = events.filter(e => 
          e.timestamp.getTime() > Date.now() - 1000
        );
        expect(recentEvents.length).toBeGreaterThan(0);
      }
      
      // Verify conversation history
      const history = environment.chatManager.getConversationHistory();
      expect(history.length).toBe(chatMessages.length * 2); // User + agent messages
    });

    it('should handle chat mode switching and context preservation', async () => {
      // Arrange - Start with chat interaction
      await environment.chatManager.sendMessage('What is my next delivery?');
      const initialHistory = environment.chatManager.getConversationHistory();
      
      // Act - Switch to voice mode and back
      environment.chatManager.switchToVoiceMode();
      
      // Simulate voice interaction
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput('Tell me more about that delivery', 0.9);
      await waitForEvent(environment, 'intent_processed', 3000);
      
      // Switch back to chat
      environment.chatManager.switchToChatMode();
      const followupResponse = await environment.chatManager.sendMessage('What is the customer phone number?');
      
      // Assert
      expect(followupResponse).toBeDefined();
      expect(followupResponse.text).toContain('555'); // Should have customer info from context
      
      // Verify context preservation events
      const contextEvents = environment.getEventsOfType('context_preserved');
      expect(contextEvents.length).toBeGreaterThan(0);
    });

    it('should handle chat error scenarios gracefully', async () => {
      // Arrange - Test various chat error scenarios
      const errorScenarios = [
        { message: '', expectedError: 'empty_message' },
        { message: '   ', expectedError: 'empty_message' },
        { message: 'What is the weather today?', expectedError: 'domain_violation' }
      ];

      for (const scenario of errorScenarios) {
        environment.clearEventLog();
        
        // Act & Assert
        if (scenario.expectedError === 'empty_message') {
          await expect(environment.chatManager.sendMessage(scenario.message))
            .rejects.toThrow('Message text cannot be empty');
        } else {
          const response = await environment.chatManager.sendMessage(scenario.message);
          expect(response.text).toContain('delivery-related tasks');
          
          // Verify domain violation was logged
          const domainEvents = environment.getEventsOfType('domain_violation');
          expect(domainEvents.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Complete API Integration Workflows', () => {
    it('should handle complete API authentication and data sync workflow', async () => {
      // Arrange - Start without authentication
      expect(environment.apiClient.isAuthenticated()).toBe(false);
      
      // Act - Complete authentication workflow
      const authSuccess = await environment.apiClient.authenticate('test_token_123');
      expect(authSuccess).toBe(true);
      expect(environment.apiClient.isAuthenticated()).toBe(true);
      
      // Sync delivery data
      const deliveryContext = await environment.apiClient.syncDeliveryData();
      expect(deliveryContext).toBeDefined();
      expect(deliveryContext.partnerId).toBe('partner_123');
      
      // Send status update
      const statusUpdate = {
        orderId: 'order_001',
        status: 'delivered' as const,
        timestamp: new Date(),
        notes: 'Package delivered successfully'
      };
      
      await environment.apiClient.sendStatusUpdate(statusUpdate);
      
      // Verify update was received
      const sentUpdates = environment.mockHostSystem.getStatusUpdates();
      expect(sentUpdates.length).toBeGreaterThan(0);
      expect(sentUpdates[0].orderId).toBe('order_001');
      
      // Get configuration
      const config = await environment.apiClient.getConfiguration();
      expect(config).toBeDefined();
      expect(config.enabledFeatures).toContain('voice_recognition');
    });

    it('should handle API failure and recovery scenarios', async () => {
      // Arrange - Authenticate first
      await environment.apiClient.authenticate('test_token_123');
      
      // Act - Simulate network failure
      environment.simulateNetworkConditions(false, 0);
      
      // Try operations that should fail
      await expect(environment.apiClient.syncDeliveryData()).rejects.toThrow();
      
      // Simulate network recovery
      environment.simulateNetworkConditions(true, 100);
      
      // Verify recovery
      const recoveredData = await environment.apiClient.syncDeliveryData();
      expect(recoveredData).toBeDefined();
      
      // Verify recovery events
      const recoveryEvents = environment.getEventsOfType('network_recovered');
      expect(recoveryEvents.length).toBeGreaterThan(0);
    });

    it('should handle concurrent API operations', async () => {
      // Arrange
      await environment.apiClient.authenticate('test_token_123');
      
      // Act - Execute concurrent operations
      const operations = [
        () => environment.apiClient.syncDeliveryData(),
        () => environment.apiClient.getConfiguration(),
        () => environment.apiClient.sendStatusUpdate({
          orderId: 'concurrent_test',
          status: 'delivered',
          timestamp: new Date()
        }),
        () => environment.apiClient.ping()
      ];
      
      const startTime = Date.now();
      const results = await Promise.allSettled(operations.map(op => op()));
      const duration = Date.now() - startTime;
      
      // Assert
      expect(results).toHaveLength(4);
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThanOrEqual(3); // Most should succeed
      expect(duration).toBeLessThan(5000); // Should handle efficiently
    });
  });
  describe('End-to-End Real-World Scenarios', () => {
    it('should handle complete delivery partner daily workflow', async () => {
      // Arrange - Simulate start of delivery shift with mixed voice and chat
      const workflowSteps = [
        { action: 'voice', command: 'What deliveries do I have today?', expectedType: 'delivery_status' },
        { action: 'chat', command: 'Show me the first delivery details', expectedType: 'delivery_status' },
        { action: 'voice', command: 'Navigate to pickup location', expectedType: 'navigation' },
        { action: 'voice', command: 'Send message reached pickup location', expectedType: 'quick_message' },
        { action: 'chat', command: 'Mark order as picked up', expectedType: 'delivery_status' },
        { action: 'voice', command: 'Navigate to delivery location', expectedType: 'navigation' },
        { action: 'voice', command: 'Call customer', expectedType: 'communication' },
        { action: 'chat', command: 'Send message reached delivery location', expectedType: 'quick_message' },
        { action: 'voice', command: 'Mark order as delivered', expectedType: 'delivery_status' },
        { action: 'chat', command: 'What is my next delivery?', expectedType: 'delivery_status' }
      ];

      // Act & Assert - Execute complete workflow
      for (const [index, step] of workflowSteps.entries()) {
        if (step.action === 'voice') {
          await environment.voiceManager.startListening('tap-to-speak');
          environment.simulateVoiceInput(step.command, 0.9);
          const intentEvent = await waitForEvent(environment, 'intent_processed', 3000);
          expect(intentEvent.data.intent.type).toBe(step.expectedType);
        } else {
          const response = await environment.chatManager.sendMessage(step.command);
          expect(response.intent?.type).toBe(step.expectedType);
        }

        // Brief pause between steps to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Verify complete workflow was logged and processed
      const events = environment.getEventLog();
      const intentEvents = events.filter(e => e.event.includes('intent_processed'));
      const messageEvents = events.filter(e => e.event.includes('message_sent'));
      
      expect(intentEvents.length + messageEvents.length).toBeGreaterThanOrEqual(workflowSteps.length);
      
      // Verify status updates were sent to host system
      const statusUpdates = environment.mockHostSystem.getStatusUpdates();
      expect(statusUpdates.length).toBeGreaterThan(0);
    });

    it('should handle mixed voice and chat interactions seamlessly', async () => {
      // Arrange - Test seamless switching between voice and chat
      const mixedInteractions = [
        { mode: 'chat', input: 'What is my delivery status?', expectResponse: true },
        { mode: 'voice', input: 'Navigate to next stop', expectResponse: true },
        { mode: 'chat', input: 'What is the customer address?', expectResponse: true },
        { mode: 'voice', input: 'Send message on the way', expectResponse: true },
        { mode: 'chat', input: 'Call customer', expectResponse: true },
        { mode: 'voice', input: 'Mark as delivered', expectResponse: true }
      ];

      // Act - Execute mixed interaction flow
      for (const interaction of mixedInteractions) {
        if (interaction.mode === 'voice') {
          environment.chatManager.switchToVoiceMode();
          await environment.voiceManager.startListening('tap-to-speak');
          environment.simulateVoiceInput(interaction.input, 0.9);
          
          if (interaction.expectResponse) {
            await waitForEvent(environment, 'intent_processed', 3000);
          }
        } else {
          environment.chatManager.switchToChatMode();
          const response = await environment.chatManager.sendMessage(interaction.input);
          
          if (interaction.expectResponse) {
            expect(response).toBeDefined();
            expect(response.text.length).toBeGreaterThan(0);
          }
        }
      }

      // Assert - Verify seamless mode switching
      const modeEvents = environment.getEventsOfType('mode_switch');
      expect(modeEvents.length).toBeGreaterThan(0);
      
      // Verify context was preserved throughout
      const contextEvents = environment.getEventsOfType('context_updated');
      expect(contextEvents.length).toBeGreaterThan(0);
    });

    it('should handle complete API integration workflow with real-world scenarios', async () => {
      // Arrange - Complete API integration scenario
      await environment.apiClient.authenticate('test_token_123');
      
      // Act - Simulate real delivery workflow with API calls
      
      // 1. Sync initial delivery data
      const initialData = await environment.apiClient.syncDeliveryData();
      expect(initialData.currentDeliveries.length).toBeGreaterThan(0);
      
      // 2. Process voice command that triggers API call
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput('Send message reached pickup location', 0.95);
      await waitForEvent(environment, 'quick_message_sent', 3000);
      
      // 3. Verify status update was sent via API
      let statusUpdates = environment.mockHostSystem.getStatusUpdates();
      expect(statusUpdates.length).toBe(1);
      expect(statusUpdates[0].type).toBe('quick_message');
      
      // 4. Process chat command that triggers API call
      const response = await environment.chatManager.sendMessage('Mark order as delivered');
      expect(response.intent?.type).toBe('delivery_status');
      
      // 5. Verify delivery status update was sent via API
      statusUpdates = environment.mockHostSystem.getStatusUpdates();
      expect(statusUpdates.length).toBe(2);
      
      // 6. Sync updated data
      const updatedData = await environment.apiClient.syncDeliveryData();
      expect(updatedData).toBeDefined();
      
      // Assert - Verify complete integration
      const apiEvents = environment.getEventsOfType('api');
      expect(apiEvents.length).toBeGreaterThan(0);
    });

    it('should handle error recovery across all components', async () => {
      // Arrange - Test comprehensive error recovery
      await environment.apiClient.authenticate('test_token_123');
      
      // Act & Assert - Test various error scenarios and recovery
      
      // 1. Network failure during voice command
      environment.simulateNetworkConditions(false, 0);
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput('Send status update', 0.9);
      
      const networkError = await waitForEvent(environment, 'network_error', 3000);
      expect(networkError).toBeDefined();
      
      // 2. Recovery and retry
      environment.simulateNetworkConditions(true, 100);
      const recoveryEvent = await waitForEvent(environment, 'network_recovered', 3000);
      expect(recoveryEvent).toBeDefined();
      
      // 3. Auth failure during chat
      environment.simulateAuthFailure(true);
      const chatResponse = await environment.chatManager.sendMessage('Get delivery status');
      expect(chatResponse.text).toContain('error');
      
      // 4. Auth recovery
      environment.simulateAuthFailure(false);
      await environment.authenticateWithMockSystem();
      
      const successResponse = await environment.chatManager.sendMessage('What is my next delivery?');
      expect(successResponse.text).not.toContain('error');
      
      // Verify error and recovery events
      const errorEvents = environment.getEventsOfType('error');
      const recoveryEvents = environment.getEventsOfType('recovery');
      expect(errorEvents.length).toBeGreaterThan(0);
      expect(recoveryEvents.length).toBeGreaterThan(0);
    });
    it('should handle emergency scenarios with priority escalation', async () => {
      // Arrange
      const emergencyScenarios = [
        'Emergency - vehicle breakdown',
        'Accident occurred, need assistance',
        'Medical emergency',
        'Unable to complete deliveries due to emergency'
      ];

      for (const emergency of emergencyScenarios) {
        // Act
        await environment.voiceManager.startListening('tap-to-speak');
        environment.simulateVoiceInput(emergency, 0.95);

        // Wait for safety alert
        const safetyEvent = await waitForEvent(environment, 'safety_alert', 3000);

        // Assert
        expect(safetyEvent).toBeDefined();
        expect(safetyEvent.data.priority).toBe('high');
        expect(safetyEvent.data.type).toBe('emergency');

        // Verify emergency protocols were triggered
        const emergencyEvents = environment.getEventsOfType('emergency');
        expect(emergencyEvents.length).toBeGreaterThan(0);

        // Clear events for next scenario
        environment.clearEventLog();
      }
    });

    it('should handle complex multi-modal conversations', async () => {
      // Arrange - Start complex conversation mixing voice and chat
      const conversationFlow = [
        { mode: 'chat', input: 'What deliveries do I have?', expectResponse: true },
        { mode: 'voice', input: 'Tell me about the first one', expectResponse: true },
        { mode: 'chat', input: 'What is the customer address?', expectResponse: true },
        { mode: 'voice', input: 'Navigate there', expectResponse: true },
        { mode: 'chat', input: 'Send quick message on the way', expectResponse: true },
        { mode: 'voice', input: 'Call customer', expectResponse: true }
      ];

      // Act - Execute conversation flow
      for (const step of conversationFlow) {
        if (step.mode === 'voice') {
          environment.chatManager.switchToVoiceMode();
          await environment.voiceManager.startListening('tap-to-speak');
          environment.simulateVoiceInput(step.input, 0.9);
          
          if (step.expectResponse) {
            await waitForEvent(environment, 'intent_processed', 3000);
          }
        } else {
          environment.chatManager.switchToChatMode();
          const response = await environment.chatManager.sendMessage(step.input);
          
          if (step.expectResponse) {
            expect(response).toBeDefined();
            expect(response.text.length).toBeGreaterThan(0);
          }
        }
      }

      // Assert - Verify context was preserved throughout
      const history = environment.chatManager.getConversationHistory();
      expect(history.length).toBeGreaterThanOrEqual(conversationFlow.length * 2);

      // Verify mode switches were handled correctly
      const modeEvents = environment.getEventsOfType('mode_switch');
      expect(modeEvents.length).toBeGreaterThan(0);
    });

    it('should handle network disruption and recovery scenarios', async () => {
      // Arrange - Start with good connection
      const initialResponse = await environment.chatManager.sendMessage('What is my delivery status?');
      expect(initialResponse.text).not.toContain('error');

      // Act - Simulate network disruption
      environment.simulateNetworkConditions(false, 0);

      // Try operations while offline
      const offlineResponse = await environment.chatManager.sendMessage('Send status update');
      expect(offlineResponse.text).toContain('offline');

      // Simulate network recovery
      environment.simulateNetworkConditions(true, 100);

      // Verify recovery
      const recoveryResponse = await environment.chatManager.sendMessage('What is my next delivery?');
      expect(recoveryResponse.text).not.toContain('error');

      // Assert - Check recovery events
      const networkEvents = environment.getEventsOfType('network');
      const recoveryEvents = networkEvents.filter(e => e.data.status === 'recovered');
      expect(recoveryEvents.length).toBeGreaterThan(0);
    });

    it('should handle concurrent operations from multiple interfaces', async () => {
      // Arrange - Prepare concurrent operations
      const operations = [
        () => environment.chatManager.sendMessage('What is my delivery status?'),
        () => environment.apiClient.syncDeliveryData(),
        () => environment.chatManager.sendMessage('Navigate to next stop'),
        () => environment.apiClient.sendStatusUpdate({
          orderId: 'concurrent_test',
          status: 'delivered',
          timestamp: new Date()
        }),
        () => environment.chatManager.sendMessage('Call customer')
      ];

      // Act - Execute all operations concurrently
      const startTime = Date.now();
      const results = await Promise.allSettled(operations.map(op => op()));
      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(operations.length);
      
      // Most operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThanOrEqual(3);

      // Should handle concurrency efficiently
      expect(duration).toBeLessThan(8000);

      // Verify system remained stable
      const errorEvents = environment.getEventsOfType('error');
      const criticalErrors = errorEvents.filter(e => e.data.severity === 'critical');
      expect(criticalErrors.length).toBe(0);
    });
  });

  describe('System Resilience and Recovery', () => {
    it('should recover from service failures gracefully', async () => {
      // Arrange - Simulate various service failures
      const failureScenarios = [
        { service: 'voice', failure: 'recognition_timeout' },
        { service: 'api', failure: 'authentication_expired' },
        { service: 'intent', failure: 'processing_error' },
        { service: 'network', failure: 'connection_lost' }
      ];

      for (const scenario of failureScenarios) {
        // Act - Simulate failure
        switch (scenario.service) {
          case 'voice':
            // Simulate voice recognition timeout
            await environment.voiceManager.startListening('tap-to-speak');
            // Don't provide input - should timeout
            break;
          
          case 'api':
            // Simulate auth expiration
            environment.simulateAuthFailure(true);
            await expect(environment.apiClient.syncDeliveryData()).rejects.toThrow();
            break;
          
          case 'intent':
            // Simulate processing error with malformed input
            await environment.chatManager.sendMessage('');
            break;
          
          case 'network':
            // Simulate network loss
            environment.simulateNetworkConditions(false, 0);
            await expect(environment.apiClient.getConfiguration()).rejects.toThrow();
            break;
        }

        // Assert - Verify recovery mechanisms
        const errorEvents = environment.getEventsOfType('error');
        const recoveryEvents = environment.getEventsOfType('recovery');
        
        expect(errorEvents.length).toBeGreaterThan(0);
        
        // System should attempt recovery
        if (scenario.service !== 'intent') {
          expect(recoveryEvents.length).toBeGreaterThan(0);
        }

        // Reset for next scenario
        environment.simulateAuthFailure(false);
        environment.simulateNetworkConditions(true, 100);
        environment.clearEventLog();
      }
    });

    it('should maintain data integrity during failures', async () => {
      // Arrange - Create initial state
      await environment.chatManager.sendMessage('What is my delivery status?');
      const initialHistory = environment.chatManager.getConversationHistory();
      const initialContext = environment.intentProcessor.getCurrentContext();

      // Act - Simulate various failures
      environment.simulateNetworkConditions(false, 0);
      
      // Try operations that should fail
      await expect(environment.apiClient.syncDeliveryData()).rejects.toThrow();
      
      // Try operations that should work offline
      const offlineResponse = await environment.chatManager.sendMessage('What deliveries do I have cached?');
      
      // Restore network
      environment.simulateNetworkConditions(true, 100);

      // Assert - Data integrity maintained
      const finalHistory = environment.chatManager.getConversationHistory();
      const finalContext = environment.intentProcessor.getCurrentContext();

      // History should be preserved and extended
      expect(finalHistory.length).toBeGreaterThan(initialHistory.length);
      for (let i = 0; i < initialHistory.length; i++) {
        expect(finalHistory[i]).toEqual(initialHistory[i]);
      }

      // Context should be preserved
      expect(finalContext.partnerId).toBe(initialContext.partnerId);
      expect(finalContext.currentDeliveries).toEqual(initialContext.currentDeliveries);
    });

    it('should handle resource exhaustion gracefully', async () => {
      // Arrange - Simulate resource pressure
      const heavyOperations = Array.from({ length: 20 }, (_, i) => 
        () => environment.chatManager.sendMessage(`Heavy operation ${i}: What is my delivery status with lots of details and context?`)
      );

      // Act - Execute operations rapidly
      const results = await Promise.allSettled(
        heavyOperations.map(async (op, index) => {
          // Slight stagger to simulate rapid but not simultaneous requests
          await new Promise(resolve => setTimeout(resolve, index * 10));
          return await op();
        })
      );

      // Assert - System should handle gracefully
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      // Most should succeed, but some failures are acceptable under pressure
      expect(successful.length).toBeGreaterThan(heavyOperations.length * 0.7);

      // Failures should be graceful, not crashes
      failed.forEach(failure => {
        expect(failure.reason).toHaveProperty('message');
      });

      // System should remain responsive
      const finalResponse = await environment.chatManager.sendMessage('Simple status check');
      expect(finalResponse).toBeDefined();
    });

    it('should maintain performance under sustained load', async () => {
      // Arrange - Prepare sustained operations
      const sustainedDuration = 5000; // 5 seconds
      const operationInterval = 200; // Every 200ms
      const operations: Array<() => Promise<any>> = [
        () => environment.chatManager.sendMessage('Status check'),
        () => environment.apiClient.ping(),
        () => environment.chatManager.sendMessage('Quick delivery info'),
      ];

      // Act - Run sustained operations
      const startTime = Date.now();
      const results: any[] = [];
      
      while (Date.now() - startTime < sustainedDuration) {
        const operation = operations[results.length % operations.length];
        try {
          const result = await operation();
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error });
        }
        
        await new Promise(resolve => setTimeout(resolve, operationInterval));
      }

      // Assert - Performance should remain stable
      const successRate = results.filter(r => r.success).length / results.length;
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate minimum

      // Response times should not degrade significantly
      const memoryAfter = await environment.measureMemoryUsage();
      expect(memoryAfter.used).toBeLessThan(200); // Should not consume excessive memory
    });
  });

  describe('Cross-Component Integration', () => {
    it('should coordinate between all major components seamlessly', async () => {
      // Arrange - Test coordination between Voice, Chat, Intent, Domain, API, and Safety
      const coordinationTest = async (input: string, mode: 'voice' | 'chat') => {
        if (mode === 'voice') {
          await environment.voiceManager.startListening('tap-to-speak');
          environment.simulateVoiceInput(input, 0.9);
          return await waitForEvent(environment, 'intent_processed', 3000);
        } else {
          return await environment.chatManager.sendMessage(input);
        }
      };

      // Act - Test various coordination scenarios
      const scenarios = [
        { input: 'What is my next delivery?', mode: 'voice' as const, expectsAPI: true },
        { input: 'Navigate to pickup location', mode: 'chat' as const, expectsAPI: false },
        { input: 'Send message reached pickup', mode: 'voice' as const, expectsAPI: true },
        { input: 'Emergency - need help', mode: 'chat' as const, expectsSafety: true },
        { input: 'What is the weather today?', mode: 'voice' as const, expectsDomain: true }
      ];

      for (const scenario of scenarios) {
        environment.clearEventLog();
        
        const result = await coordinationTest(scenario.input, scenario.mode);
        expect(result).toBeDefined();

        const events = environment.getEventLog();

        // Verify expected component interactions
        if (scenario.expectsAPI) {
          const apiEvents = events.filter(e => e.event.includes('api') || e.event.includes('sync'));
          expect(apiEvents.length).toBeGreaterThan(0);
        }

        if (scenario.expectsSafety) {
          const safetyEvents = events.filter(e => e.event.includes('safety') || e.event.includes('emergency'));
          expect(safetyEvents.length).toBeGreaterThan(0);
        }

        if (scenario.expectsDomain) {
          const domainEvents = events.filter(e => e.event.includes('domain_violation'));
          expect(domainEvents.length).toBeGreaterThan(0);
        }
      }
    });

    it('should maintain state consistency across all components', async () => {
      // Arrange - Perform operations that affect multiple components
      await environment.chatManager.sendMessage('What deliveries do I have?');
      
      // Update context through API
      const newContext = environment.generateRandomDeliveryScenario();
      environment.intentProcessor.updateContext(newContext);
      environment.chatManager.updateDeliveryContext(newContext);

      // Act - Verify all components reflect the update
      const chatResponse = await environment.chatManager.sendMessage('What is my current delivery?');
      
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput('Tell me about my next stop', 0.9);
      const voiceEvent = await waitForEvent(environment, 'intent_processed', 3000);

      // Assert - All components should have consistent state
      expect(chatResponse.text).toContain(newContext.currentDeliveries[0].id);
      expect(voiceEvent.data.context.partnerId).toBe(newContext.partnerId);

      // Verify context synchronization events
      const syncEvents = environment.getEventsOfType('context_updated');
      expect(syncEvents.length).toBeGreaterThan(0);
    });

    it('should handle component initialization and shutdown properly', async () => {
      // Act - Test component lifecycle
      const newEnvironment = createIntegrationTestEnvironment();
      
      // Verify initialization
      await newEnvironment.initialize();
      expect(newEnvironment.apiClient.isAuthenticated()).toBe(true);
      
      // Test basic functionality
      const response = await newEnvironment.chatManager.sendMessage('Test initialization');
      expect(response).toBeDefined();

      // Test shutdown
      await newEnvironment.cleanup();
      
      // Verify cleanup
      const finalEvents = newEnvironment.getEventLog();
      const cleanupEvents = finalEvents.filter(e => e.event.includes('cleanup') || e.event.includes('shutdown'));
      expect(cleanupEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Property-Based Integration Testing', () => {
    /**
     * Property: System Stability Under Random Operations
     * For any sequence of valid operations, the system should remain stable and functional.
     */
    it('should maintain stability under random operation sequences', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              type: fc.oneof(
                fc.constant('voice_command'),
                fc.constant('chat_message'),
                fc.constant('api_call'),
                fc.constant('mode_switch'),
                fc.constant('context_update')
              ),
              data: fc.oneof(
                fc.constant('What is my delivery status?'),
                fc.constant('Navigate to next stop'),
                fc.constant('Send quick message'),
                fc.constant('Call customer')
              )
            }),
            { minLength: 3, maxLength: 10 }
          ),
          async (operations) => {
            // Arrange
            environment.clearEventLog();
            const initialMemory = await environment.measureMemoryUsage();

            // Act - Execute random operation sequence
            for (const operation of operations) {
              try {
                switch (operation.type) {
                  case 'voice_command':
                    await environment.voiceManager.startListening('tap-to-speak');
                    environment.simulateVoiceInput(operation.data, 0.9);
                    await waitForEvent(environment, 'intent_processed', 2000);
                    break;
                  
                  case 'chat_message':
                    await environment.chatManager.sendMessage(operation.data);
                    break;
                  
                  case 'api_call':
                    await environment.apiClient.syncDeliveryData();
                    break;
                  
                  case 'mode_switch':
                    if (Math.random() > 0.5) {
                      environment.chatManager.switchToVoiceMode();
                    } else {
                      environment.chatManager.switchToChatMode();
                    }
                    break;
                  
                  case 'context_update':
                    const newContext = environment.generateRandomDeliveryScenario();
                    environment.intentProcessor.updateContext(newContext);
                    break;
                }
              } catch (error) {
                // Some operations may fail, but system should remain stable
              }
              
              // Brief pause between operations
              await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Assert - System should remain stable
            const finalMemory = await environment.measureMemoryUsage();
            const memoryIncrease = finalMemory.used - initialMemory.used;
            expect(memoryIncrease).toBeLessThan(100); // Should not leak significant memory

            // System should still be responsive
            const testResponse = await environment.chatManager.sendMessage('System status check');
            expect(testResponse).toBeDefined();
            expect(testResponse.text.length).toBeGreaterThan(0);

            // No critical errors should have occurred
            const events = environment.getEventLog();
            const criticalErrors = events.filter(e => 
              e.event.includes('error') && e.data.severity === 'critical'
            );
            expect(criticalErrors.length).toBe(0);
          }
        ),
        { numRuns: 8 }
      );
    });

    /**
     * Property: Data Consistency Across Components
     * For any data update, all components should eventually reflect the same state.
     */
    it('should maintain data consistency across all components', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            partnerId: fc.string({ minLength: 5, maxLength: 15 }),
            deliveryCount: fc.integer({ min: 0, max: 5 }),
            updateType: fc.oneof(
              fc.constant('delivery_status'),
              fc.constant('location_update'),
              fc.constant('route_change')
            )
          }),
          async (contextUpdate) => {
            // Arrange - Create consistent context
            const testContext = environment.generateRandomDeliveryScenario();
            testContext.partnerId = contextUpdate.partnerId;
            testContext.currentDeliveries = testContext.currentDeliveries.slice(0, contextUpdate.deliveryCount);

            // Act - Update context across components
            environment.intentProcessor.updateContext(testContext);
            environment.chatManager.updateDeliveryContext(testContext);

            // Verify consistency through different interfaces
            const chatResponse = await environment.chatManager.sendMessage('What is my partner ID?');
            
            await environment.voiceManager.startListening('tap-to-speak');
            environment.simulateVoiceInput('How many deliveries do I have?', 0.9);
            const voiceEvent = await waitForEvent(environment, 'intent_processed', 3000);

            // Assert - All components should reflect the same data
            expect(chatResponse.text).toContain(contextUpdate.partnerId);
            expect(voiceEvent.data.context.partnerId).toBe(contextUpdate.partnerId);
            expect(voiceEvent.data.context.currentDeliveries.length).toBe(contextUpdate.deliveryCount);

            // Verify no data corruption occurred
            const currentContext = environment.intentProcessor.getCurrentContext();
            expect(currentContext.partnerId).toBe(contextUpdate.partnerId);
            expect(currentContext.currentDeliveries.length).toBe(contextUpdate.deliveryCount);
          }
        ),
        { numRuns: 12 }
      );
    });

    /**
     * Property: Error Recovery Completeness
     * For any error condition, the system should recover to a functional state.
     */
    it('should recover completely from any error condition', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            errorType: fc.oneof(
              fc.constant('network_failure'),
              fc.constant('auth_failure'),
              fc.constant('processing_error'),
              fc.constant('timeout_error')
            ),
            recoveryDelay: fc.integer({ min: 100, max: 1000 })
          }),
          async (errorScenario) => {
            // Arrange - Establish baseline functionality
            const baselineResponse = await environment.chatManager.sendMessage('Baseline test');
            expect(baselineResponse).toBeDefined();

            // Act - Introduce error condition
            switch (errorScenario.errorType) {
              case 'network_failure':
                environment.simulateNetworkConditions(false, 0);
                break;
              case 'auth_failure':
                environment.simulateAuthFailure(true);
                break;
              case 'processing_error':
                // Simulate by sending malformed input
                break;
              case 'timeout_error':
                environment.simulateNetworkConditions(true, 5000);
                break;
            }

            // Wait for error to manifest
            await new Promise(resolve => setTimeout(resolve, errorScenario.recoveryDelay));

            // Simulate recovery
            environment.simulateNetworkConditions(true, 100);
            environment.simulateAuthFailure(false);
            
            if (errorScenario.errorType === 'auth_failure') {
              await environment.authenticateWithMockSystem();
            }

            // Assert - System should be fully functional again
            const recoveryResponse = await environment.chatManager.sendMessage('Recovery test');
            expect(recoveryResponse).toBeDefined();
            expect(recoveryResponse.text).not.toContain('error');

            // Verify all major functions work
            const apiTest = await environment.apiClient.ping();
            expect(apiTest.success).toBe(true);

            await environment.voiceManager.startListening('tap-to-speak');
            environment.simulateVoiceInput('Test voice recovery', 0.9);
            const voiceRecovery = await waitForEvent(environment, 'intent_processed', 3000);
            expect(voiceRecovery).toBeDefined();
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});