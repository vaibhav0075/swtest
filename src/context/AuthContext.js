import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useContext, useEffect, useState } from 'react';

// For Android Emulator
// const API_URL = 'http://10.0.2.2:5000/api';
// For iOS Simulator
// const API_URL = 'http://localhost:5000/api';
// For physical device (replace with your computer's IP address)
const API_URL = 'https://swanidhi-backend.onrender.com/api';  // Replace xxx with your computer's IP address

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [phone, setPhone] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [storedCredentials, setStoredCredentials] = useState(null);

  // Check for stored user data on app start
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        const storedAccounts = await AsyncStorage.getItem('accounts');
        const storedBiometrics = await AsyncStorage.getItem('biometricsEnabled');
        const credentialsStr = await AsyncStorage.getItem('biometricCredentials');
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Ensure _id is set from id
          if (parsedUser.id && !parsedUser._id) {
            parsedUser._id = parsedUser.id;
          }
          setUser(parsedUser);
        }
        if (storedAccounts) {
          const parsedAccounts = JSON.parse(storedAccounts);
          setAccounts(parsedAccounts);
        }
        if (storedBiometrics !== null) {
          setBiometricsEnabled(JSON.parse(storedBiometrics));
        }
        if (credentialsStr) {
          setStoredCredentials(JSON.parse(credentialsStr));
        }
      } catch (error) {
        console.error('Error loading stored user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  const toggleBiometrics = async (enabled) => {
    try {
      await AsyncStorage.setItem('biometricsEnabled', JSON.stringify(enabled));
      setBiometricsEnabled(enabled);
      if (!enabled) {
        await AsyncStorage.removeItem('biometricCredentials');
        setStoredCredentials(null);
      } else if (phone && tempPassword) {
        // If enabling and we have current credentials, store them immediately
        const credentials = { phone, password: tempPassword };
        await AsyncStorage.setItem('biometricCredentials', JSON.stringify(credentials));
        setStoredCredentials(credentials);
      }
    } catch (error) {
      console.error('Error saving biometric preference:', error);
    }
  };

  const login = async (memberId, password) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/login`, {
        memberId,
        password,
      });

      // Store the token and user data
      const { token, ...userData } = response.data;
      // Ensure _id is set from id
      if (userData.id && !userData._id) {
        userData._id = userData.id;
      }
      
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      console.log('Login successful. User data:', userData);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // New login by phone (multi-account)
  const loginByPhone = async (phoneNumber, password, memberId = null) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/login-by-phone`, {
        phone: phoneNumber,
        password,
        memberId,
      });
      const { accounts: accList, token, selectedAccount: selAcc } = response.data;
      setAccounts(accList || []);
      setSelectedAccount(selAcc || null);
      setPhone(phoneNumber);
      if (token && selAcc) {
        // Find the selected account object
        const userData = accList.find(acc => acc.memberId === selAcc);
        if (userData) {
          await AsyncStorage.setItem('token', token);
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          await AsyncStorage.setItem('accounts', JSON.stringify(accList));
          setUser(userData);
          setAccounts(accList);
          setTempPassword(password); // Store password temporarily
          
          if (biometricsEnabled) {
            const credentials = { phone: phoneNumber, password };
            await AsyncStorage.setItem('biometricCredentials', JSON.stringify(credentials));
            setStoredCredentials(credentials);
          }
          
          return userData;
        }
      }
      return { accounts: accList };
    } catch (error) {
      console.error('Login by phone error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await AsyncStorage.multiRemove(['user', 'token', 'accounts']);
      setUser(null);
      setAccounts([]);
      setSelectedAccount(null);
      setPhone(null);
      setTempPassword(null);
      // We do NOT clear biometricCredentials here so that they remain for the next login
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    loginByPhone,
    accounts,
    selectedAccount,
    setSelectedAccount,
    setAccounts,
    phone,
    tempPassword,
    biometricsEnabled,
    storedCredentials,
    toggleBiometrics,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 