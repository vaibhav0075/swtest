import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert, BackHandler } from 'react-native';

// Prevent multiple maintenance alerts/exits on Android causing crashes
let androidMaintenanceAlertShown = false;

const API_URL = 'https://swanidhi-backend.onrender.com/api'; // Updated to use your correct backend IP
// const API_URL = 'http://10.0.2.2:5000/api'; // For Android emulator
// const API_URL = 'http://localhost:5000/api'; // For iOS simulator

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 Unauthorized errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.multiRemove(['user', 'token']);

      // Since we don't have navigation context directly here, we'll rely on the app's root navigator
      // or the next render cycle to pick up the null user state and redirect.
      // For immediate redirection, it's usually handled at the navigation level or specific screen.
      // However, clearing the token and user will effectively invalidate the session.

      // You might need a global navigation ref or a state in a top-level component for immediate reset
      // For now, clearing storage and letting AuthProvider react to it is the best approach without changing fundamental app structure.
      
      // To trigger a navigation reset from here, it's more complex and typically involves a global navigation service.
      // Given the setup, clearing storage is the primary action. The screens using `useAuth` will react.
    }
    // Maintenance mode enforcement: show immediate alert and allow user to close app
    if (error.response && error.response.status === 503) {
      if (androidMaintenanceAlertShown) {
        return Promise.reject(error);
      }
      androidMaintenanceAlertShown = true;
      const message = error.response?.data?.message || 'The app is under maintenance.';
      Alert.alert(
        'Maintenance Mode',
        message,
        [
          { text: 'Close App', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ],
        { cancelable: false }
      );
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  loginByPhone: (credentials) => api.post('/auth/login-by-phone', credentials),
  register: (userData) => api.post('/auth/register', userData),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Members API
export const membersAPI = {
  getAll: () => api.get('/members'),
  create: (memberData) => api.post('/members', memberData),
  delete: (id) => api.delete(`/members/${id}`),
  pause: (id) => api.post(`/members/${id}/pause`),
  unpause: (id) => api.post(`/members/${id}/unpause`),
  update: (id, memberData) => api.patch(`/members/${id}`, memberData),
};

// Loans API
export const loansAPI = {
  getAll: () => api.get('/loans'),
  getByMember: (memberId) => api.get(`/loans/member/${memberId}`),
  getMyLoans: () => api.get('/loans/my-loans'),
  getTotalOutstanding: () => api.get('/loans/total-outstanding'),
  create: (loanData) => api.post('/loans', loanData),
  addRepayment: (loanId, amount, date) => api.post(`/loans/${loanId}/repayment`, { amount, date }),
  repayMember: (memberId, amount, date) => api.post('/loans/repay-member', { memberId, amount, date }),
  update: (loanId, data) => api.patch(`/loans/${loanId}`, data),
  delete: (loanId) => api.delete(`/loans/${loanId}`),
  deleteRepayment: (loanId, repaymentId) => api.delete(`/loans/${loanId}/repayment/${repaymentId}`),
  updateRepayment: (loanId, repaymentId, data) => api.patch(`/loans/${loanId}/repayment/${repaymentId}`, data),
};

// Installments API
export const installmentsAPI = {
  getAll: () => api.get('/installments'),
  getByMember: (memberId) => api.get(`/installments/member/${memberId}`),
  getMyInstallments: () => api.get('/installments/my-installments'),
  create: (installmentData) => api.post('/installments', installmentData),
  update: (installmentId, data) => api.patch(`/installments/${installmentId}`, data),
  delete: (installmentId) => api.delete(`/installments/${installmentId}`),
  diagnostic: () => api.get('/installments/diagnostic'),
  quickAdd: (amount, date) => api.post('/installments/quick-add', { amount, date }),
  quickAddStatus: (jobId) => api.get(`/installments/quick-add/status/${jobId}`),
};

// Expenses API
export const expensesAPI = {
  getAll: () => api.get('/expenses'),
  create: (expenseData) => api.post('/expenses', expenseData),
  update: (expenseId, data) => api.patch(`/expenses/${expenseId}`, data),
  delete: (expenseId) => api.delete(`/expenses/${expenseId}`),
};

// Fund API
export const fundAPI = {
  getTotalFund: () => api.get('/fund'),
  getShareValue: () => api.get('/fund/share-value'),
  getInterest: (memberId) => api.get(`/fund/interest/${memberId}`),
  getTotalInterest: () => api.get('/fund/total-interest'),
  getTotalInterestThisMonth: () => api.get('/fund/total-interest-this-month'),
  getTotalInterestByRange: (startDate, endDate) => api.get('/fund/total-interest-by-range', {
    params: { startDate, endDate }
  }),
  getInvestment: (memberId) => api.get(`/fund/investment/${memberId}`),
};

// Earnings API
export const earningsAPI = {
  getLatest: () => fundAPI.getTotalInterestThisMonth(),
  getAll: () => api.get('/earnings-distribution'),
  getByType: (type) => api.get(`/earnings-distribution/type/${type}`),
};

// Maintenance API
export const maintenanceAPI = {
  getStatus: () => api.get('/maintenance'), // public endpoint, token not required
  setStatus: (enabled, message) => api.post('/maintenance', { enabled, message }),
};

// Logs API
export const logsAPI = {
  getTransactions: (params) => api.get('/logs/transactions', { params }),
  getLogins: (params) => api.get('/logs/logins', { params }),
  getMembers: (params) => api.get('/logs/members', { params }),
  getStatistics: (params) => api.get('/logs/statistics', { params }),
  exportLogs: (type, params) => api.get(`/logs/export/${type}`, { params, responseType: 'blob' }),
};

export default api; 