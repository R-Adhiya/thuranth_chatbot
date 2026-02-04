import React from 'react';
import { Card, Button, Space, Typography, Descriptions, Tag, Alert } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface DecisionPanelProps {
  parcel: any;
  onDecisionMade: () => void;
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({ parcel, onDecisionMade }) => {
  const handleAccept = () => {
    console.log('Accepting consolidation');
    onDecisionMade();
  };

  const handleReject = () => {
    console.log('Rejecting consolidation');
    onDecisionMade();
  };

  // Mock decision data
  const decision = {
    vehicleId: 'VH-123',
    registrationNumber: 'DL-01-AB-1234',
    score: 85,
    explanation: 'Vehicle VH-123 selected with score 85. Impact: +2.5km, +8min, +15.2% utilization.',
    constraints: {
      capacity: true,
      sla: true,
      deviation: true,
      trust: true,
    },
    impact: {
      additionalKm: 2.5,
      additionalMinutes: 8,
      utilizationImprovement: 15.2,
    },
  };

  return (
    <div className="space-y-4">
      <Alert
        message="Consolidation Opportunity Detected"
        description="A late parcel can be consolidated with an existing vehicle. Review the details below."
        type="info"
        showIcon
      />

      <Card title="Parcel Details" size="small">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Tracking Number">PKG-001</Descriptions.Item>
          <Descriptions.Item label="Destination">Connaught Place, Delhi</Descriptions.Item>
          <Descriptions.Item label="Weight">2.5 kg</Descriptions.Item>
          <Descriptions.Item label="SLA Deadline">6:00 PM Today</Descriptions.Item>
          <Descriptions.Item label="Priority">
            <Tag color="orange">Normal</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Carrier">BlueDart Express</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Recommended Vehicle" size="small">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Vehicle">{decision.registrationNumber}</Descriptions.Item>
          <Descriptions.Item label="Type">4-Wheeler</Descriptions.Item>
          <Descriptions.Item label="Current Location">Karol Bagh, Delhi</Descriptions.Item>
          <Descriptions.Item label="Trust Score">92%</Descriptions.Item>
          <Descriptions.Item label="Spare Capacity">15.5 kg</Descriptions.Item>
          <Descriptions.Item label="Driver">Rajesh Kumar</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Impact Analysis" size="small">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <Text type="secondary">Additional Distance</Text>
            <div className="text-lg font-semibold text-blue-600">
              +{decision.impact.additionalKm} km
            </div>
          </div>
          <div>
            <Text type="secondary">Additional Time</Text>
            <div className="text-lg font-semibold text-orange-600">
              +{decision.impact.additionalMinutes} min
            </div>
          </div>
          <div>
            <Text type="secondary">Utilization Gain</Text>
            <div className="text-lg font-semibold text-green-600">
              +{decision.impact.utilizationImprovement}%
            </div>
          </div>
        </div>
      </Card>

      <Card title="Constraint Validation" size="small">
        <Space direction="vertical" className="w-full">
          {Object.entries(decision.constraints).map(([constraint, passed]) => (
            <div key={constraint} className="flex items-center justify-between">
              <Text className="capitalize">{constraint} Check</Text>
              {passed ? (
                <Tag icon={<CheckCircleOutlined />} color="success">
                  Passed
                </Tag>
              ) : (
                <Tag icon={<CloseCircleOutlined />} color="error">
                  Failed
                </Tag>
              )}
            </div>
          ))}
        </Space>
      </Card>

      <Card title="Decision Score" size="small">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {decision.score}/100
          </div>
          <Text type="secondary">{decision.explanation}</Text>
        </div>
      </Card>

      <div className="flex justify-end space-x-3 pt-4">
        <Button onClick={handleReject} size="large">
          Reject
        </Button>
        <Button 
          type="primary" 
          onClick={handleAccept} 
          size="large"
          icon={<CheckCircleOutlined />}
        >
          Accept Consolidation
        </Button>
      </div>
    </div>
  );
};