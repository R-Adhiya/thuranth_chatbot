/**
 * Mock for react-native-voice
 * 
 * Provides mock implementation of voice recognition functionality
 * for integration testing without requiring actual device capabilities.
 */

interface VoiceRecognitionResult {
  value: string[];
  error?: string;
}

interface VoiceRecognitionError {
  code: string;
  message: string;
}

class MockVoice {
  private isListening: boolean = false;
  private listeners: Map<string, Function[]> = new Map();
  private mockResults: VoiceRecognitionResult[] = [];
  private mockErrors: VoiceRecognitionError[] = [];
  private simulateDelay: number = 1000; // 1 second default
  private confidenceLevel: number = 0.9;

  constructor() {
    this.setupDefaultMockData();
  }

  /**
   * Start voice recognition
   */
  async start(locale: string = 'en-US'): Promise<void> {
    if (this.isListening) {
      throw new Error('Voice recognition is already active');
    }

    this.isListening = true;
    this.emit('onSpeechStart', {});

    // Simulate recognition delay
    setTimeout(() => {
      if (this.isListening) {
        this.simulateRecognitionResult();
      }
    }, this.simulateDelay);
  }

  /**
   * Stop voice recognition
   */
  async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;
    this.emit('onSpeechEnd', {});
  }

  /**
   * Destroy voice recognition
   */
  async destroy(): Promise<void> {
    this.isListening = false;
    this.listeners.clear();
    this.emit('onSpeechEnd', {});
  }

  /**
   * Check if voice recognition is available
   */
  async isAvailable(): Promise<boolean> {
    return true; // Always available in mock
  }

  /**
   * Get available speech recognition services
   */
  async getSpeechRecognitionServices(): Promise<string[]> {
    return ['mock-speech-service'];
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
  private emit(event: string, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.warn(`Error in voice event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Simulate voice recognition result
   */
  private simulateRecognitionResult(): void {
    // Check if we should simulate an error
    if (this.mockErrors.length > 0 && Math.random() < 0.1) {
      const error = this.mockErrors[Math.floor(Math.random() * this.mockErrors.length)];
      this.emit('onSpeechError', error);
      return;
    }

    // Simulate successful recognition
    if (this.mockResults.length > 0) {
      const result = this.mockResults[Math.floor(Math.random() * this.mockResults.length)];
      this.emit('onSpeechResults', result);
    } else {
      // Default result if no mock data
      this.emit('onSpeechResults', {
        value: ['What is my next delivery?']
      });
    }
  }

  /**
   * Set up default mock data for testing
   */
  private setupDefaultMockData(): void {
    this.mockResults = [
      { value: ['What is my next delivery?'] },
      { value: ['Navigate to pickup location'] },
      { value: ['Send message reached pickup location'] },
      { value: ['Mark order as picked up'] },
      { value: ['Navigate to delivery location'] },
      { value: ['Call customer'] },
      { value: ['Send message reached delivery location'] },
      { value: ['Mark order as delivered'] },
      { value: ['What deliveries do I have left?'] },
      { value: ['Send quick message delayed due to traffic'] }
    ];

    this.mockErrors = [
      { code: 'VOICE_TIMEOUT', message: 'Voice recognition timeout' },
      { code: 'VOICE_LOW_CONFIDENCE', message: 'Low confidence in recognition' },
      { code: 'VOICE_NO_MATCH', message: 'No speech recognized' },
      { code: 'VOICE_NETWORK_ERROR', message: 'Network error during recognition' }
    ];
  }

  // Test utilities for controlling mock behavior

  /**
   * Set mock recognition results
   */
  setMockResults(results: VoiceRecognitionResult[]): void {
    this.mockResults = results;
  }

  /**
   * Set mock errors
   */
  setMockErrors(errors: VoiceRecognitionError[]): void {
    this.mockErrors = errors;
  }

  /**
   * Set recognition delay
   */
  setRecognitionDelay(delay: number): void {
    this.simulateDelay = delay;
  }

  /**
   * Set confidence level
   */
  setConfidenceLevel(confidence: number): void {
    this.confidenceLevel = confidence;
  }

  /**
   * Simulate specific voice input (for testing)
   */
  simulateVoiceInput(text: string, confidence: number = 0.9): void {
    if (this.isListening) {
      setTimeout(() => {
        this.emit('onSpeechResults', {
          value: [text],
          confidence: confidence
        });
      }, 100);
    }
  }

  /**
   * Simulate voice error (for testing)
   */
  simulateVoiceError(error: VoiceRecognitionError): void {
    if (this.isListening) {
      setTimeout(() => {
        this.emit('onSpeechError', error);
      }, 100);
    }
  }

  /**
   * Get current listening state
   */
  get isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Reset mock to initial state
   */
  reset(): void {
    this.isListening = false;
    this.listeners.clear();
    this.setupDefaultMockData();
    this.simulateDelay = 1000;
    this.confidenceLevel = 0.9;
  }
}

// Create singleton instance
const mockVoice = new MockVoice();

// Export both the class and instance for different use cases
export default mockVoice;
export { MockVoice, VoiceRecognitionResult, VoiceRecognitionError };