import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { RouteCard } from '../components/RouteCard';
import { NewStopNotification } from '../components/NewStopNotification';
import { ImpactPreview } from '../components/ImpactPreview';
import { api } from '../services/api';

interface RouteInfo {
  id: string;
  totalStops: number;
  completedStops: number;
  estimatedDuration: number;
  totalDistance: number;
  parcels: any[];
}

interface ConsolidationRequest {
  id: string;
  parcel: any;
  impact: {
    additionalKm: number;
    additionalMinutes: number;
  };
  explanation: string;
}

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { socket, isConnected } = useWebSocket();
  
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [pendingRequest, setPendingRequest] = useState<ConsolidationRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRouteInfo();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewStopRequest = (data: ConsolidationRequest) => {
      console.log('New consolidation request:', data);
      setPendingRequest(data);
    };

    const handleRouteUpdate = (data: RouteInfo) => {
      console.log('Route updated:', data);
      setRouteInfo(data);
    };

    socket.on('consolidation:request', handleNewStopRequest);
    socket.on('route:updated', handleRouteUpdate);

    return () => {
      socket.off('consolidation:request', handleNewStopRequest);
      socket.off('route:updated', handleRouteUpdate);
    };
  }, [socket]);

  const loadRouteInfo = async () => {
    try {
      const response = await api.get('/driver/route');
      setRouteInfo(response.data);
    } catch (error) {
      console.error('Failed to load route info:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRouteInfo();
    setRefreshing(false);
  };

  const handleAcceptStop = async () => {
    if (!pendingRequest) return;

    try {
      await api.post(`/driver/consolidation/${pendingRequest.id}/accept`);
      setPendingRequest(null);
      await loadRouteInfo();
      
      Alert.alert(
        'Stop Accepted',
        'New delivery stop has been added to your route.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to accept the new stop. Please try again.');
    }
  };

  const handleRejectStop = async () => {
    if (!pendingRequest) return;

    Alert.alert(
      'Reject Stop',
      'Are you sure you want to reject this delivery stop?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/driver/consolidation/${pendingRequest.id}/reject`);
              setPendingRequest(null);
            } catch (error) {
              Alert.alert('Error', 'Failed to reject the stop.');
            }
          },
        },
      ]
    );
  };

  const handleCallDispatcher = () => {
    // In a real app, this would initiate a phone call
    Alert.alert(
      'Call Dispatcher',
      'This would call your dispatcher for assistance.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading route information...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Connection Status */}
      <View style={[styles.statusBar, { backgroundColor: isConnected ? '#52c41a' : '#ff4d4f' }]}>
        <Text style={styles.statusText}>
          {isConnected ? '🟢 Connected' : '🔴 Offline'}
        </Text>
      </View>

      {/* Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.driverName}>{user?.name || 'Driver'}</Text>
      </View>

      {/* Route Summary */}
      {routeInfo && (
        <RouteCard
          routeInfo={routeInfo}
          onViewDetails={() => navigation.navigate('Route')}
        />
      )}

      {/* New Stop Request */}
      {pendingRequest && (
        <NewStopNotification
          request={pendingRequest}
          onAccept={handleAcceptStop}
          onReject={handleRejectStop}
        />
      )}

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Route')}
        >
          <Text style={styles.actionButtonText}>📍 View Route</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCallDispatcher}
        >
          <Text style={styles.actionButtonText}>📞 Call Dispatcher</Text>
        </TouchableOpacity>
      </View>

      {/* Impact Preview */}
      {routeInfo && <ImpactPreview routeInfo={routeInfo} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBar: {
    padding: 8,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1890ff',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1890ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});