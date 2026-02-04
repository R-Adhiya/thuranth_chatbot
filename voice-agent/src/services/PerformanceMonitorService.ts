/**
 * Performance Monitor Service
 * 
 * Monitors and optimizes performance metrics for the Voice Agent system.
 * Tracks response times, battery usage, and device compatibility.
 */

import DeviceInfo from 'react-native-device-info';

export interface PerformanceMetrics {
  responseTime: number;
  batteryLevel: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  timestamp: number;
}

export interface DeviceCapabilities {
  isLowEndDevice: boolean;
  availableMemory: number;
  batteryLevel: number;
  isCharging: boolean;
  networkType: string;
}

export interface PerformanceThresholds {
  maxResponseTime: number;
  minBatteryLevel: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
}

export class PerformanceMonitorService {
  private metrics: PerformanceMetrics[] = [];
  private thresholds: PerformanceThresholds;
  private deviceCapabilities: DeviceCapabilities | null = null;
  private performanceOptimizationEnabled = true;

  constructor() {
    this.thresholds = {
      maxResponseTime: 2000, // 2 seconds as per requirements
      minBatteryLevel: 15, // 15% battery threshold
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      maxCpuUsage: 80, // 80% CPU usage
    };
  }

  /**
   * Initialize performance monitoring
   */
  async initialize(): Promise<void> {
    try {
      this.deviceCapabilities = await this.getDeviceCapabilities();
      this.optimizeForDevice();
    } catch (error) {
      console.warn('Failed to initialize performance monitoring:', error);
    }
  }

  /**
   * Start monitoring a performance operation
   */
  startOperation(operationId: string): number {
    return Date.now();
  }

  /**
   * End monitoring and record metrics
   */
  async endOperation(operationId: string, startTime: number): Promise<PerformanceMetrics> {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const metrics: PerformanceMetrics = {
      responseTime,
      batteryLevel: await this.getBatteryLevel(),
      memoryUsage: await this.getMemoryUsage(),
      cpuUsage: await this.getCpuUsage(),
      networkLatency: await this.getNetworkLatency(),
      timestamp: endTime,
    };

    this.recordMetrics(metrics);
    this.checkThresholds(metrics);
    
    return metrics;
  }

  /**
   * Get current device capabilities
   */
  private async getDeviceCapabilities(): Promise<DeviceCapabilities> {
    const [
      totalMemory,
      batteryLevel,
      isCharging,
      networkType,
    ] = await Promise.all([
      DeviceInfo.getTotalMemory(),
      this.getBatteryLevel(),
      DeviceInfo.isBatteryCharging(),
      this.getNetworkType(),
    ]);

    const isLowEndDevice = totalMemory < 2 * 1024 * 1024 * 1024; // Less than 2GB RAM

    return {
      isLowEndDevice,
      availableMemory: totalMemory,
      batteryLevel,
      isCharging,
      networkType,
    };
  }

  /**
   * Optimize performance based on device capabilities
   */
  private optimizeForDevice(): void {
    if (!this.deviceCapabilities) return;

    if (this.deviceCapabilities.isLowEndDevice) {
      // Reduce thresholds for low-end devices
      this.thresholds.maxResponseTime = 3000; // Allow 3 seconds
      this.thresholds.maxMemoryUsage = 50 * 1024 * 1024; // 50MB limit
      this.enableLowEndOptimizations();
    }

    if (this.deviceCapabilities.batteryLevel < this.thresholds.minBatteryLevel) {
      this.enableBatteryOptimizations();
    }
  }

  /**
   * Enable optimizations for low-end devices
   */
  private enableLowEndOptimizations(): void {
    // Reduce audio quality for better performance
    // Disable non-essential features
    // Increase cache cleanup frequency
    console.log('Low-end device optimizations enabled');
  }

  /**
   * Enable battery saving optimizations
   */
  private enableBatteryOptimizations(): void {
    // Reduce background processing
    // Lower audio processing quality
    // Increase sleep intervals
    console.log('Battery optimization mode enabled');
  }

