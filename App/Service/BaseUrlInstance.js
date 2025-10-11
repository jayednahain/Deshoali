import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

const BaseUrlInstance = axios.create({
  baseURL: 'https://api.redfynix.com/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to check network connectivity before making requests
BaseUrlInstance.interceptors.request.use(
  async config => {
    try {
      const networkState = await NetInfo.fetch();

      if (!networkState.isConnected || !networkState.isInternetReachable) {
        const error = new Error('No internet connection');
        error.code = 'NETWORK_ERROR';
        error.isNetworkError = true;
        throw error;
      }

      return config;
    } catch (error) {
      if (error.isNetworkError) {
        throw error;
      }
      // If NetInfo fails, proceed with the request
      return config;
    }
  },
  error => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle network-related errors
BaseUrlInstance.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    // Check if it's a network error
    if (
      error.code === 'NETWORK_ERROR' ||
      error.message === 'Network Error' ||
      error.message === 'No internet connection' ||
      !error.response
    ) {
      // Double-check network connectivity
      try {
        const networkState = await NetInfo.fetch();
        if (!networkState.isConnected || !networkState.isInternetReachable) {
          error.isNetworkError = true;
          error.message =
            'No internet connection. Please check your network settings.';
        }
      } catch (netInfoError) {
        // If NetInfo fails, assume it's a network error
        error.isNetworkError = true;
        error.message = 'Network connection failed. Please try again.';
      }
    }

    return Promise.reject(error);
  },
);

export default BaseUrlInstance;
