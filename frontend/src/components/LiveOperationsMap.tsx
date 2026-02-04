import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Spin, Alert } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface Vehicle {
  id: string;
  registrationNumber: string;
  type: '2w' | '4w';
  currentLat: number;
  currentLng: number;
  status: string;
  spareCapacity: number;
  utilizationPercentage: number;
}

interface Hub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'warehouse' | 'sorting_center';
}

export const LiveOperationsMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active vehicles
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['active-vehicles'],
    queryFn: () => api.get('/vehicles/active').then(res => res.data),
    refetchInterval: 10000, // Update every 10 seconds
  });

  // Fetch hubs
  const { data: hubs } = useQuery<Hub[]>({
    queryKey: ['hubs'],
    queryFn: () => api.get('/hubs').then(res => res.data),
  });

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
        });

        await loader.load();

        if (!mapRef.current) return;

        const mapInstance = new google.maps.Map(mapRef.current, {
          center: { lat: 28.6139, lng: 77.2090 }, // Delhi center
          zoom: 11,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        setMap(mapInstance);
        setLoading(false);
      } catch (err) {
        setError('Failed to load Google Maps');
        setLoading(false);
      }
    };

    initMap();
  }, []);

  // Update vehicle markers
  useEffect(() => {
    if (!map || !vehicles) return;

    // Clear existing markers (in a real app, you'd manage this more efficiently)
    vehicles.forEach(vehicle => {
      const marker = new google.maps.Marker({
        position: { lat: vehicle.currentLat, lng: vehicle.currentLng },
        map: map,
        title: `${vehicle.registrationNumber} (${vehicle.utilizationPercentage.toFixed(1)}% utilized)`,
        icon: {
          url: vehicle.type === '4w' ? '/icons/truck.png' : '/icons/bike.png',
          scaledSize: new google.maps.Size(32, 32),
        },
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h4 class="font-semibold">${vehicle.registrationNumber}</h4>
            <p class="text-sm">Type: ${vehicle.type.toUpperCase()}</p>
            <p class="text-sm">Status: ${vehicle.status}</p>
            <p class="text-sm">Utilization: ${vehicle.utilizationPercentage.toFixed(1)}%</p>
            <p class="text-sm">Spare Capacity: ${vehicle.spareCapacity.toFixed(1)}kg</p>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    });
  }, [map, vehicles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Map Loading Error"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  return <div ref={mapRef} className="w-full h-full" />;
};