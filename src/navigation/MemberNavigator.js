import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import member screens
import AboutScreen from '../screens/member/AboutScreen';
import ChangePasswordScreen from '../screens/member/ChangePasswordScreen';
import MemberDashboard from '../screens/member/MemberDashboard';
import MemberEarnings from '../screens/member/MemberEarnings';
import MemberLoans from '../screens/member/MemberLoans';
import MemberSettings from '../screens/member/MemberSettings';
import AppSettings from '../screens/AppSettings';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const SettingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SettingsMain" component={MemberSettings} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    <Stack.Screen name="AppSettings" component={AppSettings} />
    <Stack.Screen name="About" component={AboutScreen} />
  </Stack.Navigator>
);

export default function MemberNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={MemberDashboard}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={MemberEarnings}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="cash-multiple" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Loans"
        component={MemberLoans}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="handshake" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
} 