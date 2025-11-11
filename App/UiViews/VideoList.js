import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeColors } from '../AppTheme';
import {
  BottomButtonSectionWithText,
  CustomLoader,
  DownloadingProcessModal,
  OfflineHeader,
  VideoListRenderer,
  VideoSearchBar,
} from '../Components';
import { loadAppConfigThunk } from '../Features/Config/appConfigSlice';
import {
  hideDownloadingProcessModal,
  showDownloadingProcessModal,
  showErrorModal,
  updateDownloadingProcessModal,
} from '../Features/Modal/modalSlice';
import {
  fetchVideosThunk,
  incrementVideosDownloaded,
  loadLocalVideosThunk,
  resetApiVideosOnly,
  resetDownloadTracking,
  resetVideosState,
  searchVideosThunk,
  serverSyncThunk,
  setCurrentDownload,
  setDownloadingInModal,
  setSearchQuery,
  setTotalVideosToDownload,
  setVideosWithStatus,
  startAutoDownloadThunk,
  updateVideoStatus,
} from '../Features/Videos/VideosSlice';
import { useAppStatus } from '../Hooks/useAppStatus';
import { useNetworkStatus } from '../Hooks/useNetworkStatus';
import AppStore from '../ReduxStore/store';
import DownloadManager from '../Service/DownloadManager';
import FileSystemService from '../Service/FileSystemService';
// import VideoComparison from '../Service/VideoComparison';
import useAppLanguage from '../Hooks/useAppLagnuage';
import * as VideoComparison from '../Utils/VideoComparison';

