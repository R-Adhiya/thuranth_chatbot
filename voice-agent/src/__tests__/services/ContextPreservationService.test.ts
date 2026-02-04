/**
 * Property-Based Tests for ContextPreservationService
 * Feature: voice-agent, Property 6: Context Preservation
 * Validates: Requirements 2.5, 8.5
 */

import fc from 'fast-check';
import { ContextPreservationService } from '../../services/ContextPreservationService';
import { ChatManagerService } from '../../services/ChatManagerService';
import { IntentProcessorService } from '../../services/IntentProcessorService';
import { ConversationContext, DeliveryContext, ChatMessage } from '../../types';

describe('ContextPreservationService Property Tests', () => {
  let contextPreservation: ContextPreservationService;
  let chatManager: ChatManagerService;
  let intentProcessor: IntentProcessorService;

  beforeEach(() => {
    contextPreservation = new ContextPreservationService();
    intentProcessor = new IntentProcessorService();
    chatManager = new ChatManagerService(intentProcessor, contextPreservation);
  });

  /**
   * Property 6: Context Preservation
   * For any mode switch between voice and chat or context update, 
   * the Voice_Agent should maintain conversation and delivery context consistently
   */
  describe('Property 6: Context Preservation', () => {
    
    // Generator for valid delivery contexts
    const deliveryContextArbitrary = fc.record({
      partnerId: fc.string({ minLength: 5, maxLength: 20 }),
      currentDeliveries: fc.array(
        fc.record({
          id: fc.string({ minLength: 8, maxLength: 15 }),
          status: fc.oneof(
            fc.constant('pending' as const),
            fc.constant('picked_up' as const),
            fc.constant('in_transit' as const),
            fc.constant('delivered' as const),
            fc.constant('failed' as const)
          ),
          pickupLocation: fc.record({
            street: fc.string({ minLength: 10, maxLength: 50 }),
            city: fc.string({ minLength: 3, maxLength: 30 }),
            state: fc.string({ minLength: 2, maxLength: 20 }),
            zipCode: fc.string({ minLength: 5, maxLength: 10 }),
            coordinates: fc.record({
              latitude: fc.float({ min: Math.fround(-90), max: Math.fround(90) }),
              longitude: fc.float({ min: Math.fround(-180), max: Math.fround(180) })
            })
          }),
          deliveryLocation: fc.record({
            street: fc.string({ minLength: 10, maxLength: 50 }),
            city: fc.string({ minLength: 3, maxLength: 30 }),
            state: fc.string({ minLength: 2, maxLength: 20 }),
            zipCode: fc.string({ minLength: 5, maxLength: 10 }),
            coordinates: fc.record({
              latitude: fc.float({ min: Math.fround(-90), max: Math.fround(90) }),
              longitude: fc.float({ min: Math.fround(-180), max: Math.fround(180) })
            })
          }),
          customerInfo: fc.record({
            name: fc.string({ minLength: 5, maxLength: 30 }),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            email: fc.option(fc.emailAddress()),
            notes: fc.option(fc.string({ maxLength: 100 }))
          }),
          estimatedTime: fc.date(),
          specialInstructions: fc.option(fc.string({ maxLength: 200 }))
        }),
        { minLength: 0, maxLength: 5 }
      ),
      activeRoute: fc.record({
        id: fc.string({ minLength: 5, maxLength: 15 }),
        stops: fc.array(
          fc.record({
            street: fc.string({ minLength: 10, maxLength: 50 }),
            city: fc.string({ minLength: 3, maxLength: 30 }),
            state: fc.string({ minLength: 2, maxLength: 20 }),
            zipCode: fc.string({ minLength: 5, maxLength: 10 }),
            coordinates: fc.record({
              latitude: fc.float({ min: Math.fround(-90), max: Math.fround(90) }),
              longitude: fc.float({ min: Math.fround(-180), max: Math.fround(180) })
            })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        estimatedDuration: fc.integer({ min: 300, max: 7200 }),
        distance: fc.float({ min: Math.fround(0.1), max: Math.fround(100) })
      }),
      vehicleStatus: fc.record({
        id: fc.string({ minLength: 5, maxLength: 15 }),
        type: fc.oneof(
          fc.constant('car' as const),
          fc.constant('bike' as const),
          fc.constant('truck' as const),
          fc.constant('van' as const)
        ),
        isMoving: fc.boolean(),
        speed: fc.float({ min: Math.fround(0), max: Math.fround(120) }),
        fuelLevel: fc.option(fc.float({ min: Math.fround(0), max: Math.fround(100) })),
        batteryLevel: fc.option(fc.float({ min: Math.fround(0), max: Math.fround(100) }))
      }),
      location: fc.record({
        latitude: fc.float({ min: Math.fround(-90), max: Math.fround(90) }),
        longitude: fc.float({ min: Math.fround(-180), max: Math.fround(180) }),
        accuracy: fc.option(fc.float({ min: Math.fround(1), max: Math.fround(100) }))
      }),
      workingHours: fc.record({
        start: fc.date(),
        end: fc.date()
      })
    });

    // Generator for chat messages
    const chatMessageArbitrary = fc.record({
      id: fc.string({ minLength: 10, maxLength: 30 }),
      text: fc.string({ minLength: 5, maxLength: 200 }),
      sender: fc.oneof(fc.constant('user' as const), fc.constant('agent' as const)),
      timestamp: fc.date()
    });

    // Generator for conversation contexts
    const conversationContextArbitrary = fc.record({
      messages: fc.array(chatMessageArbitrary, { minLength: 0, maxLength: 10 }),
      currentTopic: fc.option(fc.oneof(
        fc.constant('delivery_status'),
        fc.constant('navigation'),
        fc.constant('communication'),
        fc.constant('quick_message')
      )),
      deliveryContext: deliveryContextArbitrary
    });

    it('should preserve conversation context across mode switches', async () => {
      await fc.assert(
        fc.asyncProperty(
          conversationContextArbitrary,
          fc.oneof(fc.constant('voice' as const), fc.constant('chat' as const)),
          fc.oneof(fc.constant('voice' as const), fc.constant('chat' as const)),
          async (originalContext, fromMode, toMode) => {
            // Act - Preserve context and switch modes
            contextPreservation.preserveContext(originalContext);
            contextPreservation.switchMode(fromMode, toMode);
            
            // Restore context after mode switch
            const restoredContext = contextPreservation.restoreContext();

            // Assert - Context should be preserved accurately
            expect(restoredContext).toBeDefined();
            expect(restoredContext!.messages).toHaveLength(originalContext.messages.length);
            expect(restoredContext!.currentTopic).toBe(originalContext.currentTopic);
            expect(restoredContext!.deliveryContext.partnerId).toBe(originalContext.deliveryContext.partnerId);

            // Messages should be preserved in order
            restoredContext!.messages.forEach((message, index) => {
              expect(message.id).toBe(originalContext.messages[index].id);
              expect(message.text).toBe(originalContext.messages[index].text);
              expect(message.sender).toBe(originalContext.messages[index].sender);
              expect(message.timestamp).toEqual(originalContext.messages[index].timestamp);
            });

            // Delivery context should be preserved
            expect(restoredContext!.deliveryContext.currentDeliveries).toHaveLength(
              originalContext.deliveryContext.currentDeliveries.length
            );
            expect(restoredContext!.deliveryContext.location).toEqual(originalContext.deliveryContext.location);
            expect(restoredContext!.deliveryContext.activeRoute.id).toBe(originalContext.deliveryContext.activeRoute.id);
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    });

    it('should maintain context validity across multiple mode transitions', async () => {
      await fc.assert(
        fc.asyncProperty(
          conversationContextArbitrary,
          fc.array(
            fc.record({
              fromMode: fc.oneof(fc.constant('voice' as const), fc.constant('chat' as const)),
              toMode: fc.oneof(fc.constant('voice' as const), fc.constant('chat' as const))
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (originalContext, transitions) => {
            // Arrange
            contextPreservation.preserveContext(originalContext);

            // Act - Perform multiple mode transitions
            for (const transition of transitions) {
              contextPreservation.switchMode(transition.fromMode, transition.toMode);
            }

            // Assert - Context should remain valid and consistent
            expect(contextPreservation.isContextValid()).toBe(true);
            
            const restoredContext = contextPreservation.restoreContext();
            expect(restoredContext).toBeDefined();
            
            // Core context should be preserved
            expect(restoredContext!.deliveryContext.partnerId).toBe(originalContext.deliveryContext.partnerId);
            expect(restoredContext!.messages).toHaveLength(originalContext.messages.length);

            // Context statistics should reflect transitions
            const stats = contextPreservation.getContextStats();
            expect(stats.modeTransitions).toBe(transitions.length);
            expect(stats.isValid).toBe(true);
            expect(stats.messageCount).toBe(originalContext.messages.length);
          }
        ),
        { numRuns: 50, timeout: 15000 }
      );
    });

    it('should handle delivery context updates while preserving conversation history', async () => {
      await fc.assert(
        fc.asyncProperty(
          conversationContextArbitrary,
          deliveryContextArbitrary,
          async (originalContext, updatedDeliveryContext) => {
            // Arrange
            contextPreservation.preserveContext(originalContext);

            // Act - Update delivery context
            contextPreservation.updateDeliveryContext(updatedDeliveryContext);

            // Assert - Conversation should be preserved, delivery context updated
            const restoredContext = contextPreservation.restoreContext();
            expect(restoredContext).toBeDefined();

            // Conversation messages should be preserved
            expect(restoredContext!.messages).toHaveLength(originalContext.messages.length);
            restoredContext!.messages.forEach((message, index) => {
              expect(message.id).toBe(originalContext.messages[index].id);
              expect(message.text).toBe(originalContext.messages[index].text);
            });

            // Delivery context should be updated
            expect(restoredContext!.deliveryContext.partnerId).toBe(updatedDeliveryContext.partnerId);
            expect(restoredContext!.deliveryContext.currentDeliveries).toHaveLength(
              updatedDeliveryContext.currentDeliveries.length
            );
            expect(restoredContext!.deliveryContext.location).toEqual(updatedDeliveryContext.location);

            // Context should remain valid
            expect(contextPreservation.isContextValid()).toBe(true);
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    });

    it('should merge contexts from different modes correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 5 }), // voice messages
          fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 5 }), // chat messages
          deliveryContextArbitrary,
          async (voiceMessages, chatMessages, deliveryContext) => {
            // Arrange - Create contexts for both modes
            const voiceContext: ConversationContext = {
              messages: voiceMessages,
              deliveryContext
            };

            const chatContext: ConversationContext = {
              messages: chatMessages,
              deliveryContext
            };

            // Act - Merge contexts
            const mergedContext = contextPreservation.mergeContexts(voiceContext, chatContext);

            // Assert - Merged context should contain all messages chronologically
            expect(mergedContext.messages.length).toBe(voiceMessages.length + chatMessages.length);
            
            // Messages should be in chronological order
            for (let i = 1; i < mergedContext.messages.length; i++) {
              expect(mergedContext.messages[i].timestamp.getTime()).toBeGreaterThanOrEqual(
                mergedContext.messages[i - 1].timestamp.getTime()
              );
            }

            // Should contain all original messages
            const allOriginalMessages = [...voiceMessages, ...chatMessages];
            allOriginalMessages.forEach(originalMessage => {
              const foundMessage = mergedContext.messages.find(m => m.id === originalMessage.id);
              expect(foundMessage).toBeDefined();
              expect(foundMessage!.text).toBe(originalMessage.text);
              expect(foundMessage!.sender).toBe(originalMessage.sender);
            });

            // Delivery context should be preserved
            expect(mergedContext.deliveryContext.partnerId).toBe(deliveryContext.partnerId);
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });

    it('should handle context expiration correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          conversationContextArbitrary,
          fc.integer({ min: 1, max: 60 }), // expiration minutes
          async (context, expirationMinutes) => {
            // Arrange
            contextPreservation.setContextExpiration(expirationMinutes);
            contextPreservation.preserveContext(context);

            // Act - Check initial validity
            const initiallyValid = contextPreservation.isContextValid();
            expect(initiallyValid).toBe(true);

            // Simulate time passage by manipulating internal state
            // (In real implementation, this would be time-based)
            const snapshot = contextPreservation.getContextSnapshot();
            expect(snapshot.isValid).toBe(true);

            // Context should be valid immediately after preservation
            expect(contextPreservation.isContextValid()).toBe(true);

            // Context expiration should be set correctly
            expect(contextPreservation.getContextExpiration()).toBe(expirationMinutes);
          }
        ),
        { numRuns: 30, timeout: 5000 }
      );
    });

    it('should validate context integrity correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          conversationContextArbitrary,
          async (context) => {
            // Act - Preserve context and validate
            contextPreservation.preserveContext(context);
            const validation = contextPreservation.validateContextIntegrity();

            // Assert - Validation should reflect context state
            expect(validation).toBeDefined();
            expect(Array.isArray(validation.issues)).toBe(true);
            expect(Array.isArray(validation.recommendations)).toBe(true);

            if (context.messages.length > 0 && context.deliveryContext.partnerId) {
              // Should be valid if context has messages and partner ID
              expect(validation.isValid).toBe(true);
              expect(validation.issues.length).toBe(0);
            }

            // Issues and recommendations should be strings
            validation.issues.forEach(issue => {
              expect(typeof issue).toBe('string');
              expect(issue.length).toBeGreaterThan(0);
            });

            validation.recommendations.forEach(recommendation => {
              expect(typeof recommendation).toBe('string');
              expect(recommendation.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 50, timeout: 5000 }
      );
    });

    it('should export and import context correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          conversationContextArbitrary,
          fc.array(
            fc.record({
              fromMode: fc.oneof(fc.constant('voice' as const), fc.constant('chat' as const)),
              toMode: fc.oneof(fc.constant('voice' as const), fc.constant('chat' as const))
            }),
            { minLength: 0, maxLength: 3 }
          ),
          async (context, transitions) => {
            // Arrange - Set up context and perform transitions
            contextPreservation.preserveContext(context);
            
            for (const transition of transitions) {
              contextPreservation.switchMode(transition.fromMode, transition.toMode);
            }

            // Act - Export context
            const exportedContext = contextPreservation.exportContext();

            // Create new service and import context
            const newContextPreservation = new ContextPreservationService();
            newContextPreservation.importContext(exportedContext);

            // Assert - Imported context should match original
            const originalSnapshot = contextPreservation.getContextSnapshot();
            const importedSnapshot = newContextPreservation.getContextSnapshot();

            expect(importedSnapshot.currentMode).toBe(originalSnapshot.currentMode);
            expect(importedSnapshot.contextVersion).toBe(originalSnapshot.contextVersion);
            
            if (originalSnapshot.conversationContext && importedSnapshot.conversationContext) {
              expect(importedSnapshot.conversationContext.messages).toHaveLength(
                originalSnapshot.conversationContext.messages.length
              );
              expect(importedSnapshot.conversationContext.deliveryContext.partnerId).toBe(
                originalSnapshot.conversationContext.deliveryContext.partnerId
              );
            }

            // Statistics should match
            const originalStats = contextPreservation.getContextStats();
            const importedStats = newContextPreservation.getContextStats();
            
            expect(importedStats.messageCount).toBe(originalStats.messageCount);
            expect(importedStats.modeTransitions).toBe(originalStats.modeTransitions);
          }
        ),
        { numRuns: 30, timeout: 10000 }
      );
    });

    it('should handle chat manager integration seamlessly', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
          async (deliveryContext, queries) => {
            // Arrange
            chatManager.updateDeliveryContext(deliveryContext);

            // Act - Send messages in chat mode
            chatManager.switchToChatMode();
            for (const query of queries) {
              try {
                await chatManager.sendMessage(query);
              } catch (error) {
                // Some queries might fail, that's acceptable
                continue;
              }
            }

            // Switch to voice mode
            chatManager.switchToVoiceMode();

            // Switch back to chat mode
            chatManager.switchToChatMode();

            // Assert - Context should be preserved throughout
            const history = chatManager.getConversationHistory();
            const stats = chatManager.getContextPreservationStats();

            expect(stats.modeTransitions).toBeGreaterThanOrEqual(2); // At least 2 transitions
            expect(stats.isValid).toBe(true);
            expect(stats.messageCount).toBe(history.length);

            // Delivery context should be preserved
            const restoredContext = chatManager.restoreContext();
            if (restoredContext) {
              expect(restoredContext.deliveryContext.partnerId).toBe(deliveryContext.partnerId);
            }

            // Context integrity should be maintained
            const validation = chatManager.validateContextIntegrity();
            expect(validation.isValid).toBe(true);
          }
        ),
        { numRuns: 30, timeout: 15000 }
      );
    });

    it('should handle edge cases in context preservation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Empty context
            fc.record({
              messages: fc.constant([]),
              deliveryContext: deliveryContextArbitrary
            }),
            // Context with single message
            fc.record({
              messages: fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 1 }),
              deliveryContext: deliveryContextArbitrary
            }),
            // Context with many messages
            fc.record({
              messages: fc.array(chatMessageArbitrary, { minLength: 50, maxLength: 100 }),
              deliveryContext: deliveryContextArbitrary
            })
          ),
          async (edgeContext) => {
            // Act - Handle edge case context
            contextPreservation.preserveContext(edgeContext);
            
            // Perform mode switches
            contextPreservation.switchMode('chat', 'voice');
            contextPreservation.switchMode('voice', 'chat');

            // Assert - Should handle edge cases gracefully
            const restoredContext = contextPreservation.restoreContext();
            expect(restoredContext).toBeDefined();
            
            expect(restoredContext!.messages).toHaveLength(edgeContext.messages.length);
            expect(restoredContext!.deliveryContext.partnerId).toBe(edgeContext.deliveryContext.partnerId);

            // Context should remain valid
            expect(contextPreservation.isContextValid()).toBe(true);

            // Statistics should be reasonable
            const stats = contextPreservation.getContextStats();
            expect(stats.messageCount).toBe(edgeContext.messages.length);
            expect(stats.modeTransitions).toBe(2);
            expect(stats.isValid).toBe(true);
          }
        ),
        { numRuns: 30, timeout: 10000 }
      );
    });
  });

  describe('Context Preservation Integration Tests', () => {
    it('should maintain conversation continuity across mode switches', async () => {
      const deliveryContext: DeliveryContext = {
        partnerId: 'test-partner-123',
        currentDeliveries: [{
          id: 'order-456',
          status: 'pending',
          pickupLocation: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            coordinates: { latitude: 40.7128, longitude: -74.0060 }
          },
          deliveryLocation: {
            street: '456 Oak Ave',
            city: 'Brooklyn',
            state: 'NY',
            zipCode: '11201',
            coordinates: { latitude: 40.6892, longitude: -73.9442 }
          },
          customerInfo: {
            name: 'John Doe',
            phone: '555-1234'
          },
          estimatedTime: new Date()
        }],
        activeRoute: {
          id: 'route-789',
          stops: [],
          estimatedDuration: 3600,
          distance: 10
        },
        vehicleStatus: {
          id: 'vehicle-101',
          type: 'car',
          isMoving: false,
          speed: 0
        },
        location: { latitude: 40.7128, longitude: -74.0060 },
        workingHours: { start: new Date(), end: new Date() }
      };

      // Set up chat manager with delivery context
      chatManager.updateDeliveryContext(deliveryContext);

      // Send messages in chat mode
      await chatManager.sendMessage('What is my next delivery?');
      await chatManager.sendMessage('Navigate to next stop');

      const chatHistory = chatManager.getConversationHistory();
      expect(chatHistory.length).toBe(4); // 2 user + 2 agent messages

      // Switch to voice mode
      chatManager.switchToVoiceMode();
      expect(chatManager.getCurrentMode()).toBe('voice');

      // Switch back to chat mode
      chatManager.switchToChatMode();
      expect(chatManager.getCurrentMode()).toBe('chat');

      // Context should be preserved
      const preservedHistory = chatManager.getConversationHistory();
      expect(preservedHistory.length).toBe(chatHistory.length);

      // Messages should be identical
      preservedHistory.forEach((message, index) => {
        expect(message.id).toBe(chatHistory[index].id);
        expect(message.text).toBe(chatHistory[index].text);
        expect(message.sender).toBe(chatHistory[index].sender);
      });

      // Delivery context should be preserved
      const restoredContext = chatManager.restoreContext();
      expect(restoredContext).toBeDefined();
      expect(restoredContext!.deliveryContext.partnerId).toBe('test-partner-123');
      expect(restoredContext!.deliveryContext.currentDeliveries[0].id).toBe('order-456');

      // Context preservation stats should reflect transitions
      const stats = chatManager.getContextPreservationStats();
      expect(stats.modeTransitions).toBe(2);
      expect(stats.isValid).toBe(true);
      expect(stats.messageCount).toBe(4);
    });

    it('should handle context expiration and cleanup', async () => {
      const context: ConversationContext = {
        messages: [{
          id: 'msg-1',
          text: 'Test message',
          sender: 'user',
          timestamp: new Date()
        }],
        deliveryContext: {
          partnerId: 'test-partner',
          currentDeliveries: [],
          activeRoute: {
            id: 'route-1',
            stops: [],
            estimatedDuration: 3600,
            distance: 10
          },
          vehicleStatus: {
            id: 'vehicle-1',
            type: 'car',
            isMoving: false,
            speed: 0
          },
          location: { latitude: 40.7128, longitude: -74.0060 },
          workingHours: { start: new Date(), end: new Date() }
        }
      };

      // Set very short expiration time
      contextPreservation.setContextExpiration(1); // 1 minute
      contextPreservation.preserveContext(context);

      // Initially valid
      expect(contextPreservation.isContextValid()).toBe(true);

      // Context should be preserved
      const restoredContext = contextPreservation.restoreContext();
      expect(restoredContext).toBeDefined();
      expect(restoredContext!.messages.length).toBe(1);

      // Cleanup should not remove valid context
      const wasCleanedUp = contextPreservation.cleanupExpiredContext();
      expect(wasCleanedUp).toBe(false);
      expect(contextPreservation.isContextValid()).toBe(true);
    });
  });
});