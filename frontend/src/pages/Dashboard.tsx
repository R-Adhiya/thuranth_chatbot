import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Badge, Button, Modal, Typography, Space, Alert } from 'antd';
import { 
  TruckIcon, 
  PackageIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon 
} from 'lucide-react';
import { LiveOperationsMap } from '../components/LiveOperationsMap';
import { ParcelEventFeed } from '../components/ParcelEventFeed';
import { DecisionPanel } from '../components/DecisionPanel';
import { ImpactMetrics } from '../components/ImpactMetrics';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const { Title, Text } = Typography;

interface DashboardStats {
  activeVehicles: number;
  pendingParcels: number;
  consolidationOpportunities: number;
  todayDeliveries: number;
  avgUtilization: number;
  dispatchesAvoided: number;
}

export const Dashboard: React.FC = () => {
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [decisionModalVisible, setDecisionModalVisible] = useState(false);
  const { socket, isConnected } = useWebSocket();

  // Fetch dashboard statistics
  const { data: stats, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(res => res.data),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Listen for real-time events
  useEffect(() => {
    if (!socket) return;

    const handleParcelArrived = (data: any) => {
      console.log('New parcel arrived:', data);
      refetchStats();
    };

    const handleConsolidationOpportunity = (data: any) => {
      console.log('Consolidation opportunity:', data);
      setSelectedParcel(data.parcel);
      setDecisionModalVisible(true);
    };

    socket.on('parcel:arrived', handleParcelArrived);
    socket.on('consolidation:opportunity', handleConsolidationOpportunity);

    return () => {
      socket.off('parcel:arrived', handleParcelArrived);
      socket.off('consolidation:opportunity', handleConsolidationOpportunity);
    };
  }, [socket, refetchStats]);

  const handleDecisionMade = () => {
    setDecisionModalVisible(false);
    setSelectedParcel(null);
    refetchStats();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Connection Status */}
      {!isConnected && (
        <Alert
          message="Connection Lost"
          description="Real-time updates are unavailable. Attempting to reconnect..."
          type="warning"
          showIcon
          closable
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <Title level={2} className="mb-0">Operations Dashboard</Title>
        <Space>
          <Badge status={isConnected ? 'processing' : 'error'} />
          <Text type="secondary">
            {isConnected ? 'Live' : 'Offline'}
          </Text>
        </Space>
      </div>

      {/* Key Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Vehicles"
              value={stats?.activeVehicles || 0}
              prefix={<TruckIcon className="w-4 h-4" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Parcels"
              value={stats?.pendingParcels || 0}
              prefix={<PackageIcon className="w-4 h-4" />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Consolidation Opportunities"
              value={stats?.consolidationOpportunities || 0}
              prefix={<AlertTriangleIcon className="w-4 h-4" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Today's Deliveries"
              value={stats?.todayDeliveries || 0}
              prefix={<CheckCircleIcon className="w-4 h-4" />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Secondary Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Avg Vehicle Utilization"
              value={stats?.avgUtilization || 0}
              suffix="%"
              precision={1}
              valueStyle={{ fontSize: '18px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Dispatches Avoided Today"
              value={stats?.dispatchesAvoided || 0}
              valueStyle={{ fontSize: '18px', color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <div className="flex items-center justify-between">
              <Text type="secondary">System Status</Text>
              <Badge 
                status="processing" 
                text="Operational" 
                style={{ fontSize: '14px' }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Content Grid */}
      <Row gutter={[16, 16]}>
        {/* Live Operations Map */}
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <MapPinIcon className="w-4 h-4" />
                Live Operations Map
              </Space>
            }
            className="h-96"
          >
            <LiveOperationsMap />
          </Card>
        </Col>

        {/* Parcel Event Feed */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <ClockIcon className="w-4 h-4" />
                Recent Events
              </Space>
            }
            className="h-96"
          >
            <ParcelEventFeed />
          </Card>
        </Col>
      </Row>

      {/* Impact Metrics */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <ImpactMetrics />
        </Col>
      </Row>

      {/* Decision Modal */}
      <Modal
        title="Consolidation Decision Required"
        open={decisionModalVisible}
        onCancel={() => setDecisionModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedParcel && (
          <DecisionPanel
            parcel={selectedParcel}
            onDecisionMade={handleDecisionMade}
          />
        )}
      </Modal>
    </div>
  );
};