export default function VideoList() {
  const dispatch = useDispatch();
  const { isOnline } = useNetworkStatus();
  const { appStatus } = useAppStatus();
  const { i18n } = useAppLanguage();

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

  const { autoDownloadEnabled = true } = appConfig || {};

  // State for initialization tracking
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // NEW (Phase 4): Loader state
  const [showLoader, setShowLoader] = useState(false);

  // NEW (Phase 4): Bottom warning state for incomplete downloads
  const [showBottomWarning, setShowBottomWarning] = useState(false);
  const [pendingVideosCount, setPendingVideosCount] = useState(0);

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
        // NEW (Phase 4): Show loader during initialization
        setShowLoader(true);

        await FileSystemService.initializeVideoDirectory();
        dispatch(loadAppConfigThunk());
        dispatch(loadLocalVideosThunk());
        setIsInitialized(true);

        // Loader will be hidden after data is ready (in merge effect)
      } catch (error) {
        setIsInitialized(true);
        setShowLoader(false); // Hide on error
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
      // Loader already showing from initialization
      dispatch(fetchVideosThunk());
      // Loader will hide after merge completes
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
        (videosWithStatus.length === 0 || currentMergeKey !== lastMergeKey) // Merge if no videos OR data changed
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

            // NEW (Phase 4): Hide loader after merge completes
            setShowLoader(false);

            console.log(
              `[VideoList] Merged ${mergedVideos.length} videos with status`,
            );
          } else {
            console.warn('[VideoList] No videos after merge operation');
            setShowLoader(false);
          }
        } catch (error) {
          console.error('[VideoList] Error merging videos:', error);
          setShowLoader(false);
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

  // Periodically reload local videos when downloads are active to keep Redux state in sync
  useEffect(() => {
    let intervalId;

    if (
      currentDownload !== null ||
      (videosWithStatus &&
        videosWithStatus.some(v => v.status === 'DOWNLOADING'))
    ) {
      console.log(
        '[VideoList] Starting periodic local videos reload - downloads active',
      );

      // Reload local videos every 3 seconds during downloads
      intervalId = setInterval(() => {
        console.log(
          '[VideoList] Periodic reload of local videos during downloads',
        );
        dispatch(loadLocalVideosThunk());
      }, 3000);
    }

    return () => {
      if (intervalId) {
        console.log('[VideoList] Stopping periodic local videos reload');
        clearInterval(intervalId);
      }
    };
  }, [currentDownload, videosWithStatus, dispatch]);

  // NEW (Phase 4): Auto-download with modal integration
  useEffect(() => {
    const triggerModalDownload = async () => {
      if (
        videosWithStatus &&
        videosWithStatus.length > 0 &&
        autoDownloadEnabled &&
        isOnline &&
        !currentDownload &&
        !isProcessing &&
        isInitialized &&
        !showLoader // Wait for loader to hide
      ) {
        // Check for NEW videos that need download
        const newVideos = videosWithStatus.filter(
          video =>
            video.status === 'NEW' &&
            video.id !== undefined &&
            video.id !== null &&
            (video.filepath || video.video_url),
        );

        if (newVideos.length > 0) {
          console.log(
            `[VideoList] Starting modal-based download for ${newVideos.length} new videos`,
          );

          // Set download tracking
          dispatch(setTotalVideosToDownload(newVideos.length));
          dispatch(setDownloadingInModal(true));

          // Show downloading process modal
          dispatch(
            showDownloadingProcessModal({
              currentVideoName: newVideos[0].name,
              currentVideoProgress: 0,
              totalVideos: newVideos.length,
              completedVideos: 0,
            }),
          );

          // Get DownloadManager instance
          const downloadManager = DownloadManager.getInstance();

          // Setup modal callback - updates modal in real-time
          downloadManager.setModalCallback(
            (videoName, progress, totalVideos, completedVideos) => {
              // Build update object (only include non-null values)
              const update = {};
              if (videoName !== null && videoName !== undefined) {
                update.currentVideoName = videoName;
              }
              if (progress !== null && progress !== undefined) {
                update.currentVideoProgress = progress;
              }
              if (totalVideos !== null && totalVideos !== undefined) {
                update.totalVideos = totalVideos;
              }
              if (completedVideos !== null && completedVideos !== undefined) {
                update.completedVideos = completedVideos;
              }

              dispatch(updateDownloadingProcessModal(update));
            },
          );

          // Setup status callback - track completed downloads
          downloadManager.setStatusCallback(
            (videoId, status, localFilePath) => {
              dispatch(updateVideoStatus({ videoId, status }));

              if (status === 'DOWNLOADED') {
                // Increment downloaded count
                dispatch(incrementVideosDownloaded());

                // IMPROVED: Check actual video states instead of counter
                // Small delay to let Redux state update, then check remaining videos
                setTimeout(() => {
                  const currentState = AppStore.getState();
                  const { videosWithStatus: updatedVideos } =
                    currentState.videosStore;

                  // Count videos that still need download (NEW or FAILED)
                  const pendingVideos = updatedVideos.filter(
                    v =>
                      v.status === 'NEW' ||
                      v.status === 'FAILED' ||
                      v.status === 'DOWNLOADING',
                  );

                  // Count completed videos for modal display
                  const completedVideos = updatedVideos.filter(
                    v => v.status === 'DOWNLOADED',
                  ).length;

                  // Update modal with actual completed count
                  dispatch(
                    updateDownloadingProcessModal({
                      completedVideos: completedVideos,
                    }),
                  );

                  console.log(
                    `[VideoList] Download completed. Pending: ${pendingVideos.length}, Completed: ${completedVideos}`,
                  );

                  // Hide modal if NO videos are pending
                  if (pendingVideos.length === 0) {
                    console.log(
                      '[VideoList] All downloads completed! No pending videos.',
                    );

                    // Small delay before hiding modal
                    setTimeout(() => {
                      dispatch(hideDownloadingProcessModal());
                      dispatch(setDownloadingInModal(false));
                      dispatch(resetDownloadTracking());
                    }, 500);
                  }
                }, 100); // Small delay to ensure state is updated
              } else if (status === 'FAILED') {
                // Handle download error
                console.error(
                  `[VideoList] Download failed for video ${videoId}`,
                );

                // Hide downloading modal
                dispatch(hideDownloadingProcessModal());
                dispatch(setDownloadingInModal(false));

                // Count remaining videos
                const remainingVideos = videosWithStatus.filter(
                  v => v.status === 'NEW' || v.status === 'FAILED',
                );
                setPendingVideosCount(remainingVideos.length);
                setShowBottomWarning(remainingVideos.length > 0);

                // Show error modal
                dispatch(
                  showErrorModal({
                    title: 'ডাউনলোড ব্যর্থ',
                    message: 'ডাউনলোড করার সময় সমস্যা হয়েছে।',
                    type: 'download_error',
                    retryAction: () => {
                      // Retry from remaining videos
                      console.log('[VideoList] Retrying failed downloads...');

                      // Hide bottom warning
                      setShowBottomWarning(false);

                      // Show loader
                      setShowLoader(true);

                      // Reload and retry
                      setTimeout(() => {
                        dispatch(fetchVideosThunk());
                      }, 500);
                    },
                    canCancel: true,
                  }),
                );
              }

              if (status === 'DOWNLOADING') {
                dispatch(setCurrentDownload(videoId));
              } else if (status === 'DOWNLOADED' || status === 'FAILED') {
                dispatch(setCurrentDownload(null));
              }
            },
          );

          // Start downloads
          try {
            await dispatch(startAutoDownloadThunk(videosWithStatus)).unwrap();
          } catch (error) {
            console.error('[VideoList] Download error:', error);

            // Hide modal and show error
            dispatch(hideDownloadingProcessModal());
            dispatch(setDownloadingInModal(false));

            dispatch(
              showErrorModal({
                title: 'ত্রুটি',
                message: 'ডাউনলোড শুরু করতে ব্যর্থ',
                type: 'download_error',
                retryAction: () => {
                  setShowLoader(true);
                  setTimeout(() => {
                    dispatch(fetchVideosThunk());
                  }, 500);
                },
                canCancel: true,
              }),
            );
          }
        } else {
          console.log('[VideoList] No new videos to download');
        }
      }
    };

    const timeoutId = setTimeout(triggerModalDownload, 1000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    videosWithStatus,
    autoDownloadEnabled,
    isOnline,
    isInitialized,
    showLoader,
    dispatch,
  ]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    if (!isOnline) {
      return; // Don't refresh when offline
    }

    console.log('[VideoList] Pull-to-refresh triggered');
    setIsRefreshing(true);

    // NEW (Phase 4): Show loader during refresh
    setShowLoader(true);

    try {
      // Reset state tracking to force fresh data merge
      setLastMergeKey('');
      setLastSyncKey('');

      // Clear search state on refresh
      dispatch(setSearchQuery(''));

      // Hide bottom warning if visible
      setShowBottomWarning(false);

      // CRITICAL FIX: DON'T reset videos state completely - preserve local data
      // Instead, only clear API videos and errors, keep local videos intact
      console.log('[VideoList] Preserving local videos during refresh');
      dispatch(resetApiVideosOnly());

      // Fetch fresh videos from API first
      await dispatch(fetchVideosThunk()).unwrap();

      // Re-load local videos to ensure we have latest metadata
      dispatch(loadLocalVideosThunk());

      // Loader will hide after merge completes

      console.log('[VideoList] Pull-to-refresh completed successfully');
    } catch (error) {
      console.error('[VideoList] Pull-to-refresh failed:', error);

      // On error, still reload local videos to ensure we have the data
      dispatch(loadLocalVideosThunk());

      // Hide loader on error
      setShowLoader(false);
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

  // NEW (Phase 4): Handle bottom warning retry
  const handleBottomRetry = useCallback(() => {
    console.log('[VideoList] Bottom warning retry pressed');

    // Hide bottom warning
    setShowBottomWarning(false);

    // Show loader
    setShowLoader(true);

    // Reset and reload
    setTimeout(() => {
      dispatch(fetchVideosThunk());
    }, 500);
  }, [dispatch]);

  // Simplified render function using new VideoListRenderer component
  const renderVideoList = useCallback(() => {
    return (
      <View style={styles.container}>
        {/* Search bar at the top */}
        <VideoSearchBar
          onSearch={handleSearch}
          isSearching={isSearching}
          placeholder={i18n('type_video_name')}
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
    // Show loader while loading local videos
    if (
      !isInitialized ||
      (localVideos && Object.keys(localVideos).length === 0)
    ) {
      return (
        <View style={styles.container}>
          <CustomLoader visible={true} />
        </View>
      );
    }

    // Show offline videos
    return (
      <View style={styles.container}>
        <OfflineHeader downloadedCount={downloadedCount} />
        <VideoListRenderer
          videos={downloadedVideos}
          isOnline={isOnline}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Modals */}
        <DownloadingProcessModal />
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
  return (
    <>
      <View style={styles.container}>
        {renderVideoList()}

        {/* NEW (Phase 4): Bottom warning for incomplete downloads */}
        {showBottomWarning && pendingVideosCount > 0 && (
          <BottomButtonSectionWithText
            pendingCount={pendingVideosCount}
            onRetryPress={handleBottomRetry}
          />
        )}
      </View>

      {/* NEW (Phase 4): Full-screen loader */}
      <CustomLoader visible={showLoader} />

      {/* NEW (Phase 4): Downloading process modal */}
      <DownloadingProcessModal />
    </>
  );
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
