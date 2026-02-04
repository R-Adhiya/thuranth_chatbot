/**
 * Chat-to-Action Integration Tests
 * 
 * Tests complete chat interface workflows including:
 * - Text input → Intent processing → Action execution
 * - Context preservation across mode switches
 * - Conversation history management
 * - Real-world chat scenarios
 */

import fc from 'fast-check';
import { 
  IntegrationTestEnvironment, 
  createIntegrationTestEnvironment, 
  waitForEvent, 
  waitForCondition 
} from './setup';
import { ChatMessage } from '@/types';

describe('Chat-to-Action Integration Tests', () => {
  let environment: IntegrationTestEnvironment;

  beforeEach(async () => {
    environment = createIntegrationTestEnvironment();
    await environment.initialize();
  });

  afterEach(async () => {
    await environment.cleanup();
  });

  describe('Complete Chat Command Workflows', () => {
    it('should process delivery status query through chat interface', async () => {
      // Arrange
      const chatMessage = "What is my next delivery?";
      
      // Act
      const response = await environment.chatManager.sendMessage(chatMessage);
      
      // Assert
      expect(response).toBeDefined();
      expect(response.sender).toBe('agent');
      expect(response.text).toContain('Order');
      expect(response.intent?.type).toBe('delivery_status');
      
      // Verify conversation history
      const history = environment.chatManager.getConversationHistory();
      expect(history).toHaveLength(2); // User message + agent response
      expect(history[0].text).toBe(chatMessage);
      expect(history[1]).toEqual(response);
    });

    it('should handle navigation requests through chat', async () => {
      // Arrange
      const chatMessage = "Navigate to next stop";
      
      // Act
      const response = await environment.chatManager.sendMessage(chatMessage);
      
      // Assert
      expect(response.intent?.type).toBe('navigation');
      expect(response.intent?.action).toBe('navigate_to_next_stop');
      expect(response.text).toContain('Navigate to');
      
      // Verify navigation action was processed
      const events = environment.getEventLog();
      const navigationEvents = events.filter(e => e.event.includes('navigation'));
      expect(navigationEvents.length).toBeGreaterThan(0);
    });

    it('should process quick message requests through chat', async () => {
      // Arrange
      const chatMessage = "Send message reached pickup location";
      
      // Act
      const response = await environment.chatManager.sendMessage(chatMessage);
      
      // Assert
      expect(response.intent?.type).toBe('quick_message');
      expect(response.text).toContain('Sent:');
      expect(response.text).toContain('Reached pickup location');
      
      // Verify message was sent to host system
      const statusUpdates = environment.mockHostSystem.getStatusUpdates();
      expect(statusUpdates.length).toBeGreaterThan(0);
    });

    it('should handle customer communication through chat', async () => {
      // Arrange
      const chatMessage = "Show me customer contact information";
      
      // Act
      const response = await environment.chatManager.sendMessage(chatMessage);
      
      // Assert
      expect(response.intent?.type).toBe('communication');
      expect(response.text).toContain('Customer:');
      expect(response.text).toContain('Phone:');
    });

    it('should handle multi-turn conversations', async () => {
      // Arrange & Act
      const conversation = [
        { user: "What deliveries do I have today?", expectedType: 'delivery_status' },
        { user: "Tell me about the first one", expectedType: 'delivery_status' },
        { user: "Navigate there", expectedType: 'navigation' },
        { user: "Call the customer", expectedType: 'communication' }
      ];
      
      const responses: ChatMessage[] = [];
      
      for (const turn of conversation) {
        const response = await environment.chatManager.sendMessage(turn.user);
        responses.push(response);
        
        // Assert each response
        expect(response.intent?.type).toBe(turn.expectedType);
      }
      
      // Verify conversation history maintains context
      const history = environment.chatManager.getConversationHistory();
      expect(history).toHaveLength(conversation.length * 2); // User + agent messages
      
      // Verify context is maintained across turns
      const contextEvents = environment.getEventsOfType('context_updated');
      expect(contextEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Context Preservation and Mode Switching', () => {
    it('should preserve context when switching from voice to chat', async () => {
      // Arrange - Start with voice interaction
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput("What is my next delivery?", 0.95);
      await waitForEvent(environment, 'intent_processed', 3000);
      
      // Act - Switch to chat mode
      environment.chatManager.switchToChatMode();
      const chatResponse = await environment.chatManager.sendMessage("Tell me more about that delivery");
      
      // Assert
      expect(chatResponse).toBeDefined();
      expect(chatResponse.text).toContain('Order'); // Should have delivery context
      
      // Verify context preservation
      const contextEvents = environment.getEventsOfType('context_updated');
      const preservationEvents = contextEvents.filter(e => e.data.contextPreserved);
      expect(preservationEvents.length).toBeGreaterThan(0);
    });

    it('should preserve context when switching from chat to voice', async () => {
      // Arrange - Start with chat interaction
      await environment.chatManager.sendMessage("Show me my delivery status");
      
      // Act - Switch to voice mode and continue conversation
      environment.chatManager.switchToVoiceMode();
      await environment.voiceManager.startListening('tap-to-speak');
      environment.simulateVoiceInput("Navigate to that location", 0.90);
      
      const intentEvent = await waitForEvent(environment, 'intent_processed', 3000);
      
      // Assert
      expect(intentEvent.data.intent.type).toBe('navigation');
      
      // Verify context was preserved across modes
      const contextEvents = environment.getEventsOfType('context_updated');
      const modeTransitions = contextEvents.filter(e => e.data.mode === 'voice');
      expect(modeTransitions.length).toBeGreaterThan(0);
    });

    it('should maintain conversation history across mode switches', async () => {
      // Arrange - Build conversation history in chat
      await environment.chatManager.sendMessage("What deliveries do I have?");
      await environment.chatManager.sendMessage("Show me the first one");
      
      const initialHistory = environment.chatManager.getConversationHistory();
      
      // Act - Switch to voice and back to chat
      environment.chatManager.switchToVoiceMode();
      environment.chatManager.switchToChatMode();
      
      const finalHistory = environment.chatManager.getConversationHistory();
      
      // Assert
      expect(finalHistory).toHaveLength(initialHistory.length);
      expect(finalHistory).toEqual(initialHistory);
    });

    it('should merge contexts from different modes seamlessly', async () => {
      // Arrange - Create messages in both modes
      const chatMessages = [
        await environment.chatManager.sendMessage("What is my status?")
      ];
      
      // Simulate voice messages (would come from voice mode)
      const voiceMessages: ChatMessage[] = [
        {
          id: 'voice_1',
          text: 'Navigate to next stop',
          sender: 'user',
          timestamp: new Date(),
        },
        {
          id: 'voice_2', 
          text: 'Navigation started to 456 Oak Ave',
          sender: 'agent',
          timestamp: new Date(),
        }
      ];
      
      // Act - Merge contexts
      environment.chatManager.mergeContextsFromModes(voiceMessages, chatMessages);
      
      // Assert
      const mergedHistory = environment.chatManager.getConversationHistory();
      expect(mergedHistory.length).toBeGreaterThan(chatMessages.length);
      
      // Verify chronological order is maintained
      for (let i = 1; i < mergedHistory.length; i++) {
        expect(mergedHistory[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          mergedHistory[i - 1].timestamp.getTime()
        );
      }
    });
  });

  describe('Error Handling in Chat Interface', () => {
    it('should handle empty messages gracefully', async () => {
      // Act & Assert
      await expect(environment.chatManager.sendMessage("")).rejects.toThrow('Message text cannot be empty');
      await expect(environment.chatManager.sendMessage("   ")).rejects.toThrow('Message text cannot be empty');
    });

    it('should handle intent processing errors', async () => {
      // Arrange - Simulate network failure
      environment.simulateNetworkConditions(false, 0);
      
      // Act
      const response = await environment.chatManager.sendMessage("What is my delivery status?");
      
      // Assert
      expect(response.text).toContain('error processing');
      expect(response.sender).toBe('agent');
      
      // Verify error was logged
      const events = environment.getEventLog();
      const errorEvents = events.filter(e => e.event.includes('error'));
      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it('should handle domain violations in chat', async () => {
      // Arrange
      const offTopicMessage = "What's the weather like today?";
      
      // Act
      const response = await environment.chatManager.sendMessage(offTopicMessage);
      
      // Assert
      expect(response.text).toContain('delivery-related tasks');
      
      // Verify domain violation was logged
      const domainEvents = environment.getEventsOfType('domain_violation');
      expect(domainEvents.length).toBeGreaterThan(0);
    });

    it('should recover from API failures gracefully', async () => {
      // Arrange - Simulate API failure then recovery
      environment.simulateAuthFailure(true);
      
      // Act - First message should fail
      const failedResponse = await environment.chatManager.sendMessage("Send status update");
      expect(failedResponse.text).toContain('error');
      
      // Simulate recovery
      environment.simulateAuthFailure(false);
      await environment.authenticateWithMockSystem();
      
      // Second message should succeed
      const successResponse = await environment.chatManager.sendMessage("What is my next delivery?");
      expect(successResponse.text).not.toContain('error');
      expect(successResponse.intent?.type).toBe('delivery_status');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle rapid message sequences efficiently', async () => {
      // Arrange
      const messages = [
        "What is my status?",
        "Show next delivery",
        "Get customer info",
        "Navigate there",
        "Send quick message"
      ];
      
      // Act
      const startTime = Date.now();
      const responses = await Promise.all(
        messages.map(msg => environment.chatManager.sendMessage(msg))
      );
      const duration = Date.now() - startTime;
      
      // Assert
      expect(responses).toHaveLength(messages.length);
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.sender).toBe('agent');
      });
      expect(duration).toBeLessThan(5000); // Should handle concurrent messages efficiently
    });

    it('should maintain performance with large conversation history', async () => {
      // Arrange - Build large conversation history
      for (let i = 0; i < 50; i++) {
        await environment.chatManager.sendMessage(`Message ${i}: What is my delivery status?`);
      }
      
      // Act - Measure performance of new message
      const { result, duration } = await environment.measureResponseTime(async () => {
        return await environment.chatManager.sendMessage("What is my next delivery?");
      });
      
      // Assert
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should not degrade significantly with history
      
      const history = environment.chatManager.getConversationHistory();
      expect(history.length).toBe(102); // 50 * 2 + 2 (user + agent messages)
    });

    it('should handle context expiration appropriately', async () => {
      // Arrange - Create conversation
      await environment.chatManager.sendMessage("What is my delivery status?");
      
      // Act - Check if context is stale (simulate time passage)
      const isStale = environment.chatManager.isContextStale(0.01); // Very short timeout
      
      // Assert
      expect(isStale).toBe(true);
      
      // Verify refresh behavior
      const refreshed = environment.chatManager.refreshContextIfStale(0.01);
      expect(refreshed).toBe(true);
      
      const contextEvents = environment.getEventsOfType('context_updated');
      const refreshEvents = contextEvents.filter(e => e.data.action === 'context_refreshed');
      expect(refreshEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Advanced Chat Features', () => {
    it('should provide contextual suggestions', async () => {
      // Arrange - Set up delivery context
      await environment.chatManager.sendMessage("What deliveries do I have?");
      
      // Act
      const suggestions = environment.chatManager.getSuggestedResponses();
      
      // Assert
      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain("What's my delivery status?");
    });

    it('should handle voice input integration in chat mode', async () => {
      // Arrange
      const voiceTranscript = "Navigate to next delivery location";
      const confidence = 0.85;
      
      // Act
      const response = await environment.chatManager.handleVoiceInput(voiceTranscript, confidence);
      
      // Assert
      expect(response.intent?.type).toBe('navigation');
      expect(response.text).toContain('Navigate to');
      
      // Verify it was added to conversation history
      const history = environment.chatManager.getConversationHistory();
      expect(history.some(msg => msg.text === voiceTranscript)).toBe(true);
    });

    it('should handle low confidence voice input appropriately', async () => {
      // Arrange
      const voiceTranscript = "unclear mumbled command";
      const lowConfidence = 0.3;
      
      // Act
      const response = await environment.chatManager.handleVoiceInput(voiceTranscript, lowConfidence);
      
      // Assert
      expect(response.text).toContain("didn't catch that clearly");
      expect(response.sender).toBe('agent');
    });

    it('should export and import conversation data', async () => {
      // Arrange - Build conversation
      await environment.chatManager.sendMessage("What is my status?");
      await environment.chatManager.sendMessage("Show next delivery");
      
      // Act - Export
      const exportedData = environment.chatManager.exportConversation();
      
      // Clear and import
      environment.chatManager.clearHistory();
      expect(environment.chatManager.getConversationHistory()).toHaveLength(0);
      
      environment.chatManager.importConversation(exportedData);
      
      // Assert
      const importedHistory = environment.chatManager.getConversationHistory();
      expect(importedHistory).toHaveLength(4); // 2 user + 2 agent messages
      expect(importedHistory).toEqual(exportedData.messages);
    });

    it('should provide conversation statistics', async () => {
      // Arrange - Build varied conversation
      await environment.chatManager.sendMessage("What is my status?");
      await environment.chatManager.sendMessage("Navigate to next stop");
      await environment.chatManager.sendMessage("Call customer");
      
      // Act
      const stats = environment.chatManager.getConversationStats();
      
      // Assert
      expect(stats.messageCount).toBe(6); // 3 user + 3 agent
      expect(stats.userMessages).toBe(3);
      expect(stats.agentMessages).toBe(3);
      expect(stats.topicsDiscussed).toContain('delivery_status');
      expect(stats.topicsDiscussed).toContain('navigation');
      expect(stats.topicsDiscussed).toContain('communication');
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Property-Based Chat Testing', () => {
    /**
     * Property: Chat Message Processing Consistency
     * For any valid delivery-related text message, the system should process it consistently
     * and maintain conversation state properly.
     */
    it('should process chat messages consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('What is my next delivery?'),
            fc.constant('Show delivery status'),
            fc.constant('Navigate to next stop'),
            fc.constant('Call customer'),
            fc.constant('Send quick message')
          ),
          async (message) => {
            // Arrange
            const initialHistoryLength = environment.chatManager.getConversationHistory().length;
            
            // Act
            const response = await environment.chatManager.sendMessage(message);
            
            // Assert
            expect(response).toBeDefined();
            expect(response.sender).toBe('agent');
            expect(response.intent).toBeDefined();
            
            // Verify conversation history updated correctly
            const newHistory = environment.chatManager.getConversationHistory();
            expect(newHistory.length).toBe(initialHistoryLength + 2); // User + agent message
          }
        ),
        { numRuns: 15 }
      );
    });

    /**
     * Property: Context Preservation Across Mode Switches
     * For any sequence of mode switches, conversation context should be preserved.
     */
    it('should preserve context across mode switches consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.oneof(fc.constant('voice'), fc.constant('chat')), { minLength: 2, maxLength: 5 }),
          fc.constant('What is my delivery status?'),
          async (modeSequence, testMessage) => {
            // Arrange - Send initial message
            await environment.chatManager.sendMessage(testMessage);
            const initialHistory = environment.chatManager.getConversationHistory();
            
            // Act - Switch modes according to sequence
            for (const mode of modeSequence) {
              if (mode === 'voice') {
                environment.chatManager.switchToVoiceMode();
              } else {
                environment.chatManager.switchToChatMode();
              }
            }
            
            // Send another message to verify context
            await environment.chatManager.sendMessage("Tell me more");
            
            // Assert - History should be preserved and extended
            const finalHistory = environment.chatManager.getConversationHistory();
            expect(finalHistory.length).toBe(initialHistory.length + 2);
            
            // Original messages should still be there
            for (let i = 0; i < initialHistory.length; i++) {
              expect(finalHistory[i]).toEqual(initialHistory[i]);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property: Error Recovery in Chat
     * For any error condition, the chat interface should recover and remain functional.
     */
    it('should recover from errors consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            online: fc.boolean(),
            authFail: fc.boolean(),
            delay: fc.integer({ min: 0, max: 1000 })
          }),
          fc.constant('Send status update'),
          async (errorCondition, message) => {
            // Arrange
            environment.simulateNetworkConditions(errorCondition.online, errorCondition.delay);
            environment.simulateAuthFailure(errorCondition.authFail);
            
            // Act
            const response = await environment.chatManager.sendMessage(message);
            
            // Assert - Should always get a response, even if it's an error message
            expect(response).toBeDefined();
            expect(response.sender).toBe('agent');
            expect(typeof response.text).toBe('string');
            expect(response.text.length).toBeGreaterThan(0);
            
            // System should remain functional for subsequent messages
            const followupResponse = await environment.chatManager.sendMessage("What is my status?");
            expect(followupResponse).toBeDefined();
          }
        ),
        { numRuns: 12 }
      );
    });
  });
});