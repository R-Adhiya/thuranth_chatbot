/**
 * Property-Based Tests for IntentProcessorService
 * Feature: voice-agent, Property 2: Intent Execution Consistency
 * Validates: Requirements 1.3
 */

import fc from 'fast-check';
import { IntentProcessorService } from '../../services/IntentProcessorService';
import { DeliveryContext, Intent, Delivery, GeoLocation } from '../../types';

describe('IntentProcessorService Property Tests', () => {
  let intentProcessor: IntentProcessorService;

  beforeEach(() => {
    intentProcessor = new IntentProcessorService();
  });

  /**
   * Property 2: Intent Execution Consistency
   * For any valid delivery command processed by the Intent_Processor, 
   * the Voice_Agent should execute the corresponding system action correctly
   */
  describe('Property 2: Intent Execution Consistency', () => {
    
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
        estimatedDuration: fc.integer({ min: 300, max: 7200 }), // 5 minutes to 2 hours
        distance: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }) // 0.1 to 100 km
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

    // Generator for delivery status commands
    const deliveryStatusCommandArbitrary = fc.oneof(
      fc.constant('What is my next delivery?'),
      fc.constant('Show delivery status'),
      fc.constant('What is the status of my current order?'),
      fc.constant('Check order status'),
      fc.constant('Where is my delivery?'),
      fc.string().map(orderId => `What is the status of order ${orderId}?`),
      fc.constant('Get delivery overview'),
      fc.constant('Show current delivery status')
    );

    // Generator for navigation commands
    const navigationCommandArbitrary = fc.oneof(
      fc.constant('Navigate to next stop'),
      fc.constant('Get directions to next delivery'),
      fc.constant('Go to next location'),
      fc.string({ minLength: 5, maxLength: 50 }).map(location => `Navigate to ${location}`),
      fc.string({ minLength: 5, maxLength: 50 }).map(location => `Directions to ${location}`),
      fc.constant('Where is my next stop?'),
      fc.constant('Route to delivery location')
    );

    // Generator for communication commands
    const communicationCommandArbitrary = fc.oneof(
      fc.constant('Call customer'),
      fc.constant('Contact customer'),
      fc.constant('Message customer'),
      fc.constant('Notify customer'),
      fc.string({ minLength: 3, maxLength: 30 }).map(name => `Call customer ${name}`),
      fc.string({ minLength: 3, maxLength: 30 }).map(name => `Message customer ${name}`),
      fc.constant('Send message to customer')
    );

    // Generator for quick message commands
    const quickMessageCommandArbitrary = fc.oneof(
      fc.constant('Reached pickup location'),
      fc.constant('Reached delivery location'),
      fc.constant('Delayed due to traffic'),
      fc.constant('Unable to contact customer'),
      fc.constant('Cannot contact customer'),
      fc.constant('Traffic delay'),
      fc.constant('Running late due to traffic'),
      fc.constant('At pickup location'),
      fc.constant('At delivery location')
    );

    // Combined command generator
    const validDeliveryCommandArbitrary = fc.oneof(
      deliveryStatusCommandArbitrary,
      navigationCommandArbitrary,
      communicationCommandArbitrary,
      quickMessageCommandArbitrary
    );

    it('should consistently process valid delivery commands and produce actionable intents', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDeliveryCommandArbitrary,
          deliveryContextArbitrary,
          async (command, context) => {
            // Act
            const intent = await intentProcessor.processInput(command, context);

            // Assert - Intent should be well-formed and actionable
            expect(intent).toBeDefined();
            expect(intent.type).toMatch(/^(delivery_status|navigation|communication|quick_message)$/);
            expect(intent.action).toBeDefined();
            expect(typeof intent.action).toBe('string');
            expect(intent.action.length).toBeGreaterThan(0);
            expect(intent.parameters).toBeDefined();
            expect(typeof intent.parameters).toBe('object');
            expect(intent.confidence).toBeGreaterThanOrEqual(0);
            expect(intent.confidence).toBeLessThanOrEqual(1);

            // Intent should be valid according to validation rules
            const isValid = intentProcessor.validateIntent(intent);
            expect(isValid).toBe(true);

            // Action should be appropriate for the intent type
            switch (intent.type) {
              case 'delivery_status':
                expect(intent.action).toMatch(/^(get_next_delivery|get_current_status|get_order_status|get_delivery_overview)$/);
                break;
              case 'navigation':
                expect(intent.action).toMatch(/^(navigate_to_next_stop|navigate_to_location|get_directions)$/);
                break;
              case 'communication':
                expect(intent.action).toMatch(/^(call_customer|message_customer|contact_customer)$/);
                break;
              case 'quick_message':
                expect(intent.action).toMatch(/^(send_reached_pickup|send_reached_delivery|send_traffic_delay|send_customer_unavailable|send_status_update)$/);
                break;
            }
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    });

    it('should extract entities consistently from any delivery command', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.string({ minLength: 5, maxLength: 15 }), // order ID
          fc.string({ minLength: 5, maxLength: 50 }), // location
          async (baseCommand, orderId, location) => {
            // Create command with embedded entities
            const commandWithEntities = `${baseCommand} order ${orderId} to ${location}`;
            
            // Act
            const entities = intentProcessor.extractEntities(commandWithEntities);

            // Assert - Entities should be properly extracted
            expect(Array.isArray(entities)).toBe(true);
            
            entities.forEach(entity => {
              expect(entity.type).toBeDefined();
              expect(entity.value).toBeDefined();
              expect(entity.confidence).toBeGreaterThanOrEqual(0);
              expect(entity.confidence).toBeLessThanOrEqual(1);
              expect(entity.startIndex).toBeGreaterThanOrEqual(0);
              expect(entity.endIndex).toBeGreaterThan(entity.startIndex);
              expect(entity.endIndex).toBeLessThanOrEqual(commandWithEntities.length);
            });

            // Should extract order ID if present
            const orderEntity = entities.find(e => e.type === 'orderId');
            if (orderEntity) {
              expect(orderEntity.value).toBe(orderId);
            }

            // Should extract location if present
            const locationEntity = entities.find(e => e.type === 'location');
            if (locationEntity) {
              expect(locationEntity.value).toBe(location);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain context awareness across different delivery scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          validDeliveryCommandArbitrary,
          async (context, command) => {
            // Act
            intentProcessor.updateContext(context);
            const intent = await intentProcessor.processInput(command, context);

            // Assert - Intent should reflect context awareness
            expect(intent.parameters).toBeDefined();

            // Should include current delivery information if available
            if (context.currentDeliveries.length > 0) {
              expect(intent.parameters.currentOrderId).toBe(context.currentDeliveries[0].id);
              expect(intent.parameters.currentStatus).toBe(context.currentDeliveries[0].status);
            }

            // Should include location context
            if (context.location) {
              expect(intent.parameters.currentLocation).toEqual(context.location);
            }

            // Should include route context
            if (context.activeRoute) {
              expect(intent.parameters.routeId).toBe(context.activeRoute.id);
              expect(intent.parameters.remainingStops).toBe(context.activeRoute.stops.length);
            }

            // Context-aware confidence should be reasonable
            if (context.currentDeliveries.length > 0 && intent.type === 'delivery_status') {
              expect(intent.confidence).toBeGreaterThanOrEqual(0.6);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent confidence scores for similar commands', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          fc.oneof(
            fc.constant('What is my next delivery'),
            fc.constant('What is my next delivery?'),
            fc.constant('Show me my next delivery'),
            fc.constant('Tell me about my next delivery')
          ),
          async (context, command) => {
            // Act
            const intent = await intentProcessor.processInput(command, context);

            // Assert - Similar commands should have similar confidence scores
            expect(intent.confidence).toBeGreaterThanOrEqual(0.7);
            expect(intent.type).toBe('delivery_status');
            expect(intent.action).toMatch(/^(get_next_delivery|get_delivery_overview)$/);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle commands with varying entity combinations', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          fc.string({ minLength: 5, maxLength: 15 }), // order ID
          fc.string({ minLength: 3, maxLength: 30 }), // customer name
          fc.string({ minLength: 5, maxLength: 50 }), // location
          async (context, orderId, customerName, location) => {
            // Create commands with different entity combinations
            const commands = [
              `Check status of order ${orderId}`,
              `Call customer ${customerName}`,
              `Navigate to ${location}`,
              `Message customer ${customerName} about order ${orderId}`,
              `Get directions to ${location} for order ${orderId}`
            ];

            for (const command of commands) {
              // Act
              const intent = await intentProcessor.processInput(command, context);

              // Assert - Should handle entity combinations appropriately
              expect(intent).toBeDefined();
              expect(intentProcessor.validateIntent(intent)).toBe(true);

              // Parameters should include extracted entities
              const entities = intentProcessor.extractEntities(command);
              entities.forEach(entity => {
                expect(intent.parameters[entity.type]).toBeDefined();
              });
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should validate intents consistently based on type and parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDeliveryCommandArbitrary,
          deliveryContextArbitrary,
          async (command, context) => {
            // Act
            const intent = await intentProcessor.processInput(command, context);
            const isValid = intentProcessor.validateIntent(intent);

            // Assert - Validation should be consistent with intent structure
            if (isValid) {
              // Valid intents must have proper structure
              expect(intent.type).toMatch(/^(delivery_status|navigation|communication|quick_message)$/);
              expect(intent.confidence).toBeGreaterThanOrEqual(0.6);
              expect(intent.action).toBeDefined();
              expect(intent.action.length).toBeGreaterThan(0);
            } else {
              // Invalid intents should have clear reasons
              expect(
                intent.confidence < 0.6 || 
                !intent.action || 
                intent.action.trim().length === 0
              ).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide context-aware delivery information retrieval', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary.filter(ctx => ctx.currentDeliveries.length > 0),
          async (context) => {
            // Arrange
            intentProcessor.updateContext(context);
            const firstDelivery = context.currentDeliveries[0];

            // Act - Test delivery retrieval methods
            const deliveryById = intentProcessor.getDeliveryByOrderId(firstDelivery.id);
            const nextDelivery = intentProcessor.getNextDelivery();

            // Assert - Should retrieve correct delivery information
            expect(deliveryById).toEqual(firstDelivery);
            
            if (nextDelivery) {
              expect(['pending', 'picked_up', 'in_transit']).toContain(nextDelivery.status);
            }

            // Test location proximity
            if (context.location && firstDelivery.pickupLocation.coordinates) {
              const isNearby = intentProcessor.isLocationNearby(
                firstDelivery.pickupLocation.coordinates,
                0.01
              );
              expect(typeof isNearby).toBe('boolean');
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle edge cases in entity extraction gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.string({ maxLength: 5 }),
            fc.string({ minLength: 200, maxLength: 500 }),
            fc.string().filter(s => !/[a-zA-Z0-9]/.test(s)), // special characters only
            fc.string().map(s => s.repeat(10)) // repeated patterns
          ),
          async (edgeCaseInput) => {
            // Act
            const entities = intentProcessor.extractEntities(edgeCaseInput);

            // Assert - Should handle edge cases without errors
            expect(Array.isArray(entities)).toBe(true);
            
            entities.forEach(entity => {
              expect(entity.startIndex).toBeGreaterThanOrEqual(0);
              expect(entity.endIndex).toBeLessThanOrEqual(edgeCaseInput.length);
              expect(entity.confidence).toBeGreaterThanOrEqual(0);
              expect(entity.confidence).toBeLessThanOrEqual(1);
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Intent Classification Consistency', () => {
    it('should classify similar delivery status queries consistently', async () => {
      const statusQueries = [
        'What is my delivery status?',
        'Show me delivery status',
        'Check my delivery status',
        'What is the status of my delivery?',
        'Tell me about my delivery status'
      ];

      const context: DeliveryContext = {
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
      };

      for (const query of statusQueries) {
        const intent = await intentProcessor.processInput(query, context);
        expect(intent.type).toBe('delivery_status');
        expect(intent.confidence).toBeGreaterThan(0.6);
      }
    });

    it('should classify navigation commands consistently', async () => {
      const navigationCommands = [
        'Navigate to next stop',
        'Go to next delivery',
        'Directions to next location',
        'Route to next stop',
        'Take me to next delivery'
      ];

      const context: DeliveryContext = {
        partnerId: 'test-partner',
        currentDeliveries: [],
        activeRoute: {
          id: 'route-1',
          stops: [
            {
              street: '123 Main St',
              city: 'New York',
              state: 'NY',
              zipCode: '10001',
              coordinates: { latitude: 40.7128, longitude: -74.0060 }
            }
          ],
          estimatedDuration: 3600,
          distance: 10
        },
        vehicleStatus: {
          id: 'vehicle-1',
          type: 'car',
          isMoving: true,
          speed: 30
        },
        location: { latitude: 40.7128, longitude: -74.0060 },
        workingHours: { start: new Date(), end: new Date() }
      };

      for (const command of navigationCommands) {
        const intent = await intentProcessor.processInput(command, context);
        expect(intent.type).toBe('navigation');
        expect(intent.confidence).toBeGreaterThan(0.6);
      }
    });
  });
});