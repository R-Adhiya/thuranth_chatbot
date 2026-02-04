import { CloudVoiceConfig } from '../config/cloud-config';

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  language: string;
}

/**
 * Cloud-based Voice Service
 * Works with multiple cloud providers without local setup
 */
export class CloudVoiceService {
  private config: CloudVoiceConfig;
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;

  // Event handlers
  onVoiceResult?: (result: VoiceRecognitionResult) => void;
  onVoiceError?: (error: string) => void;
  onListeningStart?: () => void;
  onListeningEnd?: () => void;
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;

  constructor(config: CloudVoiceConfig) {
    this.config = config;
    this.initializeVoiceServices();
  }

  /**
   * Initialize voice services based on provider
   */
  private initializeVoiceServices(): void {
    switch (this.config.provider) {
      case 'webspeech':
        this.initializeWebSpeech();
        break;
      case 'assemblyai':
        this.initializeAssemblyAI();
        break;
      case 'deepgram':
        this.initializeDeepgram();
        break;
      case 'azure':
        this.initializeAzureSpeech();
        break;
      default:
        console.warn(`Voice provider ${this.config.provider} not implemented, falling back to Web Speech`);
        this.initializeWebSpeech();
    }
  }

  /**
   * Web Speech API (100% FREE, Built-in)
   */
  private initializeWebSpeech(): void {
    // Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = this.config.language || 'en-US';

        this.recognition.onstart = () => {
          this.isListening = true;
          this.onListeningStart?.();
        };

        this.recognition.onresult = (event: any) => {
          const result = event.results[0];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence || 0.9;

          this.onVoiceResult?.({
            transcript,
            confidence,
            language: this.config.language || 'en-US',
          });
        };

        this.recognition.onerror = (event: any) => {
          this.isListening = false;
          this.onVoiceError?.(event.error);
          this.onListeningEnd?.();
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.onListeningEnd?.();
        };
      }

