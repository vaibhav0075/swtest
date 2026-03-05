import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';

// Admin Screens
import { useEffect, useState } from 'react';
import { Alert, BackHandler, Platform } from 'react-native';
import AboutScreen from '../screens/admin/AboutScreen';
import ActivitiesScreen from '../screens/admin/ActivitiesScreen';
import AddMember from '../screens/admin/AddMember';
import AdminDashboard from '../screens/admin/AdminDashboard';
import ChangePasswordScreen from '../screens/admin/ChangePasswordScreen';
import FundsDetailsScreen from '../screens/admin/FundsDetailsScreen';
import GiveLoanPage from '../screens/admin/GiveLoanPage';
import HistoryScreen from '../screens/admin/HistoryScreen';
import MaintenanceScreen from '../screens/admin/MaintenanceScreen';
import ManageMembers from '../screens/admin/ManageMembers';
import MemberDetailScreen from '../screens/admin/MemberDetailScreen';
import ReportDetail from '../screens/admin/ReportDetail';
import ReportsScreen from '../screens/admin/ReportsScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';
import ShareValueGrowthScreen from '../screens/admin/ShareValueGrowthScreen';
import UpdateLoansScreen from '../screens/admin/UpdateLoansScreen';
import UpdatePage from '../screens/admin/UpdatePage';
import AppSettings from '../screens/AppSettings';
import GiveLoanScreen from '../screens/GiveLoanScreen';
import PaymentHistory from '../screens/member/PaymentHistory';
import MembersScreen from '../screens/MembersScreen';
import RecordInstallmentScreen from '../screens/RecordInstallmentScreen';
import { maintenanceAPI } from '../services/api';

// Member Navigation
import MemberNavigator from './MemberNavigator';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MembersStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="MembersList"
      component={MembersScreen}
      options={{ title: 'Members' }}
    />
    <Stack.Screen
      name="MemberDetail"
      component={MemberDetailScreen}
      options={{ title: 'Member Details' }}
    />
    <Stack.Screen
      name="GiveLoan"
      component={GiveLoanScreen}
      options={{ title: 'Give Loan' }}
    />
    <Stack.Screen
      name="RecordInstallment"
      component={RecordInstallmentScreen}
      options={{ title: 'Record Installment' }}
    />
    <Stack.Screen
      name="PaymentHistory"
      component={PaymentHistory}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="History"
      component={HistoryScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const DashboardStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="DashboardMain" component={AdminDashboard} options={{ headerShown: false }} />
    <Stack.Screen name="FundsDetails" component={FundsDetailsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ShareValueGrowth" component={ShareValueGrowthScreen} options={{ headerShown: false }} />
    <Stack.Screen name="UpdatePage" component={UpdatePage} options={{ headerShown: false }} />
    <Stack.Screen name="UpdateLoansScreen" component={UpdateLoansScreen} options={{ headerShown: false }} />
    <Stack.Screen name="GiveLoanPage" component={GiveLoanPage} options={{ headerShown: false }} />
    <Stack.Screen name="Activities" component={ActivitiesScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="SettingsMain" component={SettingsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
    <Stack.Screen name="AppSettings" component={AppSettings} options={{ headerShown: false }} />
    <Stack.Screen name="ManageMembers" component={ManageMembers} options={{ headerShown: false }} />
    <Stack.Screen name="AddMember" component={AddMember} options={{ headerShown: false }} />
    <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const ReportsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="ReportsMain"
      component={ReportsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ReportDetail"
      component={ReportDetail}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Dashboard') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Members') {
          iconName = focused ? 'people' : 'people-outline';
        } else if (route.name === 'Reports') {
          iconName = focused ? 'bar-chart' : 'bar-chart-outline';
        } else if (route.name === 'Settings') {
          iconName = focused ? 'settings' : 'settings-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardStack}
      options={{ headerShown: false }}
    />
    <Tab.Screen
      name="Members"
      component={MembersStack}
      options={{ headerShown: false }}
    />
    <Tab.Screen
      name="Reports"
      component={ReportsStack}
      options={{ headerShown: false }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsStack}
      options={{ headerShown: false }}
    />
  </Tab.Navigator>
);

const MemberStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MemberTabs" component={MemberNavigator} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistory} />
  </Stack.Navigator>
);

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [maintenance, setMaintenance] = useState({ enabled: false, message: '' });

  useEffect(() => {
    let intervalId;
    const checkMaintenance = async () => {
      try {
        const res = await maintenanceAPI.getStatus();
        const enabled = Boolean(res?.data?.enabled);
        const message = res?.data?.message || '';
        setMaintenance({ enabled, message });
        // Immediate modal for members when maintenance is on
        if (enabled && user && user.role !== 'admin') {
          Alert.alert(
            'Maintenance Mode',
            message || 'The app is under maintenance.',
            [
              { text: 'Close App', style: 'destructive', onPress: () => { if (Platform.OS === 'android') BackHandler.exitApp(); } },
            ],
            { cancelable: false }
          );
        }
      } catch (e) {
        // ignore
      }
    };
    checkMaintenance();
    intervalId = setInterval(checkMaintenance, 15000); // recheck every 15s
    return () => intervalId && clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const isMember = user && user.role !== 'admin';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : user.role === 'admin' ? (
        <Stack.Screen name="Main" component={AdminTabs} />
      ) : maintenance.enabled ? (
        <Stack.Screen name="Maintenance" component={MaintenanceScreen} />
      ) : (
        <Stack.Screen name="MemberHome" component={MemberStack} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
}); 