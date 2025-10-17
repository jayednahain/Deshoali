import React, { useEffect } from 'react';
import BootSplash from 'react-native-bootsplash';
import Toast from 'react-native-toast-message';
import { Provider } from 'react-redux';
import AppNavigation from './App/AppNavigation/CustomNavigation';

import DownloadInProgressModal from './App/Components/Modal/DownloadInProgressModal';
import ErrorModal from './App/Components/Modal/ErrorModal';
import StorageModal from './App/Components/Modal/StorageModal';
import AppStore from './App/ReduxStore/store';

export default function App() {
  useEffect(() => {
    // Hide splash screen after component is mounted
    const timer = setTimeout(() => {
      BootSplash.hide({ fade: true });
    }, 2000); // Show splash for 2 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <Provider store={AppStore}>
      <AppNavigation />

      {/* Phase 3: Modal Components */}
      <ErrorModal />
      <StorageModal />
      <DownloadInProgressModal />

      {/* Phase 3: Toast Notifications */}
      <Toast />
    </Provider>
  );
}
