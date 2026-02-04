/**
 * Delivery Context Manager
 * 
 * Manages delivery context updates from external delivery data and provides
 * location and route awareness capabilities.
 */

import {
  DeliveryContext,
  Delivery,
  Route,
  VehicleStatus,
  GeoLocation,
  StatusUpdate
} from '../types';

export class DeliveryContextManager {
  private context: DeliveryContext | null = null;
  private contextUpdateCallbacks: Array<(context: DeliveryContext) => void> = [];
  private locationUpdateCallbacks: Array<(location: GeoLocation) => void> = [];

  /**
   * Initialize context with delivery data
   */
  initializeContext(initialContext: DeliveryContext): void {
    this.context = { ...initialContext };
    this.notifyContextUpdate();
  }

  /**
   * Update delivery context from external system
   */
  updateFromExternalData(deliveryData: {
    deliveries?: Delivery[];
    route?: Route;
    vehicleStatus?: VehicleStatus;
    location?: GeoLocation;
  }): void {
    if (!this.context) {
      throw new Error('Context must be initialized before updates');
    }

    let hasChanges = false;

    if (deliveryData.deliveries) {
      this.context.currentDeliveries = deliveryData.deliveries;
      hasChanges = true;
    }

    if (deliveryData.route) {
      this.context.activeRoute = deliveryData.route;
      hasChanges = true;
    }

    if (deliveryData.vehicleStatus) {
      this.context.vehicleStatus = deliveryData.vehicleStatus;
      hasChanges = true;
    }

    if (deliveryData.location) {
      const oldLocation = this.context.location;
      this.context.location = deliveryData.location;
      hasChanges = true;

      // Notify location-specific callbacks
      if (!this.locationsEqual(oldLocation, deliveryData.location)) {
        this.notifyLocationUpdate(deliveryData.location);
      }
    }

    if (hasChanges) {
      this.notifyContextUpdate();
    }
  }

  /**
   * Update single delivery status
   */
  updateDeliveryStatus(orderId: string, status: Delivery['status'], location?: GeoLocation): boolean {
    if (!this.context) return false;

    const delivery = this.context.currentDeliveries.find(d => d.id === orderId);
    if (!delivery) return false;

    delivery.status = status;

    // Update location if provided
    if (location) {
      this.context.location = location;
      this.notifyLocationUpdate(location);
    }

    this.notifyContextUpdate();
    return true;
  }

  /**
   * Add new delivery to context
   */
  addDelivery(delivery: Delivery): void {
    if (!this.context) {
      throw new Error('Context must be initialized before adding deliveries');
    }

    this.context.currentDeliveries.push(delivery);
    this.notifyContextUpdate();
  }

  /**
   * Remove delivery from context
   */
  removeDelivery(orderId: string): boolean {
    if (!this.context) return false;

    const initialLength = this.context.currentDeliveries.length;
    this.context.currentDeliveries = this.context.currentDeliveries.filter(d => d.id !== orderId);
    
    const wasRemoved = this.context.currentDeliveries.length < initialLength;
    if (wasRemoved) {
      this.notifyContextUpdate();
    }

    return wasRemoved;
  }

  /**
   * Update route information
   */
  updateRoute(route: Route): void {
    if (!this.context) {
      throw new Error('Context must be initialized before updating route');
    }

    this.context.activeRoute = route;
    this.notifyContextUpdate();
  }

  /**
   * Update vehicle status
   */
  updateVehicleStatus(vehicleStatus: VehicleStatus): void {
    if (!this.context) {
      throw new Error('Context must be initialized before updating vehicle status');
    }

    this.context.vehicleStatus = vehicleStatus;
    this.notifyContextUpdate();
  }

  /**
   * Update current location
   */
  updateLocation(location: GeoLocation): void {
    if (!this.context) {
      throw new Error('Context must be initialized before updating location');
    }

    const oldLocation = this.context.location;
    this.context.location = location;

    if (!this.locationsEqual(oldLocation, location)) {
      this.notifyLocationUpdate(location);
      this.notifyContextUpdate();
    }
  }

  /**
   * Get current context
   */
  getContext(): DeliveryContext | null {
    return this.context ? { ...this.context } : null;
  }

  /**
   * Get deliveries by status
   */
  getDeliveriesByStatus(status: Delivery['status']): Delivery[] {
    if (!this.context) return [];
    
    return this.context.currentDeliveries.filter(d => d.status === status);
  }

  /**
   * Get next delivery in sequence
   */
  getNextDelivery(): Delivery | null {
    if (!this.context) return null;

    // Find first non-completed delivery
    return this.context.currentDeliveries.find(
      d => d.status === 'pending' || d.status === 'picked_up' || d.status === 'in_transit'
    ) || null;
  }

