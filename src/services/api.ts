
import axios from 'axios';
import { API_URL } from '@env'; // Ensure you have @env setup or use process.env
import { useAuthStore } from '@store/useAuthStore'; // For accessing token

const apiClient = axios.create({
  baseURL: API_URL || 'http://localhost:3000/api', // Fallback if env var is not set
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token to headers
apiClient.interceptors.request.use(
  config => {
    const token = useAuthStore.getState().token; // Get token from Zustand store
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Response interceptor for handling common errors (e.g., 401 Unauthorized)
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // Here you could try to refresh the token
      // For example:
      // try {
      //   const { token: newToken } = await AuthService.refreshToken(); // Your refresh token logic
      //   useAuthStore.getState().setToken(newToken);
      //   axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      //   originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      //   return apiClient(originalRequest);
      // } catch (refreshError) {
      //   useAuthStore.getState().logout(); // Logout if refresh fails
      //   // Redirect to login or handle appropriately
      //   return Promise.reject(refreshError);
      // }
      console.error('API Error: Unauthorized. Need to implement token refresh or logout.');
      useAuthStore.getState().logout(); // Simple logout for now
    }
    // Handle other errors (network errors, server errors, etc.)
    // You can log them using a custom logger or Sentry
    return Promise.reject(error);
  },
);

export default apiClient;
