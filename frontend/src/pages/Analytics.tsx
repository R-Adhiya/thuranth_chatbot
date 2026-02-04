import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

export const Analytics: React.FC = () => {
  return (
    <div className="p-6">
      <Title level={2}>Analytics & Reports</Title>
      <Card>
        <p>Analytics dashboard will be implemented here.</p>
        <p>Features:</p>
        <ul>
          <li>Fuel savings analytics</li>
          <li>Emissions reduction tracking</li>
          <li>Consolidation success rates</li>
          <li>Performance trends</li>
          <li>Cost optimization reports</li>
        </ul>
      </Card>
    </div>
  );
};