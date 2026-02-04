import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

export const VehicleManagement: React.FC = () => {
  return (
    <div className="p-6">
      <Title level={2}>Vehicle Management</Title>
      <Card>
        <p>Vehicle management interface will be implemented here.</p>
        <p>Features:</p>
        <ul>
          <li>Vehicle fleet overview</li>
          <li>Real-time location tracking</li>
          <li>Capacity management</li>
          <li>Driver assignments</li>
          <li>Performance metrics</li>
        </ul>
      </Card>
    </div>
  );
};