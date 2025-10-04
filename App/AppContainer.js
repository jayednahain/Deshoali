import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppNavigator from './AppNavigation/AppNavigator';
import {
  checkNetworkAndSyncThunk,
  clearDownloadStatesThunk,
} from './Features/vedios/vediosThunkFunctions';

import { syncManager } from './service/syncManager';
import LoadingScreen from './UiViews/LoadingScreen';

const AppContainer = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, authChecked } = useSelector(state => state.auth);
  // const { isOffline } = useSelector(state => state.videosStore);

  useEffect(() => {
    // Setup sync manager listeners
    const handleSyncEvent = async event => {
      console.log('Sync event received:', event);

      switch (event.type) {
        case 'initial-sync':
        case 'network-recovery':
        case 'app-foreground':
          if (isAuthenticated) {
            try {
              await dispatch(checkNetworkAndSyncThunk()).unwrap();
            } catch (error) {
              console.error('Error handling sync event:', error);
            }
          }
          break;

        case 'app-background':
          // Handle app going to background if needed
          break;

        default:
          console.log('Unhandled sync event:', event.type);
      }
    };

    const handleNetworkEvent = event => {
      console.log('Network event received:', event);

      if (event.wasOffline && event.isOnline && isAuthenticated) {
        // Network recovered, sync data
        dispatch(checkNetworkAndSyncThunk());
      }
    };

    // Subscribe to sync and network events
    syncManager.subscribeToSync(handleSyncEvent);
    syncManager.subscribeToNetwork(handleNetworkEvent);

    return () => {
      // Cleanup subscriptions
      syncManager.unsubscribeFromSync(handleSyncEvent);
      syncManager.unsubscribeFromNetwork(handleNetworkEvent);
    };
  }, [dispatch, isAuthenticated]);

  // Clear download states on app start (as per requirements)
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(clearDownloadStatesThunk());
    }
  }, [dispatch, isAuthenticated]);

  // Show loading screen while authentication is being checked
  if (!authChecked || !isAuthenticated) {
    return <LoadingScreen />;
  }

  // Show main app navigation
  return <AppNavigator />;
};

export default AppContainer;
