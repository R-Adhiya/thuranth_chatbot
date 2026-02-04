import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

export const ParcelManagement: React.FC = () => {
  return (
    <div className="p-6">
      <Title level={2}>Parcel Management</Title>
      <Card>
        <p>Parcel management interface will be implemented here.</p>
        <p>Features:</p>
        <ul>
          <li>Parcel tracking and status</li>
          <li>Late arrival management</li>
          <li>Consolidation history</li>
          <li>SLA monitoring</li>
          <li>Exception handling</li>
        </ul>
      </Card>
    </div>
  );
};