      // Speech Synthesis
      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
      }
    }
  }

  /**
   * AssemblyAI (5 hours free/month)
   */
  private initializeAssemblyAI(): void {
    // AssemblyAI requires WebSocket connection for real-time
    // For simplicity, we'll use Web Speech as fallback
    console.log('AssemblyAI: Using Web Speech as fallback for real-time recognition');
    this.initializeWebSpeech();
  }

  /**
   * Deepgram ($200 free credit)
   */
  private initializeDeepgram(): void {
    // Deepgram requires WebSocket connection for real-time
    // For simplicity, we'll use Web Speech as fallback
    console.log('Deepgram: Using Web Speech as fallback for real-time recognition');
    this.initializeWebSpeech();
  }

  /**
   * Azure Speech (5 hours free/month)
   */
  private initializeAzureSpeech(): void {
    // Azure Speech SDK requires additional setup
    // For simplicity, we'll use Web Speech as fallback
    console.log('Azure Speech: Using Web Speech as fallback for real-time recognition');
    this.initializeWebSpeech();
  }

  /**
   * Start voice recognition
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      return;
    }

    try {
      if (this.config.provider === 'webspeech' && this.recognition) {
        this.recognition.start();
      } else {
        // For cloud providers, implement specific logic
        await this.startCloudRecognition();
      }
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      this.onVoiceError?.('Failed to start voice recognition');
    }
  }

  /**
   * Stop voice recognition
   */
  stopListening(): void {
    if (!this.isListening) {
      return;
    }

    if (this.config.provider === 'webspeech' && this.recognition) {
      this.recognition.stop();
    } else {
      this.stopCloudRecognition();
    }
  }

  /**
   * Speak text using text-to-speech
   */
  async speak(text: string, language?: string): Promise<void> {
    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    try {
      if (this.config.provider === 'webspeech' && this.synthesis) {
        await this.speakWithWebSpeech(text, language);
      } else {
        await this.speakWithCloudTTS(text, language);
      }
    } catch (error) {
      console.error('Failed to speak:', error);
      throw error;
    }
  }

  /**
   * Stop speaking
   */
  stopSpeaking(): void {
    if (this.config.provider === 'webspeech' && this.synthesis) {
      this.synthesis.cancel();
    }
    this.isSpeaking = false;
    this.onSpeakingEnd?.();
  }

  /**
   * Web Speech TTS
   */
  private async speakWithWebSpeech(text: string, language?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      this.isSpeaking = true;
      this.onSpeakingStart?.();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language || this.config.language || 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to find a voice for the specified language
      const voices = this.synthesis.getVoices();
      const targetVoice = voices.find(voice => 
        voice.lang.startsWith(utterance.lang.split('-')[0])
      );
      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      utterance.onend = () => {
        this.isSpeaking = false;
        this.onSpeakingEnd?.();
        resolve();
      };

      utterance.onerror = (error) => {
        this.isSpeaking = false;
        this.onSpeakingEnd?.();
        reject(error);
      };

      this.synthesis.speak(utterance);
    });
  }

  /**
   * Cloud TTS (placeholder for cloud providers)
   */
  private async speakWithCloudTTS(text: string, language?: string): Promise<void> {
    // For now, fallback to Web Speech
    // In production, implement specific cloud TTS APIs
    return this.speakWithWebSpeech(text, language);
  }

  /**
   * Start cloud recognition (placeholder)
   */
  private async startCloudRecognition(): Promise<void> {
    // Implement specific cloud recognition logic here
    // For now, fallback to Web Speech
    if (this.recognition) {
      this.recognition.start();
    } else {
      throw new Error('Voice recognition not available');
    }
  }

  /**
   * Stop cloud recognition (placeholder)
   */
  private stopCloudRecognition(): void {
    // Implement specific cloud recognition stop logic here
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  /**
   * Set language for recognition and TTS
   */
  setLanguage(language: string): void {
    this.config.language = language;
    
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  /**
   * Get available voices for TTS
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.synthesis) {
      return this.synthesis.getVoices();
    }
    return [];
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    const languages = [
      'en-US', 'en-GB', 'en-AU',
      'hi-IN',
      'ta-IN',
      'te-IN',
      'bn-IN',
      'mr-IN',
      'gu-IN',
      'es-ES', 'es-MX',
      'fr-FR',
      'de-DE',
      'it-IT',
      'pt-BR',
      'ja-JP',
      'ko-KR',
      'zh-CN',
    ];

    return languages;
  }

  /**
   * Check if voice recognition is supported
   */
  isRecognitionSupported(): boolean {
    return this.recognition !== null;
  }

  /**
   * Check if text-to-speech is supported
   */
  isTTSSupported(): boolean {
    return this.synthesis !== null;
  }

  /**
   * Get current status
   */
  getStatus(): {
    isListening: boolean;
    isSpeaking: boolean;
    provider: string;
    language: string;
    recognitionSupported: boolean;
    ttsSupported: boolean;
  } {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      provider: this.config.provider,
      language: this.config.language || 'en-US',
      recognitionSupported: this.isRecognitionSupported(),
      ttsSupported: this.isTTSSupported(),
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: CloudVoiceConfig): void {
    this.config = config;
    this.initializeVoiceServices();
  }

  /**
   * Test voice recognition
   */
  async testRecognition(): Promise<boolean> {
    try {
      if (!this.isRecognitionSupported()) {
        return false;
      }

      // Simple test - just check if we can start recognition
      await this.startListening();
      setTimeout(() => this.stopListening(), 1000);
      return true;
    } catch (error) {
      console.error('Voice recognition test failed:', error);
      return false;
    }
  }

  /**
   * Test text-to-speech
   */
  async testTTS(): Promise<boolean> {
    try {
      if (!this.isTTSSupported()) {
        return false;
      }

      await this.speak('Test', 'en-US');
      return true;
    } catch (error) {
      console.error('TTS test failed:', error);
      return false;
    }
  }
}