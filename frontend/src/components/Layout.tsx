import React from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Space, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  DashboardOutlined, 
  CarOutlined, 
  InboxOutlined, 
  BarChartOutlined,
  SafetyOutlined,
  AuditOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/vehicles',
      icon: <CarOutlined />,
      label: 'Vehicles',
    },
    {
      key: '/parcels',
      icon: <InboxOutlined />,
      label: 'Parcels',
    },
    {
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
    },
    {
      key: '/trust-score',
      icon: <SafetyOutlined />,
      label: 'Trust Score',
    },
    {
      key: '/audit',
      icon: <AuditOutlined />,
      label: 'Audit Logs',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: logout,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider width={250} theme="light">
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
            PDCP Platform
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0, marginTop: '8px' }}
        />
      </Sider>
      
      <AntLayout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Text strong style={{ fontSize: '16px' }}>
            Post-Dispatch Consolidation Platform
          </Text>
          
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <Text>{user?.username || 'User'}</Text>
            </Space>
          </Dropdown>
        </Header>
        
        <Content style={{ margin: 0, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};