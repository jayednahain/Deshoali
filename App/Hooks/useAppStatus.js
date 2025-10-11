import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export const useAppStatus = () => {
  const [appStatus, setAppStatus] = useState(AppState.currentState);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      'change',
      nextAppState => {
        setAppStatus(nextAppState);
      },
    );

    return () => {
      appStateSubscription?.remove();
    };
  }, []);

  return {
    appStatus,
    isActive: appStatus === 'active',
    isBackground: appStatus === 'background',
    isInactive: appStatus === 'inactive',
  };
};
