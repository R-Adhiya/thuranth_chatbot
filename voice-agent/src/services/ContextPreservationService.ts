/**
 * Context Preservation Service
 * 
 * Handles seamless context preservation when switching between voice and chat modes.
 * Ensures conversation continuity and delivery context consistency across mode transitions.
 */

import {
  ConversationContext,
  DeliveryContext,
  VoiceAgentEvent,
  EventCallback
} from '../types';

export interface ContextPreservation {
  preserveContext(context: ConversationContext): void;
  restoreContext(): ConversationContext | null;
  switchMode(fromMode: 'voice' | 'chat', toMode: 'voice' | 'chat'): void;
  updateDeliveryContext(context: DeliveryContext): void;
  getContextSnapshot(): ContextSnapshot;
  isContextValid(): boolean;
  clearContext(): void;
}

export interface ContextSnapshot {
  conversationContext: ConversationContext | null;
  currentMode: 'voice' | 'chat';
  lastActivity: Date;
  contextVersion: number;
  isValid: boolean;
}

export interface ModeTransition {
  fromMode: 'voice' | 'chat';
  toMode: 'voice' | 'chat';
  timestamp: Date;
  contextPreserved: boolean;
  messageCount: number;
  deliveryContextId?: string;
}

export class ContextPreservationService implements ContextPreservation {
  private conversationContext: ConversationContext | null = null;
  private currentMode: 'voice' | 'chat' = 'chat';
  private lastActivity: Date = new Date();
  private contextVersion: number = 0;
  private eventCallbacks: Map<VoiceAgentEvent, EventCallback[]> = new Map();
  private transitionHistory: ModeTransition[] = [];
  private maxTransitionHistory = 10;
  private contextExpirationMinutes = 60; // Context expires after 1 hour of inactivity

  constructor() {
    this.initializeEventCallbacks();
  }

  /**
   * Preserve current conversation context
   */
  preserveContext(context: ConversationContext): void {
    this.conversationContext = {
      messages: [...context.messages],
      ...(context.currentTopic !== undefined && { currentTopic: context.currentTopic }),
      deliveryContext: { ...context.deliveryContext }
    };
    
    this.lastActivity = new Date();
    this.contextVersion++;
    
    this.emitEvent('context_updated', {
      action: 'context_preserved',
      messageCount: context.messages.length,
      topic: context.currentTopic || 'none',
      version: this.contextVersion
    });
  }

  /**
   * Restore preserved conversation context
   */
  restoreContext(): ConversationContext | null {
    if (!this.isContextValid()) {
      return null;
    }

    if (!this.conversationContext) {
      return null;
    }

    // Return a deep copy to prevent mutations
    const restoredContext: ConversationContext = {
      messages: [...this.conversationContext.messages],
      ...(this.conversationContext.currentTopic !== undefined && { currentTopic: this.conversationContext.currentTopic }),
      deliveryContext: { ...this.conversationContext.deliveryContext }
    };

    this.emitEvent('context_updated', {
      action: 'context_restored',
      messageCount: restoredContext.messages.length,
      topic: restoredContext.currentTopic || 'none',
      version: this.contextVersion
    });

    return restoredContext;
  }

  /**
   * Handle mode switching with context preservation
   */
  switchMode(fromMode: 'voice' | 'chat', toMode: 'voice' | 'chat'): void {
    if (fromMode === toMode) {
      return; // No switch needed
    }

    const transition: ModeTransition = {
      fromMode,
      toMode,
      timestamp: new Date(),
      contextPreserved: this.conversationContext !== null,
      messageCount: this.conversationContext?.messages.length || 0,
      ...(this.conversationContext?.deliveryContext?.partnerId && { 
        deliveryContextId: this.conversationContext.deliveryContext.partnerId 
      })
    };

    // Add to transition history
    this.transitionHistory.push(transition);
    if (this.transitionHistory.length > this.maxTransitionHistory) {
      this.transitionHistory.shift();
    }

    // Update current mode
    this.currentMode = toMode;
    this.lastActivity = new Date();

    this.emitEvent('context_updated', {
      action: 'mode_switched',
      fromMode,
      toMode,
      contextPreserved: transition.contextPreserved,
      messageCount: transition.messageCount
    });
  }

