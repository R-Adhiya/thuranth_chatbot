/**
 * Property-Based Tests for DeliveryContextManager
 * Feature: voice-agent, Property 17: Delivery Context Awareness
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

import fc from 'fast-check';
import { DeliveryContextManager } from '../../services/DeliveryContextManager';
import { DeliveryContext, Delivery, GeoLocation, Route, VehicleStatus } from '../../types';

describe('DeliveryContextManager Property Tests', () => {
  let contextManager: DeliveryContextManager;

  beforeEach(() => {
    contextManager = new DeliveryContextManager();
  });

  /**
   * Property 17: Delivery Context Awareness
   * For any context-dependent query about deliveries, navigation, or status, 
   * the Voice_Agent should provide accurate responses based on current delivery state
   */
  describe('Property 17: Delivery Context Awareness', () => {
    
    // Generator for delivery contexts
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
        { minLength: 0, maxLength: 10 }
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

    // Generator for location updates
    const locationArbitrary = fc.record({
      latitude: fc.float({ min: Math.fround(-90), max: Math.fround(90) }),
      longitude: fc.float({ min: Math.fround(-180), max: Math.fround(180) }),
      accuracy: fc.option(fc.float({ min: Math.fround(1), max: Math.fround(100) }))
    });

    it('should maintain context consistency across any sequence of updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          fc.array(locationArbitrary, { minLength: 1, maxLength: 10 }),
          async (initialContext, locationUpdates) => {
            // Arrange
            contextManager.initializeContext(initialContext);

            // Act - Apply sequence of location updates
            for (const location of locationUpdates) {
              contextManager.updateLocation(location);
              
              // Assert - Context should always be retrievable and consistent
              const currentContext = contextManager.getContext();
              expect(currentContext).toBeDefined();
              expect(currentContext!.partnerId).toBe(initialContext.partnerId);
              expect(currentContext!.location).toEqual(location);
              
              // Delivery data should remain unchanged during location updates
              expect(currentContext!.currentDeliveries).toEqual(initialContext.currentDeliveries);
              expect(currentContext!.activeRoute).toEqual(initialContext.activeRoute);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide accurate next delivery information for any delivery state', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary.filter(ctx => ctx.currentDeliveries.length > 0),
          async (context) => {
            // Arrange
            contextManager.initializeContext(context);

            // Act
            const nextDelivery = contextManager.getNextDelivery();

            // Assert - Next delivery should be the first non-completed delivery
            if (nextDelivery) {
              expect(['pending', 'picked_up', 'in_transit']).toContain(nextDelivery.status);
              
              // Should be from the current deliveries list
              const foundInContext = context.currentDeliveries.find(d => d.id === nextDelivery.id);
              expect(foundInContext).toBeDefined();
              expect(foundInContext).toEqual(nextDelivery);
            } else {
              // If no next delivery, all deliveries should be completed
              const activeDeliveries = context.currentDeliveries.filter(
                d => d.status === 'pending' || d.status === 'picked_up' || d.status === 'in_transit'
              );
              expect(activeDeliveries.length).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accurately detect location proximity for any delivery locations', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary.filter(ctx => ctx.currentDeliveries.length > 0),
          fc.float({ min: Math.fround(0.0001), max: Math.fround(0.01) }), // proximity threshold
          async (context, threshold) => {
            // Arrange
            contextManager.initializeContext(context);
            
            // Test proximity to each delivery location
            for (const delivery of context.currentDeliveries) {
              // Act - Move to pickup location
              contextManager.updateLocation(delivery.pickupLocation.coordinates);
              const proximityAtPickup = contextManager.checkLocationProximity(threshold);
              
              // Assert - Should detect proximity to pickup if delivery is pending
              if (delivery.status === 'pending') {
                expect(proximityAtPickup.nearPickup).toBeDefined();
                expect(proximityAtPickup.nearPickup!.delivery.id).toBe(delivery.id);
                expect(proximityAtPickup.nearPickup!.distance).toBeLessThanOrEqual(threshold);
              }

              // Act - Move to delivery location
              contextManager.updateLocation(delivery.deliveryLocation.coordinates);
              const proximityAtDelivery = contextManager.checkLocationProximity(threshold);
              
              // Assert - Should detect proximity to delivery if picked up or in transit
              if (delivery.status === 'picked_up' || delivery.status === 'in_transit') {
                expect(proximityAtDelivery.nearDelivery).toBeDefined();
                expect(proximityAtDelivery.nearDelivery!.delivery.id).toBe(delivery.id);
                expect(proximityAtDelivery.nearDelivery!.distance).toBeLessThanOrEqual(threshold);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain accurate delivery statistics for any delivery state changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary.filter(ctx => ctx.currentDeliveries.length > 0),
          fc.array(
            fc.record({
              orderId: fc.string({ minLength: 8, maxLength: 15 }),
              newStatus: fc.oneof(
                fc.constant('pending' as const),
                fc.constant('picked_up' as const),
                fc.constant('in_transit' as const),
                fc.constant('delivered' as const),
                fc.constant('failed' as const)
              )
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (context, statusUpdates) => {
            // Arrange
            contextManager.initializeContext(context);
            const initialStats = contextManager.getDeliveryStats();

            // Act - Apply status updates
            for (const update of statusUpdates) {
              // Only update if order exists
              const existingDelivery = context.currentDeliveries.find(d => d.id === update.orderId);
              if (existingDelivery) {
                contextManager.updateDeliveryStatus(update.orderId, update.newStatus);
              }
            }

            // Assert - Statistics should be consistent
            const finalStats = contextManager.getDeliveryStats();
            expect(finalStats.total).toBe(initialStats.total); // Total count shouldn't change
            
            // Sum of all status counts should equal total
            const statusSum = finalStats.pending + finalStats.pickedUp + finalStats.inTransit + 
                            finalStats.delivered + finalStats.failed;
            expect(statusSum).toBe(finalStats.total);
            
            // Completion rate should be valid
            expect(finalStats.completionRate).toBeGreaterThanOrEqual(0);
            expect(finalStats.completionRate).toBeLessThanOrEqual(1);
            
            if (finalStats.total > 0) {
              const expectedCompletionRate = (finalStats.delivered + finalStats.failed) / finalStats.total;
              expect(Math.abs(finalStats.completionRate - expectedCompletionRate)).toBeLessThan(0.001);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate contextually appropriate suggestions for any delivery scenario', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          async (context) => {
            // Arrange
            contextManager.initializeContext(context);

            // Act
            const suggestions = contextManager.generateSuggestions();

            // Assert - Suggestions should be relevant to context
            expect(Array.isArray(suggestions)).toBe(true);
            
            // Each suggestion should be a non-empty string
            suggestions.forEach(suggestion => {
              expect(typeof suggestion).toBe('string');
              expect(suggestion.length).toBeGreaterThan(0);
            });

            // If there are active deliveries, should have relevant suggestions
            const nextDelivery = contextManager.getNextDelivery();
            if (nextDelivery) {
              const hasNavigationSuggestion = suggestions.some(s => 
                s.toLowerCase().includes('navigate') || s.toLowerCase().includes('pickup') || s.toLowerCase().includes('delivery')
              );
              expect(hasNavigationSuggestion).toBe(true);
            }

            // If vehicle is moving slowly, should suggest traffic delay
            if (context.vehicleStatus.isMoving && context.vehicleStatus.speed < 5) {
              const hasTrafficSuggestion = suggestions.some(s => 
                s.toLowerCase().includes('traffic') || s.toLowerCase().includes('delay')
              );
              expect(hasTrafficSuggestion).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle delivery additions and removals consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          fc.array(
            fc.record({
              id: fc.string({ minLength: 8, maxLength: 15 }),
              status: fc.oneof(
                fc.constant('pending' as const),
                fc.constant('picked_up' as const),
                fc.constant('in_transit' as const)
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
            { minLength: 1, maxLength: 5 }
          ),
          async (initialContext, newDeliveries) => {
            // Arrange
            contextManager.initializeContext(initialContext);
            const initialCount = initialContext.currentDeliveries.length;

            // Act - Add new deliveries
            for (const delivery of newDeliveries) {
              contextManager.addDelivery(delivery);
            }

            // Assert - Count should increase correctly
            const contextAfterAdding = contextManager.getContext();
            expect(contextAfterAdding!.currentDeliveries.length).toBe(initialCount + newDeliveries.length);

            // All new deliveries should be present
            for (const delivery of newDeliveries) {
              const found = contextAfterAdding!.currentDeliveries.find(d => d.id === delivery.id);
              expect(found).toBeDefined();
              expect(found).toEqual(delivery);
            }

            // Act - Remove some deliveries
            const deliveriesToRemove = newDeliveries.slice(0, Math.ceil(newDeliveries.length / 2));
            for (const delivery of deliveriesToRemove) {
              const wasRemoved = contextManager.removeDelivery(delivery.id);
              expect(wasRemoved).toBe(true);
            }

            // Assert - Count should decrease correctly
            const contextAfterRemoving = contextManager.getContext();
            const expectedFinalCount = initialCount + newDeliveries.length - deliveriesToRemove.length;
            expect(contextAfterRemoving!.currentDeliveries.length).toBe(expectedFinalCount);

            // Removed deliveries should not be present
            for (const delivery of deliveriesToRemove) {
              const found = contextAfterRemoving!.currentDeliveries.find(d => d.id === delivery.id);
              expect(found).toBeUndefined();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should notify callbacks consistently for any context changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary,
          fc.array(locationArbitrary, { minLength: 1, maxLength: 5 }),
          async (context, locationUpdates) => {
            // Arrange
            contextManager.initializeContext(context);
            
            let contextUpdateCount = 0;
            let locationUpdateCount = 0;
            let lastContextUpdate: DeliveryContext | null = null;
            let lastLocationUpdate: GeoLocation | null = null;

            contextManager.onContextUpdate((ctx) => {
              contextUpdateCount++;
              lastContextUpdate = ctx;
            });

            contextManager.onLocationUpdate((loc) => {
              locationUpdateCount++;
              lastLocationUpdate = loc;
            });

            // Act - Apply location updates
            for (const location of locationUpdates) {
              contextManager.updateLocation(location);
            }

            // Assert - Callbacks should be called appropriately
            expect(contextUpdateCount).toBeGreaterThan(0);
            expect(locationUpdateCount).toBeGreaterThan(0);
            expect(lastContextUpdate).toBeDefined();
            expect(lastLocationUpdate).toBeDefined();

            // Last updates should match the final state
            const finalContext = contextManager.getContext();
            expect(lastContextUpdate).toEqual(finalContext);
            expect(lastLocationUpdate).toEqual(locationUpdates[locationUpdates.length - 1]);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should create valid status updates for any delivery state', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryContextArbitrary.filter(ctx => ctx.currentDeliveries.length > 0),
          fc.string({ minLength: 5, maxLength: 20 }), // status
          fc.option(fc.string({ maxLength: 200 })), // notes
          async (context, status, notes) => {
            // Arrange
            contextManager.initializeContext(context);
            const delivery = context.currentDeliveries[0];

            // Act
            const statusUpdate = contextManager.createStatusUpdate(delivery.id, status, notes);

            // Assert - Status update should be well-formed
            expect(statusUpdate.deliveryId).toBe(delivery.id);
            expect(statusUpdate.status).toBe(status);
            expect(statusUpdate.timestamp).toBeInstanceOf(Date);
            expect(statusUpdate.location).toEqual(context.location);
            
            if (notes) {
              expect(statusUpdate.notes).toBe(notes);
            }

            // Timestamp should be recent (within last few seconds)
            const now = new Date();
            const timeDiff = now.getTime() - statusUpdate.timestamp.getTime();
            expect(timeDiff).toBeLessThan(5000); // 5 seconds
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Context Update Edge Cases', () => {
    it('should handle rapid context updates without data corruption', async () => {
      const context: DeliveryContext = {
        partnerId: 'test-partner',
        currentDeliveries: [
          {
            id: 'delivery-1',
            status: 'pending',
            pickupLocation: {
              street: '123 Main St',
              city: 'Test City',
              state: 'TS',
              zipCode: '12345',
              coordinates: { latitude: 40.7128, longitude: -74.0060 }
            },
            deliveryLocation: {
              street: '456 Oak Ave',
              city: 'Test City',
              state: 'TS',
              zipCode: '12345',
              coordinates: { latitude: 40.7589, longitude: -73.9851 }
            },
            customerInfo: {
              name: 'Test Customer',
              phone: '555-0123'
            },
            estimatedTime: new Date()
          }
        ],
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

      contextManager.initializeContext(context);

      // Rapid updates
      for (let i = 0; i < 100; i++) {
        contextManager.updateLocation({
          latitude: 40.7128 + (i * 0.001),
          longitude: -74.0060 + (i * 0.001)
        });
        
        contextManager.updateDeliveryStatus('delivery-1', i % 2 === 0 ? 'pending' : 'picked_up');
      }

      // Context should remain consistent
      const finalContext = contextManager.getContext();
      expect(finalContext).toBeDefined();
      expect(finalContext!.currentDeliveries.length).toBe(1);
      expect(finalContext!.currentDeliveries[0].id).toBe('delivery-1');
    });

    it('should handle invalid operations gracefully', async () => {
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

      contextManager.initializeContext(context);

      // Try to update non-existent delivery
      const result = contextManager.updateDeliveryStatus('non-existent', 'delivered');
      expect(result).toBe(false);

      // Try to remove non-existent delivery
      const removeResult = contextManager.removeDelivery('non-existent');
      expect(removeResult).toBe(false);

      // Context should remain unchanged
      const finalContext = contextManager.getContext();
      expect(finalContext!.currentDeliveries.length).toBe(0);
    });
  });
});