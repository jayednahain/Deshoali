import React, { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { H1, ThemeColors } from '../../AppTheme';
import useAppLanguage from '../../Hooks/useAppLagnuage';
import CardVideoListItem from '../Card/CardVideoListItem';

export default function VideoListRenderer({
  videos = [],
  isOnline = true,
  onRefresh,
  isRefreshing = false,
}) {
  const { i18n } = useAppLanguage();
  // Memoize the filtered data to prevent unnecessary re-renders
  const dataToRender = useMemo(() => {
    if (!Array.isArray(videos)) {
      return [];
    }

    return isOnline
      ? videos
      : videos.filter(v => v && v.status === 'DOWNLOADED');
  }, [videos, isOnline]);

  // Memoize the render function to prevent re-creation on each render
  const renderVideoItem = useCallback(({ item, index }) => {
    if (!item || item.id === undefined || item.id === null) {
      console.warn('[VideoListRenderer] Invalid video item:', item);
      return null;
    }

    return (
      <CardVideoListItem
        cardItem={item}
        index={index}
        key={item.id}
      />
    );
  }, []);

  // Memoize key extractor for better performance
  const keyExtractor = useCallback(item => {
    if (item && item.id !== undefined && item.id !== null) {
      return String(item.id);
    }
    console.warn('[VideoListRenderer] Invalid item for keyExtractor:', item);
    return Math.random().toString();
  }, []);

  // Handle empty state
  if (dataToRender.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <H1 style={styles.emptyText}>
          {isOnline ? i18n('no_videos') : i18n('no_internet_download_message')}
        </H1>
        {!isOnline && (
          <H1 style={styles.emptySubText}>
            {i18n('connect_to_internet_for_video_download')}
          </H1>
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={dataToRender}
      renderItem={renderVideoItem}
      keyExtractor={keyExtractor}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[ThemeColors.colorPrimary || '#007AFF']}
          tintColor={ThemeColors.colorPrimary || '#007AFF'}
          title="Refreshing videos..."
          titleColor={ThemeColors.colorGray}
        />
      }
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={100}
      initialNumToRender={10}
      windowSize={10}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    paddingBottom: '20%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: ThemeColors.colorBlack,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: ThemeColors.colorGray,
    textAlign: 'center',
  },
});
