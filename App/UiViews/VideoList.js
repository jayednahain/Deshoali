import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeColors } from '../AppTheme';
import {
  OfflineHeader,
  VideoListRenderer,
  VideoSearchBar,
} from '../Components';
import { loadAppConfigThunk } from '../Features/Config/appConfigSlice';
import {
  fetchVideosThunk,
  loadLocalVideosThunk,
  resetVideosState,
  searchVideosThunk,
  serverSyncThunk,
  setSearchQuery,
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
    // Search state
    searchQuery = '',
    searchResults = [],
    isSearching = false,
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

  // State for pull-to-refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoized values for performance optimization
  const downloadedVideos = useMemo(() => {
    return videosWithStatus.filter(video => video.status === 'DOWNLOADED');
  }, [videosWithStatus]);

  const downloadedCount = useMemo(() => {
    return downloadedVideos.length;
  }, [downloadedVideos]);

  // Determine which videos to show based on search state
  const displayVideos = useMemo(() => {
    // If there's a search query, show search results, otherwise show all videos
    return searchQuery.trim() ? searchResults : videosWithStatus;
  }, [searchQuery, searchResults, videosWithStatus]);

  // App status effect - log when app becomes active
  useEffect(() => {
    if (appStatus) {
      console.log('[VideoList] App status changed:', appStatus);
    }
  }, [appStatus]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await FileSystemService.initializeVideoDirectory();
        dispatch(loadAppConfigThunk());
        dispatch(loadLocalVideosThunk());
        setIsInitialized(true);
      } catch (error) {
        setIsInitialized(true);
      }
    };

    if (!isInitialized) {
      initializeApp();
    }
  }, [dispatch, isInitialized]);

  // Fetch API videos when online and initialized (optimized dependencies)
  useEffect(() => {
    if (
      isOnline &&
      isInitialized &&
      !isLoading &&
      videos.length === 0 &&
      !isError
    ) {
      dispatch(fetchVideosThunk());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOnline, // Only re-run when network changes
    isInitialized, // Only re-run when app is ready
    dispatch, // React requirement
    // Removed isLoading, videos.length, isError, errorMessage to prevent loops
  ]);

  // Merge videos with local status when both API videos and local videos are available (optimized)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    videos, // Re-run when API videos change
    localVideos, // Re-run when local videos change
    dispatch, // React requirement
    // Removed isProcessing, videosWithStatus.length, lastMergeKey to prevent infinite loops
    // These are checked inside the effect condition
  ]);

  // Server synchronization - run after successful merge to cleanup deleted videos (optimized)
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
          await dispatch(
            serverSyncThunk({
              serverVideos: videos,
              localVideos: localVideos,
              options: {
                autoCleanup: true, // Automatically remove deleted videos
                dryRun: false, // Actually perform the cleanup
              },
            }),
          );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    videos, // Re-run when API videos change
    videosWithStatus, // Re-run when merged videos change
    localVideos, // Re-run when local videos change
    isOnline, // Re-run when network changes
    dispatch, // React requirement
    // Removed isProcessing, lastSyncKey to prevent loops
    // These are checked inside the effect condition
  ]);

  // Auto-download trigger - when videos with status are ready and auto-download is enabled (optimized)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    videosWithStatus, // Re-run when videos change
    autoDownloadEnabled, // Re-run when setting changes
    isOnline, // Re-run when network changes
    isInitialized, // Re-run when app is ready
    dispatch, // React requirement
    // Removed currentDownload, isProcessing, downloadOnWifiOnly to prevent excessive re-runs
    // These are checked inside the effect condition
  ]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    if (!isOnline) {
      return; // Don't refresh when offline
    }

    console.log('[VideoList] Pull-to-refresh triggered');
    setIsRefreshing(true);

    try {
      // Reset state tracking to force fresh data
      setLastMergeKey('');
      setLastSyncKey('');

      // Clear search state on refresh
      dispatch(setSearchQuery(''));

      // Clear any existing error state
      dispatch(resetVideosState());

      // Fetch fresh videos from API
      await dispatch(fetchVideosThunk()).unwrap();

      // Re-load local videos to get latest status
      dispatch(loadLocalVideosThunk());

      console.log('[VideoList] Pull-to-refresh completed successfully');
    } catch (error) {
      console.error('[VideoList] Pull-to-refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isOnline, dispatch]);

  // Handle search functionality
  const handleSearch = useCallback(
    async query => {
      if (!isOnline) {
        console.log('[VideoList] Search disabled - offline mode');
        return;
      }

      if (query.trim() === '') {
        // Clear search
        dispatch(setSearchQuery(''));
        return;
      }

      try {
        console.log(`[VideoList] Searching for: "${query}"`);
        await dispatch(searchVideosThunk(query)).unwrap();
      } catch (error) {
        console.error('[VideoList] Search failed:', error);
      }
    },
    [dispatch, isOnline],
  );

  // Simplified render function using new VideoListRenderer component
  const renderVideoList = useCallback(() => {
    return (
      <View style={styles.container}>
        {/* Search bar at the top */}
        <VideoSearchBar
          onSearch={handleSearch}
          isSearching={isSearching}
          placeholder="Search videos by title (min 3 chars)..."
        />

        {/* Video list */}
        <VideoListRenderer
          videos={displayVideos}
          isOnline={isOnline}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </View>
    );
  }, [
    displayVideos,
    isOnline,
    handleRefresh,
    isRefreshing,
    handleSearch,
    isSearching,
  ]);

  // Handle offline mode - show only downloaded videos
  if (!isOnline) {
    return (
      <View style={styles.container}>
        <OfflineHeader downloadedCount={downloadedCount} />
        {/* Search disabled in offline mode */}
        <VideoListRenderer
          videos={downloadedVideos}
          isOnline={isOnline}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
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
            setLastSyncKey(''); // Reset sync tracking
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
  return renderVideoList();
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
