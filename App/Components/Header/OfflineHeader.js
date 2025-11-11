import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../../AppTheme';
import useAppLanguage from '../../Hooks/useAppLagnuage';
import { UtilityFunctions } from '../../UtilityFunctions/UtilityFunctions';

export default function OfflineHeader({ downloadedCount = 0 }) {
  const { i18n } = useAppLanguage();
  return (
    <View style={styles.offlineHeader}>
      <Text style={styles.offlineText}>{i18n('offline_mode')}</Text>
      <Text style={styles.offlineSubText}>
        {/* Showing {downloadedCount} downloaded video */}
        {i18n('no_of_downloaded_videos')}{' '}
        {UtilityFunctions.getNumbersFromString(downloadedCount)}
        {/* {downloadedCount !== 1 ? 's' : ''} */}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  offlineHeader: {
    backgroundColor: '#df5959ff',
    padding: 12,
    alignItems: 'center',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  offlineText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: ThemeColors.colorWhite,
    marginBottom: 4,
  },
  offlineSubText: {
    fontSize: 14,
    color: ThemeColors.colorWhite,
  },
});
