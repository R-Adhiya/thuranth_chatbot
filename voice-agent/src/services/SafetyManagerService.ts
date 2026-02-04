/**
 * Safety Manager Service
 * 
 * Manages safety and usability features for hands-free operation during delivery tasks.
 * Implements driving mode, hands-free operation, safety situation detection, and distraction minimization.
 */

import { 
  SafetyManager, 
  SafetySituation, 
  SafetyState, 
  OperationMode, 
  VehicleStatus, 
  GeoLocation,
  VoiceAgentEvent 
} from '../types';

export class SafetyManagerService implements SafetyManager {
  private isDrivingModeEnabled: boolean = false;
  private isHandsFreeModeEnabled: boolean = false;
  private currentOperationMode: OperationMode = 'normal';
  private currentSafetySituation: SafetySituation = {
    type: 'none',
    severity: 'low',
    timestamp: new Date()
  };
  private distractionsMinimized: boolean = false;
  private safetyStateCallbacks: Array<(state: SafetyState) => void> = [];
  private eventCallbacks: Array<(event: VoiceAgentEvent, data?: any) => void> = [];
  
  // Vehicle monitoring data
  private lastVehicleStatus: VehicleStatus | null = null;
  private lastLocation: GeoLocation | null = null;
  private speedHistory: number[] = [];
  private accelerationHistory: number[] = [];
  
  // Safety thresholds
  private readonly SPEED_THRESHOLD_HIGH = 80; // km/h
  private readonly ACCELERATION_THRESHOLD = 5; // m/s²
  private readonly SHARP_TURN_THRESHOLD = 30; // degrees/second
  private readonly HISTORY_SIZE = 10;

  /**
   * Enable driving mode with voice-priority interface
   */
  enableDrivingMode(): void {
    if (!this.isDrivingModeEnabled) {
      this.isDrivingModeEnabled = true;
      this.currentOperationMode = 'driving';
      this.minimizeDistractions();
      this.notifyStateChange();
      this.emitEvent('driving_mode_enabled', { mode: this.currentOperationMode });
    }
  }

  /**
   * Disable driving mode and restore normal interface
   */
  disableDrivingMode(): void {
    if (this.isDrivingModeEnabled) {
      this.isDrivingModeEnabled = false;
      this.currentOperationMode = this.isHandsFreeModeEnabled ? 'hands_free' : 'normal';
      this.restoreNormalInterface();
      this.notifyStateChange();
      this.emitEvent('driving_mode_disabled', { mode: this.currentOperationMode });
    }
  }

  /**
   * Check if driving mode is currently active
   */
  isDrivingModeActive(): boolean {
    return this.isDrivingModeEnabled;
  }

  /**
   * Enable hands-free operation mode
   */
  enableHandsFreeMode(): void {
    if (!this.isHandsFreeModeEnabled) {
      this.isHandsFreeModeEnabled = true;
      if (!this.isDrivingModeEnabled) {
        this.currentOperationMode = 'hands_free';
      }
      this.notifyStateChange();
      this.emitEvent('hands_free_enabled', { mode: this.currentOperationMode });
    }
  }

  /**
   * Disable hands-free operation mode
   */
  disableHandsFreeMode(): void {
    if (this.isHandsFreeModeEnabled) {
      this.isHandsFreeModeEnabled = false;
      if (!this.isDrivingModeEnabled) {
        this.currentOperationMode = 'normal';
        this.restoreNormalInterface();
      }
      this.notifyStateChange();
      this.emitEvent('hands_free_disabled', { mode: this.currentOperationMode });
    }
  }

  /**
   * Check if hands-free mode is currently active
   */
  isHandsFreeMode(): boolean {
    return this.isHandsFreeModeEnabled;
  }

  /**
   * Detect current safety situation based on vehicle data
   */
  detectSafetySituation(): SafetySituation {
    if (!this.lastVehicleStatus) {
      return this.currentSafetySituation;
    }

    const situation: SafetySituation = {
      type: 'none',
      severity: 'low',
      timestamp: new Date(),
      vehicleData: {
        speed: this.lastVehicleStatus.speed,
        acceleration: this.calculateCurrentAcceleration(),
        gpsAccuracy: this.lastLocation?.accuracy || 0
      }
    };

    // Detect high speed situation
    if (this.lastVehicleStatus.speed > this.SPEED_THRESHOLD_HIGH) {
      situation.type = 'high_speed';
      situation.severity = 'medium';
    }

    // Detect emergency braking
    const acceleration = this.calculateCurrentAcceleration();
    if (Math.abs(acceleration) > this.ACCELERATION_THRESHOLD) {
      situation.type = 'emergency_braking';
      situation.severity = 'high';
    }

    // Detect sharp turns (simplified - would need gyroscope data in real implementation)
    if (this.detectSharpTurn()) {
      situation.type = 'sharp_turn';
      situation.severity = 'medium';
    }

    // Update current situation if it changed
    if (situation.type !== this.currentSafetySituation.type || 
        situation.severity !== this.currentSafetySituation.severity) {
      this.currentSafetySituation = situation;
      
      // Switch to safety critical mode for high severity situations
      if (situation.severity === 'high') {
        this.currentOperationMode = 'safety_critical';
        this.minimizeDistractions();
      }
      
      this.notifyStateChange();
      this.emitEvent('safety_situation_detected', situation);
    }

    return this.currentSafetySituation;
  }

