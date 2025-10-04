import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  checkNetworkAndSyncThunk,
  fetchVideoListThunk,
  startVideoDownloadThunk,
  syncVideoStatusThunk,
  updateDownloadProgressThunk,
} from '../Features/vedios/vediosThunkFunctions';
import VideoCard from '../UiComponents/VideoCard';

import { updateVideoDownloadStatus } from '../Features/vedios/videosSlice';
import { videoDownloadManager } from '../service/downloadManager';

const VideoListScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const {
    videos,
    downloadStatus,
    isLoading,
    isError,
    error,
    isOffline,
    lastSync,
  } = useSelector(state => state.videosStore);

  const { isAuthenticated } = useSelector(state => state.auth);

  const initializeVideoList = useCallback(async () => {
    try {
      // Check network and sync accordingly
      await dispatch(checkNetworkAndSyncThunk()).unwrap();

      // Sync download status for all videos
      if (videos.length > 0) {
        await dispatch(syncVideoStatusThunk(videos)).unwrap();
      }
    } catch (err) {
      console.error('Error initializing video list:', err);
    }
  }, [dispatch, videos]);

  useEffect(() => {
    if (isAuthenticated) {
      initializeVideoList();
    }
  }, [isAuthenticated, initializeVideoList]);

  const handleRefresh = useCallback(async () => {
    try {
      await dispatch(fetchVideoListThunk()).unwrap();
      if (videos.length > 0) {
        await dispatch(syncVideoStatusThunk(videos)).unwrap();
      }
    } catch (err) {
      Alert.alert(
        'Refresh Failed',
        err || 'Failed to refresh video list. Please try again.',
        [{ text: 'OK' }],
      );
    }
  }, [dispatch, videos]);

  const handleVideoPress = useCallback(
    (video, status) => {
      if (status?.status === 'completed' && status.filePath) {
        // Play downloaded video
        navigation.navigate('VideoPlayer', {
          video,
          filePath: status.filePath,
          isLocal: true,
        });
      } else if (!isOffline && video.sources?.[0]) {
        // Stream online video
        navigation.navigate('VideoPlayer', {
          video,
          streamUrl: video.sources[0],
          isLocal: false,
        });
      } else {
        Alert.alert(
          'Video Unavailable',
          'This video is not available offline. Please download it first or connect to the internet.',
          [{ text: 'OK' }],
        );
      }
    },
    [navigation, isOffline],
  );

  const handleDownload = useCallback(
    async video => {
      try {
        await dispatch(startVideoDownloadThunk(video)).unwrap();

        // Subscribe to download progress updates
        const videoId = video.id || video.title;
        videoDownloadManager.subscribeToProgress(videoId, progress => {
          dispatch(
            updateDownloadProgressThunk({
              videoId,
              progress,
              status: 'downloading',
            }),
          );
        });

        videoDownloadManager.subscribeToStatus(videoId, status => {
          dispatch(
            updateVideoDownloadStatus({
              videoId,
              status,
            }),
          );
        });
      } catch (err) {
        Alert.alert(
          'Download Failed',
          err || 'Failed to start download. Please try again.',
          [{ text: 'OK' }],
        );
      }
    },
    [dispatch],
  );

  const renderVideoCard = useCallback(
    ({ item }) => (
      <VideoCard
        video={item}
        downloadStatus={downloadStatus}
        onPress={handleVideoPress}
        onDownload={handleDownload}
        isOffline={isOffline}
      />
    ),
    [downloadStatus, handleVideoPress, handleDownload, isOffline],
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Videos</Text>
      <View style={styles.statusContainer}>
        {isOffline && <Text style={styles.offlineStatus}>Offline Mode</Text>}
        {lastSync && (
          <Text style={styles.lastSync}>
            Last synced: {new Date(lastSync).toLocaleString()}
          </Text>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {isOffline
          ? 'No videos available offline. Connect to internet to download videos.'
          : 'No videos available. Pull to refresh.'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Authenticating...</Text>
      </View>
    );
  }

  if (isError && videos.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        {renderError()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        renderItem={renderVideoCard}
        keyExtractor={item => item.id || item.title}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContainer,
          videos.length === 0 && styles.emptyListContainer,
        ]}
      />

      {isLoading && videos.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offlineStatus: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  lastSync: {
    color: '#666',
    fontSize: 12,
  },
  listContainer: {
    paddingVertical: 8,
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    lineHeight: 24,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  errorText: {
    textAlign: 'center',
    color: '#F44336',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
});

export default VideoListScreen;
