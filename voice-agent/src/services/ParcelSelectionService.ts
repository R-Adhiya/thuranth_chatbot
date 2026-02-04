import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Parcel {
  id: string;
  trackingNumber: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'delayed' | 'failed';
  destination: string;
  customerName: string;
  customerPhone?: string;
  pickupLocation: string;
  estimatedDelivery: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  specialInstructions?: string;
  deliveryAttempts: number;
  lastUpdate: Date;
}

export class ParcelSelectionService {
  private static readonly STORAGE_KEY = 'active_parcels';
  private static readonly SELECTED_PARCEL_KEY = 'selected_parcel';

  /**
   * Get all active parcels for the current driver
   */
  async getActiveParcels(): Promise<Parcel[]> {
    try {
      // In a real app, this would fetch from your backend API
      // For demo purposes, we'll use mock data with AsyncStorage
      const stored = await AsyncStorage.getItem(ParcelSelectionService.STORAGE_KEY);
      
      if (stored) {
        const parcels = JSON.parse(stored);
        return parcels.map((p: any) => ({
          ...p,
          estimatedDelivery: new Date(p.estimatedDelivery),
          lastUpdate: new Date(p.lastUpdate),
        }));
      }

      // Return mock data if no stored data
      return this.getMockParcels();
    } catch (error) {
      console.error('Failed to load parcels:', error);
      return this.getMockParcels();
    }
  }

  /**
   * Get parcels filtered by status
   */
  async getParcelsByStatus(status: Parcel['status']): Promise<Parcel[]> {
    const allParcels = await this.getActiveParcels();
    return allParcels.filter(parcel => parcel.status === status);
  }

  /**
   * Get parcels by priority
   */
  async getParcelsByPriority(priority: Parcel['priority']): Promise<Parcel[]> {
    const allParcels = await this.getActiveParcels();
    return allParcels.filter(parcel => parcel.priority === priority);
  }

