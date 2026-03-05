import React from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    View,
    Switch,
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../context/AuthContext';

export default function AppSettings({ navigation }) {
  const { biometricsEnabled, toggleBiometrics } = useAuth();

  const handleToggleBiometrics = async (value) => {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware) {
        Alert.alert('Error', 'Your device does not support biometric authentication');
        return;
      }
      if (!isEnrolled) {
        Alert.alert('Error', 'No biometrics enrolled. Please set up fingerprint or face lock in your device settings.');
        return;
      }
    }
    toggleBiometrics(value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>App Settings</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.settingItem}>
          <View style={[styles.iconContainer, { backgroundColor: '#5856D6' }]}>
            <Icon name="fingerprint" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.settingTitle}>Biometric Login</Text>
            <Text style={styles.settingSubtitle}>Use fingerprint or face to log in</Text>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={handleToggleBiometrics}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={biometricsEnabled ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingTop: 40,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
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
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#000000',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
