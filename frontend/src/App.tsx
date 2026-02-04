import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { VehicleManagement } from './pages/VehicleManagement';
import { ParcelManagement } from './pages/ParcelManagement';
import { Analytics } from './pages/Analytics';
import { TrustScore } from './pages/TrustScore';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
          },
        }}
      >
        <AuthProvider>
          <WebSocketProvider>
            <Router>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/vehicles" element={<VehicleManagement />} />
                  <Route path="/parcels" element={<ParcelManagement />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/trust-score" element={<TrustScore />} />
                  <Route path="/audit" element={<AuditLogs />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </Router>
          </WebSocketProvider>
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;