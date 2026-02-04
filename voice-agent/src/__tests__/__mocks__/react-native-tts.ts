/**
 * Mock for react-native-tts
 * 
 * Provides mock implementation of text-to-speech functionality
 * for integration testing without requiring actual audio output.
 */

interface TTSVoice {
  id: string;
  name: string;
  language: string;
  quality: number;
}

interface TTSOptions {
  androidParams?: {
    KEY_PARAM_PAN?: number;
    KEY_PARAM_VOLUME?: number;
    KEY_PARAM_STREAM?: number;
  };
  iosVoiceId?: string;
  rate?: number;
  pitch?: number;
}

interface TTSEvent {
  utteranceId: string;
}

class MockTTS {
  private isSpeaking: boolean = false;
  private isPaused: boolean = false;
  private listeners: Map<string, Function[]> = new Map();
  private currentUtteranceId: string | null = null;
  private speechQueue: Array<{ text: string; options?: TTSOptions; utteranceId: string }> = [];
  private defaultLanguage: string = 'en-US';
  private defaultRate: number = 0.5;
  private defaultPitch: number = 1.0;
  private simulateDelay: number = 1000; // 1 second per 10 characters

  constructor() {
    this.setupDefaultConfiguration();
  }

  /**
   * Speak text
   */
  async speak(text: string, options?: TTSOptions): Promise<string> {
    const utteranceId = this.generateUtteranceId();
    
    if (this.isSpeaking && !this.isPaused) {
      // Add to queue
      this.speechQueue.push({ text, options, utteranceId });
      return utteranceId;
    }

    this.currentUtteranceId = utteranceId;
    this.isSpeaking = true;
    this.isPaused = false;

    // Emit start event
    this.emit('tts-start', { utteranceId });

    // Calculate speech duration based on text length
    const duration = Math.max(500, text.length * (this.simulateDelay / 10));

    // Simulate speech progress
    setTimeout(() => {
      if (this.currentUtteranceId === utteranceId && this.isSpeaking) {
        this.emit('tts-progress', { 
          utteranceId,
          location: Math.floor(text.length / 2),
          length: text.length
        });
      }
    }, duration / 2);

    // Simulate speech completion
    setTimeout(() => {
      if (this.currentUtteranceId === utteranceId && this.isSpeaking) {
        this.isSpeaking = false;
        this.currentUtteranceId = null;
        this.emit('tts-finish', { utteranceId });
        
        // Process next item in queue
        this.processQueue();
      }
    }, duration);

    return utteranceId;
  }

  /**
   * Stop current speech
   */
  async stop(): Promise<void> {
    if (this.isSpeaking) {
      const utteranceId = this.currentUtteranceId;
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentUtteranceId = null;
      this.speechQueue = [];

      if (utteranceId) {
        this.emit('tts-cancel', { utteranceId });
      }
    }
  }

  /**
   * Pause current speech
   */
  async pause(): Promise<void> {
    if (this.isSpeaking && !this.isPaused) {
      this.isPaused = true;
      
      if (this.currentUtteranceId) {
        this.emit('tts-pause', { utteranceId: this.currentUtteranceId });
      }
    }
  }

  /**
   * Resume paused speech
   */
  async resume(): Promise<void> {
    if (this.isSpeaking && this.isPaused) {
      this.isPaused = false;
      
      if (this.currentUtteranceId) {
        this.emit('tts-resume', { utteranceId: this.currentUtteranceId });
      }
    }
  }

  /**
   * Set default language
   */
  async setDefaultLanguage(language: string): Promise<void> {
    this.defaultLanguage = language;
  }

  /**
   * Set default speech rate
   */
  async setDefaultRate(rate: number): Promise<void> {
    this.defaultRate = Math.max(0.1, Math.min(2.0, rate));
  }

  /**
   * Set default pitch
   */
  async setDefaultPitch(pitch: number): Promise<void> {
    this.defaultPitch = Math.max(0.5, Math.min(2.0, pitch));
  }

  /**
   * Get initialization status
   */
  async getInitStatus(): Promise<string> {
    return 'success';
  }

  /**
   * Get available voices
   */
  async voices(): Promise<TTSVoice[]> {
    return [
      {
        id: 'com.apple.ttsbundle.Samantha-compact',
        name: 'Samantha',
        language: 'en-US',
        quality: 300
      },
      {
        id: 'com.apple.ttsbundle.Alex-compact',
        name: 'Alex',
        language: 'en-US',
        quality: 300
      },
      {
        id: 'mock-voice-1',
        name: 'Mock Voice 1',
        language: 'en-US',
        quality: 500
      }
    ];
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, handler: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, handler: Function): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: TTSEvent): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.warn(`Error in TTS event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Generate unique utterance ID
   */
  private generateUtteranceId(): string {
    return `utterance_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Process speech queue
   */
  private processQueue(): void {
    if (this.speechQueue.length > 0 && !this.isSpeaking) {
      const next = this.speechQueue.shift()!;
      this.speak(next.text, next.options);
    }
  }

  /**
   * Set up default configuration
   */
  private setupDefaultConfiguration(): void {
    this.defaultLanguage = 'en-US';
    this.defaultRate = 0.5;
    this.defaultPitch = 1.0;
    this.simulateDelay = 1000;
  }

  // Test utilities for controlling mock behavior

  /**
   * Set speech simulation delay
   */
  setSpeechDelay(delay: number): void {
    this.simulateDelay = delay;
  }

  /**
   * Get current speaking state
   */
  get isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Get current paused state
   */
  get isCurrentlyPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get queue length
   */
  get queueLength(): number {
    return this.speechQueue.length;
  }

  /**
   * Get current utterance ID
   */
  get currentUtterance(): string | null {
    return this.currentUtteranceId;
  }

  /**
   * Simulate TTS error (for testing)
   */
  simulateError(utteranceId: string, error: string): void {
    setTimeout(() => {
      this.emit('tts-error', { utteranceId } as any);
    }, 100);
  }

  /**
   * Force complete current speech (for testing)
   */
  forceComplete(): void {
    if (this.isSpeaking && this.currentUtteranceId) {
      const utteranceId = this.currentUtteranceId;
      this.isSpeaking = false;
      this.currentUtteranceId = null;
      this.emit('tts-finish', { utteranceId });
      this.processQueue();
    }
  }

  /**
   * Clear speech queue
   */
  clearQueue(): void {
    this.speechQueue = [];
  }

  /**
   * Reset mock to initial state
   */
  reset(): void {
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentUtteranceId = null;
    this.speechQueue = [];
    this.listeners.clear();
    this.setupDefaultConfiguration();
  }

  /**
   * Get mock statistics (for testing)
   */
  getStats(): any {
    return {
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      queueLength: this.speechQueue.length,
      currentUtteranceId: this.currentUtteranceId,
      defaultLanguage: this.defaultLanguage,
      defaultRate: this.defaultRate,
      defaultPitch: this.defaultPitch
    };
  }
}

// Create singleton instance
const mockTTS = new MockTTS();

// Export both the class and instance for different use cases
export default mockTTS;
export { MockTTS, TTSVoice, TTSOptions, TTSEvent };