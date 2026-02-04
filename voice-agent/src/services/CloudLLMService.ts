import { CloudLLMConfig } from '../config/cloud-config';
import { Parcel } from './ParcelSelectionService';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  language?: string;
}

/**
 * Cloud-based LLM Service
 * Works with multiple cloud providers without local setup
 */
export class CloudLLMService {
  private config: CloudLLMConfig;
  private conversationHistory: ChatMessage[] = [];

  constructor(config: CloudLLMConfig) {
    this.config = config;
  }

  /**
   * Process message with cloud LLM
   */
  async processMessage(
    text: string,
    selectedParcel?: Parcel | null,
    language: string = 'en'
  ): Promise<string> {
    try {
      const prompt = this.buildPrompt(text, selectedParcel, language);
      const response = await this.callCloudLLM(prompt);
      
      // Add to history
      this.addToHistory('user', text, language);
      this.addToHistory('agent', response, language);
      
      return response;
    } catch (error) {
      console.error('Cloud LLM error:', error);
      return this.getErrorResponse(language);
    }
  }

  /**
   * Call cloud LLM based on provider
   */
  private async callCloudLLM(prompt: string): Promise<string> {
    switch (this.config.provider) {
      case 'gemini':
        return this.callGemini(prompt);
      case 'huggingface':
        return this.callHuggingFace(prompt);
      case 'groq':
        return this.callGroq(prompt);
      case 'openai':
        return this.callOpenAI(prompt);
      case 'cohere':
        return this.callCohere(prompt);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /**
   * Google Gemini API (FREE)
   */
  private async callGemini(prompt: string): Promise<string> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: this.config.temperature || 0.7,
              maxOutputTokens: this.config.maxTokens || 500,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  /**
   * Hugging Face API (FREE)
   */
  private async callHuggingFace(prompt: string): Promise<string> {
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.config.model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              temperature: this.config.temperature || 0.7,
              max_new_tokens: this.config.maxTokens || 500,
              return_full_text: false,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (Array.isArray(data) && data[0]?.generated_text) {
        return data[0].generated_text.replace(prompt, '').trim();
      }
      
      return 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('Hugging Face API error:', error);
      throw error;
    }
  }

  /**
   * Groq API (FREE TIER)
   */
  private async callGroq(prompt: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: this.config.temperature || 0.7,
            max_tokens: this.config.maxTokens || 500,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('Groq API error:', error);
      throw error;
    }
  }

  /**
   * OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: this.config.temperature || 0.7,
            max_tokens: this.config.maxTokens || 500,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  /**
   * Cohere API (FREE TIER)
   */
  private async callCohere(prompt: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            prompt,
            temperature: this.config.temperature || 0.7,
            max_tokens: this.config.maxTokens || 500,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status}`);
      }

      const data = await response.json();
      return data.generations?.[0]?.text || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('Cohere API error:', error);
      throw error;
    }
  }

  /**
   * Build context-aware prompt
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

பதில்களை சுருக்கமாகவும், உதவிகரமாகவும், டெலிவரி செயல்பாடுகளில் கவனம் செலுத்தியும் வைத்திருங்கள்।`,

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
    const recentMessages = this.conversationHistory.slice(-6);
    return recentMessages
      .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n');
  }

  /**
   * Add message to history
   */
  private addToHistory(sender: 'user' | 'agent', text: string, language: string): void {
    this.conversationHistory.push({
      id: this.generateMessageId(),
      text,
      sender,
      timestamp: new Date(),
      language,
    });

    // Keep only last 20 messages
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
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
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update configuration
   */
  setConfig(config: CloudLLMConfig): void {
    this.config = config;
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
  clearHistory(): void {
    this.conversationHistory = [];
  }
}