  /**
   * Update delivery context while preserving conversation context
   */
  updateDeliveryContext(context: DeliveryContext): void {
    if (this.conversationContext) {
      // Update delivery context while preserving conversation
      this.conversationContext.deliveryContext = { ...context };
    } else {
      // Create new conversation context with delivery context
      this.conversationContext = {
        messages: [],
        deliveryContext: { ...context }
      };
    }

    this.lastActivity = new Date();
    this.contextVersion++;

    this.emitEvent('context_updated', {
      action: 'delivery_context_updated',
      partnerId: context.partnerId,
      deliveryCount: context.currentDeliveries.length,
      version: this.contextVersion
    });
  }

  /**
   * Get current context snapshot
   */
  getContextSnapshot(): ContextSnapshot {
    return {
      conversationContext: this.conversationContext ? {
        messages: [...this.conversationContext.messages],
        ...(this.conversationContext.currentTopic !== undefined && { currentTopic: this.conversationContext.currentTopic }),
        deliveryContext: { ...this.conversationContext.deliveryContext }
      } : null,
      currentMode: this.currentMode,
      lastActivity: this.lastActivity,
      contextVersion: this.contextVersion,
      isValid: this.isContextValid()
    };
  }

  /**
   * Check if current context is valid and not expired
   */
  isContextValid(): boolean {
    if (!this.conversationContext) {
      return false;
    }

    // Check if context has expired
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - this.lastActivity.getTime();
    const expirationTime = this.contextExpirationMinutes * 60 * 1000;

    if (timeSinceLastActivity > expirationTime) {
      return false;
    }

    // Check if delivery context is valid
    if (!this.conversationContext.deliveryContext) {
      return false;
    }

    // Check if partner ID exists
    if (!this.conversationContext.deliveryContext.partnerId) {
      return false;
    }

    return true;
  }

  /**
   * Clear all preserved context
   */
  clearContext(): void {
    this.conversationContext = null;
    this.contextVersion = 0;
    this.lastActivity = new Date();
    this.transitionHistory = [];

    this.emitEvent('context_updated', {
      action: 'context_cleared',
      version: this.contextVersion
    });
  }

  /**
   * Merge contexts when switching modes
   */
  mergeContexts(voiceContext: ConversationContext, chatContext: ConversationContext): ConversationContext {
    // Merge messages chronologically
    const allMessages = [...voiceContext.messages, ...chatContext.messages]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Use the most recent delivery context
    const mostRecentDeliveryContext = voiceContext.deliveryContext.partnerId === chatContext.deliveryContext.partnerId
      ? chatContext.deliveryContext // Assume chat context is more recent
      : voiceContext.deliveryContext;

    // Determine current topic from most recent messages
    const recentMessages = allMessages.slice(-3);
    const currentTopic = recentMessages
      .filter(msg => msg.intent)
      .map(msg => msg.intent!.type)
      .pop();

    const mergedContext: ConversationContext = {
      messages: allMessages,
      ...(currentTopic !== undefined && { currentTopic }),
      deliveryContext: mostRecentDeliveryContext
    };

    this.preserveContext(mergedContext);

    this.emitEvent('context_updated', {
      action: 'contexts_merged',
      messageCount: allMessages.length,
      topic: currentTopic,
      version: this.contextVersion
    });

    return mergedContext;
  }

  /**
   * Get transition history
   */
  getTransitionHistory(): ModeTransition[] {
    return [...this.transitionHistory];
  }

  /**
   * Get context statistics
   */
  getContextStats(): {
    messageCount: number;
    modeTransitions: number;
    contextAge: number;
    isValid: boolean;
    currentMode: 'voice' | 'chat';
    lastTopic?: string;
  } {
    return {
      messageCount: this.conversationContext?.messages.length || 0,
      modeTransitions: this.transitionHistory.length,
      contextAge: Date.now() - this.lastActivity.getTime(),
      isValid: this.isContextValid(),
      currentMode: this.currentMode,
      ...(this.conversationContext?.currentTopic && { lastTopic: this.conversationContext.currentTopic })
    };
  }

  /**
   * Refresh context activity timestamp
   */
  refreshActivity(): void {
    this.lastActivity = new Date();
    
    this.emitEvent('context_updated', {
      action: 'activity_refreshed',
      timestamp: this.lastActivity
    });
  }