  /**
   * Search parcels by tracking number or customer name
   */
  async searchParcels(query: string): Promise<Parcel[]> {
    const allParcels = await this.getActiveParcels();
    const lowerQuery = query.toLowerCase();
    
    return allParcels.filter(parcel => 
      parcel.trackingNumber.toLowerCase().includes(lowerQuery) ||
      parcel.customerName.toLowerCase().includes(lowerQuery) ||
      parcel.destination.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get parcel by tracking number
   */
  async getParcelByTrackingNumber(trackingNumber: string): Promise<Parcel | null> {
    const allParcels = await this.getActiveParcels();
    return allParcels.find(parcel => parcel.trackingNumber === trackingNumber) || null;
  }

  /**
   * Update parcel status
   */
  async updateParcelStatus(trackingNumber: string, status: Parcel['status']): Promise<boolean> {
    try {
      const parcels = await this.getActiveParcels();
      const parcelIndex = parcels.findIndex(p => p.trackingNumber === trackingNumber);
      
      if (parcelIndex === -1) {
        return false;
      }

      parcels[parcelIndex].status = status;
      parcels[parcelIndex].lastUpdate = new Date();
      
      if (status === 'in_transit') {
        parcels[parcelIndex].deliveryAttempts += 1;
      }

      await this.saveParcels(parcels);
      return true;
    } catch (error) {
      console.error('Failed to update parcel status:', error);
      return false;
    }
  }

  /**
   * Add delivery attempt
   */
  async addDeliveryAttempt(trackingNumber: string, notes?: string): Promise<boolean> {
    try {
      const parcels = await this.getActiveParcels();
      const parcelIndex = parcels.findIndex(p => p.trackingNumber === trackingNumber);
      
      if (parcelIndex === -1) {
        return false;
      }

      parcels[parcelIndex].deliveryAttempts += 1;
      parcels[parcelIndex].lastUpdate = new Date();
      
      if (notes) {
        parcels[parcelIndex].specialInstructions = 
          (parcels[parcelIndex].specialInstructions || '') + `\nAttempt ${parcels[parcelIndex].deliveryAttempts}: ${notes}`;
      }

      await this.saveParcels(parcels);
      return true;
    } catch (error) {
      console.error('Failed to add delivery attempt:', error);
      return false;
    }
  }

  /**
   * Get currently selected parcel
   */
  async getSelectedParcel(): Promise<Parcel | null> {
    try {
      const stored = await AsyncStorage.getItem(ParcelSelectionService.SELECTED_PARCEL_KEY);
      if (stored) {
        const parcel = JSON.parse(stored);
        return {
          ...parcel,
          estimatedDelivery: new Date(parcel.estimatedDelivery),
          lastUpdate: new Date(parcel.lastUpdate),
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get selected parcel:', error);
      return null;
    }
  }

  /**
   * Set selected parcel
   */
  async setSelectedParcel(parcel: Parcel | null): Promise<void> {
    try {
      if (parcel) {
        await AsyncStorage.setItem(
          ParcelSelectionService.SELECTED_PARCEL_KEY,
          JSON.stringify(parcel)
        );
      } else {
        await AsyncStorage.removeItem(ParcelSelectionService.SELECTED_PARCEL_KEY);
      }
    } catch (error) {
      console.error('Failed to set selected parcel:', error);
    }
  }

  /**
   * Get parcels sorted by priority and estimated delivery
   */
  async getSortedParcels(): Promise<Parcel[]> {
    const parcels = await this.getActiveParcels();
    
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    
    return parcels.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by estimated delivery time
      return a.estimatedDelivery.getTime() - b.estimatedDelivery.getTime();
    });
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(): Promise<{
    total: number;
    pending: number;
    inTransit: number;
    delivered: number;
    delayed: number;
    failed: number;
  }> {
    const parcels = await this.getActiveParcels();
    
    return {
      total: parcels.length,
      pending: parcels.filter(p => p.status === 'pending').length,
      inTransit: parcels.filter(p => p.status === 'in_transit').length,
      delivered: parcels.filter(p => p.status === 'delivered').length,
      delayed: parcels.filter(p => p.status === 'delayed').length,
      failed: parcels.filter(p => p.status === 'failed').length,
    };
  }

  /**
   * Save parcels to storage
   */
  private async saveParcels(parcels: Parcel[]): Promise<void> {
    await AsyncStorage.setItem(
      ParcelSelectionService.STORAGE_KEY,
      JSON.stringify(parcels)
    );
  }

  /**
   * Generate mock parcels for demo
   */
  private getMockParcels(): Parcel[] {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    return [
      {
        id: '1',
        trackingNumber: 'PKG001',
        status: 'pending',
        destination: '123 Main Street, Downtown, Mumbai 400001',
        customerName: 'Rajesh Kumar',
        customerPhone: '+91 98765 43210',
        pickupLocation: 'Warehouse A, Andheri East',
        estimatedDelivery: tomorrow,
        priority: 'high',
        weight: 2.5,
        dimensions: { length: 30, width: 20, height: 15 },
        specialInstructions: 'Handle with care - fragile items',
        deliveryAttempts: 0,
        lastUpdate: now,
      },
      {
        id: '2',
        trackingNumber: 'PKG002',
        status: 'in_transit',
        destination: '456 Oak Avenue, Bandra West, Mumbai 400050',
        customerName: 'Priya Sharma',
        customerPhone: '+91 87654 32109',
        pickupLocation: 'Warehouse B, Powai',
        estimatedDelivery: now,
        priority: 'urgent',
        weight: 1.2,
        dimensions: { length: 25, width: 15, height: 10 },
        specialInstructions: 'Call before delivery',
        deliveryAttempts: 1,
        lastUpdate: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        id: '3',
        trackingNumber: 'PKG003',
        status: 'pending',
        destination: '789 Pine Road, Juhu, Mumbai 400049',
        customerName: 'Mohammed Ali',
        customerPhone: '+91 76543 21098',
        pickupLocation: 'Warehouse A, Andheri East',
        estimatedDelivery: dayAfter,
        priority: 'medium',
        weight: 5.0,
        dimensions: { length: 40, width: 30, height: 25 },
        deliveryAttempts: 0,
        lastUpdate: now,
      },
      {
        id: '4',
        trackingNumber: 'PKG004',
        status: 'delayed',
        destination: '321 Cedar Lane, Malad West, Mumbai 400064',
        customerName: 'Sunita Patel',
        customerPhone: '+91 65432 10987',
        pickupLocation: 'Warehouse C, Goregaon',
        estimatedDelivery: now,
        priority: 'high',
        weight: 3.8,
        dimensions: { length: 35, width: 25, height: 20 },
        specialInstructions: 'Apartment delivery - Ring bell twice',
        deliveryAttempts: 2,
        lastUpdate: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: '5',
        trackingNumber: 'PKG005',
        status: 'pending',
        destination: '654 Elm Street, Versova, Mumbai 400061',
        customerName: 'Amit Singh',
        customerPhone: '+91 54321 09876',
        pickupLocation: 'Warehouse B, Powai',
        estimatedDelivery: tomorrow,
        priority: 'low',
        weight: 0.8,
        dimensions: { length: 20, width: 15, height: 8 },
        deliveryAttempts: 0,
        lastUpdate: now,
      },
    ];
  }

  /**
   * Initialize with mock data (for demo purposes)
   */
  async initializeMockData(): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(ParcelSelectionService.STORAGE_KEY);
      if (!existing) {
        const mockParcels = this.getMockParcels();
        await this.saveParcels(mockParcels);
      }
    } catch (error) {
      console.error('Failed to initialize mock data:', error);
    }
  }

  /**
   * Clear all data (for testing)
   */
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ParcelSelectionService.STORAGE_KEY);
      await AsyncStorage.removeItem(ParcelSelectionService.SELECTED_PARCEL_KEY);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }
}