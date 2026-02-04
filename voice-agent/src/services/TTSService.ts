/**
 * Text-to-Speech Service
 * 
 * Handles speech synthesis with priority queuing, voice customization,
 * and audio output management for the voice agent.
 */

import Tts from 'react-native-tts';
import { Platform } from 'react-native';

import {
  TTSOptions,
  VoiceAgentError,
  EventCallback,
  VoiceAgentEvent,
} from '../types';
import {
  TTS_SETTINGS,
  ERROR_CODES,
  EVENTS,
} from '../constants';
import {
  createVoiceAgentError,
  logPerformanceMetric,
} from '../utils';

export interface TTSQueueItem {
  id: string;
  text: string;
  priority: 'high' | 'normal' | 'low';
  options?: TTSOptions;
  timestamp: Date;
  retryCount: number;
}

export interface TTSService {
  speak(text: string, priority?: 'high' | 'normal' | 'low', options?: TTSOptions): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  setDefaultOptions(options: TTSOptions): void;
  getAvailableVoices(): Promise<any[]>;
  setVoice(voiceId: string): Promise<void>;
  getQueueLength(): number;
  clearQueue(): void;
  addEventListener(event: VoiceAgentEvent, callback: EventCallback): void;
  removeEventListener(event: VoiceAgentEvent, callback: EventCallback): void;
}

