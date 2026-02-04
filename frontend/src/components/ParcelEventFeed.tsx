import React from 'react';
import { List, Badge, Typography, Space } from 'antd';
import { ClockIcon, PackageIcon, TruckIcon } from 'lucide-react';

const { Text } = Typography;

const mockEvents = [
  {
    id: 1,
    type: 'parcel_arrived',
    message: 'Late parcel PKG-001 arrived at warehouse',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    status: 'warning',
  },
  {
    id: 2,
    type: 'consolidation_opportunity',
    message: 'Consolidation opportunity for vehicle VH-123',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    status: 'success',
  },
  {
    id: 3,
    type: 'parcel_delivered',
    message: 'Parcel PKG-002 delivered successfully',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    status: 'default',
  },
  {
    id: 4,
    type: 'vehicle_dispatched',
    message: 'Vehicle VH-456 dispatched with 5 parcels',
    timestamp: new Date(Date.now() - 20 * 60 * 1000),
    status: 'processing',
  },
];

export const ParcelEventFeed: React.FC = () => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'parcel_arrived':
        return <PackageIcon className="w-4 h-4" />;
      case 'vehicle_dispatched':
        return <TruckIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - timestamp.getTime()) / 60000);
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <div className="h-full overflow-auto">
      <List
        dataSource={mockEvents}
        renderItem={(event) => (
          <List.Item className="px-4 py-3 border-b border-gray-100">
            <Space direction="vertical" size="small" className="w-full">
              <div className="flex items-center justify-between">
                <Space>
                  <Badge status={event.status as any} />
                  {getIcon(event.type)}
                </Space>
                <Text type="secondary" className="text-xs">
                  {formatTime(event.timestamp)}
                </Text>
              </div>
              <Text className="text-sm">{event.message}</Text>
            </Space>
          </List.Item>
        )}
      />
    </div>
  );
};