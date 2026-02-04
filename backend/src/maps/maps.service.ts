import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DistanceResult {
  distanceKm: number;
  durationMinutes: number;
  status: string;
}

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('Google Maps API key not configured');
    }
  }

  async calculateDistance(origin: Coordinates, destination: Coordinates): Promise<DistanceResult> {
    try {
      const url = `${this.baseUrl}/distancematrix/json`;
      const params = {
        origins: `${origin.lat},${origin.lng}`,
        destinations: `${destination.lat},${destination.lng}`,
        mode: 'driving',
        units: 'metric',
        key: this.apiKey,
      };

      const response = await axios.get(url, { params });
      const data = response.data;

      if (data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${data.status}`);
      }

      const element = data.rows[0].elements[0];
      
      if (element.status !== 'OK') {
        throw new Error(`Distance calculation failed: ${element.status}`);
      }

      return {
        distanceKm: element.distance.value / 1000, // Convert meters to km
        durationMinutes: element.duration.value / 60, // Convert seconds to minutes
        status: 'OK',
      };
    } catch (error) {
      this.logger.error(`Distance calculation failed: ${error.message}`);
      
      // Fallback to straight-line distance
      const straightLineDistance = this.calculateStraightLineDistance(origin, destination);
      return {
        distanceKm: straightLineDistance,
        durationMinutes: straightLineDistance * 2, // Rough estimate: 30 km/h average
        status: 'FALLBACK',
      };
    }
  }

  async geocodeAddress(address: string): Promise<Coordinates> {
    try {
      const url = `${this.baseUrl}/geocode/json`;
      const params = {
        address,
        key: this.apiKey,
      };

      const response = await axios.get(url, { params });
      const data = response.data;

      if (data.status !== 'OK' || data.results.length === 0) {
        throw new Error(`Geocoding failed: ${data.status}`);
      }

      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    } catch (error) {
      this.logger.error(`Geocoding failed for address "${address}": ${error.message}`);
      throw error;
    }
  }

  async reverseGeocode(coordinates: Coordinates): Promise<string> {
    try {
      const url = `${this.baseUrl}/geocode/json`;
      const params = {
        latlng: `${coordinates.lat},${coordinates.lng}`,
        key: this.apiKey,
      };

      const response = await axios.get(url, { params });
      const data = response.data;

      if (data.status !== 'OK' || data.results.length === 0) {
        throw new Error(`Reverse geocoding failed: ${data.status}`);
      }

      return data.results[0].formatted_address;
    } catch (error) {
      this.logger.error(`Reverse geocoding failed: ${error.message}`);
      return `${coordinates.lat}, ${coordinates.lng}`;
    }
  }

  private calculateStraightLineDistance(origin: Coordinates, destination: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(destination.lat - origin.lat);
    const dLng = this.toRadians(destination.lng - origin.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(origin.lat)) * Math.cos(this.toRadians(destination.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async validateCoordinates(coordinates: Coordinates): Promise<boolean> {
    return (
      coordinates.lat >= -90 && coordinates.lat <= 90 &&
      coordinates.lng >= -180 && coordinates.lng <= 180
    );
  }

  async isWithinServiceArea(coordinates: Coordinates): Promise<boolean> {
    // Define service area bounds for India
    const indiaBounds = {
      north: 37.6,
      south: 6.4,
      east: 97.25,
      west: 68.7,
    };

    return (
      coordinates.lat >= indiaBounds.south &&
      coordinates.lat <= indiaBounds.north &&
      coordinates.lng >= indiaBounds.west &&
      coordinates.lng <= indiaBounds.east
    );
  }
}