export class TTSService implements TTSService {
  private queue: TTSQueueItem[] = [];
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private currentItem: TTSQueueItem | null = null;
  private defaultOptions: TTSOptions = TTS_SETTINGS.DEFAULT_OPTIONS;
  private eventCallbacks: Map<VoiceAgentEvent, EventCallback[]> = new Map();
  private isInitialized: boolean = false;
  private availableVoices: any[] = [];
  private currentVoiceId: string | null = null;
  private maxRetries: number = 3;
  private queueProcessingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeTTS();
  }

  /**
   * Initialize TTS service and set up event listeners
   */
  private async initializeTTS(): Promise<void> {
    try {
      // Set up TTS event listeners
      Tts.addEventListener('tts-start', this.handleTTSStart.bind(this));
      Tts.addEventListener('tts-finish', this.handleTTSFinish.bind(this));
      Tts.addEventListener('tts-cancel', this.handleTTSCancel.bind(this));
      Tts.addEventListener('tts-error', this.handleTTSError.bind(this));

      // Set default TTS options
      await this.applyDefaultSettings();

      // Load available voices
      await this.loadAvailableVoices();

      // Start queue processing
      this.startQueueProcessing();

      this.isInitialized = true;
      console.log('[TTS] Service initialized successfully');
    } catch (error) {
      console.error('[TTS] Failed to initialize TTS service:', error);
      throw createVoiceAgentError(
        ERROR_CODES.TTS_INITIALIZATION_FAILED,
        'Failed to initialize text-to-speech service'
      );
    }
  }

  /**
   * Apply default TTS settings
   */
  private async applyDefaultSettings(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Tts.setDefaultRate(this.defaultOptions.rate || 0.5);
        await Tts.setDefaultPitch(this.defaultOptions.pitch || 1.0);
      } else {
        // iOS
        await Tts.setDefaultRate(this.defaultOptions.rate || 0.5);
        await Tts.setDefaultPitch(this.defaultOptions.pitch || 1.0);
      }

      if (this.defaultOptions.language) {
        await Tts.setDefaultLanguage(this.defaultOptions.language);
      }
    } catch (error) {
      console.error('[TTS] Failed to apply default settings:', error);
    }
  }

  /**
   * Load available voices for the current language
   */
  private async loadAvailableVoices(): Promise<void> {
    try {
      this.availableVoices = await Tts.voices();
      console.log(`[TTS] Loaded ${this.availableVoices.length} available voices`);
    } catch (error) {
      console.error('[TTS] Failed to load available voices:', error);
      this.availableVoices = [];
    }
  }

  /**
   * Start queue processing interval
   */
  private startQueueProcessing(): void {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
    }

    this.queueProcessingInterval = setInterval(() => {
      this.processQueue();
    }, 100); // Check queue every 100ms
  }

  /**
   * Process the TTS queue
   */
  private async processQueue(): Promise<void> {
    if (this.isPlaying || this.isPaused || this.queue.length === 0) {
      return;
    }

    // Sort queue by priority (high -> normal -> low) and timestamp
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    const nextItem = this.queue.shift();
    if (nextItem) {
      await this.playItem(nextItem);
    }
  }

  /**
   * Play a specific TTS item
   */
  private async playItem(item: TTSQueueItem): Promise<void> {
    this.currentItem = item;
    this.isPlaying = true;

    try {
      const startTime = Date.now();

      // Apply item-specific options if provided
      if (item.options) {
        await this.applyTTSOptions(item.options);
      }

      // Start speaking
      await Tts.speak(item.text);

      // Log performance metric
      const duration = Date.now() - startTime;
      logPerformanceMetric('tts_speak_duration', duration);

      this.emitEvent('tts_started', {
        itemId: item.id,
        text: item.text,
        priority: item.priority,
        timestamp: new Date()
      });

    } catch (error) {
      console.error(`[TTS] Failed to play item ${item.id}:`, error);
      
      // Retry logic
      if (item.retryCount < this.maxRetries) {
        item.retryCount++;
        this.queue.unshift(item); // Put back at front of queue
        console.log(`[TTS] Retrying item ${item.id} (attempt ${item.retryCount})`);
      } else {
        this.emitEvent('tts_error', {
          itemId: item.id,
          error: createVoiceAgentError(ERROR_CODES.TTS_PLAYBACK_FAILED, error.message),
          timestamp: new Date()
        });
      }

      this.isPlaying = false;
      this.currentItem = null;
    }
  }

  /**
   * Apply TTS options
   */
  private async applyTTSOptions(options: TTSOptions): Promise<void> {
    try {
      if (options.rate !== undefined) {
        await Tts.setDefaultRate(options.rate);
      }
      if (options.pitch !== undefined) {
        await Tts.setDefaultPitch(options.pitch);
      }
      if (options.language) {
        await Tts.setDefaultLanguage(options.language);
      }
    } catch (error) {
      console.error('[TTS] Failed to apply TTS options:', error);
    }
  }

  /**
   * Speak text with specified priority
   */
  async speak(text: string, priority: 'high' | 'normal' | 'low' = 'normal', options?: TTSOptions): Promise<void> {
    if (!this.isInitialized) {
      throw createVoiceAgentError(
        ERROR_CODES.TTS_NOT_INITIALIZED,
        'TTS service is not initialized'
      );
    }

    if (!text || text.trim().length === 0) {
      return; // Don't speak empty text
    }

    // Create queue item
    const item: TTSQueueItem = {
      id: `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      priority,
      options,
      timestamp: new Date(),
      retryCount: 0
    };

    // Handle high priority items
    if (priority === 'high') {
      // Stop current playback for high priority
      if (this.isPlaying) {
        await this.stop();
      }
      
      // Add to front of queue
      this.queue.unshift(item);
    } else {
      // Add to end of queue
      this.queue.push(item);
    }

    console.log(`[TTS] Added item to queue: ${item.id} (priority: ${priority})`);
  }

  /**
   * Stop current TTS playback and clear queue
   */
  stop(): void {
    try {
      Tts.stop();
      this.isPlaying = false;
      this.isPaused = false;
      this.currentItem = null;
      
      this.emitEvent('tts_stopped', {
        timestamp: new Date(),
        queueCleared: this.queue.length > 0
      });
      
      console.log('[TTS] Stopped playback');
    } catch (error) {
      console.error('[TTS] Failed to stop TTS:', error);
    }
  }

  /**
   * Pause current TTS playback
   */
  pause(): void {
    if (this.isPlaying && !this.isPaused) {
      this.isPaused = true;
      
      this.emitEvent('tts_paused', {
        itemId: this.currentItem?.id,
        timestamp: new Date()
      });
      
      console.log('[TTS] Paused playback');
    }
  }

  /**
   * Resume paused TTS playback
   */
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      
      this.emitEvent('tts_resumed', {
        itemId: this.currentItem?.id,
        timestamp: new Date()
      });
      
      console.log('[TTS] Resumed playback');
    }
  }

  /**
   * Set default TTS options
   */
  setDefaultOptions(options: TTSOptions): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
    
    // Apply new defaults immediately
    this.applyDefaultSettings().catch(error => {
      console.error('[TTS] Failed to apply new default options:', error);
    });
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<any[]> {
    if (this.availableVoices.length === 0) {
      await this.loadAvailableVoices();
    }
    return this.availableVoices;
  }

  /**
   * Set voice by ID
   */
  async setVoice(voiceId: string): Promise<void> {
    try {
      const voice = this.availableVoices.find(v => v.id === voiceId);
      if (!voice) {
        throw new Error(`Voice with ID ${voiceId} not found`);
      }

      await Tts.setDefaultVoice(voiceId);
      this.currentVoiceId = voiceId;
      
      console.log(`[TTS] Set voice to: ${voice.name} (${voiceId})`);
    } catch (error) {
      console.error('[TTS] Failed to set voice:', error);
      throw createVoiceAgentError(
        ERROR_CODES.TTS_VOICE_CHANGE_FAILED,
        `Failed to set voice: ${error.message}`
      );
    }
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Clear the TTS queue
   */
  clearQueue(): void {
    const queueLength = this.queue.length;
    this.queue = [];
    
    this.emitEvent('tts_queue_cleared', {
      itemsCleared: queueLength,
      timestamp: new Date()
    });
    
    console.log(`[TTS] Cleared queue (${queueLength} items)`);
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    length: number;
    isPlaying: boolean;
    isPaused: boolean;
    currentItem: TTSQueueItem | null;
    nextItems: TTSQueueItem[];
  } {
    return {
      length: this.queue.length,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentItem: this.currentItem,
      nextItems: this.queue.slice(0, 3) // Next 3 items
    };
  }

  /**
   * Handle TTS start event
   */
  private handleTTSStart(): void {
    console.log('[TTS] Started speaking');
  }

  /**
   * Handle TTS finish event
   */
  private handleTTSFinish(): void {
    console.log('[TTS] Finished speaking');
    
    this.emitEvent('tts_finished', {
      itemId: this.currentItem?.id,
      timestamp: new Date()
    });

    this.isPlaying = false;
    this.currentItem = null;
  }

  /**
   * Handle TTS cancel event
   */
  private handleTTSCancel(): void {
    console.log('[TTS] Speaking cancelled');
    
    this.emitEvent('tts_cancelled', {
      itemId: this.currentItem?.id,
      timestamp: new Date()
    });

    this.isPlaying = false;
    this.currentItem = null;
  }

  /**
   * Handle TTS error event
   */
  private handleTTSError(error: any): void {
    console.error('[TTS] TTS error:', error);
    
    this.emitEvent('tts_error', {
      itemId: this.currentItem?.id,
      error: createVoiceAgentError(ERROR_CODES.TTS_PLAYBACK_FAILED, error.message),
      timestamp: new Date()
    });

    this.isPlaying = false;
    this.currentItem = null;
  }

  /**
   * Initialize event callback system
   */
  private initializeEventCallbacks(): void {
    const events: VoiceAgentEvent[] = [
      'tts_started',
      'tts_finished',
      'tts_stopped',
      'tts_paused',
      'tts_resumed',
      'tts_cancelled',
      'tts_error',
      'tts_queue_cleared'
    ];
    
    events.forEach(event => {
      this.eventCallbacks.set(event, []);
    });
  }

  /**
   * Emit event to registered callbacks
   */
  private emitEvent(event: VoiceAgentEvent, data?: any): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error(`Error in TTS event callback for ${event}:`, error);
      }
    });
  }

  /**
   * Register event callback
   */
  addEventListener(event: VoiceAgentEvent, callback: EventCallback): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    callbacks.push(callback);
    this.eventCallbacks.set(event, callbacks);
  }

  /**
   * Remove event callback
   */
  removeEventListener(event: VoiceAgentEvent, callback: EventCallback): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
      this.eventCallbacks.set(event, callbacks);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    this.clearQueue();
    
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
      this.queueProcessingInterval = null;
    }

    // Remove TTS event listeners
    Tts.removeAllListeners('tts-start');
    Tts.removeAllListeners('tts-finish');
    Tts.removeAllListeners('tts-cancel');
    Tts.removeAllListeners('tts-error');

    this.isInitialized = false;
    console.log('[TTS] Service destroyed');
  }
}