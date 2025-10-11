// import NetInfo from '@react-native-community/netinfo';
// import { useEffect, useState } from 'react';
// import { useAppStatus } from './useAppStatus';

// export const useNetworkStatus = () => {
//   const [isConnected, setIsConnected] = useState(true);
//   const [isInternetReachable, setIsInternetReachable] = useState(true);
//   const { isActive } = useAppStatus();

//   const checkNetworkStatus = async () => {
//     const state = await NetInfo.fetch();
//     setIsConnected(state.isConnected ?? false);
//     setIsInternetReachable(state.isInternetReachable ?? false);
//   };

//   useEffect(() => {
//     checkNetworkStatus();

//     const unsubscribeNetInfo = NetInfo.addEventListener(state => {
//       setIsConnected(state.isConnected ?? false);
//       setIsInternetReachable(state.isInternetReachable ?? false);
//     });

//     return () => {
//       unsubscribeNetInfo();
//     };
//   }, []);

//   useEffect(() => {
//     if (isActive) {
//       checkNetworkStatus();
//     }
//   }, [isActive]);

//   return {
//     isConnected,
//     isInternetReachable,
//     isOnline: isConnected && isInternetReachable,
//   };
// };

import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { useAppStatus } from './useAppStatus';

export const useNetworkStatus = (isCheckAppStatus = false) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const { isActive } = useAppStatus();

  const checkNetworkStatus = async () => {
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected ?? false);
    setIsInternetReachable(state.isInternetReachable ?? false);
  };

  useEffect(() => {
    checkNetworkStatus();

    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? false);
    });

    return () => {
      unsubscribeNetInfo();
    };
  }, []);

  // useEffect(() => {
  //   if (isCheckAppStatus && isActive) {
  //     checkNetworkStatus();
  //   }
  // }, [isActive, isCheckAppStatus]);

  return {
    isConnected,
    isInternetReachable,
    isOnline: isConnected && isInternetReachable,
  };
};
