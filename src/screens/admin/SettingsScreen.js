import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Switch
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { maintenanceAPI } from '../../services/api';

const settingsItems = [
  {
    id: '1',
    title: 'Change Password',
    icon: 'lock',
    color: '#007AFF',
    action: 'changePassword',
  },
  {
    id: '2',
    title: 'Notification Settings',
    icon: 'bell',
    color: '#FF9500',
    action: 'notifications',
  },
  {
    id: '3',
    title: 'App Settings',
    icon: 'cog',
    color: '#8E8E93',
    action: 'appSettings',
  },
  {
    id: '4',
    title: 'About',
    icon: 'information',
    color: '#34C759',
    action: 'about',
  },
];

export default function SettingsScreen({ navigation }) {
  const { logout, user } = useAuth();
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await maintenanceAPI.getStatus();
        setMaintenanceEnabled(Boolean(res?.data?.enabled));
      } catch (e) {}
    };
    loadStatus();
  }, []);

  const toggleMaintenance = async () => {
    if (user?.role !== 'admin') return;
    try {
      setSaving(true);
      const next = !maintenanceEnabled;
      const res = await maintenanceAPI.setStatus(next);
      setMaintenanceEnabled(Boolean(res?.data?.enabled));
      Alert.alert('Success', next ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
    } catch (e) {
      Alert.alert('Error', 'Failed to update maintenance mode');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = (action) => {
    switch (action) {
      case 'changePassword':
        navigation.navigate('ChangePassword');
        break;
      case 'notifications':
        // Handle notifications settings
        break;
      case 'appSettings':
        navigation.navigate('AppSettings');
        break;
      case 'about':
        navigation.navigate('About');
        break;
      default:
        break;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderSettingItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={() => handleAction(item.action)}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        <Icon name={item.icon} size={24} color="#FFFFFF" />
      </View>
      <Text style={styles.settingTitle}>{item.title}</Text>
      <Icon name="chevron-right" size={24} color="#8E8E93" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        {settingsItems.map(renderSettingItem)}
        
        {user?.role === 'admin' && (
          <TouchableOpacity
            style={styles.settingItem}
            onPress={toggleMaintenance}
            disabled={saving}
          >
            <View style={[styles.iconContainer, { backgroundColor: maintenanceEnabled ? '#FF3B30' : '#34C759' }]}> 
              <Icon name="tools" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.settingTitle}>{maintenanceEnabled ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}</Text>
            <Icon name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate('ManageMembers')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#007AFF' }]}> 
            <Icon name="account-group" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.settingTitle}>Manage Members</Text>
          <Icon name="chevron-right" size={24} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={24} color="#FF3B30" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Version {Constants.expoConfig?.version || '1.0.1'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    marginTop: 30,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 16,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 8,
  },
  versionContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  manageSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    marginTop: 20,
  },
  manageButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  manageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 