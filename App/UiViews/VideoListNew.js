import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeColors } from '../AppTheme';
import {
  BottomButtonSectionWithText,
  CustomLoader,
  DownloadingProcessModal,
  ErrorModal,
  OfflineHeader,
  VideoListRenderer,
  VideoSearchBar,
  setErrorModalRetryCallback,
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
import * as VideoComparison from '../Utils/VideoComparison';

/**
 * VideoListNew - Modal-Centric Download Implementation
 *
 * Key Features:
 * - CustomLoader during initialization and API calls
 * - DownloadingProcessModal for download progress (cannot be dismissed)
 * - BottomButtonSectionWithText for incomplete downloads
 * - Real-time progress updates via DownloadManager callbacks
 * - Automatic modal hide when all downloads complete
 * - Error handling with retry functionality
 */
export default function VideoListNew() {
  const dispatch = useDispatch();
  const { isOnline } = useNetworkStatus();
  const { appStatus } = useAppStatus();

  // Redux state
  const videosState = useSelector(state => state.videosStore);
  const appConfig = useSelector(state => state.appConfig);

  const {
    videos = [],
    localVideos = {},
    videosWithStatus = [],
    currentDownload = null,
    isLoading = false,
    isError = false,
    errorMessage = '',
    searchQuery = '',
    searchResults = [],
    isSearching = false,
  } = videosState || {};

  const { autoDownloadEnabled = true } = appConfig || {};

  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [showBottomWarning, setShowBottomWarning] = useState(false);
  const [pendingVideosCount, setPendingVideosCount] = useState(0);
  const [lastMergeKey, setLastMergeKey] = useState('');
  const [lastSyncKey, setLastSyncKey] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoized values
  const downloadedVideos = useMemo(() => {
    return videosWithStatus.filter(video => video.status === 'DOWNLOADED');
  }, [videosWithStatus]);

  const downloadedCount = useMemo(() => {
    return downloadedVideos.length;
  }, [downloadedVideos]);

  const displayVideos = useMemo(() => {
    return searchQuery.trim() ? searchResults : videosWithStatus;
  }, [searchQuery, searchResults, videosWithStatus]);

  // App status logging
  useEffect(() => {
    if (appStatus) {
      console.log('[VideoListNew] App status changed:', appStatus);
    }
  }, [appStatus]);

  // Initialize app - show loader
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setShowLoader(true);
        await FileSystemService.initializeVideoDirectory();
        dispatch(loadAppConfigThunk());
        dispatch(loadLocalVideosThunk());
        setIsInitialized(true);
      } catch (error) {
        console.error('[VideoListNew] Initialization error:', error);
        setIsInitialized(true);
        setShowLoader(false);
      }
    };

    if (!isInitialized) {
      initializeApp();
    }
  }, [dispatch, isInitialized]);

  // Fetch API videos when online
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
  }, [isOnline, isInitialized, dispatch]);

  // Merge videos with local status - hide loader after merge
  useEffect(() => {
    const mergeVideos = async () => {
      const currentMergeKey = `${videos.length}-${
        Object.keys(localVideos || {}).length
      }-${videosWithStatus.length}`;

      if (currentMergeKey === lastMergeKey) {
        return;
      }

      if (
        videos &&
        videos.length > 0 &&
        localVideos &&
        typeof localVideos === 'object' &&
        !isProcessing &&
        (videosWithStatus.length === 0 || currentMergeKey !== lastMergeKey)
      ) {
        try {
          setIsProcessing(true);
          console.log('[VideoListNew] Merging videos...');

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
            setLastMergeKey(currentMergeKey);
            setShowLoader(false); // Hide loader after merge
            console.log(`[VideoListNew] Merged ${mergedVideos.length} videos`);
          } else {
            setShowLoader(false);
          }
        } catch (error) {
          console.error('[VideoListNew] Merge error:', error);
          setShowLoader(false);
        } finally {
          setIsProcessing(false);
        }
      }
    };

    mergeVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, localVideos, dispatch]);

  // Server synchronization
  useEffect(() => {
    const performServerSync = async () => {
      const currentSyncKey = `${videos.length}-${videosWithStatus.length}`;

      if (currentSyncKey === lastSyncKey) {
        return;
      }

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
          await dispatch(
            serverSyncThunk({
              serverVideos: videos,
              localVideos: localVideos,
              options: {
                autoCleanup: true,
                dryRun: false,
              },
            }),
          );
          setLastSyncKey(currentSyncKey);
        } catch (error) {
          console.error('[VideoListNew] Server sync failed:', error);
        }
      }
    };

    const timeoutId = setTimeout(performServerSync, 2000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, videosWithStatus, localVideos, isOnline, dispatch]);

  // Periodic reload during downloads
  useEffect(() => {
    let intervalId;

    if (
      currentDownload !== null ||
      (videosWithStatus &&
        videosWithStatus.some(v => v.status === 'DOWNLOADING'))
    ) {
      intervalId = setInterval(() => {
        dispatch(loadLocalVideosThunk());
      }, 3000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentDownload, videosWithStatus, dispatch]);

  // NEW: Backup completion check - monitors videosWithStatus changes
  useEffect(() => {
    // Check if modal is visible
    const modalState = AppStore.getState().modalStore?.downloadingProcessModal;

    if (!modalState?.visible) {
      return; // Modal not visible, nothing to check
    }

    // Check if we have videos
    if (!videosWithStatus || videosWithStatus.length === 0) {
      return;
    }

    // Count pending videos
    const pendingVideos = videosWithStatus.filter(
      v =>
        v.status === 'NEW' ||
        v.status === 'FAILED' ||
        v.status === 'DOWNLOADING',
    );

    const completedVideos = videosWithStatus.filter(
      v => v.status === 'DOWNLOADED',
    );

    console.log(
      `[VideoListNew] 🔄 BACKUP CHECK - Pending: ${pendingVideos.length}, Downloaded: ${completedVideos.length}`,
    );

    // If no pending videos and modal is still visible, hide it
    if (pendingVideos.length === 0 && completedVideos.length > 0) {
      console.log(
        '[VideoListNew] 🚨 BACKUP CHECK TRIGGERED - Hiding modal now!',
      );
      setTimeout(() => {
        dispatch(hideDownloadingProcessModal());
        dispatch(setDownloadingInModal(false));
        dispatch(resetDownloadTracking());
      }, 500);
    }
  }, [videosWithStatus, dispatch]); // Runs whenever videosWithStatus changes

  // Modal-based auto-download
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
        !showLoader
      ) {
        const newVideos = videosWithStatus.filter(
          video =>
            video.status === 'NEW' &&
            video.id !== undefined &&
            video.id !== null &&
            (video.filepath || video.video_url),
        );

        if (newVideos.length > 0) {
          console.log(
            `[VideoListNew] Starting download for ${newVideos.length} videos`,
          );

          // Set download tracking
          dispatch(setTotalVideosToDownload(newVideos.length));
          dispatch(setDownloadingInModal(true));

          // Show modal
          dispatch(
            showDownloadingProcessModal({
              currentVideoName: newVideos[0].name,
              currentVideoProgress: 0,
              totalVideos: newVideos.length,
              completedVideos: 0,
            }),
          );

          const downloadManager = DownloadManager.getInstance();

          // Modal callback - real-time progress updates
          downloadManager.setModalCallback(
            (videoName, progress, totalVideos, completedVideos) => {
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

          // Status callback - handle completion/failure
          downloadManager.setStatusCallback(
            (videoId, status, localFilePath) => {
              dispatch(updateVideoStatus({ videoId, status }));

              if (status === 'DOWNLOADED') {
                dispatch(incrementVideosDownloaded());

                // Check actual video states after a small delay
                setTimeout(() => {
                  const currentState = AppStore.getState();
                  const { videosWithStatus: updatedVideos } =
                    currentState.videosStore;
                  const { downloadingProcessModal } = currentState.modalStore;

                  // Skip if modal is already hidden
                  if (!downloadingProcessModal.visible) {
                    console.log(
                      '[VideoListNew] ⏭️ Modal already hidden, skipping check',
                    );
                    return;
                  }

                  console.log('[VideoListNew] 🔍 CHECKING COMPLETION STATUS');
                  console.log(
                    '[VideoListNew] Total videos:',
                    updatedVideos.length,
                  );

                  // Count pending videos (NEW, FAILED, or DOWNLOADING)
                  const pendingVideos = updatedVideos.filter(
                    v =>
                      v.status === 'NEW' ||
                      v.status === 'FAILED' ||
                      v.status === 'DOWNLOADING',
                  );

                  // Count completed videos
                  const completedVideos = updatedVideos.filter(
                    v => v.status === 'DOWNLOADED',
                  ).length;

                  console.log('[VideoListNew] ✅ DOWNLOADED:', completedVideos);
                  console.log(
                    '[VideoListNew] ⏳ PENDING:',
                    pendingVideos.length,
                  );
                  console.log('[VideoListNew] Pending videos:', pendingVideos);

                  // Update modal with accurate count
                  dispatch(
                    updateDownloadingProcessModal({
                      completedVideos: completedVideos,
                    }),
                  );

                  console.log(
                    `[VideoListNew] 📊 Status - Pending: ${pendingVideos.length}, Completed: ${completedVideos}`,
                  );

                  // Hide modal if NO pending videos
                  if (pendingVideos.length === 0 && completedVideos > 0) {
                    console.log(
                      '[VideoListNew] ✨ ALL DOWNLOADS COMPLETE! HIDING MODAL...',
                    );

                    // Hide immediately
                    console.log(
                      '[VideoListNew] 🚫 Dispatching hideDownloadingProcessModal...',
                    );
                    dispatch(hideDownloadingProcessModal());
                    dispatch(setDownloadingInModal(false));
                    dispatch(resetDownloadTracking());
                  } else {
                    console.log(
                      '[VideoListNew] ⚠️ Still have pending videos, NOT hiding modal',
                    );
                  }
                }, 500); // Increased delay to ensure all status updates complete
              } else if (status === 'FAILED') {
                console.error(`[VideoListNew] Download failed: ${videoId}`);

                // Hide modal
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
                      setShowBottomWarning(false);
                      setShowLoader(true);
                      setTimeout(() => {
                        dispatch(fetchVideosThunk());
                      }, 500);
                    },
                    canCancel: true,
                  }),
                );
              }

              // Update current download
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
            console.error('[VideoListNew] Download error:', error);
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

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    if (!isOnline) return;

    setIsRefreshing(true);
    setShowLoader(true);

    try {
      setLastMergeKey('');
      setLastSyncKey('');
      dispatch(setSearchQuery(''));
      setShowBottomWarning(false);
      dispatch(resetApiVideosOnly());
      await dispatch(fetchVideosThunk()).unwrap();
      dispatch(loadLocalVideosThunk());
    } catch (error) {
      console.error('[VideoListNew] Refresh failed:', error);
      dispatch(loadLocalVideosThunk());
      setShowLoader(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [isOnline, dispatch]);

  // Search
  const handleSearch = useCallback(
    async query => {
      if (!isOnline) return;

      if (query.trim() === '') {
        dispatch(setSearchQuery(''));
        return;
      }

      try {
        await dispatch(searchVideosThunk(query)).unwrap();
      } catch (error) {
        console.error('[VideoListNew] Search failed:', error);
      }
    },
    [dispatch, isOnline],
  );

  // Bottom warning retry
  const handleBottomRetry = useCallback(() => {
    setShowBottomWarning(false);
    setShowLoader(true);
    setTimeout(() => {
      dispatch(fetchVideosThunk());
    }, 500);
  }, [dispatch]);

  // Show ErrorModal for API errors
  useEffect(() => {
    if (isError && errorMessage) {
      // Check if we have local videos directly from storage
      const hasLocalVideos = localVideos && Object.keys(localVideos).length > 0;
      const offlineVideoCount = hasLocalVideos
        ? Object.keys(localVideos).length
        : 0;

      // Set retry callback only (offline button just hides modal)
      setErrorModalRetryCallback(() => {
        dispatch(resetVideosState());
        setLastMergeKey('');
        setLastSyncKey('');
        setTimeout(() => {
          dispatch(fetchVideosThunk());
        }, 100);
      });

      // Show modal - offline button just hides it, videos show underneath
      dispatch(
        showErrorModal({
          title: 'ত্রুটি',
          message: errorMessage || 'ভিডিও লোড করতে ব্যর্থ',
          type: 'api_error',
          hasOfflineVideos: hasLocalVideos,
          offlineVideoCount: offlineVideoCount,
          canCancel: false,
        }),
      );
    }
  }, [isError, errorMessage, localVideos, dispatch]); // Render video list
  const renderVideoList = useCallback(() => {
    return (
      <View style={styles.container}>
        <VideoSearchBar
          onSearch={handleSearch}
          isSearching={isSearching}
          placeholder="Search videos by title (min 3 chars)..."
        />
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

  // Offline mode
  if (!isOnline) {
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

    return (
      <View style={styles.container}>
        <OfflineHeader downloadedCount={downloadedCount} />
        <VideoListRenderer
          videos={downloadedVideos}
          isOnline={isOnline}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        <DownloadingProcessModal />
      </View>
    );
  }

  // Loading state
  if (!isInitialized || (isLoading && videos.length === 0)) {
    return (
      <View style={styles.container}>
        <CustomLoader visible={true} />
      </View>
    );
  }

  // Error state - Show offline videos if available, otherwise empty view
  // The ErrorModal will show on top automatically via useEffect
  if (isError && errorMessage) {
    const hasOfflineVideos = localVideos && Object.keys(localVideos).length > 0;

    if (!hasOfflineVideos) {
      // No offline videos - show empty view (modal shows on top)
      return (
        <View style={styles.container}>
          <CustomLoader visible={false} />
        </View>
      );
    }

    // Has offline videos - show them!
    const offlineVideosList = Object.values(localVideos).map(video => ({
      ...video,
      status: 'DOWNLOADED',
    }));

    return (
      <>
        <View style={styles.container}>
          <OfflineHeader downloadedCount={offlineVideosList.length} />
          <VideoListRenderer
            videos={offlineVideosList}
            isOnline={false}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        </View>
        <ErrorModal />
        <DownloadingProcessModal />
      </>
    );
  }

  // Main render
  return (
    <>
      <View style={styles.container}>
        {renderVideoList()}

        {/* DEBUG BUTTON - Remove after fixing */}
        {__DEV__ && (
          <View
            style={{
              position: 'absolute',
              top: 100,
              right: 10,
              backgroundColor: 'rgba(255, 0, 0, 0.9)',
              padding: 8,
              borderRadius: 8,
              zIndex: 9999,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                const currentState = AppStore.getState();
                const { videosWithStatus: vids } = currentState.videosStore;
                const { downloadingProcessModal: modal } =
                  currentState.modalStore;

                console.log('========== 🔍 DEBUG STATE ==========');
                console.log('Modal visible:', modal.visible);
                console.log('Modal state:', modal);

                const pending = vids.filter(
                  v =>
                    v.status === 'NEW' ||
                    v.status === 'FAILED' ||
                    v.status === 'DOWNLOADING',
                );
                const downloaded = vids.filter(v => v.status === 'DOWNLOADED');

                console.log('Total videos:', vids.length);
                console.log('Pending:', pending.length);
                console.log('Downloaded:', downloaded.length);
                console.log('Pending details:', pending);
                console.log('====================================');
              }}
            >
              <Text
                style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}
              >
                DEBUG
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                console.log('🚫 FORCE HIDE MODAL (Manual)');
                dispatch(hideDownloadingProcessModal());
                dispatch(setDownloadingInModal(false));
                dispatch(resetDownloadTracking());
              }}
              style={{ marginTop: 5 }}
            >
              <Text
                style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}
              >
                HIDE
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <CustomLoader visible={showLoader} />
      <DownloadingProcessModal />
      <ErrorModal />

      {/* Floating Bottom Warning */}
      {showBottomWarning && pendingVideosCount > 0 && (
        <View style={styles.floatingBottomWarning}>
          <BottomButtonSectionWithText
            pendingCount={pendingVideosCount}
            onRetryPress={handleBottomRetry}
          />
        </View>
      )}
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
  floatingBottomWarning: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
});
