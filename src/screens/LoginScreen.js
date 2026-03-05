import React, { useCallback, useState, useEffect } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { loginByPhone, loading, biometricsEnabled, toggleBiometrics, storedCredentials } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (biometricsEnabled && storedCredentials) {
      setPhone(storedCredentials.phone);
      setPassword(storedCredentials.password);
      checkBiometricAvailability();
    }
  }, [biometricsEnabled, storedCredentials]);

  const checkBiometricAvailability = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHardware && isEnrolled) {
      handleBiometricLogin();
    }
  };

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
      
      // If turning ON, we might want to prompt login first to get credentials, 
      // but the user's request is to have it prompt automatically if already enabled.
      // If credentials aren't stored yet, they will be stored on next successful login.
    }
    toggleBiometrics(value);
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with your fingerprint or face',
      });
      if (result.success) {
        // If we have stored credentials, use them to log in
        if (storedCredentials) {
          try {
            await loginByPhone(storedCredentials.phone, storedCredentials.password);
          } catch (error) {
            Alert.alert('Error', 'Biometric login failed. Please enter your credentials manually.');
          }
        } else if (phone && password) {
          // If credentials are typed but not stored yet, use them
          handleLogin();
        } else {
          Alert.alert('Credentials Required', 'Please enter your phone and password once to link them for biometric login.');
        }
      } else {
        // Only alert if it wasn't a manual cancel or similar
        // Alert.alert('Error', 'Biometric authentication failed');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during biometric authentication');
    }
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter both phone number and password');
      return;
    }

    try {
      const result = await loginByPhone(phone, password);
      
      // If user data is returned, login was successful
      // The AppNavigator will automatically handle routing based on user state
      if (result && result.id) {
        // No need to navigate manually - AppNavigator will handle it
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Invalid credentials');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPhone('');
    setPassword('');
    setShowPassword(false);
    setRefreshing(false);
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Swanidhi</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: 'black' }]}
          placeholder="Phone Number"
          placeholderTextColor="black"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoCapitalize="none"
          editable={!loading}
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput, { color: 'black' }]}
            placeholder="Password"
            placeholderTextColor="black"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
            disabled={loading}
          >
            <Text style={styles.eyeIconText}>
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>

        <View style={styles.biometricToggleContainer}>
          <Text style={styles.biometricToggleText}>Enable Biometric Login</Text>
          <Switch
            value={biometricsEnabled}
            onValueChange={handleToggleBiometrics}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={biometricsEnabled ? '#007AFF' : '#f4f3f4'}
          />
        </View>

        {biometricsEnabled && (
          <TouchableOpacity
            style={[styles.button, styles.biometricButton]}
            onPress={handleBiometricLogin}
          >
            <Ionicons name="finger-print" size={24} color="white" />
            <Text style={[styles.buttonText, { marginLeft: 10 }]}>Login with Biometrics</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 50, // Make space for the eye icon
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  eyeIconText: {
    fontSize: 20,
    lineHeight: 20, // Match the font size to prevent vertical offset
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  biometricToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  biometricToggleText: {
    fontSize: 16,
    color: '#333',
  },
  biometricButton: {
    backgroundColor: '#007AFF',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 