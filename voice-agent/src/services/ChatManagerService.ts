import AsyncStorage from '@react-native-async-storage/async-storage';
import { Parcel } from './ParcelSelectionService';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  language?: string;
}

export interface LLMConfig {
  provider: 'ollama' | 'openai' | 'gemini' | 'huggingface';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export class ChatManagerService {
  private static readonly STORAGE_KEY = 'chat_history';
  private llmConfig: LLMConfig;
  private conversationHistory: ChatMessage[] = [];

  constructor(config?: LLMConfig) {
    // Default to Ollama (free local LLM)
    this.llmConfig = config || {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b',
      temperature: 0.7,
      maxTokens: 500,
    };
  }

  /**
   * Process message with LLM integration
   */
  async processMessage(
    text: string,
    selectedParcel?: Parcel | null,
    language: string = 'en'
  ): Promise<string> {
    try {
      // Add user message to history
      const userMessage: ChatMessage = {
        id: this.generateMessageId(),
        text,
        sender: 'user',
        timestamp: new Date(),
        language,
      };
      
      this.conversationHistory.push(userMessage);
      await this.saveHistory();

      // Generate context-aware prompt
      const prompt = this.buildPrompt(text, selectedParcel, language);
      
      // Get response from LLM
      const response = await this.callLLM(prompt);
      
      // Add agent response to history
      const agentMessage: ChatMessage = {
        id: this.generateMessageId(),
        text: response,
        sender: 'agent',
        timestamp: new Date(),
        language,
      };
      
      this.conversationHistory.push(agentMessage);
      await this.saveHistory();

      return response;
    } catch (error) {
      console.error('Chat processing error:', error);
      return this.getErrorResponse(language);
    }
  }

  /**
   * Build context-aware prompt for LLM
   */
  private buildPrompt(userInput: string, selectedParcel?: Parcel | null, language: string = 'en'): string {
    const systemPrompt = this.getSystemPrompt(language);
    const parcelContext = selectedParcel ? this.getParcelContext(selectedParcel, language) : '';
    const conversationContext = this.getConversationContext();
    
    return `${systemPrompt}

${parcelContext}

${conversationContext}

User: ${userInput}
Assistant:`;
  }

  /**
   * Get system prompt in specified language
   */
  private getSystemPrompt(language: string): string {
    const prompts: Record<string, string> = {
      en: `You are a helpful AI assistant for delivery drivers. You can only help with delivery-related tasks such as:
- Parcel status updates
- Navigation assistance  
- Customer communication
- Delivery confirmations
- Traffic and delay notifications
- Pickup confirmations

Keep responses concise, helpful, and focused on delivery operations. If asked about non-delivery topics, politely redirect to delivery-related assistance.`,

      hi: `आप डिलीवरी ड्राइवरों के लिए एक सहायक AI असिस्टेंट हैं। आप केवल डिलीवरी संबंधी कार्यों में मदद कर सकते हैं जैसे:
- पार्सल स्थिति अपडेट
- नेवीगेशन सहायता
- ग्राहक संचार
- डिलीवरी पुष्टि
- ट्रैफिक और देरी की सूचना
- पिकअप पुष्टि

जवाब संक्षिप्त, सहायक और डिलीवरी संचालन पर केंद्रित रखें।`,

      ta: `நீங்கள் டெலிவரி டிரைவர்களுக்கான உதவிகரமான AI உதவியாளர். நீங்கள் டெலிவரி தொடர்பான பணிகளில் மட்டுமே உதவ முடியும்:
- பார்சல் நிலை புதுப்பிப்புகள்
- வழிசெலுத்தல் உதவி
- வாடிக்கையாளர் தொடர்பு
- டெலிவரி உறுதிப்படுத்தல்
- போக்குவரத்து மற்றும் தாமத அறிவிப்புகள்
- பிக்அப் உறுதிப்படுத்தல்

பதில்களை சுருக்கமாகவும், உதவிகரமாகவும், டெலிவரி செயல்பாடுகளில் கவனம் செலுத்தியும் வைத்திருங்கள்.`,

      te: `మీరు డెలివరీ డ్రైవర్లకు సహాయకరమైన AI అసిస్టెంట్. మీరు డెలివరీ సంబంధిత పనులలో మాత్రమే సహాయం చేయగలరు:
- పార్సెల్ స్థితి అప్‌డేట్‌లు
- నావిగేషన్ సహాయం
- కస్టమర్ కమ్యూనికేషన్
- డెలివరీ నిర్ధారణలు
- ట్రాఫిక్ మరియు ఆలస్య నోటిఫికేషన్లు
- పికప్ నిర్ధారణలు

ప్రతిస్పందనలను సంక్షిప్తంగా, సహాయకరంగా మరియు డెలివరీ కార్యకలాపాలపై దృష్టి సారించి ఉంచండి।`,
    };

    return prompts[language] || prompts['en'];
  }

  /**
   * Get parcel context for prompt
   */
  private getParcelContext(parcel: Parcel, language: string): string {
    const labels: Record<string, Record<string, string>> = {
      en: {
        selected: 'Selected Parcel Information:',
        tracking: 'Tracking Number:',
        status: 'Status:',
        destination: 'Destination:',
        customer: 'Customer:',
        priority: 'Priority:',
        attempts: 'Delivery Attempts:',
      },
      hi: {
        selected: 'चयनित पार्सल जानकारी:',
        tracking: 'ट्रैकिंग नंबर:',
        status: 'स्थिति:',
        destination: 'गंतव्य:',
        customer: 'ग्राहक:',
        priority: 'प्राथमिकता:',
        attempts: 'डिलीवरी प्रयास:',
      },
      ta: {
        selected: 'தேர்ந்தெடுக்கப்பட்ட பார்சல் தகவல்:',
        tracking: 'ட்ராக்கிங் எண்:',
        status: 'நிலை:',
        destination: 'இலக்கு:',
        customer: 'வாடிக்கையாளர்:',
        priority: 'முன்னுரிமை:',
        attempts: 'டெலிவரி முயற்சிகள்:',
      },
      te: {
        selected: 'ఎంచుకున్న పార్సెల్ సమాచారం:',
        tracking: 'ట్రాకింగ్ నంబర్:',
        status: 'స్థితి:',
        destination: 'గమ్యం:',
        customer: 'కస్టమర్:',
        priority: 'ప్రాధాన్యత:',
        attempts: 'డెలివరీ ప్రయత్నాలు:',
      },
    };

    const l = labels[language] || labels['en'];
    
    return `${l.selected}
${l.tracking} ${parcel.trackingNumber}
${l.status} ${parcel.status}
${l.destination} ${parcel.destination}
${l.customer} ${parcel.customerName}
${l.priority} ${parcel.priority}
${l.attempts} ${parcel.deliveryAttempts}`;
  }

  /**
   * Get recent conversation context
   */
  private getConversationContext(): string {
    const recentMessages = this.conversationHistory.slice(-6); // Last 3 exchanges
    return recentMessages
      .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n');
  }

  /**
   * Call LLM API based on provider
   */
  private async callLLM(prompt: string): Promise<string> {
    switch (this.llmConfig.provider) {
      case 'ollama':
        return this.callOllama(prompt);
      case 'openai':
        return this.callOpenAI(prompt);
      case 'gemini':
        return this.callGemini(prompt);
      case 'huggingface':
        return this.callHuggingFace(prompt);
      default:
        throw new Error(`Unsupported LLM provider: ${this.llmConfig.provider}`);
    }
  }

  /**
   * Call Ollama API (free local LLM)
   */
  private async callOllama(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.llmConfig.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.llmConfig.model,
          prompt,
          stream: false,
          options: {
            temperature: this.llmConfig.temperature || 0.7,
            num_predict: this.llmConfig.maxTokens || 500,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('Ollama API error:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.llmConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: this.llmConfig.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: this.llmConfig.temperature || 0.7,
          max_tokens: this.llmConfig.maxTokens || 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Call Google Gemini API
   */
  private async callGemini(prompt: string): Promise<string> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.llmConfig.model}:generateContent?key=${this.llmConfig.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: this.llmConfig.temperature || 0.7,
            maxOutputTokens: this.llmConfig.maxTokens || 500,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Call Hugging Face API
   */
  private async callHuggingFace(prompt: string): Promise<string> {
    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${this.llmConfig.model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.llmConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            temperature: this.llmConfig.temperature || 0.7,
            max_new_tokens: this.llmConfig.maxTokens || 500,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const data = await response.json();
      return data[0]?.generated_text?.replace(prompt, '').trim() || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('Hugging Face API error:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Get fallback response when LLM fails
   */
  private getFallbackResponse(): string {
    const responses = [
      "I can help you with delivery status, navigation, and customer communication. What do you need?",
      "How can I assist you with your deliveries today?",
      "I'm here to help with your delivery tasks. Please let me know what you need.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Get error response in specified language
   */
  private getErrorResponse(language: string): string {
    const responses: Record<string, string> = {
      en: "I'm sorry, I encountered an error. Please try again.",
      hi: "माफ करें, मुझे एक त्रुटि का सामना करना पड़ा। कृपया पुनः प्रयास करें।",
      ta: "மன்னிக்கவும், நான் ஒரு பிழையை எதிர்கொண்டேன். தயவுசெய்து மீண்டும் முயற்சிக்கவும்.",
      te: "క్షమించండి, నేను ఒక లోపాన్ని ఎదుర్కొన్నాను. దయచేసి మళ్లీ ప్రయత్నించండి.",
    };
    return responses[language] || responses['en'];
  }

  /**
   * Configure LLM settings
   */
  setLLMConfig(config: LLMConfig): void {
    this.llmConfig = { ...this.llmConfig, ...config };
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  async clearHistory(): Promise<void> {
    this.conversationHistory = [];
    await AsyncStorage.removeItem(ChatManagerService.STORAGE_KEY);
  }

  /**
   * Load conversation history from storage
   */
  async loadHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(ChatManagerService.STORAGE_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        this.conversationHistory = history.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }

  /**
   * Save conversation history to storage
   */
  private async saveHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        ChatManagerService.STORAGE_KEY,
        JSON.stringify(this.conversationHistory)
      );
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}