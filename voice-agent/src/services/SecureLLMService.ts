import { CloudLLMConfig } from '../config/cloud-config';
import { 
  PRODUCTION_CONFIG, 
  STRICT_SYSTEM_PROMPTS, 
  isDeliveryRelated, 
  REJECTION_MESSAGES,
  FALLBACK_CONFIG 
} from '../config/production-config';
import { Parcel } from './ParcelSelectionService';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  language?: string;
  blocked?: boolean;
}

/**
 * Secure LLM Service with Strict Domain Control
 * Ensures AI never breaks character and only answers delivery-related questions
 */
export class SecureLLMService {
  private primaryConfig: CloudLLMConfig;
  private fallbackConfig: CloudLLMConfig;
  private conversationHistory: ChatMessage[] = [];
  private retryCount: number = 0;

  constructor(primaryConfig?: CloudLLMConfig, fallbackConfig?: CloudLLMConfig) {
    this.primaryConfig = primaryConfig || PRODUCTION_CONFIG.llm;
    this.fallbackConfig = fallbackConfig || PRODUCTION_CONFIG.fallbackLLM;
  }

  /**
   * Process message with strict domain validation
   */
  async processMessage(
    text: string,
    selectedParcel?: Parcel | null,
    language: string = 'en'
  ): Promise<string> {
    try {
      // STEP 1: Domain Validation - Block non-delivery topics
      if (!this.validateDeliveryDomain(text)) {
        const rejectionMessage = REJECTION_MESSAGES[language as keyof typeof REJECTION_MESSAGES] || REJECTION_MESSAGES.en;
        
        // Log blocked attempt
        this.addToHistory('user', text, language, true);
        this.addToHistory('agent', rejectionMessage, language);
        
        return rejectionMessage;
      }

      // STEP 2: Build secure prompt with strict instructions
      const prompt = this.buildSecurePrompt(text, selectedParcel, language);
      
      // STEP 3: Try primary LLM (Groq)
      let response: string;
      try {
        response = await this.callLLMWithRetry(this.primaryConfig, prompt);
      } catch (primaryError) {
        console.warn('Primary LLM failed, trying fallback:', primaryError);
        
        // STEP 4: Fallback to OpenAI if Groq fails
        try {
          response = await this.callLLMWithRetry(this.fallbackConfig, prompt);
        } catch (fallbackError) {
          console.error('Both LLMs failed:', fallbackError);
          return this.getErrorResponse(language);
        }
      }

      // STEP 5: Validate response is delivery-focused
      const validatedResponse = this.validateResponse(response, language);
      
      // STEP 6: Add to history
      this.addToHistory('user', text, language);
      this.addToHistory('agent', validatedResponse, language);
      
      return validatedResponse;
      
    } catch (error) {
      console.error('Secure LLM processing error:', error);
      return this.getErrorResponse(language);
    }
  }

  /**
   * Validate if input is delivery-related
   */
  private validateDeliveryDomain(input: string): boolean {
    // Use the domain validation from config
    return isDeliveryRelated(input);
  }

  /**
  