  /**
   * Check if context needs refresh
   */
  needsRefresh(maxAgeMinutes: number = 30): boolean {
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - this.lastActivity.getTime();
    const maxAge = maxAgeMinutes * 60 * 1000;

    return timeSinceLastActivity > maxAge;
  }

  /**
   * Export context for persistence
   */
  exportContext(): {
    conversationContext: ConversationContext | null;
    currentMode: 'voice' | 'chat';
    lastActivity: Date;
    contextVersion: number;
    transitionHistory: ModeTransition[];
  } {
    return {
      conversationContext: this.conversationContext ? {
        messages: [...this.conversationContext.messages],
        ...(this.conversationContext.currentTopic !== undefined && { currentTopic: this.conversationContext.currentTopic }),
        deliveryContext: { ...this.conversationContext.deliveryContext }
      } : null,
      currentMode: this.currentMode,
      lastActivity: this.lastActivity,
      contextVersion: this.contextVersion,
      transitionHistory: [...this.transitionHistory]
    };
  }

  /**
   * Import context from persistence
   */
  importContext(data: {
    conversationContext: ConversationContext | null;
    currentMode: 'voice' | 'chat';
    lastActivity: Date;
    contextVersion: number;
    transitionHistory: ModeTransition[];
  }): void {
    this.conversationContext = data.conversationContext;
    this.currentMode = data.currentMode;
    this.lastActivity = data.lastActivity;
    this.contextVersion = data.contextVersion;
    this.transitionHistory = data.transitionHistory;

    this.emitEvent('context_updated', {
      action: 'context_imported',
      version: this.contextVersion,
      messageCount: this.conversationContext?.messages.length || 0
    });
  }

  /**
   * Validate context integrity
   */
  validateContextIntegrity(): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!this.conversationContext) {
      issues.push('No conversation context available');
      recommendations.push('Initialize context with delivery data');
      return { isValid: false, issues, recommendations };
    }

    // Check message integrity
    if (this.conversationContext.messages.length === 0) {
      issues.push('No messages in conversation context');
      recommendations.push('Start a conversation to build context');
    }

    // Check message chronology
    const messages = this.conversationContext.messages;
    for (let i = 1; i < messages.length; i++) {
      const currentMessage = messages[i];
      const previousMessage = messages[i - 1];
      if (currentMessage?.timestamp && previousMessage?.timestamp && 
          currentMessage.timestamp < previousMessage.timestamp) {
        issues.push('Messages are not in chronological order');
        recommendations.push('Sort messages by timestamp');
        break;
      }
    }

    // Check delivery context
    if (!this.conversationContext.deliveryContext) {
      issues.push('No delivery context available');
      recommendations.push('Update with current delivery information');
    } else {
      const deliveryContext = this.conversationContext.deliveryContext;
      if (!deliveryContext.partnerId) {
        issues.push('Missing partner ID in delivery context');
        recommendations.push('Ensure partner ID is set');
      }

      if (!deliveryContext.location) {
        issues.push('Missing location in delivery context');
        recommendations.push('Update with current location');
      }
    }

    // Check context age
    if (this.needsRefresh()) {
      issues.push('Context is stale');
      recommendations.push('Refresh context with recent activity');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Auto-cleanup expired contexts
   */
  cleanupExpiredContext(): boolean {
    if (!this.isContextValid()) {
      this.clearContext();
      return true;
    }
    return false;
  }

  /**
   * Initialize event callback system
   */
  private initializeEventCallbacks(): void {
    const events: VoiceAgentEvent[] = [
      'context_updated'
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
        console.error(`Error in event callback for ${event}:`, error);
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
   * Set context expiration time
   */
  setContextExpiration(minutes: number): void {
    this.contextExpirationMinutes = Math.max(1, minutes);
    
    this.emitEvent('context_updated', {
      action: 'expiration_updated',
      expirationMinutes: this.contextExpirationMinutes
    });
  }

  /**
   * Get context expiration time
   */
  getContextExpiration(): number {
    return this.contextExpirationMinutes;
  }

  /**
   * Force context refresh
   */
  forceRefresh(): void {
    this.lastActivity = new Date();
    this.contextVersion++;
    
    this.emitEvent('context_updated', {
      action: 'force_refreshed',
      version: this.contextVersion,
      timestamp: this.lastActivity
    });
  }
}