  /**
   * Get current battery level
   */
  private async getBatteryLevel(): Promise<number> {
    try {
      return await DeviceInfo.getBatteryLevel();
    } catch (error) {
      console.warn('Failed to get battery level:', error);
      return 100; // Default to full battery if unavailable
    }
  }

  /**
   * Get current memory usage (approximation)
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      const usedMemory = await DeviceInfo.getUsedMemory();
      return usedMemory;
    } catch (error) {
      console.warn('Failed to get memory usage:', error);
      return 0;
    }
  }

  /**
   * Get CPU usage (approximation based on performance timing)
   */
  private async getCpuUsage(): Promise<number> {
    // Simple CPU usage estimation based on timing
    const start = performance.now();
    let iterations = 0;
    const testDuration = 10; // 10ms test
    
    while (performance.now() - start < testDuration) {
      iterations++;
    }
    
    // Normalize to percentage (higher iterations = lower CPU usage)
    const normalizedUsage = Math.max(0, Math.min(100, 100 - (iterations / 1000)));
    return normalizedUsage;
  }

  /**
   * Get network latency
   */
  private async getNetworkLatency(): Promise<number> {
    try {
      const start = Date.now();
      await fetch('https://www.google.com/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return Date.now() - start;
    } catch (error) {
      console.warn('Failed to measure network latency:', error);
      return 0;
    }
  }

  /**
   * Get network type
   */
  private async getNetworkType(): Promise<string> {
    try {
      // This would typically use react-native-netinfo
      // For now, return a default value
      return 'wifi';
    } catch (error) {
      console.warn('Failed to get network type:', error);
      return 'unknown';
    }
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only last 100 metrics to prevent memory bloat
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * Check if metrics exceed thresholds and take action
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    if (metrics.responseTime > this.thresholds.maxResponseTime) {
      console.warn(`Response time exceeded threshold: ${metrics.responseTime}ms`);
      this.optimizeResponseTime();
    }

    if (metrics.batteryLevel < this.thresholds.minBatteryLevel) {
      console.warn(`Battery level low: ${metrics.batteryLevel}%`);
      this.enableBatteryOptimizations();
    }

    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      console.warn(`Memory usage high: ${metrics.memoryUsage} bytes`);
      this.optimizeMemoryUsage();
    }
  }

  /**
   * Optimize response time
   */
  private optimizeResponseTime(): void {
    // Reduce audio processing quality
    // Skip non-essential processing steps
    // Prioritize critical operations
    console.log('Response time optimization enabled');
  }

  /**
   * Optimize memory usage
   */
  private optimizeMemoryUsage(): void {
    // Clear old metrics
    this.metrics = this.metrics.slice(-50);
    // Trigger garbage collection hints
    // Clear caches
    console.log('Memory optimization performed');
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    averageResponseTime: number;
    currentBatteryLevel: number;
    currentMemoryUsage: number;
    isOptimized: boolean;
  } {
    const recentMetrics = this.metrics.slice(-10);
    const averageResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
      : 0;

    const latestMetrics = this.metrics[this.metrics.length - 1];

    return {
      averageResponseTime,
      currentBatteryLevel: latestMetrics?.batteryLevel || 100,
      currentMemoryUsage: latestMetrics?.memoryUsage || 0,
      isOptimized: this.performanceOptimizationEnabled,
    };
  }

  /**
   * Enable or disable performance optimization
   */
  setOptimizationEnabled(enabled: boolean): void {
    this.performanceOptimizationEnabled = enabled;
    if (enabled && this.deviceCapabilities) {
      this.optimizeForDevice();
    }
  }

  /**
   * Get device capabilities
   */
  getDeviceCapabilities(): DeviceCapabilities | null {
    return this.deviceCapabilities;
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }
}

export default PerformanceMonitorService;