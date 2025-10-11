import React, { useEffect } from 'react';
import BootSplash from 'react-native-bootsplash';
import { Provider } from 'react-redux';
import AppNavigation from './App/AppNavigation/CustomNavigation';
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
    </Provider>
  );
}
