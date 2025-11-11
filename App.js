import React, { useEffect, useState } from 'react';
import BootSplash from 'react-native-bootsplash';
import Toast from 'react-native-toast-message';
import { Provider } from 'react-redux';
import AppNavigation from './App/AppNavigation/CustomNavigation';

import { SafeAreaView } from 'react-native-safe-area-context';
import CrashReportModal from './App/Components/Modal/CrashReportModal';
import DownloadInProgressModal from './App/Components/Modal/DownloadInProgressModal';
import ErrorModal from './App/Components/Modal/ErrorModal';
import StorageModal from './App/Components/Modal/StorageModal';
import AppStore from './App/ReduxStore/store';
import CrashReportService from './App/Service/CrashReportService';

export default function App() {
  const [crashModalVisible, setCrashModalVisible] = useState(false);
  const [currentCrash, setCurrentCrash] = useState(null);

  useEffect(() => {
    // Initialize crash report service
    CrashReportService.initialize();

    // Hide splash screen after component is mounted
    const timer = setTimeout(() => {
      BootSplash.hide({ fade: true });
    }, 2000); // Show splash for 2 seconds

    // Set up global error handler for uncaught JavaScript errors
    const errorHandler = (error, isFatal) => {
      try {
        console.error('[App] Uncaught error:', error, 'isFatal:', isFatal);
        CrashReportService.captureError(error, { isFatal }).then(
          crashReport => {
            if (crashReport) {
              setCurrentCrash(crashReport);
              setCrashModalVisible(true);
            }
          },
        );
      } catch (err) {
        console.error('[App] Error in error handler:', err);
      }
    };

    // Set up error handler using global error handler
    global.ErrorUtils = global.ErrorUtils || {};
    global.ErrorUtils.setGlobalHandler = errorHandler;

    return () => {
      clearTimeout(timer);
      // Clean up if needed
    };
  }, []);

  const handleCrashModalClose = () => {
    setCrashModalVisible(false);
    setCurrentCrash(null);
  };

  const handleCrashRetry = () => {
    // Optionally reload the app or navigate to home
    // For now, just close the modal
    handleCrashModalClose();
  };

  return (
    <Provider store={AppStore}>
      <SafeAreaView style={{ flex: 1 }}>
        <AppNavigation />

        {/* Phase 3: Modal Components */}
        <ErrorModal />
        <StorageModal />
        <DownloadInProgressModal />

        {/* Crash Report Modal */}
        <CrashReportModal
          isVisible={crashModalVisible}
          crashReport={currentCrash}
          onClose={handleCrashModalClose}
          onRetry={handleCrashRetry}
        />

        {/* Phase 3: Toast Notifications */}
        <Toast />
      </SafeAreaView>
    </Provider>
  );
}
