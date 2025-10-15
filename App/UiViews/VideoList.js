import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeColors } from '../AppTheme';
import CardVideoListItem from '../Components/Card/CardVideoListItem';
import { loadAppConfigThunk } from '../Features/Config/appConfigSlice';
import {
  fetchVideosThunk,
  loadLocalVideosThunk,
  resetVideosState,
  serverSyncThunk,
  setVideosWithStatus,
  startAutoDownloadThunk,
} from '../Features/Videos/VideosSlice';
import { useAppStatus } from '../Hooks/useAppStatus';
import { useNetworkStatus } from '../Hooks/useNetworkStatus';
import FileSystemService from '../Service/FileSystemService';
// import VideoComparison from '../Service/VideoComparison';
import * as VideoComparison from '../Utils/VideoComparison';

export default function VideoList() {
  const dispatch = useDispatch();
  const { isOnline } = useNetworkStatus();
  const { appStatus } = useAppStatus();

  // Get Redux state - be careful with destructuring
  const videosState = useSelector(state => state.videosStore);
  const appConfig = useSelector(state => state.appConfig);

  // Safely destructure with defaults to prevent undefined errors
  const {
    videos = [],
    localVideos = {},
    videosWithStatus = [],
    currentDownload = null,
    isLoading = false,
    isError = false,
    errorMessage = '',
  } = videosState || {};

  const { autoDownloadEnabled = true, downloadOnWifiOnly = true } =
    appConfig || {};

  // State for initialization tracking
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // State to track if merging has been completed for current data
  const [lastMergeKey, setLastMergeKey] = useState('');
  
  // State to track server synchronization
  const [lastSyncKey, setLastSyncKey] = useState('');

  // App status effect - log when app becomes active
  useEffect(() => {
    if (appStatus) {
      console.log('[VideoList] App status changed:', appStatus);
    }
  }, [appStatus]);

  // Initialize app on mount - load configs and local videos
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[VideoList] Initializing app...');

        // Initialize file system first
        await FileSystemService.initializeVideoDirectory();
        console.log('[VideoList] File system initialized');

        // Load app configuration
        dispatch(loadAppConfigThunk());
        console.log('[VideoList] Loading app configuration');

        // Load local videos from AsyncStorage
        dispatch(loadLocalVideosThunk());
        console.log('[VideoList] Loading local videos');

        setIsInitialized(true);
        console.log('[VideoList] App initialization completed');
      } catch (error) {
        console.error('[VideoList] App initialization failed:', error);
        setIsInitialized(true); // Still mark as initialized to prevent infinite loops
      }
    };

    if (!isInitialized) {
      initializeApp();
    }
  }, [dispatch, isInitialized]);

  // Fetch API videos when online and initialized (but don't retry if there's an error)
  useEffect(() => {
    if (
      isOnline &&
      isInitialized &&
      !isLoading &&
      videos.length === 0 &&
      !isError
    ) {
      console.log('[VideoList] Fetching videos from API...');
      dispatch(fetchVideosThunk());
    } else if (isError) {
      console.log(
        '[VideoList] Skipping API call due to previous error:',
        errorMessage,
      );
    }
  }, [
    isOnline,
    isInitialized,
    dispatch,
    isLoading,
    videos.length,
    isError,
    errorMessage,
  ]);

  // Merge videos with local status when both API videos and local videos are available
  useEffect(() => {
    const mergeVideos = async () => {
      // Create a unique key for current data state
      const currentMergeKey = `${videos.length}-${
        Object.keys(localVideos || {}).length
      }-${videosWithStatus.length}`;

      // Skip if we've already processed this exact data combination
      if (currentMergeKey === lastMergeKey) {
        console.log('[VideoList] Skipping merge - data unchanged');
        return;
      }

      if (
        videos &&
        videos.length > 0 &&
        localVideos &&
        typeof localVideos === 'object' &&
        !isProcessing &&
        videosWithStatus.length === 0 // Only merge if we don't have merged videos yet
      ) {
        try {
          setIsProcessing(true);
          console.log('[VideoList] Merging API videos with local status...');

          const mergedVideos = await VideoComparison.mergeVideosWithLocalStatus(
            videos,
            localVideos,
          );

          if (
            mergedVideos &&
            Array.isArray(mergedVideos) &&
            mergedVideos.length > 0
          ) {
            dispatch(setVideosWithStatus(mergedVideos));
            setLastMergeKey(currentMergeKey); // Mark this data combination as processed
            console.log(
              `[VideoList] Merged ${mergedVideos.length} videos with status`,
            );
          } else {
            console.warn('[VideoList] No videos after merge operation');
          }
        } catch (error) {
          console.error('[VideoList] Error merging videos:', error);
        } finally {
          setIsProcessing(false);
        }
      }
    };

    mergeVideos();
  }, [
    videos,
    localVideos,
    dispatch,
    isProcessing,
    videosWithStatus.length,
    lastMergeKey,
  ]);

  // Server synchronization - run after successful merge to cleanup deleted videos
  useEffect(() => {
    const performServerSync = async () => {
      // Create a unique key for current sync state
      const currentSyncKey = `${videos.length}-${videosWithStatus.length}`;

      // Skip if we've already synced this data combination
      if (currentSyncKey === lastSyncKey) {
        return;
      }

      // Only sync when we have both server videos and merged videos with status
      if (
        videos &&
        videos.length > 0 &&
        videosWithStatus &&
        videosWithStatus.length > 0 &&
        localVideos &&
        typeof localVideos === 'object' &&
        !isProcessing &&
        isOnline
      ) {
        try {
          console.log('[VideoList] Starting server synchronization...');
          
          // Perform server sync with auto-cleanup enabled
          await dispatch(serverSyncThunk({
            serverVideos: videos,
            localVideos: localVideos,
            options: {
              autoCleanup: true,  // Automatically remove deleted videos
              dryRun: false,      // Actually perform the cleanup
            },
          }));

          setLastSyncKey(currentSyncKey); // Mark this sync as completed
          console.log('[VideoList] Server synchronization completed');

        } catch (error) {
          console.error('[VideoList] Server synchronization failed:', error);
          // Don't throw error - sync is optional, main app should continue
        }
      }
    };

    // Add a small delay to ensure merge is fully complete
    const timeoutId = setTimeout(performServerSync, 2000);

    return () => clearTimeout(timeoutId);
  }, [
    videos,
    videosWithStatus,
    localVideos,
    isProcessing,
    isOnline,
    lastSyncKey,
    dispatch,
  ]);

  // Auto-download trigger - when videos with status are ready and auto-download is enabled
  useEffect(() => {
    const triggerAutoDownload = () => {
      if (
        videosWithStatus &&
        videosWithStatus.length > 0 &&
        autoDownloadEnabled &&
        isOnline &&
        !currentDownload && // No active downloads
        !isProcessing &&
        isInitialized
      ) {
        // Check WiFi condition
        if (downloadOnWifiOnly) {
          // TODO: Implement WiFi check if needed
          // For now, assume connection is acceptable
        }

        // Check for NEW videos that need download
        const newVideos = videosWithStatus.filter(
          video =>
            video.status === 'NEW' &&
            video.id !== undefined &&
            video.id !== null &&
            (video.filepath || video.video_url), // Check for either filepath or video_url
        );

        if (newVideos.length > 0) {
          console.log(
            `[VideoList] Starting auto-download for ${newVideos.length} new videos`,
          );
          dispatch(startAutoDownloadThunk(videosWithStatus));
        } else {
          console.log('[VideoList] No new videos to auto-download');
        }
      }
    };

    // Small delay to ensure state is stable
    const timeoutId = setTimeout(triggerAutoDownload, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    videosWithStatus,
    autoDownloadEnabled,
    isOnline,
    currentDownload,
    isProcessing,
    isInitialized,
    downloadOnWifiOnly,
    dispatch,
  ]);

  // Render functions
  const renderVideoItem = useCallback(({ item }) => {
    if (!item || item.id === undefined || item.id === null) {
      console.warn('[VideoList] Invalid video item:', item);
      return null;
    }

    return <CardVideoListItem cardItem={item} key={item.id} />;
  }, []);

  const renderVideoList = useCallback(() => {
    const dataToRender = isOnline
      ? videosWithStatus
      : videosWithStatus.filter(v => v.status === 'DOWNLOADED');

    if (!Array.isArray(dataToRender) || dataToRender.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {isOnline
              ? 'No videos available'
              : 'No downloaded videos available offline'}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={dataToRender}
        renderItem={renderVideoItem}
        keyExtractor={item => {
          if (item && item.id !== undefined && item.id !== null) {
            return String(item.id);
          }
          console.warn('[VideoList] Invalid item for keyExtractor:', item);
          return Math.random().toString();
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    );
  }, [isOnline, videosWithStatus, renderVideoItem]);

  // Handle offline mode - show only downloaded videos
  if (!isOnline) {
    const downloadedVideos = videosWithStatus.filter(
      video => video.status === 'DOWNLOADED',
    );

    return (
      <View style={styles.container}>
        <View style={styles.offlineHeader}>
          <Text style={styles.offlineText}>Offline Mode</Text>
          <Text style={styles.offlineSubText}>
            Showing {downloadedVideos.length} downloaded video
            {downloadedVideos.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {downloadedVideos.length > 0 ? (
          <FlatList
            data={downloadedVideos}
            renderItem={renderVideoItem}
            keyExtractor={item => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No downloaded videos available</Text>
            <Text style={styles.emptySubText}>
              Connect to internet to download videos
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Show loading state during initialization
  if (!isInitialized || (isLoading && videos.length === 0)) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  // Show error state with retry option
  if (isError && errorMessage) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error Loading Videos</Text>
        <Text style={styles.errorSubText}>{errorMessage}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            console.log(
              '[VideoList] Manual retry requested - clearing error state',
            );
            // Clear error state and reset merge tracking
            dispatch(resetVideosState());
            setLastMergeKey(''); // Reset merge tracking
            setLastSyncKey('');  // Reset sync tracking
            setTimeout(() => {
              dispatch(fetchVideosThunk());
            }, 100);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main content
  return <View style={styles.container}>{renderVideoList()}</View>;
}
const styles = StyleSheet.create({
  container: {
    backgroundColor: ThemeColors.colorWhite,
    flex: 1,
  },
  centerContainer: {
    backgroundColor: ThemeColors.colorWhite,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
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
  loadingText: {
    fontSize: 18,
    color: ThemeColors.colorBlack,
  },
  errorText: {
    fontSize: 18,
    color: ThemeColors.colorRed || '#FF0000',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 14,
    color: ThemeColors.colorGray,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: ThemeColors.colorPrimary || '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: ThemeColors.colorWhite,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
