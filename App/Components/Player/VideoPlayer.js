import Slider from '@react-native-community/slider';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import RNFS from 'react-native-fs';
import Orientation from 'react-native-orientation-locker';
import Video from 'react-native-video';
import { ThemeColors } from '../../AppTheme';
import { useAppLanguage } from '../../Hooks/useAppLagnuage';

export default function VideoPlayer({
  videoData,
  onFullscreenToggle,
  isFullscreen = false,
}) {
  const { i18n } = useAppLanguage();
  const videoRef = useRef(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideControlsTimeout = useRef(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [videoKey, setVideoKey] = useState(0);

  // Debug state changes
  useEffect(() => {
    // console.log('[VideoPlayer] State:', {
    //   isPlaying,
    //   currentTime: currentTime.toFixed(2),
    //   duration: duration.toFixed(2),
    //   isSeeking,
    //   isLoading,
    // });
  }, [isPlaying, currentTime, duration, isSeeking, isLoading]);

  // Extract video data
  const { name = '', localFilePath = '' } = videoData || {};

  // Video source validation with proper file:// handling
  const videoSource = useMemo(() => {
    if (!localFilePath) {
      console.warn('[VideoPlayer] No local file path provided');
      return null;
    }

    // Handle file:// prefix properly
    const uri = localFilePath.startsWith('file://')
      ? localFilePath
      : `file://${localFilePath}`;

    console.log('[VideoPlayer] Video source URI:', uri);
    return { uri };
  }, [localFilePath]);

  // Check file existence
  useEffect(() => {
    const checkFile = async () => {
      if (localFilePath) {
        try {
          // Remove file:// prefix if present for RNFS
          const cleanPath = localFilePath.replace('file://', '');
          const exists = await RNFS.exists(cleanPath);
          console.log('[VideoPlayer] File exists:', exists, 'at:', cleanPath);

          if (exists) {
            const stat = await RNFS.stat(cleanPath);
            console.log('[VideoPlayer] File size:', stat.size, 'bytes');
          } else {
            console.error('[VideoPlayer] File does not exist at path');
          }
        } catch (error) {
          console.error('[VideoPlayer] Error checking file:', error);
        }
      }
    };
    checkFile();
  }, [localFilePath]);

  // Auto-hide controls with proper cleanup
  const startHideControlsTimer = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }

    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 3000);
  }, [controlsOpacity]);

  // Show controls
  const showControlsTemp = useCallback(() => {
    setShowControls(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [controlsOpacity]);

  // Handle video tap - FIXED
  const handleVideoTap = useCallback(() => {
    setShowControls(prev => {
      if (!prev) {
        // Currently hidden, show them
        Animated.timing(controlsOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        return true;
      } else {
        // Currently visible, hide them
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
        return false;
      }
    });
  }, [controlsOpacity]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
    showControlsTemp();
  }, [showControlsTemp]);

  // Handle seek - FIXED with proper slider handling
  const handleSlidingStart = useCallback(() => {
    console.log('[VideoPlayer] Slider started');
    setIsSeeking(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
  }, []);

  const handleSeekChange = useCallback(value => {
    console.log('[VideoPlayer] Slider value changing:', value);
    setCurrentTime(value);
  }, []);

  const handleSlidingComplete = useCallback(
    value => {
      console.log('[VideoPlayer] Slider complete, seeking to:', value);
      if (videoRef.current && value >= 0 && value <= duration) {
        videoRef.current.seek(value);
        setCurrentTime(value);
      }
      setIsSeeking(false);
      showControlsTemp();
    },
    [duration, showControlsTemp],
  );

  // Handle fullscreen toggle with ROTATION
  const handleFullscreenToggle = useCallback(() => {
    const newFullscreenState = !isFullscreen;

    if (newFullscreenState) {
      // Entering fullscreen - lock to landscape
      Orientation.lockToLandscape();
    } else {
      // Exiting fullscreen - lock to portrait
      Orientation.lockToPortrait();
    }

    onFullscreenToggle(newFullscreenState);
    showControlsTemp();
  }, [isFullscreen, onFullscreenToggle, showControlsTemp]);

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    setIsMuted(prev => !prev);
    showControlsTemp();
  }, [showControlsTemp]);

  // Video event handlers
  const onLoad = useCallback(data => {
    console.log('[VideoPlayer] Video loaded successfully:', data);
    const videoDuration = data.duration || 0;
    setDuration(videoDuration);
    setCurrentTime(0); // Reset to start
    setIsLoading(false);
  }, []);

  const onProgress = useCallback(
    data => {
      // Only update if not seeking to prevent slider jumping
      if (!isSeeking && data && data.currentTime >= 0) {
        console.log('[VideoPlayer] Progress update:', data.currentTime);
        setCurrentTime(data.currentTime);
      }
    },
    [isSeeking],
  );

  const onEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.seek(0);
    }
    showControlsTemp();
    console.log('[VideoPlayer] Video ended');
  }, [showControlsTemp]);

  const onError = useCallback(
    error => {
      console.error(
        '[VideoPlayer] Video error:',
        JSON.stringify(error, null, 2),
      );
      setIsLoading(false);

      let errorMessage = 'Failed to load video. Please try again.';
      let errorTitle = 'Playback Error';

      if (error && error.error) {
        const errorStr = error.error.errorString?.toLowerCase() || '';
        const errorCode = error.error.errorCode || '';

        console.log('[VideoPlayer] Error details:', {
          errorString: error.error.errorString,
          errorCode: errorCode,
        });

        if (
          errorStr.includes('mediacodevideorenderer') ||
          errorStr.includes('decoding_failed') ||
          errorStr.includes('codec') ||
          errorCode.includes('24003')
        ) {
          errorTitle = 'Video Format Error';
          errorMessage =
            'This video format is not supported on your device. The video may need to be re-encoded to H.264 format.';
        } else if (errorStr.includes('network') || errorStr.includes('io')) {
          errorTitle = 'File Error';
          errorMessage =
            'Failed to load video file. The file may be corrupted.';
        }
      }

      Alert.alert(
        i18n('error') || errorTitle,
        i18n('video_playback_error') || errorMessage,
        [
          {
            text: i18n('retry') || 'Retry',
            onPress: () => {
              console.log('[VideoPlayer] Retrying video playback');
              setVideoKey(prev => prev + 1); // Force remount
              setIsLoading(true);
              setCurrentTime(0);
              setIsPlaying(false);
            },
          },
          { text: i18n('ok') || 'OK' },
        ],
      );
    },
    [i18n],
  );

  const formatTime = useCallback(seconds => {
    if (!seconds || seconds < 0 || !isFinite(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
      // Reset orientation when component unmounts
      Orientation.lockToPortrait();
    };
  }, []);

  // Start timer when playing
  useEffect(() => {
    if (isPlaying && showControls) {
      startHideControlsTimer();
    }
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [isPlaying, showControls, startHideControlsTimer]);

  if (!videoSource) {
    return (
      <View
        style={[styles.container, isFullscreen && styles.fullscreenContainer]}
      >
        <Text style={styles.errorText}>
          {i18n('no_video_source') || 'No video source available'}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, isFullscreen && styles.fullscreenContainer]}
    >
      <TouchableWithoutFeedback onPress={handleVideoTap}>
        <View style={styles.videoContainer}>
          <Video
            key={videoKey}
            ref={videoRef}
            source={videoSource}
            style={styles.video}
            resizeMode="contain"
            paused={!isPlaying}
            volume={isMuted ? 0 : 1.0}
            onLoad={onLoad}
            onProgress={onProgress}
            onEnd={onEnd}
            onError={onError}
            progressUpdateInterval={250}
            onLoadStart={() => {
              console.log('[VideoPlayer] Video load started');
              setIsLoading(true);
            }}
            onReadyForDisplay={() => {
              console.log('[VideoPlayer] Video ready for display');
            }}
            onPlaybackStateChanged={state => {
              console.log('[VideoPlayer] Playback state changed:', state);
            }}
            playWhenInactive={false}
            playInBackground={false}
            allowsExternalPlayback={false}
            hideShutterView={true}
            disableFocus={true}
            ignoreSilentSwitch="ignore"
            mixWithOthers="mix"
            useTextureView={true}
            bufferConfig={{
              minBufferMs: 2000,
              maxBufferMs: 5000,
              bufferForPlaybackMs: 1000,
              bufferForPlaybackAfterRebufferMs: 1500,
            }}
            controls={false}
            reportBandwidth={true}
            selectedVideoTrack={{
              type: 'auto',
            }}
          />

          {/* Loading overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>
                {i18n('loading') || 'Loading'}...
              </Text>
            </View>
          )}

          {/* Debug info in development */}
          {/* {__DEV__ && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                Time: {formatTime(currentTime)} / {formatTime(duration)}
              </Text>
              <Text style={styles.debugText}>
                Raw: {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
              </Text>
              <Text style={styles.debugText}>
                Seeking: {isSeeking ? 'YES' : 'NO'} | Playing:{' '}
                {isPlaying ? 'YES' : 'NO'}
              </Text>
            </View>
          )} */}

          {/* Controls overlay - ALWAYS can receive touches */}
          <Animated.View
            style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
          >
            {/* Top controls */}
            <View style={styles.topControls}>
              <Text style={styles.videoTitle} numberOfLines={1}>
                {name}
              </Text>
              <TouchableOpacity
                style={styles.fullscreenButton}
                onPress={handleFullscreenToggle}
              >
                <Text style={styles.buttonText}>
                  {isFullscreen ? '⤢' : '⤡'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Center play/pause button */}
            <View style={styles.centerControls}>
              <TouchableOpacity
                style={styles.playPauseButton}
                onPress={handlePlayPause}
              >
                <Text style={styles.playPauseText}>
                  {isPlaying ? '⏸' : '▶'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bottom controls */}
            <View style={styles.bottomControls}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

              <Slider
                style={styles.progressSlider}
                minimumValue={0}
                maximumValue={duration > 0 ? duration : 1}
                value={currentTime >= 0 ? currentTime : 0}
                onSlidingStart={handleSlidingStart}
                onValueChange={handleSeekChange}
                onSlidingComplete={handleSlidingComplete}
                minimumTrackTintColor={ThemeColors.colorPrimary || '#007AFF'}
                maximumTrackTintColor="rgba(255,255,255,0.3)"
                thumbTintColor={ThemeColors.colorWhite}
                disabled={duration <= 0 || isLoading}
              />

              <Text style={styles.timeText}>{formatTime(duration)}</Text>

              <TouchableOpacity
                style={styles.muteButton}
                onPress={handleMuteToggle}
              >
                <Text style={styles.buttonText}>{isMuted ? '🔇' : '🔊'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: ThemeColors.colorBlack,
    aspectRatio: 16 / 9,
  },
  fullscreenContainer: {
    flex: 1,
    aspectRatio: undefined,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: ThemeColors.colorWhite,
    fontSize: 16,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  videoTitle: {
    flex: 1,
    color: ThemeColors.colorWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullscreenButton: {
    padding: 8,
    marginLeft: 12,
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseText: {
    color: ThemeColors.colorWhite,
    fontSize: 32,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
  },
  timeText: {
    color: ThemeColors.colorWhite,
    fontSize: 14,
    minWidth: 45,
    textAlign: 'center',
  },
  progressSlider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  muteButton: {
    padding: 8,
    marginLeft: 8,
  },
  buttonText: {
    color: ThemeColors.colorWhite,
    fontSize: 20,
  },
  errorText: {
    color: ThemeColors.colorWhite,
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  debugInfo: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 8,
    borderRadius: 4,
  },
  debugText: {
    color: '#00ff00',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
