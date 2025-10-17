import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../../AppTheme';

export default function OfflineHeader({ downloadedCount = 0 }) {
  return (
    <View style={styles.offlineHeader}>
      <Text style={styles.offlineText}>Offline Mode</Text>
      <Text style={styles.offlineSubText}>
        Showing {downloadedCount} downloaded video
        {downloadedCount !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  offlineHeader: {
    backgroundColor: ThemeColors.colorGray,
    padding: 12,
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: ThemeColors.colorBlack,
    marginBottom: 4,
  },
  offlineSubText: {
    fontSize: 14,
    color: ThemeColors.colorBlack,
  },
});