  /**
   * Minimize distractions for safety
   */
  minimizeDistractions(): void {
    if (!this.distractionsMinimized) {
      this.distractionsMinimized = true;
      // In a real implementation, this would:
      // - Reduce visual elements
      // - Increase voice feedback
      // - Disable non-essential features
      // - Prioritize critical delivery functions
    }
  }

  /**
   * Restore normal interface when safe
   */
  restoreNormalInterface(): void {
    if (this.distractionsMinimized && 
        this.currentOperationMode !== 'safety_critical' && 
        this.currentSafetySituation.severity !== 'high') {
      this.distractionsMinimized = false;
      // In a real implementation, this would:
      // - Restore full visual interface
      // - Re-enable all features
      // - Return to normal interaction patterns
    }
  }

  /**
   * Get current operation mode
   */
  getOperationMode(): OperationMode {
    return this.currentOperationMode;
  }

  /**
   * Set operation mode manually
   */
  setOperationMode(mode: OperationMode): void {
    const previousMode = this.currentOperationMode;
    this.currentOperationMode = mode;

    // Update related flags based on mode
    switch (mode) {
      case 'normal':
        this.isDrivingModeEnabled = false;
        this.isHandsFreeModeEnabled = false;
        this.restoreNormalInterface();
        break;
      case 'driving':
        this.isDrivingModeEnabled = true;
        this.minimizeDistractions();
        break;
      case 'hands_free':
        this.isHandsFreeModeEnabled = true;
        break;
      case 'safety_critical':
        this.minimizeDistractions();
        break;
    }

    if (previousMode !== mode) {
      this.notifyStateChange();
    }
  }

  /**
   * Register callback for safety state changes
   */
  onSafetyStateChange(callback: (state: SafetyState) => void): void {
    this.safetyStateCallbacks.push(callback);
  }

  /**
   * Register callback for voice agent events
   */
  onEvent(callback: (event: VoiceAgentEvent, data?: any) => void): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Update vehicle status for safety monitoring
   */
  updateVehicleStatus(status: VehicleStatus): void {
    this.lastVehicleStatus = status;
    
    // Update speed history
    this.speedHistory.push(status.speed);
    if (this.speedHistory.length > this.HISTORY_SIZE) {
      this.speedHistory.shift();
    }

    // Calculate and store acceleration
    const acceleration = this.calculateCurrentAcceleration();
    this.accelerationHistory.push(acceleration);
    if (this.accelerationHistory.length > this.HISTORY_SIZE) {
      this.accelerationHistory.shift();
    }

    // Detect safety situations
    this.detectSafetySituation();
  }

  /**
   * Update location for safety monitoring
   */
  updateLocation(location: GeoLocation): void {
    this.lastLocation = location;
  }

  /**
   * Get current safety state
   */
  getSafetyState(): SafetyState {
    return {
      isDrivingMode: this.isDrivingModeEnabled,
      isHandsFreeMode: this.isHandsFreeModeEnabled,
      currentSituation: this.currentSafetySituation,
      operationMode: this.currentOperationMode,
      distractionsMinimized: this.distractionsMinimized
    };
  }

  /**
   * Check if voice-only interaction is required
   */
  isVoiceOnlyMode(): boolean {
    return this.currentOperationMode === 'hands_free' || 
           this.currentOperationMode === 'safety_critical' ||
           (this.currentOperationMode === 'driving' && this.currentSafetySituation.severity === 'high');
  }

  /**
   * Check if visual interface should be minimized
   */
  shouldMinimizeVisualInterface(): boolean {
    return this.currentOperationMode === 'driving' || 
           this.currentOperationMode === 'safety_critical' ||
           this.distractionsMinimized;
  }

  // Private helper methods

  private calculateCurrentAcceleration(): number {
    if (this.speedHistory.length < 2) {
      return 0;
    }
    
    const currentSpeed = this.speedHistory[this.speedHistory.length - 1];
    const previousSpeed = this.speedHistory[this.speedHistory.length - 2];
    
    // Simplified acceleration calculation (would need time intervals in real implementation)
    return currentSpeed - previousSpeed;
  }

  private detectSharpTurn(): boolean {
    // Simplified sharp turn detection
    // In a real implementation, this would use gyroscope data
    if (this.accelerationHistory.length < 3) {
      return false;
    }
    
    const recentAccelerations = this.accelerationHistory.slice(-3);
    const variance = this.calculateVariance(recentAccelerations);
    
    return variance > 2; // Threshold for detecting erratic movement
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private notifyStateChange(): void {
    const state = this.getSafetyState();
    this.safetyStateCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in safety state callback:', error);
      }
    });
  }

  private emitEvent(event: VoiceAgentEvent, data?: any): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    });
  }
}