  /**
   * Check if near any delivery location
   */
  checkLocationProximity(threshold: number = 0.001): {
    nearPickup?: { delivery: Delivery; distance: number };
    nearDelivery?: { delivery: Delivery; distance: number };
  } {
    if (!this.context?.location) return {};

    const currentLoc = this.context.location;
    const result: any = {};

    for (const delivery of this.context.currentDeliveries) {
      // Check pickup proximity for pending deliveries
      if (delivery.status === 'pending') {
        const pickupDistance = this.calculateDistance(currentLoc, delivery.pickupLocation.coordinates);
        if (pickupDistance <= threshold) {
          result.nearPickup = { delivery, distance: pickupDistance };
        }
      }

      // Check delivery proximity for picked up deliveries
      if (delivery.status === 'picked_up' || delivery.status === 'in_transit') {
        const deliveryDistance = this.calculateDistance(currentLoc, delivery.deliveryLocation.coordinates);
        if (deliveryDistance <= threshold) {
          result.nearDelivery = { delivery, distance: deliveryDistance };
        }
      }
    }

    return result;
  }

  /**
   * Generate context-aware suggestions
   */
  generateSuggestions(): string[] {
    if (!this.context) return [];

    const suggestions: string[] = [];
    const proximity = this.checkLocationProximity();
    
    // Location-based suggestions
    if (proximity.nearPickup) {
      suggestions.push(`You're near pickup for order ${proximity.nearPickup.delivery.id}. Mark as picked up?`);
    }
    
    if (proximity.nearDelivery) {
      suggestions.push(`You're near delivery for order ${proximity.nearDelivery.delivery.id}. Mark as delivered?`);
    }

    // Route-based suggestions
    const nextDelivery = this.getNextDelivery();
    if (nextDelivery) {
      if (nextDelivery.status === 'pending') {
        suggestions.push(`Navigate to pickup: ${nextDelivery.pickupLocation.street}`);
      } else {
        suggestions.push(`Navigate to delivery: ${nextDelivery.deliveryLocation.street}`);
      }
    }

    // Vehicle status suggestions
    if (this.context.vehicleStatus.isMoving && this.context.vehicleStatus.speed < 5) {
      suggestions.push('Send traffic delay notification?');
    }

    // Working hours suggestions
    if (!this.isWithinWorkingHours()) {
      suggestions.push('You are outside working hours');
    }

    return suggestions;
  }

  /**
   * Register callback for context updates
   */
  onContextUpdate(callback: (context: DeliveryContext) => void): void {
    this.contextUpdateCallbacks.push(callback);
  }

  /**
   * Register callback for location updates
   */
  onLocationUpdate(callback: (location: GeoLocation) => void): void {
    this.locationUpdateCallbacks.push(callback);
  }

  /**
   * Remove context update callback
   */
  removeContextUpdateCallback(callback: (context: DeliveryContext) => void): void {
    this.contextUpdateCallbacks = this.contextUpdateCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Remove location update callback
   */
  removeLocationUpdateCallback(callback: (location: GeoLocation) => void): void {
    this.locationUpdateCallbacks = this.locationUpdateCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Create status update object
   */
  createStatusUpdate(orderId: string, status: string, notes?: string): StatusUpdate {
    return {
      deliveryId: orderId,
      status,
      timestamp: new Date(),
      location: this.context?.location,
      notes
    };
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats(): {
    total: number;
    pending: number;
    pickedUp: number;
    inTransit: number;
    delivered: number;
    failed: number;
    completionRate: number;
  } {
    if (!this.context) {
      return { total: 0, pending: 0, pickedUp: 0, inTransit: 0, delivered: 0, failed: 0, completionRate: 0 };
    }

    const deliveries = this.context.currentDeliveries;
    const stats = {
      total: deliveries.length,
      pending: deliveries.filter(d => d.status === 'pending').length,
      pickedUp: deliveries.filter(d => d.status === 'picked_up').length,
      inTransit: deliveries.filter(d => d.status === 'in_transit').length,
      delivered: deliveries.filter(d => d.status === 'delivered').length,
      failed: deliveries.filter(d => d.status === 'failed').length,
      completionRate: 0
    };

    if (stats.total > 0) {
      stats.completionRate = (stats.delivered + stats.failed) / stats.total;
    }

    return stats;
  }

  /**
   * Private helper methods
   */
  private notifyContextUpdate(): void {
    if (this.context) {
      this.contextUpdateCallbacks.forEach(callback => {
        try {
          callback(this.context!);
        } catch (error) {
          console.error('Error in context update callback:', error);
        }
      });
    }
  }

  private notifyLocationUpdate(location: GeoLocation): void {
    this.locationUpdateCallbacks.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error in location update callback:', error);
      }
    });
  }

  private locationsEqual(loc1: GeoLocation, loc2: GeoLocation): boolean {
    if (!loc1 || !loc2) return false;
    
    const threshold = 0.0001; // ~10 meters
    return Math.abs(loc1.latitude - loc2.latitude) < threshold &&
           Math.abs(loc1.longitude - loc2.longitude) < threshold;
  }

  private calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
    // Simple Euclidean distance for proximity checking
    const latDiff = loc1.latitude - loc2.latitude;
    const lonDiff = loc1.longitude - loc2.longitude;
    return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
  }

  private isWithinWorkingHours(): boolean {
    if (!this.context?.workingHours) return true;

    const now = new Date();
    const { start, end } = this.context.workingHours;
    
    return now >= start && now <= end;
  }
}