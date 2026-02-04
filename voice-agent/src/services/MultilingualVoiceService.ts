import { VoiceManagerService } from './VoiceManagerService';
import { IntentProcessorService } from './IntentProcessorService';

export interface VoiceConfig {
  language: string;
  voice?: string;
  rate: number;
  pitch: number;
  volume: number;
}

export interface LanguageSupport {
  code: string;
  name: string;
  nativeName: string;
  speechRecognition: boolean;
  textToSpeech: boolean;
  voiceOptions: string[];
}

export class MultilingualVoiceService {
  private voiceManager: VoiceManagerService;
  private intentProcessor: IntentProcessorService;
  private currentLanguage: string = 'en';
  private synthesis: SpeechSynthesis | null = null;
  private recognition: any = null;

  // Supported languages configuration
  private supportedLanguages: LanguageSupport[] = [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      speechRecognition: true,
      textToSpeech: true,
      voiceOptions: ['en-US', 'en-GB', 'en-AU'],
    },
    {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिन्दी',
      speechRecognition: true,
      textToSpeech: true,
      voiceOptions: ['hi-IN'],
    },
    {
      code: 'ta',
      name: 'Tamil',
      nativeName: 'தமிழ்',
      speechRecognition: true,
      textToSpeech: true,
      voiceOptions: ['ta-IN'],
    },
    {
      code: 'te',
      name: 'Telugu',
      nativeName: 'తెలుగు',
      speechRecognition: true,
      textToSpeech: true,
      voiceOptions: ['te-IN'],
    },
    {
      code: 'bn',
      name: 'Bengali',
      nativeName: 'বাংলা',
      speechRecognition: true,
      textToSpeech: true,
      voiceOptions: ['bn-IN'],
    },
    {
      code: 'mr',
      name: 'Marathi',
      nativeName: 'मराठी',
      speechRecognition: true,
      textToSpeech: true,
      voiceOptions: ['mr-IN'],
    },
    {
      code: 'gu',
      name: 'Gujarati',
      nativeName: 'ગુજરાતી',
      speechRecognition: true,
      textToSpeech: true,
      voiceOptions: ['gu-IN'],
    },
  ];

  constructor() {
    this.voiceManager = new VoiceManagerService();
    this.intentProcessor = new IntentProcessorService();
    
    // Initialize speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }

    // Initialize speech recognition
    this.initializeSpeechRecognition();
  }

  /**
   * Initialize the service with a specific language
   */
  async initialize(language: string): Promise<void> {
    this.currentLanguage = language;
    
    // Configure voice manager for the language
    await this.voiceManager.setLanguage(language);
    
    // Configure speech recognition
    if (this.recognition) {
      const langConfig = this.getLanguageConfig(language);
      if (langConfig && langConfig.voiceOptions.length > 0) {
        this.recognition.lang = langConfig.voiceOptions[0];
      }
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageSupport[] {
    return this.supportedLanguages;
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.some(lang => lang.code === language);
  }

  /**
   * Get language configuration
   */
  getLanguageConfig(language: string): LanguageSupport | null {
    return this.supportedLanguages.find(lang => lang.code === language) || null;
  }

  /**
   * Speak text in the specified language
   */
  async speak(text: string, language?: string): Promise<void> {
    const targetLanguage = language || this.currentLanguage;
    const langConfig = this.getLanguageConfig(targetLanguage);
    
    if (!langConfig || !langConfig.textToSpeech) {
      throw new Error(`Text-to-speech not supported for language: ${targetLanguage}`);
    }

    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set language-specific voice
      const voices = this.synthesis.getVoices();
      const targetVoice = voices.find(voice => 
        langConfig.voiceOptions.some(option => voice.lang.startsWith(option))
      );
      
      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      // Configure speech parameters
      utterance.rate = this.getOptimalRate(targetLanguage);
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      this.synthesis.speak(utterance);
    });
  }

  /**
   * Stop speaking
   */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Start listening for speech in the current language
   */
  async startListening(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not available');
    }

    const langConfig = this.getLanguageConfig(this.currentLanguage);
    if (!langConfig || !langConfig.speechRecognition) {
      throw new Error(`Speech recognition not supported for language: ${this.currentLanguage}`);
    }

    return new Promise((resolve, reject) => {
      this.recognition.lang = langConfig.voiceOptions[0];
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onstart = () => resolve();
      this.recognition.onerror = (error: any) => reject(error);

      try {
        this.recognition.start();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  /**
   * Process voice command in the current language
   */
  async processCommand(command: string, context?: any, language?: string): Promise<string> {
    const targetLanguage = language || this.currentLanguage;
    
    // Translate command to English for processing if needed
    const processedCommand = await this.translateForProcessing(command, targetLanguage);
    
    // Process the command
    const response = await this.intentProcessor.processInput(processedCommand, context);
    
    // Translate response back to target language if needed
    return this.translateResponse(response, targetLanguage);
  }

  /**
   * Get available voices for a language
   */
  getAvailableVoices(language: string): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    
    const langConfig = this.getLanguageConfig(language);
    if (!langConfig) return [];

    const voices = this.synthesis.getVoices();
    return voices.filter(voice => 
      langConfig.voiceOptions.some(option => voice.lang.startsWith(option))
    );
  }

  /**
   * Set voice configuration
   */
  setVoiceConfig(config: VoiceConfig): void {
    this.currentLanguage = config.language;
    // Additional voice configuration can be stored here
  }

  /**
   * Get optimal speech rate for language
   */
  private getOptimalRate(language: string): number {
    const rates: Record<string, number> = {
      'en': 1.0,
      'hi': 0.8,  // Slower for Hindi
      'ta': 0.8,  // Slower for Tamil
      'te': 0.8,  // Slower for Telugu
      'bn': 0.8,  // Slower for Bengali
      'mr': 0.8,  // Slower for Marathi
      'gu': 0.8,  // Slower for Gujarati
    };
    return rates[language] || 1.0;
  }

  /**
   * Initialize speech recognition
   */
  private initializeSpeechRecognition(): void {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
      }
    }
  }

  /**
   * Translate command for processing (placeholder - integrate with translation service)
   */
  private async translateForProcessing(command: string, fromLanguage: string): Promise<string> {
    // If already in English, return as-is
    if (fromLanguage === 'en') {
      return command;
    }

    // For demo purposes, return basic translations
    // In production, integrate with Google Translate API or similar
    const basicTranslations: Record<string, Record<string, string>> = {
      'hi': {
        'स्थिति': 'status',
        'डिलीवरी': 'delivery',
        'पार्सल': 'parcel',
        'कहाँ': 'where',
        'कब': 'when',
        'मदद': 'help',
      },
      'ta': {
        'நிலை': 'status',
        'டெலிவரி': 'delivery',
        'பார்சல்': 'parcel',
        'எங்கே': 'where',
        'எப்போது': 'when',
        'உதவி': 'help',
      },
      'te': {
        'స్థితి': 'status',
        'డెలివరీ': 'delivery',
        'పార్సెల్': 'parcel',
        'ఎక్కడ': 'where',
        'ఎప్పుడు': 'when',
        'సహాయం': 'help',
      },
    };

    let translatedCommand = command.toLowerCase();
    const translations = basicTranslations[fromLanguage];
    
    if (translations) {
      Object.entries(translations).forEach(([original, translated]) => {
        translatedCommand = translatedCommand.replace(new RegExp(original, 'gi'), translated);
      });
    }

    return translatedCommand;
  }

  /**
   * Translate response to target language (placeholder)
   */
  private translateResponse(response: string, toLanguage: string): string {
    // If target is English, return as-is
    if (toLanguage === 'en') {
      return response;
    }

    // Basic response translations for demo
    const responseTranslations: Record<string, Record<string, string>> = {
      'hi': {
        'Your parcel status is': 'आपके पार्सल की स्थिति है',
        'delivered': 'डिलीवर किया गया',
        'in transit': 'ट्रांजिट में',
        'pending': 'लंबित',
        'delayed': 'देरी से',
        'How can I help you': 'मैं आपकी कैसे मदद कर सकता हूं',
        'I can help you with': 'मैं आपकी मदद कर सकता हूं',
      },
      'ta': {
        'Your parcel status is': 'உங்கள் பார்சல் நிலை',
        'delivered': 'வழங்கப்பட்டது',
        'in transit': 'போக்குவரத்தில்',
        'pending': 'நிலுவையில்',
        'delayed': 'தாமதம்',
        'How can I help you': 'நான் உங்களுக்கு எப்படி உதவ முடியும்',
        'I can help you with': 'நான் உங்களுக்கு உதவ முடியும்',
      },
      'te': {
        'Your parcel status is': 'మీ పార్సెల్ స్థితి',
        'delivered': 'డెలివర్ చేయబడింది',
        'in transit': 'రవాణాలో',
        'pending': 'పెండింగ్',
        'delayed': 'ఆలస్యం',
        'How can I help you': 'నేను మీకు ఎలా సహాయం చేయగలను',
        'I can help you with': 'నేను మీకు సహాయం చేయగలను',
      },
    };

    let translatedResponse = response;
    const translations = responseTranslations[toLanguage];
    
    if (translations) {
      Object.entries(translations).forEach(([english, translated]) => {
        translatedResponse = translatedResponse.replace(new RegExp(english, 'gi'), translated);
      });
    }

    return translatedResponse;
  }

  /**
   * Set up voice result handler
   */
  onVoiceResult?: (result: string) => void;
  onVoiceError?: (error: string) => void;

  /**
   * Configure recognition event handlers
   */
  setupRecognitionHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      if (this.onVoiceResult) {
        this.onVoiceResult(result);
      }
    };

    this.recognition.onerror = (event: any) => {
      if (this.onVoiceError) {
        this.onVoiceError(event.error);
      }
    };
  }
}