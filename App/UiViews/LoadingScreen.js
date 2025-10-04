import { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import DeshoaliAppLogo from '../AppAssets/SvgLogos/DeshoaliAppLogo.svg';
import {
  checkAuthThunk,
  loginThunk,
} from '../Features/auth/authThunkFunctions';
import { syncManager } from '../service/syncManager';

const { height } = Dimensions.get('window');

const LoadingScreen = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, authChecked, error } = useSelector(
    state => state.auth,
  );

  const initializeApp = useCallback(async () => {
    try {
      // Initialize sync manager
      await syncManager.initialize();

      // Check for existing authentication
      const result = await dispatch(checkAuthThunk()).unwrap();

      if (!result) {
        // No existing auth, perform login with fixed credentials
        await dispatch(loginThunk()).unwrap();
      }
    } catch (err) {
      console.error('App initialization error:', err);

      // If check auth fails, try to login
      try {
        await dispatch(loginThunk()).unwrap();
      } catch (loginError) {
        console.error('Login error:', loginError);
      }
    }
  }, [dispatch]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const getStatusMessage = () => {
    if (!authChecked) {
      return 'Checking authentication...';
    } else if (isLoading) {
      return 'Authenticating...';
    } else if (error) {
      return 'Authentication failed. Retrying...';
    } else if (isAuthenticated) {
      return 'Loading videos...';
    }
    return 'Starting app...';
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <DeshoaliAppLogo width={120} height={120} />
        <Text style={styles.appName}>Deshoali</Text>
        <Text style={styles.subtitle}>Video Player</Text>
      </View>

      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.statusText}>{getStatusMessage()}</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Having trouble connecting. The app will retry automatically.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: height * 0.1,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  errorContainer: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LoadingScreen;
