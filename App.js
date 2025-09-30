import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BootSplash from 'react-native-bootsplash';

export default function App() {
  useEffect(() => {
    // Hide splash screen after component is mounted
    const timer = setTimeout(() => {
      BootSplash.hide({ fade: true });
    }, 2000); // Show splash for 2 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello Deshoali!</Text>
      <Text style={styles.subtitle}>Welcome to your app!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 24,
    color: '#000000',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
});
