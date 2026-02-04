/**
 * Domain Controller Service
 * 
 * Enforces delivery-only scope and prevents off-topic interactions.
 * Validates intents against approved delivery-related whitelist and logs rejected queries.
 */

import { 
  DomainController, 
  Intent, 
  ValidationResult, 
  VoiceAgentError 
} from '../types';

export class DomainControllerService implements DomainController {
  private approvedIntents: string[] = [
    // Delivery Status Intents
    'delivery_status_check',
    'delivery_status_update',
    'delivery_mark_picked_up',
    'delivery_mark_delivered',
    'delivery_mark_failed',
    'delivery_get_next',
    'delivery_get_current',
    'delivery_get_details',
    
    // Navigation Intents
    'navigation_to_pickup',
    'navigation_to_delivery',
    'navigation_to_next_stop',
    'navigation_get_directions',
    'navigation_get_eta',
    'navigation_report_traffic',
    
    // Communication Intents
    'communication_send_message',
    'communication_call_customer',
    'communication_report_delay',
    'communication_report_issue',
    'communication_contact_support',
    
    // Quick Message Intents
    'quick_message_reached_pickup',
    'quick_message_reached_delivery',
    'quick_message_traffic_delay',
    'quick_message_customer_unavailable',
    'quick_message_delivery_complete',
    'quick_message_need_assistance',
    
    // Route and Location Intents
    'route_get_overview',
    'route_get_remaining_stops',
    'location_get_current',
    'location_share_with_customer',
    
    // Vehicle and Status Intents
    'vehicle_status_check',
    'vehicle_report_issue',
    'break_start',
    'break_end',
    'shift_start',
    'shift_end'
  ];

  private blockedKeywords: string[] = [
    // Entertainment
    'music', 'song', 'play', 'movie', 'video', 'game', 'entertainment',
    
    // Personal/Social
    'personal', 'family', 'friend', 'social', 'dating', 'relationship',
    
    // News/Politics
    'news', 'politics', 'election', 'government', 'president', 'vote',
    
    // Shopping/Commerce (non-delivery)
    'buy', 'purchase', 'shop', 'store', 'mall', 'price', 'discount',
    
    // General Knowledge
    'wikipedia', 'definition', 'history', 'science', 'math', 'calculate',
    
    // Weather (unless delivery-related)
    'weather', 'temperature', 'rain', 'snow', 'forecast',
    
    // Sports
    'sports', 'football', 'basketball', 'baseball', 'soccer', 'game score',
    
    // Technology (non-delivery)
    'computer', 'software', 'programming', 'internet', 'email', 'social media'
  ];

  private rejectionMessage: string = "I can help only with delivery-related tasks";
  
  private queryLog: Array<{
    query: string;
    reason: string;
    timestamp: Date;
  }> = [];

  /**
   * Validates if an intent is within the approved delivery domain
   */
  validateIntent(intent: Intent): ValidationResult {
    try {
      // Check if intent type is approved
      if (!this.isApprovedIntentType(intent.type)) {
        const reason = `Intent type '${intent.type}' is not approved for delivery operations`;
        this.logRejectedQuery(intent.action, reason);
        return {
          isValid: false,
          reason,
          suggestedAction: 'Please ask about delivery status, navigation, or communication tasks'
        };
      }

      // Check if specific action is in approved list
      if (!this.approvedIntents.includes(intent.action)) {
        const reason = `Intent action '${intent.action}' is not in approved delivery intents`;
        this.logRejectedQuery(intent.action, reason);
        return {
          isValid: false,
          reason,
          suggestedAction: 'Try asking about delivery status, directions, or sending messages'
        };
      }

      // Check for blocked keywords in parameters
      const blockedKeywordFound = this.containsBlockedKeywords(intent.parameters);
      if (blockedKeywordFound) {
        const reason = `Query contains blocked keyword: ${blockedKeywordFound}`;
        this.logRejectedQuery(JSON.stringify(intent.parameters), reason);
        return {
          isValid: false,
          reason,
          suggestedAction: 'Please focus on delivery-related tasks only'
        };
      }

      // Check confidence threshold
      if (intent.confidence < 0.3) {
        const reason = `Intent confidence too low: ${intent.confidence}`;
        this.logRejectedQuery(intent.action, reason);
        return {
          isValid: false,
          reason,
          suggestedAction: 'Please rephrase your delivery-related request more clearly'
        };
      }

      return {
        isValid: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      this.logRejectedQuery(intent.action, `Validation error: ${errorMessage}`);
      return {
        isValid: false,
        reason: 'Unable to validate intent due to system error',
        suggestedAction: 'Please try again with a delivery-related request'
      };
    }
  }

  /**
   * Returns the list of approved delivery-related intents
   */
  getApprovedIntents(): string[] {
    return [...this.approvedIntents];
  }

  /**
   * Logs rejected queries for monitoring and improvement
   */
  logRejectedQuery(query: string, reason: string): void {
    const logEntry = {
      query,
      reason,
      timestamp: new Date()
    };
    
    this.queryLog.push(logEntry);
    
    // Keep only last 1000 entries to prevent memory issues
    if (this.queryLog.length > 1000) {
      this.queryLog = this.queryLog.slice(-1000);
    }
    
    // In a real implementation, this would also send to external logging service
    console.log('[DomainController] Rejected query:', logEntry);
  }

  /**
   * Generates the standard rejection response message
   */
  generateRejectionResponse(): string {
    return this.rejectionMessage;
  }

  /**
   * Gets the query log for monitoring purposes
   */
  getQueryLog(): Array<{ query: string; reason: string; timestamp: Date }> {
    return [...this.queryLog];
  }

  /**
   * Clears the query log (useful for testing or maintenance)
   */
  clearQueryLog(): void {
    this.queryLog = [];
  }

  /**
   * Updates the approved intents list (for configuration updates)
   */
  updateApprovedIntents(newIntents: string[]): void {
    this.approvedIntents = [...newIntents];
  }

  /**
   * Updates the blocked keywords list (for configuration updates)
   */
  updateBlockedKeywords(newKeywords: string[]): void {
    this.blockedKeywords = [...newKeywords];
  }

  /**
   * Updates the rejection message (for configuration updates)
   */
  updateRejectionMessage(newMessage: string): void {
    this.rejectionMessage = newMessage;
  }

  // Private helper methods

  private isApprovedIntentType(type: string): boolean {
    const approvedTypes = ['delivery_status', 'navigation', 'communication', 'quick_message'];
    return approvedTypes.includes(type);
  }

  private containsBlockedKeywords(parameters: Record<string, any>): string | null {
    const paramString = JSON.stringify(parameters).toLowerCase();
    
    for (const keyword of this.blockedKeywords) {
      if (paramString.includes(keyword.toLowerCase())) {
        return keyword;
      }
    }
    
    return null;
  }
}