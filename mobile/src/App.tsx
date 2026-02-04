import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, Platform, PermissionsAndroid } from 'react-native';
import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { RouteScreen } from './screens/RouteScreen';
import { DeliveryScreen } from './screens/DeliveryScreen';
import { NotificationService } from './services/NotificationService';

const Stack = createStackNavigator();

const App: React.FC = () => {
  useEffect(() => {
    // Initialize notification service
    NotificationService.initialize();

    // Request location permissions
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'PDCP Location Permission',
            message: 'PDCP needs access to your location for delivery tracking',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');
        } else {
          console.log('Location permission denied');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  return (
    <AuthProvider>
      <LocationProvider>
        <WebSocketProvider>
          <NavigationContainer>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#1890ff',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              <Stack.Screen 
                name="Login" 
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="Dashboard" 
                component={DashboardScreen}
                options={{ title: 'PDCP Driver' }}
              />
              <Stack.Screen 
                name="Route" 
                component={RouteScreen}
                options={{ title: 'Route Summary' }}
              />
              <Stack.Screen 
                name="Delivery" 
                component={DeliveryScreen}
                options={{ title: 'Delivery Confirmation' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </WebSocketProvider>
      </LocationProvider>
    </AuthProvider>
  );
};

export default App;