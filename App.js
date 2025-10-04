import React, { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import AppContainer from './App/AppContainer';
import store from './App/redux/store';

export default function App() {
  useEffect(() => {
    // Hide splash screen after component is mounted
    const timer = setTimeout(() => {
      BootSplash.hide({ fade: true });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
          backgroundColor="#007AFF"
        />
        <AppContainer />
      </SafeAreaProvider>
    </Provider>
  );
}
