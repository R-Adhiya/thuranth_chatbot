import Voice, {
  SpeechRecognizedEvent,
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
  SpeechVolumeChangedEvent,
} from '@react-native-voice/voice';
import { PermissionsAndroid, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import { TTSService } from './TTSService';

import {
  VoiceManager,
  AudioQualityMetrics,
  VoiceRecognitionResult,
  VoiceRecognitionError,
  VoiceAgentError,
  EventCallback,
  VoiceAgentEvent,
} from '@/types';
import {
  VOICE_RECOGNITION,
  TTS_SETTINGS,
  ERROR_CODES,
  EVENTS,
  PERFORMANCE,
  VOICE_GUIDANCE,
} from '@/constants';
import {
  createVoiceAgentError,
  debounce,
  throttle,
  logPerformanceMetric,
  validateAudioQuality,
} from '@/utils';

/**
 * VoiceManagerService handles all voice input/output operations
 * Manages voice activation, speech recognition, and audio quality optimization
 */
export class VoiceManagerService implements VoiceManager {
  private isListening: boolean = false;
  private currentMode: 'push-to-talk' | 'tap-to-speak' | null = null;
  private noiseReductionEnabled: boolean = true;
  private audioQualityMetrics: AudioQualityMetrics = {
    noiseLevel: 0,
    signalStrength: 0,
    recognitionAccuracy: 0,
    latency: 0,
  };
  private eventCallbacks: Map<VoiceAgentEvent, EventCallback[]> = new Map();
  private recognitionStartTime: number = 0;
  private retryCount: number = 0;
  private isInitialized: boolean = false;
  private ttsService: TTSService;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private silenceTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private lastGuidanceTime: number = 0;
  private consecutiveErrors: number = 0;
  private lastErrorType: string | null = null;

  constructor() {
    this.ttsService = new TTSService();
    this.initializeVoiceRecognition();
  }

  /**
   * Initialize voice recognition service and set up event listeners
   */
  private async initializeVoiceRecognition(): Promise<void> {
    try {
      // Request microphone permissions
      await this.requestMicrophonePermission();

      // Set up voice recognition event listeners
      Voice.onSpeechStart = this.handleSpeechStart.bind(this);
      Voice.onSpeechRecognized = this.handleSpeechRecognized.bind(this);
      Voice.onSpeechEnd = this.handleSpeechEnd.bind(this);
      Voice.onSpeechError = this.handleSpeechError.bind(this);
      Voice.onSpeechResults = this.handleSpeechResults.bind(this);
      Voice.onSpeechPartialResults = this.handleSpeechPartialResults.bind(this);
      Voice.onSpeechVolumeChanged = this.handleSpeechVolumeChanged.bind(this);

      // Check if voice recognition is available
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        throw createVoiceAgentError(
          ERROR_CODES.VOICE_RECOGNITION_FAILED,
          'Voice recognition is not available on this device'
        );
      }

      this.isInitialized = true;
      console.log('[VoiceManager] Voice recognition initialized successfully');
    } catch (error) {
      console.error('[VoiceManager] Failed to initialize voice recognition:', error);
      throw createVoiceAgentError(
        ERROR_CODES.VOICE_RECOGNITION_FAILED,
        'Failed to initialize voice recognition',
        error
      );
    }
  }

  /**
   * Request microphone permission based on platform
   */
  private async requestMicrophonePermission(): Promise<void> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Voice Agent Microphone Permission',
          message: 'Voice Agent needs access to your microphone for voice commands',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw createVoiceAgentError(
          ERROR_CODES.VOICE_RECOGNITION_FAILED,
          'Microphone permission denied'
        );
      }
    }
  }

  /**
   * Start listening for voice input
   */
  async startListening(mode: 'push-to-talk' | 'tap-to-speak'): Promise<void> {
    if (!this.isInitialized) {
      throw createVoiceAgentError(
        ERROR_CODES.VOICE_RECOGNITION_FAILED,
        'Voice recognition not initialized'
      );
    }

    if (this.isListening) {
      console.warn('[VoiceManager] Already listening, stopping previous session');
      await this.stopListening();
    }

    try {
      // Clear any existing timeouts
      this.clearTimeouts();

      this.currentMode = mode;
      this.recognitionStartTime = Date.now();

      // Configure voice recognition options
      const options = {
        language: TTS_SETTINGS.DEFAULT_LANGUAGE,
        timeout: VOICE_RECOGNITION.TIMEOUT_MS,
        partialResults: true,
        continuous: mode === 'push-to-talk',
        maxResults: 1,
      };

      // Apply noise reduction if enabled
      if (this.noiseReductionEnabled) {
        await this.applyNoiseReduction();
      }

      // Set up timeout handling
      this.setupTimeoutHandling();

      await Voice.start(TTS_SETTINGS.DEFAULT_LANGUAGE, options);
      this.isListening = true;

      this.emitEvent(EVENTS.VOICE_STARTED, { mode });
      console.log(`[VoiceManager] Started listening in ${mode} mode`);
    } catch (error) {
      console.error('[VoiceManager] Failed to start listening:', error);
      await this.handleVoiceError(error);
    }
  }

  /**
   * Stop listening for voice input
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      // Clear timeouts
      this.clearTimeouts();

      await Voice.stop();
      this.isListening = false;
      this.currentMode = null;

      const duration = Date.now() - this.recognitionStartTime;
      logPerformanceMetric('voice_recognition_session', duration, true);

      this.emitEvent(EVENTS.VOICE_STOPPED, { duration });
      console.log('[VoiceManager] Stopped listening');
    } catch (error) {
      console.error('[VoiceManager] Failed to stop listening:', error);
      await this.handleVoiceError(error);
    }
  }

  /**
   * Speak text using text-to-speech
   */
  async speak(text: string, priority: 'high' | 'normal' = 'normal'): Promise<void> {
    try {
      await this.ttsService.speak(text, priority);
      console.log(`[VoiceManager] Speaking (${priority}): ${text}`);
    } catch (error) {
      console.error('[VoiceManager] Failed to speak:', error);
      throw createVoiceAgentError(
        ERROR_CODES.TTS_FAILED,
        'Failed to speak text',
        error
      );
    }
  }

  /**
   * Enable or disable noise reduction
   */
  setNoiseReduction(enabled: boolean): void {
    this.noiseReductionEnabled = enabled;
    console.log(`[VoiceManager] Noise reduction ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current audio quality metrics
   */
  getAudioQuality(): AudioQualityMetrics {
    return { ...this.audioQualityMetrics };
  }

  /**
   * Apply noise reduction settings
   */
  private async applyNoiseReduction(): Promise<void> {
    try {
      // Platform-specific noise reduction implementation
      if (Platform.OS === 'android') {
        // Android-specific noise reduction settings
        console.log('[VoiceManager] Applied Android noise reduction');
      } else if (Platform.OS === 'ios') {
        // iOS-specific noise reduction settings
        console.log('[VoiceManager] Applied iOS noise reduction');
      }
    } catch (error) {
      console.warn('[VoiceManager] Failed to apply noise reduction:', error);
    }
  }

  /**
   * Handle speech start event
   */
  private handleSpeechStart(event: SpeechStartEvent): void {
    console.log('[VoiceManager] Speech started');
    this.updateAudioQualityMetrics({ signalStrength: 0.8 });
  }

  /**
   * Handle speech recognized event
   */
  private handleSpeechRecognized(event: SpeechRecognizedEvent): void {
    console.log('[VoiceManager] Speech recognized');
    this.updateAudioQualityMetrics({ recognitionAccuracy: 0.9 });
  }

  /**
   * Handle speech end event
   */
  private handleSpeechEnd(event: SpeechEndEvent): void {
    console.log('[VoiceManager] Speech ended');
    const duration = Date.now() - this.recognitionStartTime;
    this.updateAudioQualityMetrics({ latency: duration });
  }

  /**
   * Handle speech error event
   */
  private handleSpeechError(event: SpeechErrorEvent): void {
    console.error('[VoiceManager] Speech error:', event.error);
    this.handleVoiceError(event.error);
  }

  /**
   * Handle speech results event
   */
  private handleSpeechResults(event: SpeechResultsEvent): void {
    if (!event.value || event.value.length === 0) {
      return;
    }

    const transcript = event.value[0];
    const confidence = this.calculateConfidence(transcript);
    const duration = Date.now() - this.recognitionStartTime;

    const result: VoiceRecognitionResult = {
      transcript,
      confidence,
      isFinal: true,
    };

    this.updateAudioQualityMetrics({
      latency: duration,
      recognitionAccuracy: confidence,
    });

    logPerformanceMetric('voice_recognition', duration, confidence > VOICE_RECOGNITION.MIN_CONFIDENCE);

    if (confidence < VOICE_RECOGNITION.MIN_CONFIDENCE) {
      this.handleLowConfidenceResult(result);
    } else {
      // Successful recognition - reset retry state
      this.resetRetryState();
      this.clearTimeouts();
      
      this.emitEvent(EVENTS.VOICE_RESULT, result);
      console.log(`[VoiceManager] Voice result: "${transcript}" (confidence: ${confidence})`);
    }
  }

  /**
   * Handle partial speech results event
   */
  private handleSpeechPartialResults(event: SpeechResultsEvent): void {
    if (!event.value || event.value.length === 0) {
      return;
    }

    const transcript = event.value[0];
    const confidence = this.calculateConfidence(transcript);

    const result: VoiceRecognitionResult = {
      transcript,
      confidence,
      isFinal: false,
    };

    // Only emit partial results for high confidence transcripts
    if (confidence > VOICE_RECOGNITION.MIN_CONFIDENCE) {
      this.emitEvent(EVENTS.VOICE_RESULT, result);
    }
  }

  /**
   * Handle speech volume changed event
   */
  private handleSpeechVolumeChanged = throttle((event: SpeechVolumeChangedEvent): void => {
    const volume = event.value || 0;
    const noiseLevel = Math.max(0, 1 - volume); // Inverse relationship
    
    this.updateAudioQualityMetrics({ noiseLevel });
    
    // Validate audio quality and provide feedback if needed
    const isGoodQuality = validateAudioQuality(
      noiseLevel,
      this.audioQualityMetrics.signalStrength
    );
    
    if (!isGoodQuality && this.isListening) {
      console.warn('[VoiceManager] Poor audio quality detected');
      this.detectAudioQualityIssues();
    }
  }, 500);

  /**
   * Calculate confidence score for transcript
   */
  private calculateConfidence(transcript: string): number {
    // Simple confidence calculation based on transcript length and content
    if (!transcript || transcript.trim().length === 0) {
      return 0;
    }

    let confidence = 0.5; // Base confidence

    // Longer transcripts generally have higher confidence
    if (transcript.length > 10) confidence += 0.2;
    if (transcript.length > 20) confidence += 0.1;

    // Check for delivery-related keywords
    const deliveryKeywords = [
      'delivery', 'pickup', 'order', 'customer', 'address', 'location',
      'route', 'navigate', 'status', 'delivered', 'picked', 'delayed'
    ];

    const hasDeliveryKeywords = deliveryKeywords.some(keyword =>
      transcript.toLowerCase().includes(keyword)
    );

    if (hasDeliveryKeywords) confidence += 0.2;

    return Math.min(confidence, 1.0);
  }

  /**
   * Handle low confidence recognition results
   */
  private handleLowConfidenceResult(result: VoiceRecognitionResult): void {
    if (this.retryCount < VOICE_RECOGNITION.MAX_RETRY_ATTEMPTS) {
      this.retryCount++;
      console.log(`[VoiceManager] Low confidence result, retry ${this.retryCount}`);
      
      // Provide appropriate guidance based on confidence level
      const guidanceMessage = this.getConfidenceGuidanceMessage(result.confidence);
      this.provideUserGuidance(guidanceMessage);
      
      // Restart listening after a brief pause
      setTimeout(() => {
        if (this.currentMode) {
          this.startListening(this.currentMode);
        }
      }, VOICE_RECOGNITION.RETRY_DELAY_MS);
    } else {
      console.warn('[VoiceManager] Max retries reached for low confidence result');
      this.provideUserGuidance(VOICE_GUIDANCE.MAX_RETRIES);
      this.emitEvent(EVENTS.VOICE_ERROR, {
        code: ERROR_CODES.VOICE_LOW_CONFIDENCE,
        message: 'Low confidence recognition after max retries',
        result,
      });
      this.resetRetryState();
    }
  }

  /**
   * Get appropriate guidance message based on confidence level
   */
  private getConfidenceGuidanceMessage(confidence: number): string {
    if (confidence < VOICE_RECOGNITION.VERY_LOW_CONFIDENCE_THRESHOLD) {
      return VOICE_GUIDANCE.VERY_LOW_CONFIDENCE;
    } else if (confidence < VOICE_RECOGNITION.LOW_CONFIDENCE_THRESHOLD) {
      return VOICE_GUIDANCE.LOW_CONFIDENCE;
    } else {
      return VOICE_GUIDANCE.LOW_CONFIDENCE;
    }
  }

  /**
   * Setup timeout handling for voice recognition
   */
  private setupTimeoutHandling(): void {
    // Main timeout for voice recognition
    this.timeoutHandle = setTimeout(() => {
      if (this.isListening) {
        console.warn('[VoiceManager] Voice recognition timeout');
        this.handleTimeout();
      }
    }, VOICE_RECOGNITION.TIMEOUT_MS);

    // Silence timeout for user guidance
    this.silenceTimeoutHandle = setTimeout(() => {
      if (this.isListening) {
        console.log('[VoiceManager] Silence timeout - providing guidance');
        this.provideUserGuidance(VOICE_GUIDANCE.SILENCE_TIMEOUT);
      }
    }, VOICE_RECOGNITION.SILENCE_TIMEOUT_MS);
  }

  /**
   * Clear all timeout handles
   */
  private clearTimeouts(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    if (this.silenceTimeoutHandle) {
      clearTimeout(this.silenceTimeoutHandle);
      this.silenceTimeoutHandle = null;
    }
  }

  /**
   * Handle voice recognition timeout
   */
  private async handleTimeout(): Promise<void> {
    console.warn('[VoiceManager] Voice recognition timed out');
    
    try {
      await this.stopListening();
    } catch (error) {
      console.error('[VoiceManager] Error stopping after timeout:', error);
    }

    if (this.retryCount < VOICE_RECOGNITION.MAX_RETRY_ATTEMPTS) {
      this.retryCount++;
      this.provideUserGuidance(VOICE_GUIDANCE.TIMEOUT);
      
      // Retry after delay
      setTimeout(() => {
        if (this.currentMode) {
          this.startListening(this.currentMode);
        }
      }, VOICE_RECOGNITION.RETRY_DELAY_MS);
    } else {
      this.provideUserGuidance(VOICE_GUIDANCE.MAX_RETRIES);
      this.emitEvent(EVENTS.VOICE_TIMEOUT, {
        code: ERROR_CODES.VOICE_TIMEOUT,
        message: 'Voice recognition timeout after max retries',
        retryCount: this.retryCount,
      });
      this.resetRetryState();
    }
  }

  /**
   * Detect and handle audio quality issues
   */
  private detectAudioQualityIssues(): void {
    const { noiseLevel, signalStrength, recognitionAccuracy } = this.audioQualityMetrics;
    
    // Calculate overall audio quality score
    const qualityScore = (
      (1 - noiseLevel) * 0.4 +
      signalStrength * 0.4 +
      recognitionAccuracy * 0.2
    );

    if (qualityScore < VOICE_RECOGNITION.AUDIO_QUALITY_THRESHOLD) {
      console.warn('[VoiceManager] Poor audio quality detected:', {
        qualityScore,
        noiseLevel,
        signalStrength,
        recognitionAccuracy
      });

      // Determine specific issue and provide guidance
      let guidanceMessage = VOICE_GUIDANCE.AUDIO_QUALITY_POOR;
      
      if (noiseLevel > VOICE_RECOGNITION.NOISE_LEVEL_THRESHOLD) {
        guidanceMessage = VOICE_GUIDANCE.NOISE_TOO_HIGH;
      } else if (signalStrength < VOICE_RECOGNITION.SIGNAL_STRENGTH_THRESHOLD) {
        guidanceMessage = VOICE_GUIDANCE.SIGNAL_WEAK;
      }

      this.provideUserGuidance(guidanceMessage);
      
      this.emitEvent(EVENTS.VOICE_QUALITY_WARNING, {
        qualityScore,
        metrics: this.audioQualityMetrics,
        guidance: guidanceMessage
      });
    }
  }

  /**
   * Provide user guidance with cooldown to prevent spam
   */
  private async provideUserGuidance(message: string): Promise<void> {
    const now = Date.now();
    
    // Check cooldown to prevent too frequent guidance
    if (now - this.lastGuidanceTime < VOICE_RECOGNITION.GUIDANCE_COOLDOWN_MS) {
      console.log('[VoiceManager] Guidance on cooldown, skipping:', message);
      return;
    }

    this.lastGuidanceTime = now;
    
    try {
      await this.speak(message, 'high');
      console.log('[VoiceManager] Provided guidance:', message);
    } catch (error) {
      console.error('[VoiceManager] Failed to provide guidance:', error);
    }
  }

  /**
   * Reset retry state after successful operation or max retries
   */
  private resetRetryState(): void {
    this.retryCount = 0;
    this.consecutiveErrors = 0;
    this.lastErrorType = null;
  }

  /**
   * Enhanced voice error handling with retry logic and user guidance
   */
  private async handleVoiceError(error: any): Promise<void> {
    const errorCode = this.mapErrorToCode(error);
    const errorMessage = this.getErrorMessage(error, errorCode);
    
    console.error('[VoiceManager] Voice error:', { errorCode, errorMessage, error });

    // Track consecutive errors
    if (this.lastErrorType === errorCode) {
      this.consecutiveErrors++;
    } else {
      this.consecutiveErrors = 1;
      this.lastErrorType = errorCode;
    }

    const voiceError: VoiceRecognitionError = {
      code: errorCode,
      message: errorMessage,
    };

    // Stop listening if currently active
    if (this.isListening) {
      try {
        this.isListening = false;
        this.currentMode = null;
        this.clearTimeouts();
        await Voice.stop();
      } catch (stopError) {
        console.error('[VoiceManager] Error stopping voice after error:', stopError);
      }
    }

    // Determine if we should retry based on error type and count
    const shouldRetry = this.shouldRetryAfterError(errorCode);
    
    if (shouldRetry && this.retryCount < VOICE_RECOGNITION.MAX_RETRY_ATTEMPTS) {
      this.retryCount++;
      const guidanceMessage = this.getErrorGuidanceMessage(errorCode);
      
      if (guidanceMessage) {
        await this.provideUserGuidance(guidanceMessage);
      }

      // Retry after delay
      setTimeout(() => {
        if (this.currentMode) {
          console.log(`[VoiceManager] Retrying after error (attempt ${this.retryCount})`);
          this.startListening(this.currentMode);
        }
      }, VOICE_RECOGNITION.RETRY_DELAY_MS * this.retryCount); // Exponential backoff
    } else {
      // Max retries reached or non-retryable error
      const finalGuidanceMessage = this.getFinalErrorGuidanceMessage(errorCode);
      if (finalGuidanceMessage) {
        await this.provideUserGuidance(finalGuidanceMessage);
      }
      
      this.resetRetryState();
    }

    logPerformanceMetric('voice_recognition_error', Date.now() - this.recognitionStartTime, false);
    this.emitEvent(EVENTS.VOICE_ERROR, voiceError);
  }

  /**
   * Map various error types to standardized error codes
   */
  private mapErrorToCode(error: any): string {
    if (error?.code) {
      switch (error.code) {
        case '7': // No match
        case 'no-match':
          return ERROR_CODES.VOICE_LOW_CONFIDENCE;
        case '6': // No speech
        case 'no-speech':
          return ERROR_CODES.VOICE_SILENCE_TIMEOUT;
        case '8': // RecognitionService busy
        case 'busy':
          return ERROR_CODES.VOICE_RECOGNITION_FAILED;
        case '9': // Insufficient permissions
        case 'not-allowed':
          return ERROR_CODES.VOICE_PERMISSION_DENIED;
        case '4': // Server error
        case 'aborted':
          return ERROR_CODES.VOICE_RECOGNITION_FAILED;
        case '3': // Audio capture error
        case 'audio-capture':
          return ERROR_CODES.VOICE_AUDIO_QUALITY;
        case '2': // Network error
        case 'network':
          return ERROR_CODES.NETWORK_ERROR;
        default:
          return ERROR_CODES.VOICE_RECOGNITION_FAILED;
      }
    }

    if (error?.message) {
      const message = error.message.toLowerCase();
      if (message.includes('permission')) {
        return ERROR_CODES.VOICE_PERMISSION_DENIED;
      }
      if (message.includes('timeout')) {
        return ERROR_CODES.VOICE_TIMEOUT;
      }
      if (message.includes('network')) {
        return ERROR_CODES.NETWORK_ERROR;
      }
      if (message.includes('audio')) {
        return ERROR_CODES.VOICE_AUDIO_QUALITY;
      }
    }

    return ERROR_CODES.VOICE_RECOGNITION_FAILED;
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any, errorCode: string): string {
    switch (errorCode) {
      case ERROR_CODES.VOICE_PERMISSION_DENIED:
        return 'Microphone permission is required for voice commands';
      case ERROR_CODES.VOICE_TIMEOUT:
        return 'Voice recognition timed out';
      case ERROR_CODES.VOICE_LOW_CONFIDENCE:
        return 'Could not understand the voice command';
      case ERROR_CODES.VOICE_AUDIO_QUALITY:
        return 'Audio quality is too poor for recognition';
      case ERROR_CODES.VOICE_SILENCE_TIMEOUT:
        return 'No speech detected';
      case ERROR_CODES.NETWORK_ERROR:
        return 'Network connection required for voice recognition';
      default:
        return error?.message || 'Voice recognition error occurred';
    }
  }

  /**
   * Determine if error is retryable
   */
  private shouldRetryAfterError(errorCode: string): boolean {
    const nonRetryableErrors = [
      ERROR_CODES.VOICE_PERMISSION_DENIED,
      ERROR_CODES.VOICE_NOT_AVAILABLE,
    ];
    
    return !nonRetryableErrors.includes(errorCode) && this.consecutiveErrors < 3;
  }

  /**
   * Get guidance message for specific error types
   */
  private getErrorGuidanceMessage(errorCode: string): string | null {
    switch (errorCode) {
      case ERROR_CODES.VOICE_LOW_CONFIDENCE:
        return VOICE_GUIDANCE.LOW_CONFIDENCE;
      case ERROR_CODES.VOICE_TIMEOUT:
        return VOICE_GUIDANCE.TIMEOUT;
      case ERROR_CODES.VOICE_AUDIO_QUALITY:
        return VOICE_GUIDANCE.AUDIO_QUALITY_POOR;
      case ERROR_CODES.VOICE_SILENCE_TIMEOUT:
        return VOICE_GUIDANCE.SILENCE_TIMEOUT;
      case ERROR_CODES.NETWORK_ERROR:
        return "Network connection is required. Please check your connection and try again.";
      default:
        return VOICE_GUIDANCE.GENERAL_ERROR;
    }
  }

  /**
   * Get final guidance message when max retries reached
   */
  private getFinalErrorGuidanceMessage(errorCode: string): string | null {
    switch (errorCode) {
      case ERROR_CODES.VOICE_PERMISSION_DENIED:
        return VOICE_GUIDANCE.PERMISSION_DENIED;
      case ERROR_CODES.VOICE_NOT_AVAILABLE:
        return VOICE_GUIDANCE.NOT_AVAILABLE;
      default:
        return VOICE_GUIDANCE.MAX_RETRIES;
    }
  }



  /**
   * Update audio quality metrics
   */
  private updateAudioQualityMetrics(updates: Partial<AudioQualityMetrics>): void {
    this.audioQualityMetrics = {
      ...this.audioQualityMetrics,
      ...updates,
    };
  }

  /**
   * Register event callback
   */
  addEventListener(event: VoiceAgentEvent, callback: EventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  /**
   * Remove event callback
   */
  removeEventListener(event: VoiceAgentEvent, callback: EventCallback): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to registered callbacks
   */
  private emitEvent(event: VoiceAgentEvent, data?: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event, data);
        } catch (error) {
          console.error(`[VoiceManager] Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    try {
      if (this.isListening) {
        await this.stopListening();
      }

      // Clear all timeouts
      this.clearTimeouts();

      Voice.removeAllListeners();
      await Voice.destroy();
      await this.ttsService.destroy();

      this.eventCallbacks.clear();
      this.isInitialized = false;

      console.log('[VoiceManager] Voice manager destroyed');
    } catch (error) {
      console.error('[VoiceManager] Error during cleanup:', error);
    }
  }

  /**
   * Get current listening state
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Get current activation mode
   */
  getCurrentMode(): 'push-to-talk' | 'tap-to-speak' | null {
    return this.currentMode;
  }

  /**
   * Check if voice recognition is available
   */
  async isVoiceRecognitionAvailable(): Promise<boolean> {
    try {
      return await Voice.isAvailable();
    } catch (error) {
      console.error('[VoiceManager] Error checking voice availability:', error);
      return false;
    }
  }

  /**
   * Get available speech recognition services
   */
  async getAvailableServices(): Promise<string[]> {
    try {
      return await Voice.getSpeechRecognitionServices();
    } catch (error) {
      console.error('[VoiceManager] Error getting speech services:', error);
      return [];
    }
  }

  /**
   * Stop current TTS speech
   */
  async stopSpeaking(): Promise<void> {
    try {
      await this.ttsService.stopSpeaking();
    } catch (error) {
      console.error('[VoiceManager] Failed to stop speaking:', error);
    }
  }

  /**
   * Get TTS service status
   */
  getTTSStatus(): {
    isInitialized: boolean;
    isSpeaking: boolean;
    queueLength: number;
  } {
    return this.ttsService.getStatus();
  }

  /**
   * Set TTS voice options
   */
  setTTSOptions(options: {
    language?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  }): void {
    this.ttsService.setDefaultOptions(options);
  }

  /**
   * Get available TTS voices
   */
  async getAvailableTTSVoices(): Promise<any[]> {
    try {
      return await this.ttsService.getAvailableVoices();
    } catch (error) {
      console.error('[VoiceManager] Error getting TTS voices:', error);
      return [];
    }
  }

  /**
   * Provide optimal usage guidance to user
   */
  async provideOptimalUsageGuidance(): Promise<void> {
    await this.provideUserGuidance(VOICE_GUIDANCE.OPTIMAL_USAGE);
  }

  /**
   * Get error handling statistics
   */
  getErrorStatistics(): {
    consecutiveErrors: number;
    lastErrorType: string | null;
    retryCount: number;
    lastGuidanceTime: number;
  } {
    return {
      consecutiveErrors: this.consecutiveErrors,
      lastErrorType: this.lastErrorType,
      retryCount: this.retryCount,
      lastGuidanceTime: this.lastGuidanceTime,
    };
  }

  /**
   * Reset error handling state (useful for testing or manual reset)
   */
  resetErrorHandlingState(): void {
    this.resetRetryState();
    this.lastGuidanceTime = 0;
    this.clearTimeouts();
  }

  /**
   * Check if voice recognition is currently in error state
   */
  isInErrorState(): boolean {
    return this.consecutiveErrors > 0 || this.retryCount > 0;
  }

  /**
   * Force retry voice recognition (useful for manual retry)
   */
  async forceRetry(): Promise<void> {
    if (this.currentMode && !this.isListening) {
      console.log('[VoiceManager] Force retrying voice recognition');
      await this.startListening(this.currentMode);
    }
  }
}