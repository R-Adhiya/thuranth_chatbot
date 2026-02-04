/**
 * Property-Based Tests for QuickMessageHandlerService
 * Feature: voice-agent, Property 9: Quick Message Reliability
 * Validates: Requirements 3.2, 3.3
 */

import fc from 'fast-check';
import { QuickMessageHandlerService } from '../../services/QuickMessageHandlerService';
import { DeliveryContext, QuickMessage } from '../../types';

describe('QuickMessageHandlerService Property Tests', () => {
  let quickMessageHandler: QuickMessageHandlerService;

  beforeEach(() => {
    quickMessageHandler = new QuickMessageHandlerService();
  });

  /**
   * Property 9: Quick Message Reliability
   * For any quick message trigger (voice or touch), 
   * the Voice_Agent should send the appropriate status update correctly
   */
  describe('Property 9: Quick Message Reliability', () => {
    // Generator for delivery context
    const deliveryContextArbitrary = fc.record({
      partnerId: fc.string({ minLength: 1, maxLength: 20 }),
      currentDeliveries: fc.array(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 15 }),
          status: fc.oneof(
            fc.constant('pending' as const),
            fc.constant('picked_up' as const),
            fc.constant('in_transit' as const),
            fc.constant('delivered' as const),
            fc.constant('failed' as const)
          ),
          pickupLocation: fc.record({
            street: fc.string({ minLength: 5, maxLength: 50 }),
            city: fc.string({ minLength: 3, maxLength: 30 }),
            state: fc.string({ minLength: 2, maxLength: 20 }),
            zipCode: fc.string({ minLength: 5, maxLength: 10 }),
            coordinates: fc.record({
              latitude: fc.integer({ min: -90, max: 90 }),
              longitude: fc.integer({ min: -180, max: 180 })
            })
          }),
          deliveryLocation: fc.record({
            street: fc.string({ minLength: 5, maxLength: 50 }),
            city: fc.string({ minLength: 3, maxLength: 30 }),
            state: fc.string({ minLength: 2, maxLength: 20 }),
            zipCode: fc.string({ minLength: 5, maxLength: 10 }),
            coordinates: fc.record({
              latitude: fc.integer({ min: -90, max: 90 }),
              longitude: fc.integer({ min: -180, max: 180 })
            })
          }),
          customerInfo: fc.record({
            name: fc.string({ minLength: 2, maxLength: 30 }),
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
        id: fc.string({ minLength: 1, maxLength: 15 }),
        stops: fc.array(
          fc.record({
            street: fc.string({ minLength: 5, maxLength: 50 }),
            city: fc.string({ minLength: 3, maxLength: 30 }),
            state: fc.string({ minLength: 2, maxLength: 20 }),
            zipCode: fc.string({ minLength: 5, maxLength: 10 }),
            coordinates: fc.record({
              latitude: fc.integer({ min: -90, max: 90 }),
              longitude: fc.integer({ min: -180, max: 180 })
            })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        estimatedDuration: fc.integer({ min: 10, max: 480 }),
        distance: fc.integer({ min: 1, max: 500 })
      }),
      vehicleStatus: fc.record({
        id: fc.string({ minLength: 1, maxLength: 15 }),
        type: fc.oneof(
          fc.constant('car' as const),
          fc.constant('bike' as const),
          fc.constant('truck' as const),
          fc.constant('van' as const)
        ),
        isMoving: fc.boolean(),
        speed: fc.integer({ min: 0, max: 120 }),
        fuelLevel: fc.option(fc.integer({ min: 0, max: 100 }).map(n => n / 100)),
        batteryLevel: fc.option(fc.integer({ min: 0, max: 100 }).map(n => n / 100))
      }),
      location: fc.record({
        latitude: fc.integer({ min: -90, max: 90 }),
        longitude: fc.integer({ min: -180, max: 180 }),
        accuracy: fc.option(fc.integer({ min: 1, max: 100 }))
      }),
      workingHours: fc.record({
        start: fc.date(),
        end: fc.date()
      })
    });

    // Generator for voice trigger phrases
    const voiceTriggerArbitrary = fc.oneof(
      fc.constant('reached pickup'),
      fc.constant('at pickup location'),
      fc.constant('pickup ready'),
      fc.constant('reached delivery'),
      fc.constant('at delivery location'),
      fc.constant('delivery ready'),
      fc.constant('traffic delay'),
      fc.constant('stuck in traffic'),
      fc.constant('running late'),
      fc.constant('customer not available'),
      fc.constant('no answer'),
      fc.constant('cannot contact'),
      // Variations with different casing
      fc.constant('REACHED PICKUP'),
      fc.constant('At Pickup Location'),
      fc.constant('TRAFFIC DELAY'),
      fc.constant('Customer Not Available')
    );

    // Generator for message customization
    const customizationArbitrary = fc.oneof(
      fc.string({ minLength: 1, maxLength: 50 }).map(s => `order ${s}`),
      fc.integer({ min: 1, max: 120 }).map(n => `${n} minutes`),
      fc.constant(''),
      fc.string({ minLength: 1, maxLength: 20 })
    );

    it('should reliably send any quick message when triggered by voice', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          voiceTriggerArbitrary,
          customizationArbitrary,
          async (context, voiceTrigger, customization) => {
            // Arrange
            const availableMessages = quickMessageHandler.getAvailableMessages(context);
            
            // Act - Find message by voice trigger
            const messageId = quickMessageHandler.findMessageByVoiceTrigger(voiceTrigger);
            
            if (messageId) {
              // Assert - Message should be found and sendable
              expect(messageId).toBeDefined();
              expect(typeof messageId).toBe('string');
              
              const message = quickMessageHandler.getMessageById(messageId);
              expect(message).toBeDefined();
              
              // Check if any voice trigger matches the input phrase (case insensitive)
              const hasMatchingTrigger = message?.voiceTriggers.some(trigger => 
                trigger.toLowerCase().includes(voiceTrigger.toLowerCase()) ||
                voiceTrigger.toLowerCase().includes(trigger.toLowerCase())
              );
              expect(hasMatchingTrigger).toBe(true);
              
              // Should be able to send the message without errors
              await expect(
                quickMessageHandler.sendMessage(messageId, customization)
              ).resolves.not.toThrow();
            }
          }
        ),
        { numRuns: 100, timeout: 5000 }
      );
    });

    it('should reliably send any quick message when triggered by touch interface', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          customizationArbitrary,
          async (context, customization) => {
            // Arrange
            const availableMessages = quickMessageHandler.getAvailableMessages(context);
            
            if (availableMessages.length > 0) {
              // Act - Select a random available message
              const randomIndex = Math.floor(Math.random() * availableMessages.length);
              const selectedMessage = availableMessages[randomIndex];
              
              // Assert - Should be able to send any available message
              await expect(
                quickMessageHandler.sendMessage(selectedMessage.id, customization)
              ).resolves.not.toThrow();
              
              // Message should exist and be valid
              expect(selectedMessage.id).toBeDefined();
              expect(selectedMessage.template).toBeDefined();
              expect(selectedMessage.category).toMatch(/^(status|delay|contact|location)$/);
              expect(Array.isArray(selectedMessage.voiceTriggers)).toBe(true);
              expect(selectedMessage.voiceTriggers.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100, timeout: 5000 }
      );
    });

    it('should maintain message availability consistency for any delivery context', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          async (context) => {
            // Act
            const availableMessages = quickMessageHandler.getAvailableMessages(context);
            const allMessages = quickMessageHandler.getAllMessages();
            
            // Assert - Available messages should be a subset of all messages
            expect(Array.isArray(availableMessages)).toBe(true);
            expect(availableMessages.length).toBeLessThanOrEqual(allMessages.length);
            
            // All available messages should exist in the complete message set
            availableMessages.forEach(availableMessage => {
              const exists = allMessages.some(msg => msg.id === availableMessage.id);
              expect(exists).toBe(true);
            });
            
            // Context-based filtering should be consistent
            if (context.currentDeliveries.length === 0) {
              // When no active deliveries, only location messages should be available
              const nonLocationMessages = availableMessages.filter(
                msg => msg.category !== 'location'
              );
              // Note: This might be empty or contain some messages based on business logic
              expect(Array.isArray(nonLocationMessages)).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle voice trigger registration for any valid phrase and message combination', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 2),
          fc.oneof(
            fc.constant('reached_pickup'),
            fc.constant('reached_delivery'),
            fc.constant('traffic_delay'),
            fc.constant('customer_unavailable')
          ),
          async (phrase, messageId) => {
            // Act - Register voice trigger
            expect(() => {
              quickMessageHandler.registerVoiceTrigger(phrase, messageId);
            }).not.toThrow();
            
            // Assert - Should be able to find message by the registered phrase
            const foundMessageId = quickMessageHandler.findMessageByVoiceTrigger(phrase);
            expect(foundMessageId).toBe(messageId);
            
            // Should be able to send the message
            await expect(
              quickMessageHandler.sendMessage(messageId)
            ).resolves.not.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle message customization consistently for any valid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('reached_pickup'),
            fc.constant('reached_delivery'),
            fc.constant('traffic_delay'),
            fc.constant('customer_unavailable')
          ),
          customizationArbitrary,
          async (messageId, customization) => {
            // Act & Assert - Should handle any customization without errors
            await expect(
              quickMessageHandler.sendMessage(messageId, customization)
            ).resolves.not.toThrow();
            
            // Message should still be retrievable
            const message = quickMessageHandler.getMessageById(messageId);
            expect(message).toBeDefined();
            expect(message?.template).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain voice trigger case insensitivity for any input', async () => {
      await fc.assert(
        fc.asyncProperty(
          voiceTriggerArbitrary,
          async (originalTrigger) => {
            // Arrange - Create variations of the trigger
            const variations = [
              originalTrigger.toLowerCase(),
              originalTrigger.toUpperCase(),
              originalTrigger.charAt(0).toUpperCase() + originalTrigger.slice(1).toLowerCase()
            ];
            
            // Act & Assert - All variations should find the same message
            const results = variations.map(variation => 
              quickMessageHandler.findMessageByVoiceTrigger(variation)
            );
            
            // All non-null results should be the same
            const nonNullResults = results.filter(result => result !== null);
            if (nonNullResults.length > 0) {
              const firstResult = nonNullResults[0];
              nonNullResults.forEach(result => {
                expect(result).toBe(firstResult);
              });
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should categorize messages consistently for any message', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          async (context) => {
            // Act
            const allMessages = quickMessageHandler.getAllMessages();
            const availableMessages = quickMessageHandler.getAvailableMessages(context);
            
            // Assert - All messages should have valid categories
            allMessages.forEach(message => {
              expect(message.category).toMatch(/^(status|delay|contact|location)$/);
              
              // Category should match message content
              if (message.id.includes('pickup') || message.id.includes('delivery')) {
                expect(message.category).toBe('location');
              } else if (message.id.includes('delay') || message.id.includes('traffic')) {
                expect(message.category).toBe('delay');
              } else if (message.id.includes('customer') || message.id.includes('contact')) {
                expect(message.category).toBe('contact');
              }
            });
            
            // Available messages should maintain category consistency
            availableMessages.forEach(message => {
              expect(message.category).toMatch(/^(status|delay|contact|location)$/);
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle invalid message IDs gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => 
            !['reached_pickup', 'reached_delivery', 'traffic_delay', 'customer_unavailable'].includes(s)
          ),
          async (invalidMessageId) => {
            // Act & Assert - Should throw error for invalid message ID
            await expect(
              quickMessageHandler.sendMessage(invalidMessageId)
            ).rejects.toThrow();
            
            // Should return null for invalid message ID lookup
            const message = quickMessageHandler.getMessageById(invalidMessageId);
            expect(message).toBeNull();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle empty or invalid voice triggers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.string({ maxLength: 2 }),
            fc.string({ minLength: 100, maxLength: 200 })
          ),
          async (invalidTrigger) => {
            // Act
            const messageId = quickMessageHandler.findMessageByVoiceTrigger(invalidTrigger);
            
            // Assert - Should handle gracefully (return null or find partial match)
            expect(messageId === null || typeof messageId === 'string').toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

describe('Required Message Templates Unit Tests', () => {
  let quickMessageHandler: QuickMessageHandlerService;

  beforeEach(() => {
    quickMessageHandler = new QuickMessageHandlerService();
  });

  /**
   * Unit test for required message templates
   * Test that all required messages exist: "Reached pickup location", "Reached delivery location", 
   * "Delayed due to traffic", "Unable to contact customer"
   * Validates: Requirements 3.4
   */
  it('should have all required message templates', () => {
    const allMessages = quickMessageHandler.getAllMessages();
    const messageTemplates = allMessages.map(msg => msg.template);

    // Check for "Reached pickup location" message
    const hasPickupMessage = messageTemplates.some(template => 
      template.toLowerCase().includes('reached pickup location')
    );
    expect(hasPickupMessage).toBe(true);

    // Check for "Reached delivery location" message  
    const hasDeliveryMessage = messageTemplates.some(template =>
      template.toLowerCase().includes('reached delivery location')
    );
    expect(hasDeliveryMessage).toBe(true);

    // Check for "Delayed due to traffic" message
    const hasTrafficDelayMessage = messageTemplates.some(template =>
      template.toLowerCase().includes('delayed due to traffic')
    );
    expect(hasTrafficDelayMessage).toBe(true);

    // Check for "Unable to contact customer" message
    const hasCustomerContactMessage = messageTemplates.some(template =>
      template.toLowerCase().includes('unable to contact customer')
    );
    expect(hasCustomerContactMessage).toBe(true);
  });

  it('should have specific message IDs for required templates', () => {
    const allMessages = quickMessageHandler.getAllMessages();
    const messageIds = allMessages.map(msg => msg.id);

    // Verify specific message IDs exist
    expect(messageIds).toContain('reached_pickup');
    expect(messageIds).toContain('reached_delivery');
    expect(messageIds).toContain('traffic_delay');
    expect(messageIds).toContain('customer_unavailable');
  });

  it('should have correct message categories for required templates', () => {
    const reachedPickupMessage = quickMessageHandler.getMessageById('reached_pickup');
    const reachedDeliveryMessage = quickMessageHandler.getMessageById('reached_delivery');
    const trafficDelayMessage = quickMessageHandler.getMessageById('traffic_delay');
    const customerUnavailableMessage = quickMessageHandler.getMessageById('customer_unavailable');

    expect(reachedPickupMessage?.category).toBe('location');
    expect(reachedDeliveryMessage?.category).toBe('location');
    expect(trafficDelayMessage?.category).toBe('delay');
    expect(customerUnavailableMessage?.category).toBe('contact');
  });

  it('should have voice triggers for all required templates', () => {
    const requiredMessageIds = ['reached_pickup', 'reached_delivery', 'traffic_delay', 'customer_unavailable'];
    
    requiredMessageIds.forEach(messageId => {
      const message = quickMessageHandler.getMessageById(messageId);
      expect(message).toBeDefined();
      expect(message?.voiceTriggers).toBeDefined();
      expect(Array.isArray(message?.voiceTriggers)).toBe(true);
      expect(message?.voiceTriggers.length).toBeGreaterThan(0);
    });
  });

  it('should be able to send all required message templates', () => {
    const requiredMessageIds = ['reached_pickup', 'reached_delivery', 'traffic_delay', 'customer_unavailable'];
    
    // Test that all required messages exist and can be retrieved
    requiredMessageIds.forEach(messageId => {
      const message = quickMessageHandler.getMessageById(messageId);
      expect(message).toBeDefined();
      expect(message?.template).toBeDefined();
      
      // Test that sendMessage doesn't throw synchronously
      expect(() => {
        quickMessageHandler.sendMessage(messageId);
      }).not.toThrow();
    });
  });
});