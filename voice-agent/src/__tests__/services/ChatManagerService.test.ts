/**
 * Property-Based Tests for ChatManagerService
 * Feature: voice-agent, Property 7: Text Processing Parity
 * Validates: Requirements 2.2
 */

import fc from 'fast-check';
import { ChatManagerService } from '../../services/ChatManagerService';
import { IntentProcessorService } from '../../services/IntentProcessorService';
import { DeliveryContext, ChatMessage, Intent } from '../../types';

describe('ChatManagerService Property Tests', () => {
  let chatManager: ChatManagerService;
  let intentProcessor: IntentProcessorService;

  beforeEach(() => {
    intentProcessor = new IntentProcessorService();
    chatManager = new ChatManagerService(intentProcessor);
  });

  /**
   * Property 7: Text Processing Parity
   * For any delivery-related text query, the Intent_Processor should process it 
   * with the same accuracy as equivalent voice commands
   */
  describe('Property 7: Text Processing Parity', () => {
    
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

    // Generator for delivery-related text queries (equivalent to voice commands)
    const deliveryTextQueryArbitrary = fc.oneof(
      // Delivery status queries
      fc.oneof(
        fc.constant('What is my next delivery?'),
        fc.constant('Show delivery status'),
        fc.constant('What is the status of my current order?'),
        fc.constant('Check order status'),
        fc.constant('Where is my delivery?'),
        fc.constant('Get delivery overview'),
        fc.constant('Show current delivery status'),
        fc.string({ minLength: 5, maxLength: 15 }).map(orderId => `What is the status of order ${orderId}?`)
      ),
      // Navigation queries
      fc.oneof(
        fc.constant('Navigate to next stop'),
        fc.constant('Get directions to next delivery'),
        fc.constant('Go to next location'),
        fc.constant('Where is my next stop?'),
        fc.constant('Route to delivery location'),
        fc.string({ minLength: 5, maxLength: 50 }).map(location => `Navigate to ${location}`),
        fc.string({ minLength: 5, maxLength: 50 }).map(location => `Directions to ${location}`)
      ),
      // Communication queries
      fc.oneof(
        fc.constant('Call customer'),
        fc.constant('Contact customer'),
        fc.constant('Message customer'),
        fc.constant('Notify customer'),
        fc.constant('Send message to customer'),
        fc.string({ minLength: 3, maxLength: 30 }).map(name => `Call customer ${name}`),
        fc.string({ minLength: 3, maxLength: 30 }).map(name => `Message customer ${name}`)
      ),
      // Quick message queries
      fc.oneof(
        fc.constant('Reached pickup location'),
        fc.constant('Reached delivery location'),
        fc.constant('Delayed due to traffic'),
        fc.constant('Unable to contact customer'),
        fc.constant('Cannot contact customer'),
        fc.constant('Traffic delay'),
        fc.constant('Running late due to traffic'),
        fc.constant('At pickup location'),
        fc.constant('At delivery location')
      )
    );

    it('should process text queries with the same accuracy as equivalent voice commands', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryTextQueryArbitrary,
          deliveryContextArbitrary,
          async (textQuery, context) => {
            // Arrange
            chatManager.updateDeliveryContext(context);

            // Act - Process text query through chat manager
            const chatResponse = await chatManager.sendMessage(textQuery);
            
            // Also process directly through intent processor for comparison
            const directIntent = await intentProcessor.processInput(textQuery, context);

            // Assert - Chat processing should produce equivalent results to direct processing
            expect(chatResponse).toBeDefined();
            expect(chatResponse.sender).toBe('agent');
            expect(chatResponse.text).toBeDefined();
            expect(chatResponse.text.length).toBeGreaterThan(0);
            expect(chatResponse.intent).toBeDefined();

            // Intent should be equivalent to direct processing
            const chatIntent = chatResponse.intent!;
            expect(chatIntent.type).toBe(directIntent.type);
            expect(chatIntent.action).toBe(directIntent.action);
            
            // Confidence should be within reasonable range of direct processing
            const confidenceDifference = Math.abs(chatIntent.confidence - directIntent.confidence);
            expect(confidenceDifference).toBeLessThanOrEqual(0.1);

            // Both should be valid intents
            expect(intentProcessor.validateIntent(chatIntent)).toBe(true);
            expect(intentProcessor.validateIntent(directIntent)).toBe(true);

            // Parameters should be equivalent
            expect(Object.keys(chatIntent.parameters)).toEqual(
              expect.arrayContaining(Object.keys(directIntent.parameters))
            );
          }
        ),
        { numRuns: 100, timeout: 15000 }
      );
    });

    it('should maintain conversation context across multiple text interactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(deliveryTextQueryArbitrary, { minLength: 2, maxLength: 5 }),
          deliveryContextArbitrary,
          async (queries, context) => {
            // Arrange
            chatManager.clearHistory();
            chatManager.updateDeliveryContext(context);

            // Act - Send multiple queries in sequence
            const responses: ChatMessage[] = [];
            for (const query of queries) {
              const response = await chatManager.sendMessage(query);
              responses.push(response);
            }

            // Assert - Context should be maintained across interactions
            const history = chatManager.getConversationHistory();
            expect(history.length).toBe(queries.length * 2); // user + agent messages

            // Each response should be contextually appropriate
            responses.forEach((response, index) => {
              expect(response.intent).toBeDefined();
              expect(response.intent!.parameters.currentLocation).toEqual(context.location);
              
              if (context.currentDeliveries.length > 0) {
                expect(response.intent!.parameters.currentOrderId).toBe(context.currentDeliveries[0].id);
              }
            });

            // Conversation stats should reflect the interaction
            const stats = chatManager.getConversationStats();
            expect(stats.messageCount).toBe(queries.length * 2);
            expect(stats.userMessages).toBe(queries.length);
            expect(stats.agentMessages).toBe(queries.length);
          }
        ),
        { numRuns: 50, timeout: 20000 }
      );
    });

    it('should handle text input variations with consistent intent classification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            baseQuery: fc.oneof(
              fc.constant('next delivery'),
              fc.constant('delivery status'),
              fc.constant('navigate'),
              fc.constant('call customer'),
              fc.constant('traffic delay')
            ),
            variations: fc.array(
              fc.oneof(
                fc.constant('What is my '),
                fc.constant('Show me '),
                fc.constant('Tell me about '),
                fc.constant('I need '),
                fc.constant('Can you '),
                fc.constant('Please '),
                fc.constant('')
              ),
              { minLength: 1, maxLength: 3 }
            ),
            suffixes: fc.array(
              fc.oneof(
                fc.constant('?'),
                fc.constant('.'),
                fc.constant('!'),
                fc.constant(' please'),
                fc.constant(' now'),
                fc.constant('')
              ),
              { minLength: 1, maxLength: 2 }
            )
          }),
          deliveryContextArbitrary,
          async ({ baseQuery, variations, suffixes }, context) => {
            // Arrange
            chatManager.updateDeliveryContext(context);
            const queries = variations.flatMap(prefix => 
              suffixes.map(suffix => `${prefix}${baseQuery}${suffix}`)
            );

            // Act - Process all variations
            const responses: ChatMessage[] = [];
            for (const query of queries) {
              try {
                const response = await chatManager.sendMessage(query);
                responses.push(response);
              } catch (error) {
                // Some variations might be too ambiguous, that's acceptable
                continue;
              }
            }

            // Assert - Valid responses should have consistent intent types
            if (responses.length > 1) {
              const intentTypes = responses
                .filter(r => r.intent)
                .map(r => r.intent!.type);
              
              // Most responses should have the same intent type (allowing some variation)
              const mostCommonType = intentTypes.reduce((a, b, i, arr) =>
                arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
              );
              
              const consistentResponses = intentTypes.filter(type => type === mostCommonType);
              expect(consistentResponses.length / intentTypes.length).toBeGreaterThanOrEqual(0.7);
            }
          }
        ),
        { numRuns: 30, timeout: 15000 }
      );
    });

    it('should provide equivalent response quality for text and voice-equivalent inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.record({
              textVersion: fc.constant('What is my next delivery?'),
              voiceEquivalent: fc.constant('what is my next delivery')
            }),
            fc.record({
              textVersion: fc.constant('Navigate to next stop'),
              voiceEquivalent: fc.constant('navigate to next stop')
            }),
            fc.record({
              textVersion: fc.constant('Call customer'),
              voiceEquivalent: fc.constant('call customer')
            }),
            fc.record({
              textVersion: fc.constant('Reached pickup location'),
              voiceEquivalent: fc.constant('reached pickup location')
            })
          ),
          deliveryContextArbitrary,
          async ({ textVersion, voiceEquivalent }, context) => {
            // Arrange
            chatManager.updateDeliveryContext(context);

            // Act - Process both versions
            const textResponse = await chatManager.sendMessage(textVersion);
            
            // Simulate voice input processing (would normally come from voice recognition)
            const voiceResponse = await chatManager.handleVoiceInput(voiceEquivalent, 0.9);

            // Assert - Both should produce equivalent responses
            expect(textResponse.intent?.type).toBe(voiceResponse.intent?.type);
            expect(textResponse.intent?.action).toBe(voiceResponse.intent?.action);
            
            // Response quality should be equivalent
            expect(textResponse.text.length).toBeGreaterThan(10);
            expect(voiceResponse.text.length).toBeGreaterThan(10);
            
            // Both should be valid and actionable
            if (textResponse.intent) {
              expect(intentProcessor.validateIntent(textResponse.intent)).toBe(true);
            }
            if (voiceResponse.intent) {
              expect(intentProcessor.validateIntent(voiceResponse.intent)).toBe(true);
            }
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });

    it('should handle text processing errors gracefully while maintaining parity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''), // empty input
            fc.string({ maxLength: 3 }), // very short input
            fc.string({ minLength: 500, maxLength: 1000 }), // very long input
            fc.string().filter(s => !/[a-zA-Z]/.test(s)), // no letters
            fc.string().map(s => s.repeat(20)) // repetitive input
          ),
          deliveryContextArbitrary,
          async (edgeCaseInput, context) => {
            // Arrange
            chatManager.updateDeliveryContext(context);

            // Act & Assert - Should handle edge cases gracefully
            if (edgeCaseInput.trim().length === 0) {
              // Empty input should be rejected
              await expect(chatManager.sendMessage(edgeCaseInput)).rejects.toThrow();
            } else {
              try {
                const response = await chatManager.sendMessage(edgeCaseInput);
                
                // If processing succeeds, response should be well-formed
                expect(response).toBeDefined();
                expect(response.sender).toBe('agent');
                expect(response.text).toBeDefined();
                expect(response.timestamp).toBeInstanceOf(Date);
                
                // Should maintain conversation history
                const history = chatManager.getConversationHistory();
                expect(history.length).toBeGreaterThanOrEqual(2);
              } catch (error) {
                // Some edge cases may legitimately fail, but should fail gracefully
                expect(error).toBeInstanceOf(Error);
              }
            }
          }
        ),
        { numRuns: 30, timeout: 10000 }
      );
    });

    it('should maintain response time parity between text and voice processing', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryTextQueryArbitrary,
          deliveryContextArbitrary,
          async (query, context) => {
            // Arrange
            chatManager.updateDeliveryContext(context);

            // Act - Measure text processing time
            const textStartTime = Date.now();
            const textResponse = await chatManager.sendMessage(query);
            const textProcessingTime = Date.now() - textStartTime;

            // Measure voice-equivalent processing time
            const voiceStartTime = Date.now();
            const voiceResponse = await chatManager.handleVoiceInput(query.toLowerCase(), 0.9);
            const voiceProcessingTime = Date.now() - voiceStartTime;

            // Assert - Processing times should be comparable
            expect(textProcessingTime).toBeLessThan(5000); // Should be under 5 seconds
            expect(voiceProcessingTime).toBeLessThan(5000); // Should be under 5 seconds
            
            // Time difference should not be excessive (allowing for some variation)
            const timeDifference = Math.abs(textProcessingTime - voiceProcessingTime);
            expect(timeDifference).toBeLessThan(2000); // Within 2 seconds of each other
            
            // Both responses should be valid
            expect(textResponse.text.length).toBeGreaterThan(0);
            expect(voiceResponse.text.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20, timeout: 15000 }
      );
    });

    it('should extract entities from text with same accuracy as voice processing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 15 }), // order ID
          fc.string({ minLength: 3, maxLength: 30 }), // customer name
          fc.string({ minLength: 5, maxLength: 50 }), // location
          deliveryContextArbitrary,
          async (orderId, customerName, location, context) => {
            // Arrange
            const textQuery = `Check status of order ${orderId} for customer ${customerName} at ${location}`;
            const voiceQuery = textQuery.toLowerCase();
            
            chatManager.updateDeliveryContext(context);

            // Act - Process both versions
            const textResponse = await chatManager.sendMessage(textQuery);
            const voiceResponse = await chatManager.handleVoiceInput(voiceQuery, 0.9);

            // Assert - Entity extraction should be equivalent
            const textEntities = intentProcessor.extractEntities(textQuery);
            const voiceEntities = intentProcessor.extractEntities(voiceQuery);

            // Should extract same types of entities
            const textEntityTypes = textEntities.map(e => e.type).sort();
            const voiceEntityTypes = voiceEntities.map(e => e.type).sort();
            expect(textEntityTypes).toEqual(voiceEntityTypes);

            // Should extract order ID from both
            const textOrderEntity = textEntities.find(e => e.type === 'orderId');
            const voiceOrderEntity = voiceEntities.find(e => e.type === 'orderId');
            
            if (textOrderEntity && voiceOrderEntity) {
              expect(textOrderEntity.value.toLowerCase()).toBe(voiceOrderEntity.value.toLowerCase());
            }

            // Intent parameters should include extracted entities
            if (textResponse.intent && voiceResponse.intent) {
              expect(textResponse.intent.parameters.orderId).toBeDefined();
              expect(voiceResponse.intent.parameters.orderId).toBeDefined();
            }
          }
        ),
        { numRuns: 30, timeout: 10000 }
      );
    });
  });

  describe('Chat Manager Specific Functionality', () => {
    it('should maintain conversation history correctly', async () => {
      const context: DeliveryContext = {
        partnerId: 'test-partner',
        currentDeliveries: [{
          id: 'order-123',
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
      };

      chatManager.updateDeliveryContext(context);

      // Send multiple messages
      await chatManager.sendMessage('What is my next delivery?');
      await chatManager.sendMessage('Navigate to next stop');
      await chatManager.sendMessage('Call customer');

      const history = chatManager.getConversationHistory();
      expect(history.length).toBe(6); // 3 user + 3 agent messages

      // Check message structure
      history.forEach(message => {
        expect(message.id).toBeDefined();
        expect(message.text).toBeDefined();
        expect(message.sender).toMatch(/^(user|agent)$/);
        expect(message.timestamp).toBeInstanceOf(Date);
      });

      // Check alternating pattern
      for (let i = 0; i < history.length; i += 2) {
        expect(history[i].sender).toBe('user');
        if (i + 1 < history.length) {
          expect(history[i + 1].sender).toBe('agent');
        }
      }
    });

    it('should provide appropriate suggested responses', async () => {
      const context: DeliveryContext = {
        partnerId: 'test-partner',
        currentDeliveries: [{
          id: 'order-123',
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
      };

      chatManager.updateDeliveryContext(context);
      const suggestions = chatManager.getSuggestedResponses();

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(5);

      // Suggestions should be delivery-related
      suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
      });
    });
  });
});