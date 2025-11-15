import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import useAppLanguage from '../Hooks/useAppLagnuage';
import { useAppStatus } from '../Hooks/useAppStatus';
import { useNetworkStatus } from '../Hooks/useNetworkStatus';
import DownloadManager from '../Service/DownloadManager';
import FileSystemService from '../Service/FileSystemService';
import * as VideoComparison from '../Utils/VideoComparison';

export default function VideoListNew() {
  const dispatch = useDispatch();
  const { isOnline } = useNetworkStatus();
  // const isOnline = false;
  const { appStatus } = useAppStatus();
  const { i18n } = useAppLanguage();

  const videosState = useSelector(state => state.videosStore);
  const appConfig = useSelector(state => state.appConfig);
  const downloadingProcessModal = useSelector(
    state => state.modalStore?.downloadingProcessModal,
  );

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
  const [showLoader, setShowLoader] = useState(false);
  const [showBottomWarning, setShowBottomWarning] = useState(false);
  const [pendingVideosCount, setPendingVideosCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs for tracking (prevents unnecessary re-renders)
  const lastMergeKeyRef = useRef('');
  const lastSyncKeyRef = useRef('');
  const isProcessingRef = useRef(false);
  const downloadManagerInitialized = useRef(false);

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

  // Memoized: Videos still being processed (NEW or DOWNLOADING)
  // FAILED videos are NOT pending - they need manual retry
  const processingVideos = useMemo(() => {
    return videosWithStatus.filter(
      v => v.status === 'NEW' || v.status === 'DOWNLOADING',
    );
  }, [videosWithStatus]);

  // Memoized: Failed videos (for retry button)
  const failedVideos = useMemo(() => {
    return videosWithStatus.filter(v => v.status === 'FAILED');
  }, [videosWithStatus]);

  // ====================
  // CONSOLIDATED COMPLETION CHECK
  // ====================
  const checkAndHideModalIfComplete = useCallback(() => {
    if (!downloadingProcessModal?.visible) {
      return;
    }

    if (!videosWithStatus || videosWithStatus.length === 0) {
      return;
    }

    // Only check NEW and DOWNLOADING (actively being processed)
    // FAILED videos should NOT prevent modal from hiding
    const stillProcessing = videosWithStatus.filter(
      v => v.status === 'NEW' || v.status === 'DOWNLOADING',
    );

    const completed = videosWithStatus.filter(v => v.status === 'DOWNLOADED');

    const failed = videosWithStatus.filter(v => v.status === 'FAILED');

    console.log(
      `[VideoListNew] 🔍 COMPLETION CHECK - Processing: ${stillProcessing.length}, Downloaded: ${completed.length}, Failed: ${failed.length}`,
    );

    // Hide modal when all NEW videos are either DOWNLOADED or FAILED
    // (No more NEW or DOWNLOADING status)
    if (
      stillProcessing.length === 0 &&
      (completed.length > 0 || failed.length > 0)
    ) {
      console.log('[VideoListNew] ✨ ALL DOWNLOADS COMPLETE! HIDING MODAL...');

      dispatch(hideDownloadingProcessModal());
      dispatch(setDownloadingInModal(false));
      dispatch(resetDownloadTracking());

      // Show bottom warning if there are failed videos
      if (failed.length > 0) {
        console.log(
          `[VideoListNew] ⚠️ ${failed.length} FAILED videos - showing retry button`,
        );
        setPendingVideosCount(failed.length);
        setShowBottomWarning(true);
      }
    }
  }, [videosWithStatus, downloadingProcessModal, dispatch]);

  // ====================
  // useEffect 1: App status logging
  // ====================
  useEffect(() => {
    if (appStatus) {
      console.log('[VideoListNew] App status changed:', appStatus);
    }
  }, [appStatus]);

  // ====================
  // useEffect 2: Initialize app
  // ====================
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

  // ====================
  // useEffect 3: Fetch API videos when online
  // ====================
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
  }, [isOnline, isInitialized, isLoading, videos.length, isError, dispatch]);

  // ====================
  // useEffect 4: Merge videos with local status
  // ====================
  useEffect(() => {
    const mergeVideos = async () => {
      const currentMergeKey = `${videos.length}-${
        Object.keys(localVideos || {}).length
      }-${videosWithStatus.length}`;

      if (currentMergeKey === lastMergeKeyRef.current) {
        return;
      }

      // OFFLINE MODE: Load local videos only
      if (
        !isOnline &&
        localVideos &&
        Object.keys(localVideos).length > 0 &&
        videosWithStatus.length === 0 &&
        !isProcessingRef.current
      ) {
        try {
          isProcessingRef.current = true;
          console.log('[VideoListNew] OFFLINE MODE - Loading local videos...');

          const localVideosList = Object.values(localVideos).map(video => ({
            ...video,
            status: 'DOWNLOADED',
          }));

          dispatch(setVideosWithStatus(localVideosList));
          lastMergeKeyRef.current = currentMergeKey;
          setShowLoader(false);
          console.log(
            `[VideoListNew] OFFLINE: Loaded ${localVideosList.length} local videos`,
          );
        } catch (error) {
          console.error('[VideoListNew] Offline merge error:', error);
          setShowLoader(false);
        } finally {
          isProcessingRef.current = false;
        }
        return;
      }

      // ONLINE MODE: Merge API videos with local status
      if (
        videos &&
        videos.length > 0 &&
        localVideos &&
        typeof localVideos === 'object' &&
        !isProcessingRef.current &&
        (videosWithStatus.length === 0 ||
          currentMergeKey !== lastMergeKeyRef.current)
      ) {
        try {
          isProcessingRef.current = true;
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
            lastMergeKeyRef.current = currentMergeKey;
            setShowLoader(false);
          } else {
            setShowLoader(false);
          }
        } catch (error) {
          console.error('[VideoListNew] Merge error:', error);
          setShowLoader(false);
        } finally {
          isProcessingRef.current = false;
        }
      }
    };

    mergeVideos();
  }, [videos, localVideos, videosWithStatus.length, isOnline, dispatch]);

  // ====================
  // useEffect 4.5: Check for FAILED videos on app load/merge complete
  // ====================
  useEffect(() => {
    // Only check after videos are merged and modal is NOT visible
    if (
      videosWithStatus &&
      videosWithStatus.length > 0 &&
      !downloadingProcessModal?.visible
    ) {
      const failedVids = videosWithStatus.filter(v => v.status === 'FAILED');

      if (failedVids.length > 0) {
        setPendingVideosCount(failedVids.length);
        setShowBottomWarning(true);
      } else {
        // No failed videos, hide warning if it was showing
        setShowBottomWarning(false);
      }
    }
  }, [videosWithStatus, downloadingProcessModal?.visible]);

  // ====================
  // useEffect 5: Server synchronization (2s delay)
  // ====================
  useEffect(() => {
    const performServerSync = async () => {
      const currentSyncKey = `${videos.length}-${videosWithStatus.length}`;

      if (currentSyncKey === lastSyncKeyRef.current) {
        return;
      }

      if (
        videos &&
        videos.length > 0 &&
        videosWithStatus &&
        videosWithStatus.length > 0 &&
        localVideos &&
        typeof localVideos === 'object' &&
        !isProcessingRef.current &&
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
          lastSyncKeyRef.current = currentSyncKey;
        } catch (error) {
          console.error('[VideoListNew] Server sync failed:', error);
        }
      }
    };

    const timeoutId = setTimeout(performServerSync, 2000);
    return () => clearTimeout(timeoutId);
  }, [videos, videosWithStatus, localVideos, isOnline, dispatch]);

  // ====================
  // useEffect 6: Periodic reload during downloads (3s interval)
  // ====================
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

  // ====================
  // useEffect 7: Backup completion check (monitors videosWithStatus changes)
  // ====================
  useEffect(() => {
    if (!downloadingProcessModal?.visible) {
      return;
    }

    if (!videosWithStatus || videosWithStatus.length === 0) {
      return;
    }

    // Only check NEW and DOWNLOADING (actively being processed)
    const stillProcessing = videosWithStatus.filter(
      v => v.status === 'NEW' || v.status === 'DOWNLOADING',
    );

    const completed = downloadedVideos.length;
    const failed = videosWithStatus.filter(v => v.status === 'FAILED').length;

    console.log(
      `[VideoListNew] 🔄 BACKUP CHECK - Processing: ${stillProcessing.length}, Downloaded: ${completed}, Failed: ${failed}`,
    );

    // If no videos still processing and modal is still visible, hide it
    if (stillProcessing.length === 0 && (completed > 0 || failed > 0)) {
      console.log(
        '[VideoListNew] 🚨 BACKUP CHECK TRIGGERED - Hiding modal now!',
      );

      setTimeout(() => {
        dispatch(hideDownloadingProcessModal());
        dispatch(setDownloadingInModal(false));
        dispatch(resetDownloadTracking());

        // Show bottom warning if there are failed videos
        if (failed > 0) {
          console.log(
            `[VideoListNew] ⚠️ ${failed} FAILED videos - showing retry button`,
          );
          setPendingVideosCount(failed);
          setShowBottomWarning(true);
        }
      }, 500);
    }
  }, [
    videosWithStatus,
    downloadingProcessModal,
    downloadedVideos.length,
    dispatch,
  ]);

  // ====================
  // useEffect 8: Setup download manager callbacks
  // ====================
  useEffect(() => {
    if (downloadManagerInitialized.current) {
      return;
    }

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

    // Status callback - handle completion/failure/pause
    downloadManager.setStatusCallback(
      (videoId, status, localFilePath, callbackErrorMessage) => {
        try {
          dispatch(updateVideoStatus({ videoId, status }));

          if (status === 'DOWNLOADED') {
            dispatch(incrementVideosDownloaded());

            // Check completion after a delay to ensure state updates
            setTimeout(() => {
              checkAndHideModalIfComplete();
            }, 500);
          } else if (status === 'PAUSED') {
            // Network loss - don't show error modal, just keep modal visible
            // Download will auto-resume when network returns
            console.warn(
              `[VideoListNew] Download paused for video ${videoId}: ${callbackErrorMessage}`,
            );

            // Keep modal visible, don't hide it
            // The toast notification will be shown from DownloadManager
          } else if (status === 'FAILED') {
            console.error(
              `[VideoListNew] Download failed: ${videoId} - ${callbackErrorMessage}`,
            );

            // Hide modal
            dispatch(hideDownloadingProcessModal());
            dispatch(setDownloadingInModal(false));

            // Show error modal with error message
            dispatch(
              showErrorModal({
                title: 'ডাউনলোড ব্যর্থ',
                message:
                  callbackErrorMessage || 'ডাউনলোড করার সময় সমস্যা হয়েছে।',
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
        } catch (error) {
          console.error('[VideoListNew] Error in status callback:', error);
        }
      },
    );

    downloadManagerInitialized.current = true;
  }, [dispatch, checkAndHideModalIfComplete]);

  // ====================
  // useEffect 9: Modal-based auto-download (1s delay)
  // ====================
  useEffect(() => {
    const triggerModalDownload = async () => {
      if (
        videosWithStatus &&
        videosWithStatus.length > 0 &&
        autoDownloadEnabled &&
        isOnline &&
        !currentDownload &&
        !isProcessingRef.current &&
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
  }, [
    videosWithStatus,
    autoDownloadEnabled,
    isOnline,
    currentDownload,
    isInitialized,
    showLoader,
    dispatch,
  ]);

  // ====================
  // useEffect 10: Show ErrorModal for API errors
  // ====================
  useEffect(() => {
    if (isError && errorMessage) {
      setShowLoader(false);

      const hasLocalVideos = localVideos && Object.keys(localVideos).length > 0;
      const offlineVideoCount = hasLocalVideos
        ? Object.keys(localVideos).length
        : 0;

      // Set retry callback
      setErrorModalRetryCallback(() => {
        dispatch(resetVideosState());
        lastMergeKeyRef.current = '';
        lastSyncKeyRef.current = '';
        setShowLoader(true);
        setTimeout(() => {
          dispatch(fetchVideosThunk());
        }, 100);
      });

      // Show modal
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
  }, [isError, errorMessage, localVideos, dispatch]);

  // ====================
  // HANDLERS
  // ====================
  const handleRefresh = useCallback(async () => {
    if (!isOnline) return;

    setIsRefreshing(true);
    setShowLoader(true);

    try {
      lastMergeKeyRef.current = '';
      lastSyncKeyRef.current = '';
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

  // Bottom warning retry - Retry FAILED videos
  const handleBottomRetry = useCallback(async () => {
    console.log('[VideoListNew] Retrying FAILED videos...');

    setShowBottomWarning(false);

    // Reset FAILED videos to NEW status
    const failedVids = videosWithStatus.filter(v => v.status === 'FAILED');

    if (failedVids.length > 0) {
      console.log(
        `[VideoListNew] Resetting ${failedVids.length} FAILED videos to NEW`,
      );

      // ✅ NEW: Delete partial files for all failed videos BEFORE retry
      console.log(
        '[VideoListNew] Cleaning up partial files from failed downloads...',
      );
      for (const video of failedVids) {
        try {
          const filePath = await FileSystemService.getVideoFilePath(
            video.id,
            'mp4',
          );
          const fileExists = await FileSystemService.checkFileExists(filePath);

          if (fileExists) {
            // Get file size to log
            try {
              const fileSizeBytes = await FileSystemService.getFileSize(
                filePath,
              );
              const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
              console.log(
                `[VideoListNew] Deleting partial file for video ${video.id} (${fileSizeMB}MB)`,
              );
            } catch (sizeErr) {
              console.warn(`[VideoListNew] Could not get file size:`, sizeErr);
            }

            // Delete the partial/corrupted file
            await FileSystemService.deleteVideoFile(filePath);
            console.log(
              `[VideoListNew] ✅ Deleted partial file for video ${video.id}`,
            );
          }
        } catch (error) {
          console.error(
            `[VideoListNew] Error cleaning up file for video ${video.id}:`,
            error,
          );
          // Continue with retry even if cleanup fails
        }
      }

      // Reset each failed video to NEW
      failedVids.forEach(video => {
        dispatch(updateVideoStatus({ videoId: video.id, status: 'NEW' }));
      });

      // Show modal
      dispatch(
        showDownloadingProcessModal({
          currentVideoName: failedVids[0].name,
          currentVideoProgress: 0,
          totalVideos: failedVids.length,
          completedVideos: 0,
        }),
      );

      // Start auto-download will pick them up automatically
      // (useEffect 9 will trigger when status changes to NEW)
    }
  }, [videosWithStatus, dispatch]);

  // ====================
  // RENDER HELPERS
  // ====================
  const renderVideoList = useCallback(() => {
    return (
      <View style={styles.container}>
        <VideoSearchBar
          onSearch={handleSearch}
          isSearching={isSearching}
          placeholder={i18n('type_video_name')}
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

  // ====================
  // CONDITIONAL RENDERS
  // ====================

  // Offline mode
  if (!isOnline) {
    // Only show loader if not initialized
    if (!isInitialized) {
      return (
        <View style={styles.container}>
          <CustomLoader visible={true} />
        </View>
      );
    }

    // Show downloaded videos (or empty state if none)
    return (
      <View style={styles.container}>
        {/* <View>
          <Button
            title="Refresh"
            onPress={() => {
              setIsOnline(!isOnline);
            }}
          />
        </View> */}
        <OfflineHeader downloadedCount={downloadedCount} />
        <VideoSearchBar
          onSearch={handleSearch}
          isSearching={isSearching}
          placeholder={i18n('type_video_name')}
        />
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

  // Error state - Show offline videos if available
  if (isError && errorMessage) {
    const hasOfflineVideos = localVideos && Object.keys(localVideos).length > 0;

    if (!hasOfflineVideos) {
      return (
        <View style={styles.container}>
          <CustomLoader visible={false} />
        </View>
      );
    }

    const offlineVideosList = Object.values(localVideos).map(video => ({
      ...video,
      status: 'DOWNLOADED',
    }));

    return (
      <>
        <View style={styles.container}>
          <VideoSearchBar
            onSearch={handleSearch}
            isSearching={isSearching}
            placeholder={i18n('type_video_name')}
          />
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

  // ====================
  // MAIN RENDER
  // ====================
  return (
    <>
      <View style={styles.container}>
        {/* <View>
          <Button
            title="Refresh"
            onPress={() => {
              setIsOnline(!isOnline);
            }}
          />
        </View> */}
        {renderVideoList()}

        {/* DEBUG BUTTON */}
        {/* {__DEV__ && (
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
                const processing = videosWithStatus.filter(
                  v => v.status === 'NEW' || v.status === 'DOWNLOADING',
                );
                const failed = videosWithStatus.filter(v => v.status === 'FAILED');

                console.log('========== 🔍 DEBUG STATE ==========');
                console.log('Modal visible:', downloadingProcessModal?.visible);
                console.log('Modal state:', downloadingProcessModal);
                console.log('Total videos:', videosWithStatus.length);
                console.log('Processing (NEW/DOWNLOADING):', processing.length);
                console.log('Downloaded:', downloadedVideos.length);
                console.log('Failed:', failed.length);
                console.log('Processing details:', processing);
                console.log('Failed details:', failed);
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
        )} */}
      </View>
      <CustomLoader visible={showLoader} />
      <DownloadingProcessModal />
      <ErrorModal />
      {/* Floating Bottom Warning */}
      {showBottomWarning && (
        <View style={styles.floatingBottomWarning}>
          <BottomButtonSectionWithText
            pendingCount={pendingVideosCount}
            onRetryPress={handleBottomRetry}
          />
        </View>
      )}
      {/* x
      <View style={styles.floatingBottomWarning}>
        <BottomButtonSectionWithText
          pendingCount={pendingVideosCount}
          onRetryPress={handleBottomRetry}
        />
      </View> */}
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
