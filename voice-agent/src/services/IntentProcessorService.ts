/**
 * Intent Processor Service
 * 
 * Handles intent classification and entity extraction for delivery-related commands.
 * Converts user input (voice or text) into actionable delivery system commands.
 */

import {
  IntentProcessor,
  Intent,
  Entity,
  DeliveryContext,
  Delivery,
  GeoLocation
} from '../types';

export class IntentProcessorService implements IntentProcessor {
  private deliveryContext: DeliveryContext | null = null;
  
  // Intent patterns for delivery-specific commands
  private readonly intentPatterns = {
    delivery_status: [
      /what.*status.*order/i,
      /where.*my.*delivery/i,
      /status.*delivery/i,
      /check.*order/i,
      /delivery.*update/i
    ],
    navigation: [
      /navigate.*to/i,
      /directions.*to/i,
      /go.*to/i,
      /next.*stop/i,
      /route.*to/i,
      /where.*next/i
    ],
    communication: [
      /call.*customer/i,
      /contact.*customer/i,
      /message.*customer/i,
      /notify.*customer/i,
      /send.*message/i
    ],
    quick_message: [
      /reached.*pickup/i,
      /reached.*delivery/i,
      /delayed.*traffic/i,
      /cannot.*contact/i,
      /unable.*contact/i,
      /traffic.*delay/i,
      /running.*late/i
    ]
  };

