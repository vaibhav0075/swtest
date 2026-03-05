import React, { useCallback, useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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

  useFocusEffect(
    useCallback(() => {
      if (biometricsEnabled && storedCredentials) {
        setPhone(storedCredentials.phone);
        setPassword(storedCredentials.password);
        // Wait for screen to settle
        const timer = setTimeout(() => {
          handleBiometricLogin();
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [biometricsEnabled, storedCredentials])
  );

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login to Swanidhi',
        fallbackLabel: 'Use Password',
      });

      if (result.success) {
        if (storedCredentials) {
          try {
            await loginByPhone(storedCredentials.phone, storedCredentials.password);
          } catch (error) {
            Alert.alert('Error', 'Auto-login failed. Please login manually.');
          }
        } else if (phone && password) {
          handleLogin();
        }
      }
    } catch (error) {
      console.error('Biometric Error:', error);
    }
  };

  const onLoginPress = () => {
     if (biometricsEnabled && storedCredentials && phone === storedCredentials.phone && password === storedCredentials.password) {
       handleBiometricLogin();
     } else {
       handleLogin();
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
          onPress={onLoginPress}
          disabled={loading}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {biometricsEnabled && storedCredentials && (
              <Ionicons name="finger-print" size={24} color="white" style={{ marginRight: 10 }} />
            )}
            <Text style={styles.buttonText}>
              {loading ? 'Logging in...' : 'Login'}
            </Text>
          </View>
        </TouchableOpacity>
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