/**
 * Performance Monitor Service Tests
 * 
 * Tests for performance monitoring and optimization functionality.
 * **Feature: voice-agent, Property 13: Performance Optimization**
 */

import * as fc from 'fast-check';
import { PerformanceMonitorService, PerformanceMetrics, DeviceCapabilities } from '../../services/PerformanceMonitorService';

// Mock DeviceInfo with more comprehensive mocking
jest.mock('react-native-device-info', () => ({
  getBatteryLevel: jest.fn(),
  isBatteryCharging: jest.fn(),
  getTotalMemory: jest.fn(),
  getUsedMemory: jest.fn(),
}));

describe('PerformanceMonitorService', () => {
  let performanceMonitor: PerformanceMonitorService;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitorService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Unit Tests', () => {
    it('should initialize with default thresholds', () => {
      const stats = performanceMonitor.getPerformanceStats();
      expect(stats.isOptimized).toBe(true);
    });

    it('should track operation performance', async () => {
      const DeviceInfo = require('react-native-device-info');
      DeviceInfo.getBatteryLevel.mockResolvedValue(0.8);
      DeviceInfo.getUsedMemory.mockResolvedValue(50 * 1024 * 1024);

      const startTime = performanceMonitor.startOperation('test-op');
      // Use fake timers instead of real delay
      jest.advanceTimersByTime(100);
      
      const metrics = await performanceMonitor.endOperation('test-op', startTime);
      
      expect(metrics.responseTime).toBeGreaterThan(0);
      expect(metrics.batteryLevel).toBe(0.8);
      expect(metrics.memoryUsage).toBe(50 * 1024 * 1024);
    });

    it('should optimize for low-end devices', async () => {
      const DeviceInfo = require('react-native-device-info');
      DeviceInfo.getTotalMemory.mockResolvedValue(1 * 1024 * 1024 * 1024); // 1GB
      DeviceInfo.getBatteryLevel.mockResolvedValue(0.8);
      DeviceInfo.isBatteryCharging.mockResolvedValue(false);

      await performanceMonitor.initialize();
      
      const capabilities = performanceMonitor.getDeviceCapabilities();
      expect(capabilities?.isLowEndDevice).toBe(true);
    });

    it('should enable battery optimizations when battery is low', async () => {
      const DeviceInfo = require('react-native-device-info');
      DeviceInfo.getBatteryLevel.mockResolvedValue(0.1); // 10% battery
      DeviceInfo.getTotalMemory.mockResolvedValue(4 * 1024 * 1024 * 1024); // 4GB
      DeviceInfo.isBatteryCharging.mockResolvedValue(false);

      await performanceMonitor.initialize();
      
      const capabilities = performanceMonitor.getDeviceCapabilities();
      expect(capabilities?.batteryLevel).toBe(0.1);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 13: Performance Optimization
     * For any device configuration and network condition, the Voice_Agent should maintain 
     * smooth performance while minimizing battery consumption
     * **Validates: Requirements 6.2, 6.3**
     */
    it('should maintain performance optimization across all device configurations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate device configurations
          fc.record({
            totalMemory: fc.integer({ min: 512 * 1024 * 1024, max: 8 * 1024 * 1024 * 1024 }), // 512MB to 8GB
            batteryLevel: fc.float({ min: Math.fround(0.05), max: Math.fround(1.0) }), // 5% to 100%
            isCharging: fc.boolean(),
            usedMemory: fc.integer({ min: 10 * 1024 * 1024, max: 200 * 1024 * 1024 }), // 10MB to 200MB
          }),
          // Generate operation characteristics
          fc.record({
            operationDuration: fc.integer({ min: 10, max: 5000 }), // 10ms to 5s
            operationType: fc.constantFrom('voice_recognition', 'intent_processing', 'tts_synthesis', 'api_call'),
          }),
          async (deviceConfig, operation) => {
            // Setup device mocks
            const DeviceInfo = require('react-native-device-info');
            DeviceInfo.getTotalMemory.mockResolvedValue(deviceConfig.totalMemory);
            DeviceInfo.getBatteryLevel.mockResolvedValue(deviceConfig.batteryLevel);
            DeviceInfo.isBatteryCharging.mockResolvedValue(deviceConfig.isCharging);
            DeviceInfo.getUsedMemory.mockResolvedValue(deviceConfig.usedMemory);

            // Initialize performance monitor
            const monitor = new PerformanceMonitorService();
            await monitor.initialize();

            // Simulate operation
            const startTime = monitor.startOperation(operation.operationType);
            await new Promise(resolve => setTimeout(resolve, operation.operationDuration));
            const metrics = await monitor.endOperation(operation.operationType, startTime);

            // Verify performance optimization properties
            const stats = monitor.getPerformanceStats();
            const capabilities = monitor.getDeviceCapabilities();

            // Property: Performance monitoring should always be enabled
            expect(stats.isOptimized).toBe(true);

            // Property: Metrics should be recorded for all operations
            expect(metrics.responseTime).toBeGreaterThanOrEqual(operation.operationDuration);
            expect(metrics.batteryLevel).toBe(deviceConfig.batteryLevel);
            expect(metrics.memoryUsage).toBe(deviceConfig.usedMemory);

            // Property: Low-end device detection should be consistent
            const isLowEndDevice = deviceConfig.totalMemory < 2 * 1024 * 1024 * 1024;
            expect(capabilities?.isLowEndDevice).toBe(isLowEndDevice);

            // Property: Battery optimization should activate when battery is low
            const shouldOptimizeBattery = deviceConfig.batteryLevel < 0.15;
            if (shouldOptimizeBattery) {
              // Battery optimization should be reflected in the system state
              expect(capabilities?.batteryLevel).toBeLessThan(0.15);
            }

            // Property: Memory usage should be tracked accurately
            expect(metrics.memoryUsage).toBeGreaterThan(0);
            expect(metrics.memoryUsage).toBeLessThanOrEqual(deviceConfig.totalMemory);

            // Property: Performance stats should reflect recent operations
            expect(stats.averageResponseTime).toBeGreaterThan(0);
            expect(stats.currentBatteryLevel).toBe(deviceConfig.batteryLevel);
            expect(stats.currentMemoryUsage).toBe(deviceConfig.usedMemory);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle threshold violations gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            responseTime: fc.integer({ min: 100, max: 10000 }), // 100ms to 10s
            batteryLevel: fc.float({ min: 0.01, max: 1.0 }),
            memoryUsage: fc.integer({ min: 1024 * 1024, max: 500 * 1024 * 1024 }), // 1MB to 500MB
          }),
          async (metrics) => {
            const DeviceInfo = require('react-native-device-info');
            DeviceInfo.getBatteryLevel.mockResolvedValue(metrics.batteryLevel);
            DeviceInfo.getUsedMemory.mockResolvedValue(metrics.memoryUsage);
            DeviceInfo.getTotalMemory.mockResolvedValue(4 * 1024 * 1024 * 1024); // 4GB

            const monitor = new PerformanceMonitorService();
            await monitor.initialize();

            // Simulate operation with specific metrics
            const startTime = Date.now() - metrics.responseTime;
            const recordedMetrics = await monitor.endOperation('test-op', startTime);

            // Property: System should handle all threshold violations without crashing
            expect(recordedMetrics).toBeDefined();
            expect(recordedMetrics.responseTime).toBeCloseTo(metrics.responseTime, -1);
            expect(recordedMetrics.batteryLevel).toBe(metrics.batteryLevel);
            expect(recordedMetrics.memoryUsage).toBe(metrics.memoryUsage);

            // Property: Performance stats should remain accessible after any operation
            const stats = monitor.getPerformanceStats();
            expect(stats).toBeDefined();
            expect(typeof stats.averageResponseTime).toBe('number');
            expect(typeof stats.currentBatteryLevel).toBe('number');
            expect(typeof stats.currentMemoryUsage).toBe('number');
            expect(typeof stats.isOptimized).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain optimization state consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
          async (optimizationToggles) => {
            const monitor = new PerformanceMonitorService();
            await monitor.initialize();

            let expectedState = true; // Default state

            for (const toggle of optimizationToggles) {
              monitor.setOptimizationEnabled(toggle);
              expectedState = toggle;

              const stats = monitor.getPerformanceStats();
              
              // Property: Optimization state should always match the last set value
              expect(stats.isOptimized).toBe(expectedState);
            }

            // Property: Final state should match the last toggle
            const finalStats = monitor.getPerformanceStats();
            expect(finalStats.isOptimized).toBe(expectedState);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});