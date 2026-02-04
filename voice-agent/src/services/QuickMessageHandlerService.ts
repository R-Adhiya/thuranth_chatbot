/**
 * Quick Message Handler Service
 * 
 * Manages predefined delivery status messages for rapid communication.
 * Provides voice trigger recognition and one-tap message sending interface.
 */

import { 
  QuickMessageHandler, 
  QuickMessage, 
  DeliveryContext, 
  Delivery 
} from '../types';

export class QuickMessageHandlerService implements QuickMessageHandler {
  private messages: QuickMessage[];
  private voiceTriggerMap: Map<string, string>;

  constructor() {
    this.messages = this.initializeMessages();
    this.voiceTriggerMap = new Map();
    this.setupVoiceTriggers();
  }

  /**
   * Initialize predefined message templates
   */
  private initializeMessages(): QuickMessage[] {
    return [
      {
        id: 'reached_pickup',
        template: 'Reached pickup location for order {orderId}',
        voiceTriggers: ['reached pickup', 'at pickup location', 'pickup ready'],
        category: 'location'
      },
      {
        id: 'reached_delivery',
        template: 'Reached delivery location for order {orderId}',
        voiceTriggers: ['reached delivery', 'at delivery location', 'delivery ready'],
        category: 'location'
      },
      {
        id: 'traffic_delay',
        template: 'Delayed due to traffic, estimated {minutes} minutes late',
        voiceTriggers: ['traffic delay', 'stuck in traffic', 'running late'],
        category: 'delay'
      },
      {
        id: 'customer_unavailable',
        template: 'Unable to contact customer for order {orderId}',
        voiceTriggers: ['customer not available', 'no answer', 'cannot contact'],
        category: 'contact'
      }
    ];
  }

  /**
   * Set up voice trigger mappings
   */
  private setupVoiceTriggers(): void {
    this.messages.forEach(message => {
      message.voiceTriggers.forEach(trigger => {
        this.voiceTriggerMap.set(trigger.toLowerCase(), message.id);
      });
    });
  }

  /**
   * Get available messages based on delivery context
   */
  getAvailableMessages(context: DeliveryContext): QuickMessage[] {
    // Filter messages based on current delivery state
    const availableMessages = this.messages.filter(message => {
      switch (message.category) {
        case 'location':
          // Location messages are always available
          return true;
        case 'delay':
          // Delay messages available when there are active deliveries
          return context.currentDeliveries.length > 0;
        case 'contact':
          // Contact messages available when there are active deliveries
          return context.currentDeliveries.length > 0;
        default:
          return true;
      }
    });

    return availableMessages;
  }

  /**
   * Send a quick message with optional customization
   */
  async sendMessage(messageId: string, customization?: string): Promise<void> {
    const message = this.messages.find(m => m.id === messageId);
    if (!message) {
      throw new Error(`Message with id ${messageId} not found`);
    }

    let finalMessage = message.template;
    
    // Apply customization if provided
    if (customization) {
      finalMessage = this.applyCustomization(finalMessage, customization);
    }

    // In a real implementation, this would send the message through the integration API
    // For now, we'll simulate the sending process
    console.log(`Sending quick message: ${finalMessage}`);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Register a voice trigger for a specific message
   */
  registerVoiceTrigger(phrase: string, messageId: string): void {
    const message = this.messages.find(m => m.id === messageId);
    if (!message) {
      throw new Error(`Message with id ${messageId} not found`);
    }

    const normalizedPhrase = phrase.toLowerCase();
    this.voiceTriggerMap.set(normalizedPhrase, messageId);
    
    // Add to the message's voice triggers if not already present
    if (!message.voiceTriggers.includes(phrase)) {
      message.voiceTriggers.push(phrase);
    }
  }

  /**
   * Find message ID by voice trigger phrase
   */
  findMessageByVoiceTrigger(phrase: string): string | null {
    const normalizedPhrase = phrase.toLowerCase();
    
    // Direct match
    if (this.voiceTriggerMap.has(normalizedPhrase)) {
      return this.voiceTriggerMap.get(normalizedPhrase) || null;
    }

    // Fuzzy match - check if phrase contains any trigger
    for (const [trigger, messageId] of this.voiceTriggerMap.entries()) {
      if (normalizedPhrase.includes(trigger) || trigger.includes(normalizedPhrase)) {
        return messageId;
      }
    }

    return null;
  }

  /**
   * Apply customization to message template
   */
  private applyCustomization(template: string, customization: string): string {
    // Parse customization string for template variables
    const customizationData = this.parseCustomization(customization);
    
    let result = template;
    Object.entries(customizationData).forEach(([key, value]) => {
      result = result.replace(`{${key}}`, value);
    });

    return result;
  }

  /**
   * Parse customization string into key-value pairs
   */
  private parseCustomization(customization: string): Record<string, string> {
    const data: Record<string, string> = {};
    
    // Simple parsing - in real implementation this would be more sophisticated
    if (customization.includes('order')) {
      const orderMatch = customization.match(/order\s+(\w+)/i);
      if (orderMatch) {
        data.orderId = orderMatch[1];
      }
    }
    
    if (customization.includes('minutes')) {
      const minutesMatch = customization.match(/(\d+)\s+minutes/i);
      if (minutesMatch) {
        data.minutes = minutesMatch[1];
      }
    }

    return data;
  }

  /**
   * Get all available message templates
   */
  getAllMessages(): QuickMessage[] {
    return [...this.messages];
  }

  /**
   * Get message by ID
   */
  getMessageById(messageId: string): QuickMessage | null {
    return this.messages.find(m => m.id === messageId) || null;
  }

  /**
   * Get messages by category
   */
  getMessagesByCategory(category: QuickMessage['category']): QuickMessage[] {
    return this.messages.filter(m => m.category === category);
  }
}