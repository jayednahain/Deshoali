import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * CustomLoader - Full-screen loading overlay
 * Shows during API calls and data loading
 *
 * @param {boolean} visible - Controls loader visibility
 */
const CustomLoader = ({ visible = false }) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00ff00" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Above everything
  },
});

export default CustomLoader;
