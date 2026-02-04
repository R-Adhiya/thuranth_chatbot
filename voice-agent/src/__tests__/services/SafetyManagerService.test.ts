/**
 * Property-Based Tests for SafetyManagerService
 * Feature: voice-agent, Property 15: Hands-Free Operation
 * Validates: Requirements 7.1, 7.5
 * 
 * Feature: voice-agent, Property 16: Safety-First Interface
 * Validates: Requirements 7.2, 7.4
 */

import fc from 'fast-check';
import { SafetyManagerService } from '@/services/SafetyManagerService';
import { VehicleStatus, GeoLocation, OperationMode, SafetySituation } from '@/types';

describe('SafetyManagerService Property Tests', () => {
  let safetyManager: SafetyManagerService;

  beforeEach(() => {
    jest.clearAllMocks();
    safetyManager = new SafetyManagerService();
  });

  /**
   * Property 15: Hands-Free Operation
   * For any delivery partner interaction, the Voice_Agent should function effectively 
   * without requiring visual attention or two-handed operation
   */
  describe('Property 15: Hands-Free Operation', () => {
    // Generator for vehicle status data
    const vehicleStatusArbitrary = fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      type: fc.oneof(
        fc.constant('car' as const),
        fc.constant('bike' as const),
        fc.constant('truck' as const),
        fc.constant('van' as const)
      ),
      isMoving: fc.boolean(),
      speed: fc.float({ min: 0, max: 120 }), // km/h
      fuelLevel: fc.option(fc.float({ min: 0, max: 1 })),
      batteryLevel: fc.option(fc.float({ min: 0, max: 1 }))
    });

    // Generator for location data
    const locationArbitrary = fc.record({
      latitude: fc.float({ min: -90, max: 90 }),
      longitude: fc.float({ min: -180, max: 180 }),
      accuracy: fc.option(fc.float({ min: 0, max: 100 }))
    });

    // Generator for operation modes
    const operationModeArbitrary = fc.oneof(
      fc.constant('normal' as const),
      fc.constant('driving' as const),
      fc.constant('hands_free' as const),
      fc.constant('safety_critical' as const)
    );

    it('should enable hands-free mode for any delivery partner interaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          vehicleStatusArbitrary,
          locationArbitrary,
          async (vehicleStatus, location) => {
            // Arrange
            let stateChangeEvents: any[] = [];
            safetyManager.onSafetyStateChange((state) => {
              stateChangeEvents.push(state);
            });

            // Act - Enable hands-free mode
            safetyManager.enableHandsFreeMode();
            safetyManager.updateVehicleStatus(vehicleStatus);
            safetyManager.updateLocation(location);

            // Assert - Hands-free mode should be active
            expect(safetyManager.isHandsFreeMode()).toBe(true);
            
            const safetyState = safetyManager.getSafetyState();
            expect(safetyState.isHandsFreeMode).toBe(true);
            
            // Should function without requiring visual attention
            expect(safetyManager.isVoiceOnlyMode()).toBe(true);
            
            // Should not require two-handed operation
            const operationMode = safetyManager.getOperationMode();
            expect(['hands_free', 'safety_critical']).toContain(operationMode);

            // State change event should be emitted
            expect(stateChangeEvents.length).toBeGreaterThan(0);
            expect(stateChangeEvents[0].isHandsFreeMode).toBe(true);
          }
        ),
        { numRuns: 100, timeout: 5000 }
      );
    });

    it('should maintain hands-free functionality across any vehicle status changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(vehicleStatusArbitrary, { minLength: 2, maxLength: 10 }),
          async (vehicleStatuses) => {
            // Arrange
            safetyManager.enableHandsFreeMode();

            // Act - Update vehicle status multiple times
            for (const status of vehicleStatuses) {
              safetyManager.updateVehicleStatus(status);
              
              // Assert - Hands-free mode should remain active
              expect(safetyManager.isHandsFreeMode()).toBe(true);
              expect(safetyManager.isVoiceOnlyMode()).toBe(true);
              
              const safetyState = safetyManager.getSafetyState();
              expect(safetyState.isHandsFreeMode).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should support one-handed operation for any interaction mode', async () => {
      await fc.assert(
        fc.asyncProperty(
          operationModeArbitrary,
          vehicleStatusArbitrary,
          async (mode, vehicleStatus) => {
            // Arrange
            safetyManager.setOperationMode(mode);
            safetyManager.updateVehicleStatus(vehicleStatus);

            // Act & Assert - Check if mode supports one-handed operation
            const currentMode = safetyManager.getOperationMode();
            const isVoiceOnly = safetyManager.isVoiceOnlyMode();
            const shouldMinimizeVisual = safetyManager.shouldMinimizeVisualInterface();

            // For hands-free and safety-critical modes, should be voice-only
            if (currentMode === 'hands_free' || currentMode === 'safety_critical') {
              expect(isVoiceOnly).toBe(true);
            }

            // For driving mode, should minimize visual interface
            if (currentMode === 'driving') {
              expect(shouldMinimizeVisual).toBe(true);
            }

            // All modes should be operable (no exceptions thrown)
            expect(currentMode).toBeDefined();
            expect(typeof isVoiceOnly).toBe('boolean');
            expect(typeof shouldMinimizeVisual).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect and respond to safety situations without manual intervention', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            speed: fc.float({ min: 0, max: 150 }),
            isMoving: fc.boolean(),
            id: fc.string({ minLength: 1 }),
            type: fc.oneof(fc.constant('car'), fc.constant('bike'), fc.constant('truck'), fc.constant('van'))
          }),
          async (vehicleData) => {
            // Arrange
            let safetyEvents: any[] = [];
            safetyManager.onEvent((event, data) => {
              if (event === 'safety_situation_detected') {
                safetyEvents.push(data);
              }
            });

            const vehicleStatus: VehicleStatus = {
              ...vehicleData,
              fuelLevel: 0.5,
              batteryLevel: 0.8
            };

            // Act
            safetyManager.updateVehicleStatus(vehicleStatus);
            const detectedSituation = safetyManager.detectSafetySituation();

            // Assert - Safety detection should work for any vehicle data
            expect(detectedSituation).toBeDefined();
            expect(detectedSituation.type).toBeDefined();
            expect(detectedSituation.severity).toBeDefined();
            expect(detectedSituation.timestamp).toBeInstanceOf(Date);

            // High-speed situations should be detected
            if (vehicleData.speed > 80) {
              expect(['high_speed', 'emergency_braking', 'sharp_turn']).toContain(detectedSituation.type);
            }

            // Safety state should be consistent
            const safetyState = safetyManager.getSafetyState();
            expect(safetyState.currentSituation).toEqual(detectedSituation);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve hands-free mode across mode transitions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 2, maxLength: 8 }),
          async (modeToggles) => {
            // Act - Toggle hands-free mode multiple times
            let currentHandsFreeState = false;
            
            for (const shouldEnable of modeToggles) {
              if (shouldEnable && !currentHandsFreeState) {
                safetyManager.enableHandsFreeMode();
                currentHandsFreeState = true;
              } else if (!shouldEnable && currentHandsFreeState) {
                safetyManager.disableHandsFreeMode();
                currentHandsFreeState = false;
              }

              // Assert - State should match expected
              expect(safetyManager.isHandsFreeMode()).toBe(currentHandsFreeState);
              
              const safetyState = safetyManager.getSafetyState();
              expect(safetyState.isHandsFreeMode).toBe(currentHandsFreeState);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 16: Safety-First Interface
   * For any driving mode activation or safety situation, the Voice_Agent should prioritize 
   * voice interactions and minimize visual distractions
   */
  describe('Property 16: Safety-First Interface', () => {
    // Generator for safety situations
    const safetySituationArbitrary = fc.record({
      type: fc.oneof(
        fc.constant('emergency_braking' as const),
        fc.constant('sharp_turn' as const),
        fc.constant('high_speed' as const),
        fc.constant('traffic_congestion' as const),
        fc.constant('none' as const)
      ),
      severity: fc.oneof(
        fc.constant('low' as const),
        fc.constant('medium' as const),
        fc.constant('high' as const)
      ),
      timestamp: fc.date(),
      vehicleData: fc.option(fc.record({
        speed: fc.float({ min: 0, max: 150 }),
        acceleration: fc.float({ min: -10, max: 10 }),
        gpsAccuracy: fc.float({ min: 0, max: 100 })
      }))
    });

    it('should prioritize voice interactions when driving mode is activated', async () => {
      await fc.assert(
        fc.asyncProperty(
          vehicleStatusArbitrary,
          async (vehicleStatus) => {
            // Arrange
            let modeChangeEvents: any[] = [];
            safetyManager.onEvent((event, data) => {
              if (event === 'driving_mode_enabled') {
                modeChangeEvents.push(data);
              }
            });

            // Act - Enable driving mode
            safetyManager.enableDrivingMode();
            safetyManager.updateVehicleStatus(vehicleStatus);

            // Assert - Should prioritize voice interactions
            expect(safetyManager.isDrivingModeActive()).toBe(true);
            expect(safetyManager.shouldMinimizeVisualInterface()).toBe(true);
            
            const operationMode = safetyManager.getOperationMode();
            expect(operationMode).toBe('driving');

            // Should emit driving mode enabled event
            expect(modeChangeEvents.length).toBeGreaterThan(0);
            expect(modeChangeEvents[0].mode).toBe('driving');

            // Safety state should reflect driving mode
            const safetyState = safetyManager.getSafetyState();
            expect(safetyState.isDrivingMode).toBe(true);
            expect(safetyState.distractionsMinimized).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should minimize visual distractions for any high-severity safety situation', async () => {
      await fc.assert(
        fc.asyncProperty(
          vehicleStatusArbitrary,
          fc.float({ min: 80, max: 150 }), // High speed to trigger safety situation
          async (baseVehicleStatus, highSpeed) => {
            // Arrange
            const vehicleStatus: VehicleStatus = {
              ...baseVehicleStatus,
              speed: highSpeed,
              isMoving: true
            };

            let safetyEvents: any[] = [];
            safetyManager.onEvent((event, data) => {
              if (event === 'safety_situation_detected') {
                safetyEvents.push(data);
              }
            });

            // Act - Update with high-speed vehicle status
            safetyManager.updateVehicleStatus(vehicleStatus);
            const detectedSituation = safetyManager.detectSafetySituation();

            // Assert - Should minimize distractions for high-severity situations
            if (detectedSituation.severity === 'high') {
              expect(safetyManager.getOperationMode()).toBe('safety_critical');
              expect(safetyManager.shouldMinimizeVisualInterface()).toBe(true);
              
              const safetyState = safetyManager.getSafetyState();
              expect(safetyState.distractionsMinimized).toBe(true);
            }

            // Should detect high-speed situation
            expect(['high_speed', 'emergency_braking', 'sharp_turn']).toContain(detectedSituation.type);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain safety-first interface across any operation mode changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(operationModeArbitrary, { minLength: 2, maxLength: 6 }),
          vehicleStatusArbitrary,
          async (modes, vehicleStatus) => {
            // Act - Change operation modes
            for (const mode of modes) {
              safetyManager.setOperationMode(mode);
              safetyManager.updateVehicleStatus(vehicleStatus);

              // Assert - Safety-first principles should be maintained
              const currentMode = safetyManager.getOperationMode();
              const shouldMinimizeVisual = safetyManager.shouldMinimizeVisualInterface();
              const isVoiceOnly = safetyManager.isVoiceOnlyMode();

              // Safety-critical and driving modes should minimize visual interface
              if (currentMode === 'safety_critical' || currentMode === 'driving') {
                expect(shouldMinimizeVisual).toBe(true);
              }

              // Hands-free and safety-critical modes should be voice-only
              if (currentMode === 'hands_free' || currentMode === 'safety_critical') {
                expect(isVoiceOnly).toBe(true);
              }

              // All modes should be valid
              expect(['normal', 'driving', 'hands_free', 'safety_critical']).toContain(currentMode);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should restore normal interface only when safe for any safety situation', async () => {
      await fc.assert(
        fc.asyncProperty(
          vehicleStatusArbitrary,
          fc.float({ min: 0, max: 50 }), // Low speed for safe conditions
          async (baseVehicleStatus, safeSpeed) => {
            // Arrange - Start with driving mode enabled
            safetyManager.enableDrivingMode();
            
            const safeVehicleStatus: VehicleStatus = {
              ...baseVehicleStatus,
              speed: safeSpeed,
              isMoving: false // Stationary for safety
            };

            // Act - Update with safe vehicle status and disable driving mode
            safetyManager.updateVehicleStatus(safeVehicleStatus);
            const safetySituation = safetyManager.detectSafetySituation();
            
            // Only restore if truly safe
            if (safetySituation.severity === 'low' && safetySituation.type === 'none') {
              safetyManager.disableDrivingMode();
              
              // Assert - Should restore normal interface when safe
              expect(safetyManager.isDrivingModeActive()).toBe(false);
              
              const safetyState = safetyManager.getSafetyState();
              expect(safetyState.isDrivingMode).toBe(false);
              
              // Should not minimize distractions when safe and not in driving mode
              if (safetyManager.getOperationMode() === 'normal') {
                expect(safetyState.distractionsMinimized).toBe(false);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should emit appropriate safety events for any state transition', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 2, maxLength: 4 }), // Driving mode toggles
          fc.array(fc.boolean(), { minLength: 2, maxLength: 4 }), // Hands-free toggles
          async (drivingToggles, handsFreToggles) => {
            // Arrange
            let events: string[] = [];
            safetyManager.onEvent((event) => {
              events.push(event);
            });

            // Act - Toggle modes
            for (let i = 0; i < Math.min(drivingToggles.length, handsFreToggles.length); i++) {
              if (drivingToggles[i]) {
                safetyManager.enableDrivingMode();
              } else {
                safetyManager.disableDrivingMode();
              }

              if (handsFreToggles[i]) {
                safetyManager.enableHandsFreeMode();
              } else {
                safetyManager.disableHandsFreeMode();
              }
            }

            // Assert - Should emit appropriate events
            const expectedEvents = ['driving_mode_enabled', 'driving_mode_disabled', 'hands_free_enabled', 'hands_free_disabled'];
            const receivedExpectedEvents = events.filter(event => expectedEvents.includes(event));
            
            // Should have received at least some safety-related events
            expect(receivedExpectedEvents.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle concurrent safety operations without conflicts', async () => {
      await fc.assert(
        fc.asyncProperty(
          operationModeArbitrary,
          vehicleStatusArbitrary,
          locationArbitrary,
          async (mode, vehicleStatus, location) => {
            // Act - Perform concurrent operations
            safetyManager.setOperationMode(mode);
            safetyManager.updateVehicleStatus(vehicleStatus);
            safetyManager.updateLocation(location);
            
            const situation1 = safetyManager.detectSafetySituation();
            const situation2 = safetyManager.detectSafetySituation();

            // Assert - Should handle concurrent operations consistently
            expect(situation1).toEqual(situation2);
            
            const safetyState = safetyManager.getSafetyState();
            expect(safetyState.operationMode).toBe(mode);
            expect(safetyState.currentSituation).toBeDefined();
            
            // State should be internally consistent
            expect(typeof safetyState.isDrivingMode).toBe('boolean');
            expect(typeof safetyState.isHandsFreeMode).toBe('boolean');
            expect(typeof safetyState.distractionsMinimized).toBe('boolean');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle rapid mode switching without state corruption', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 5, maxLength: 20 }),
          async (rapidToggles) => {
            // Act - Rapid mode switching
            for (const toggle of rapidToggles) {
              if (toggle) {
                safetyManager.enableDrivingMode();
                safetyManager.enableHandsFreeMode();
              } else {
                safetyManager.disableDrivingMode();
                safetyManager.disableHandsFreeMode();
              }
            }

            // Assert - State should be consistent
            const safetyState = safetyManager.getSafetyState();
            expect(typeof safetyState.isDrivingMode).toBe('boolean');
            expect(typeof safetyState.isHandsFreeMode).toBe('boolean');
            expect(['normal', 'driving', 'hands_free', 'safety_critical']).toContain(safetyState.operationMode);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle invalid vehicle data gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.string(),
            type: fc.oneof(fc.constant('car'), fc.constant('bike'), fc.constant('truck'), fc.constant('van')),
            isMoving: fc.boolean(),
            speed: fc.float({ min: -50, max: 300 }), // Include invalid speeds
            fuelLevel: fc.option(fc.float({ min: -1, max: 2 })), // Include invalid levels
            batteryLevel: fc.option(fc.float({ min: -1, max: 2 }))
          }),
          async (invalidVehicleData) => {
            // Act - Should not throw errors with invalid data
            expect(() => {
              safetyManager.updateVehicleStatus(invalidVehicleData as VehicleStatus);
              safetyManager.detectSafetySituation();
            }).not.toThrow();

            // Assert - Should maintain valid state
            const safetyState = safetyManager.getSafetyState();
            expect(safetyState).toBeDefined();
            expect(safetyState.currentSituation).toBeDefined();
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});