  // Entity extraction patterns
  private readonly entityPatterns = {
    orderId: /order\s*(?:id|number)?\s*([a-zA-Z0-9\-_]+)/i,
    location: /(?:to|at|near)\s+([a-zA-Z0-9\s,.-]+?)(?:\s|$)/i,
    time: /(?:in|at|by)\s+(\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm)|minutes?|hours?)/i,
    customerName: /customer\s+([a-zA-Z\s]+)/i,
    address: /(?:address|location)\s+([a-zA-Z0-9\s,.-]+)/i
  };

  /**
   * Process user input and convert to actionable intent
   */
  async processInput(input: string, context: DeliveryContext): Promise<Intent> {
    this.updateContext(context);
    
    const normalizedInput = input.toLowerCase().trim();
    
    // Classify intent type
    const intentType = this.classifyIntent(normalizedInput);
    
    // Extract entities from input
    const entities = this.extractEntities(input);
    
    // Determine specific action based on intent and entities
    const action = this.determineAction(intentType, normalizedInput, entities);
    
    // Extract parameters from entities and context
    const parameters = this.extractParameters(entities, context);
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(intentType, normalizedInput, entities);
    
    return {
      type: intentType,
      action,
      parameters,
      confidence
    };
  }

  /**
   * Validate if an intent is properly formed and actionable
   */
  validateIntent(intent: Intent): boolean {
    // Check if intent type is valid
    if (!['delivery_status', 'navigation', 'communication', 'quick_message'].includes(intent.type)) {
      return false;
    }
    
    // Check confidence threshold
    if (intent.confidence < 0.6) {
      return false;
    }
    
    // Check if action is not empty
    if (!intent.action || intent.action.trim().length === 0) {
      return false;
    }
    
    // Validate required parameters based on intent type
    return this.validateIntentParameters(intent);
  }

  /**
   * Extract entities from user input
   */
  extractEntities(input: string): Entity[] {
    const entities: Entity[] = [];
    
    // Extract order IDs
    const orderMatch = input.match(this.entityPatterns.orderId);
    if (orderMatch) {
      entities.push({
        type: 'orderId',
        value: orderMatch[1],
        confidence: 0.9,
        startIndex: orderMatch.index || 0,
        endIndex: (orderMatch.index || 0) + orderMatch[0].length
      });
    }
    
    // Extract locations
    const locationMatch = input.match(this.entityPatterns.location);
    if (locationMatch) {
      entities.push({
        type: 'location',
        value: locationMatch[1].trim(),
        confidence: 0.8,
        startIndex: locationMatch.index || 0,
        endIndex: (locationMatch.index || 0) + locationMatch[0].length
      });
    }
    
    // Extract time references
    const timeMatch = input.match(this.entityPatterns.time);
    if (timeMatch) {
      entities.push({
        type: 'time',
        value: timeMatch[1],
        confidence: 0.85,
        startIndex: timeMatch.index || 0,
        endIndex: (timeMatch.index || 0) + timeMatch[0].length
      });
    }
    
    // Extract customer names
    const customerMatch = input.match(this.entityPatterns.customerName);
    if (customerMatch) {
      entities.push({
        type: 'customerName',
        value: customerMatch[1].trim(),
        confidence: 0.8,
        startIndex: customerMatch.index || 0,
        endIndex: (customerMatch.index || 0) + customerMatch[0].length
      });
    }
    
    return entities;
  }

  /**
   * Update delivery context for context-aware processing
   */
  updateContext(context: DeliveryContext): void {
    this.deliveryContext = context;
  }

  /**
   * Classify the intent type based on input patterns
   */
  private classifyIntent(input: string): Intent['type'] {
    let bestMatch: Intent['type'] = 'delivery_status';
    let highestScore = 0;
    
    for (const [intentType, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          const score = this.calculatePatternScore(input, pattern);
          if (score > highestScore) {
            highestScore = score;
            bestMatch = intentType as Intent['type'];
          }
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Determine specific action based on intent type and input
   */
  private determineAction(intentType: Intent['type'], input: string, entities: Entity[]): string {
    switch (intentType) {
      case 'delivery_status':
        if (input.includes('next')) return 'get_next_delivery';
        if (input.includes('current')) return 'get_current_status';
        if (entities.some(e => e.type === 'orderId')) return 'get_order_status';
        return 'get_delivery_overview';
        
      case 'navigation':
        if (input.includes('next')) return 'navigate_to_next_stop';
        if (entities.some(e => e.type === 'location')) return 'navigate_to_location';
        return 'get_directions';
        
      case 'communication':
        if (input.includes('call')) return 'call_customer';
        if (input.includes('message') || input.includes('notify')) return 'message_customer';
        return 'contact_customer';
        
      case 'quick_message':
        if (input.includes('reached') && input.includes('pickup')) return 'send_reached_pickup';
        if (input.includes('reached') && input.includes('delivery')) return 'send_reached_delivery';
        if (input.includes('delay') || input.includes('traffic')) return 'send_traffic_delay';
        if (input.includes('cannot') || input.includes('unable')) return 'send_customer_unavailable';
        return 'send_status_update';
        
      default:
        return 'unknown_action';
    }
  }

  /**
   * Extract parameters from entities and context
   */
  private extractParameters(entities: Entity[], context: DeliveryContext): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    // Add entity values as parameters
    entities.forEach(entity => {
      parameters[entity.type] = entity.value;
    });
    
    // Add context-aware parameters
    if (context.currentDeliveries.length > 0) {
      const currentDelivery = context.currentDeliveries[0];
      parameters.currentOrderId = currentDelivery.id;
      parameters.currentStatus = currentDelivery.status;
      
      // Add next delivery if available
      if (context.currentDeliveries.length > 1) {
        parameters.nextOrderId = context.currentDeliveries[1].id;
      }
    }
    
    // Add location context
    if (context.location) {
      parameters.currentLocation = context.location;
    }
    
    // Add route context
    if (context.activeRoute) {
      parameters.routeId = context.activeRoute.id;
      parameters.remainingStops = context.activeRoute.stops.length;
    }
    
    return parameters;
  }

  /**
   * Calculate confidence score for intent classification
   */
  private calculateConfidence(intentType: Intent['type'], input: string, entities: Entity[]): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence based on pattern matches
    const patterns = this.intentPatterns[intentType];
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        confidence += 0.2;
        break;
      }
    }
    
    // Boost confidence based on entity extraction
    if (entities.length > 0) {
      confidence += entities.length * 0.1;
    }
    
    // Boost confidence based on context relevance
    if (this.deliveryContext) {
      if (intentType === 'delivery_status' && this.deliveryContext.currentDeliveries.length > 0) {
        confidence += 0.1;
      }
      if (intentType === 'navigation' && this.deliveryContext.activeRoute) {
        confidence += 0.1;
      }
    }
    
    // Cap confidence at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate pattern matching score
   */
  private calculatePatternScore(input: string, pattern: RegExp): number {
    const match = input.match(pattern);
    if (!match) return 0;
    
    // Score based on match length relative to input length
    return match[0].length / input.length;
  }

  /**
   * Validate intent parameters based on type
   */
  private validateIntentParameters(intent: Intent): boolean {
    switch (intent.type) {
      case 'delivery_status':
        // Status queries are generally valid without specific parameters
        return true;
        
      case 'navigation':
        // Navigation requires either a location or context
        return intent.parameters.location || 
               intent.parameters.currentLocation || 
               intent.action === 'navigate_to_next_stop';
        
      case 'communication':
        // Communication requires customer context
        return intent.parameters.customerName || 
               intent.parameters.currentOrderId ||
               (this.deliveryContext && this.deliveryContext.currentDeliveries.length > 0);
        
      case 'quick_message':
        // Quick messages are generally valid
        return true;
        
      default:
        return false;
    }
  }

  /**
   * Get context-aware delivery information
   */
  getDeliveryByOrderId(orderId: string): Delivery | null {
    if (!this.deliveryContext) return null;
    
    return this.deliveryContext.currentDeliveries.find(d => d.id === orderId) || null;
  }

  /**
   * Get next delivery in route
   */
  getNextDelivery(): Delivery | null {
    if (!this.deliveryContext || this.deliveryContext.currentDeliveries.length === 0) {
      return null;
    }
    
    // Find the first non-delivered delivery
    return this.deliveryContext.currentDeliveries.find(
      d => d.status === 'pending' || d.status === 'picked_up' || d.status === 'in_transit'
    ) || null;
  }

  /**
   * Check if location is near current position
   */
  isLocationNearby(targetLocation: GeoLocation, threshold: number = 0.01): boolean {
    if (!this.deliveryContext?.location) return false;
    
    const currentLoc = this.deliveryContext.location;
    const latDiff = Math.abs(currentLoc.latitude - targetLocation.latitude);
    const lonDiff = Math.abs(currentLoc.longitude - targetLocation.longitude);
    
    return latDiff < threshold && lonDiff < threshold;
  }

  /**
   * Get context-aware response for delivery queries
   */
  generateContextAwareResponse(intent: Intent): string {
    if (!this.deliveryContext) {
      return "I don't have access to your delivery context right now.";
    }

    switch (intent.action) {
      case 'get_next_delivery':
        const nextDelivery = this.getNextDelivery();
        if (!nextDelivery) {
          return "You don't have any pending deliveries.";
        }
        return `Your next delivery is order ${nextDelivery.id} to ${nextDelivery.deliveryLocation.street}, ${nextDelivery.deliveryLocation.city}. Status: ${nextDelivery.status}.`;

      case 'get_current_status':
        if (this.deliveryContext.currentDeliveries.length === 0) {
          return "You don't have any active deliveries.";
        }
        const activeCount = this.deliveryContext.currentDeliveries.filter(
          d => d.status !== 'delivered' && d.status !== 'failed'
        ).length;
        return `You have ${activeCount} active deliveries. ${this.deliveryContext.currentDeliveries.length} total deliveries in your route.`;

      case 'get_order_status':
        const orderId = intent.parameters.orderId;
        if (!orderId) {
          return "Please specify an order ID to check status.";
        }
        const delivery = this.getDeliveryByOrderId(orderId);
        if (!delivery) {
          return `I couldn't find order ${orderId} in your current deliveries.`;
        }
        return `Order ${orderId} status: ${delivery.status}. ${delivery.status === 'pending' ? 'Ready for pickup' : delivery.status === 'picked_up' ? 'In transit to delivery location' : 'Completed'}.`;

      case 'navigate_to_next_stop':
        const nextStop = this.getNextDelivery();
        if (!nextStop) {
          return "No more stops in your route.";
        }
        const location = nextStop.status === 'pending' ? nextStop.pickupLocation : nextStop.deliveryLocation;
        return `Navigate to ${location.street}, ${location.city}, ${location.state} ${location.zipCode}`;

      case 'navigate_to_location':
        const targetLocation = intent.parameters.location;
        if (!targetLocation) {
          return "Please specify a location to navigate to.";
        }
        return `Navigate to ${targetLocation}`;

      default:
        return "I can help you with delivery status, navigation, and communication tasks.";
    }
  }

  /**
   * Update delivery status based on location and context
   */
  updateDeliveryStatusFromLocation(): string | null {
    if (!this.deliveryContext?.location) return null;

    const currentLocation = this.deliveryContext.location;
    
    // Check if near any pickup or delivery locations
    for (const delivery of this.deliveryContext.currentDeliveries) {
      if (delivery.status === 'pending' && 
          this.isLocationNearby(delivery.pickupLocation.coordinates, 0.001)) {
        return `You're near the pickup location for order ${delivery.id}. Would you like to mark it as picked up?`;
      }
      
      if (delivery.status === 'picked_up' && 
          this.isLocationNearby(delivery.deliveryLocation.coordinates, 0.001)) {
        return `You're near the delivery location for order ${delivery.id}. Would you like to mark it as delivered?`;
      }
    }

    return null;
  }

  /**
   * Get route-aware suggestions
   */
  getRouteSuggestions(): string[] {
    if (!this.deliveryContext?.activeRoute) return [];

    const suggestions: string[] = [];
    const nextDelivery = this.getNextDelivery();
    
    if (nextDelivery) {
      suggestions.push(`Navigate to next stop: ${nextDelivery.deliveryLocation.city}`);
      
      if (nextDelivery.customerInfo.phone) {
        suggestions.push(`Call customer for order ${nextDelivery.id}`);
      }
      
      if (nextDelivery.specialInstructions) {
        suggestions.push(`Review special instructions for order ${nextDelivery.id}`);
      }
    }

    // Check for potential delays
    if (this.deliveryContext.vehicleStatus.speed < 10 && this.deliveryContext.vehicleStatus.isMoving) {
      suggestions.push("Send traffic delay notification");
    }

    return suggestions;
  }

  /**
   * Get delivery statistics for context awareness
   */
  getDeliveryStats(): {
    total: number;
    pending: number;
    pickedUp: number;
    inTransit: number;
    delivered: number;
    failed: number;
  } {
    if (!this.deliveryContext) {
      return { total: 0, pending: 0, pickedUp: 0, inTransit: 0, delivered: 0, failed: 0 };
    }

    const deliveries = this.deliveryContext.currentDeliveries;
    return {
      total: deliveries.length,
      pending: deliveries.filter(d => d.status === 'pending').length,
      pickedUp: deliveries.filter(d => d.status === 'picked_up').length,
      inTransit: deliveries.filter(d => d.status === 'in_transit').length,
      delivered: deliveries.filter(d => d.status === 'delivered').length,
      failed: deliveries.filter(d => d.status === 'failed').length
    };
  }

  /**
   * Check if delivery partner is currently working
   */
  isWithinWorkingHours(): boolean {
    if (!this.deliveryContext?.workingHours) return true;

    const now = new Date();
    const { start, end } = this.deliveryContext.workingHours;
    
    return now >= start && now <= end;
  }

  /**
   * Get estimated time to complete all deliveries
   */
  getEstimatedCompletionTime(): Date | null {
    if (!this.deliveryContext?.activeRoute) return null;

    const now = new Date();
    const remainingTime = this.deliveryContext.activeRoute.estimatedDuration;
    
    return new Date(now.getTime() + remainingTime * 1000);
  }

  /**
   * Get customer information for current delivery
   */
  getCurrentCustomerInfo(): { name: string; phone: string; notes?: string } | null {
    const currentDelivery = this.getNextDelivery();
    if (!currentDelivery) return null;

    return {
      name: currentDelivery.customerInfo.name,
      phone: currentDelivery.customerInfo.phone,
      notes: currentDelivery.customerInfo.notes
    };
  }
}