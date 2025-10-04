import axios from 'axios';
import databaseManager, { DB_KEYS } from '../DBConfig';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:9000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
axiosInstance.interceptors.request.use(
  async config => {
    try {
      const token = await databaseManager.getData(DB_KEYS.JWT_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token for request:', error);
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.log('Token expired, removing from storage');
      await databaseManager.removeData(DB_KEYS.JWT_TOKEN);
      // Could dispatch logout action here if needed
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
