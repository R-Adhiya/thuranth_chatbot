import React from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { 
  SaveOutlined, 
  CarOutlined, 
  FireOutlined, 
  DollarOutlined 
} from '@ant-design/icons';

export const ImpactMetrics: React.FC = () => {
  const metrics = {
    dispatchesAvoided: 15,
    fuelSaved: 125.5, // liters
    emissionsSaved: 295.2, // kg CO2
    costSaved: 8750, // INR
    utilizationImprovement: 23.5, // percentage
    monthlyTarget: {
      dispatches: 50,
      fuel: 500,
      emissions: 1200,
    },
  };

  return (
    <Card title="Today's Impact Summary" className="w-full">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="Dispatches Avoided"
              value={metrics.dispatchesAvoided}
              prefix={<CarOutlined style={{ color: '#52c41a' }} />}
              suffix={`/ ${metrics.monthlyTarget.dispatches}`}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress 
              percent={(metrics.dispatchesAvoided / metrics.monthlyTarget.dispatches) * 100} 
              size="small" 
              showInfo={false}
              strokeColor="#52c41a"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="Fuel Saved (L)"
              value={metrics.fuelSaved}
              precision={1}
              prefix={<SaveOutlined style={{ color: '#1890ff' }} />}
              suffix={`/ ${metrics.monthlyTarget.fuel}`}
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress 
              percent={(metrics.fuelSaved / metrics.monthlyTarget.fuel) * 100} 
              size="small" 
              showInfo={false}
              strokeColor="#1890ff"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="CO₂ Saved (kg)"
              value={metrics.emissionsSaved}
              precision={1}
              prefix={<FireOutlined style={{ color: '#faad14' }} />}
              suffix={`/ ${metrics.monthlyTarget.emissions}`}
              valueStyle={{ color: '#faad14' }}
            />
            <Progress 
              percent={(metrics.emissionsSaved / metrics.monthlyTarget.emissions) * 100} 
              size="small" 
              showInfo={false}
              strokeColor="#faad14"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="Cost Saved (₹)"
              value={metrics.costSaved}
              prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div className="mt-2 text-sm text-gray-500">
              Utilization: +{metrics.utilizationImprovement}%
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} className="mt-4">
        <Col span={24}>
          <Card size="small" title="Monthly Progress" className="bg-gray-50">
            <Row gutter={16}>
              <Col span={8}>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {((metrics.dispatchesAvoided / metrics.monthlyTarget.dispatches) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Dispatch Target</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {((metrics.fuelSaved / metrics.monthlyTarget.fuel) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Fuel Target</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="text-center">
                  <div className="text-lg font-semibold text-orange-600">
                    {((metrics.emissionsSaved / metrics.monthlyTarget.emissions) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Emission Target</div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};