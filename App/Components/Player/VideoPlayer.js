import Slider from '@react-native-community/slider';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const [volume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  // Extract video data
  const { name = '', localFilePath = '' } = videoData || {};

  // Debug logging
  console.log('[VideoPlayer] Video data:', JSON.stringify(videoData, null, 2));
  console.log('[VideoPlayer] Local file path:', localFilePath);

  // Check file existence
  useEffect(() => {
    const checkFile = async () => {
      if (localFilePath) {
        try {
          const exists = await RNFS.exists(localFilePath);
          console.log('[VideoPlayer] File exists:', exists);
          console.log('[VideoPlayer] Checking path:', localFilePath);

          if (exists) {
            const stat = await RNFS.stat(localFilePath);
            console.log('[VideoPlayer] File stat:', stat);
          }
        } catch (error) {
          console.error('[VideoPlayer] Error checking file:', error);
        }
      }
    };
    checkFile();
  }, [localFilePath]);

  // Validate video source - Add file:// prefix for Android compatibility
  const videoSource = localFilePath ? { uri: `file://${localFilePath}` } : null;
  console.log('[VideoPlayer] Video source:', videoSource);

  // Auto-hide controls
  const startHideControlsTimer = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }

    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }, 3000);
  }, [isPlaying, controlsOpacity]);

  // Show controls
  const showControlsTemp = useCallback(() => {
    setShowControls(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    startHideControlsTimer();
  }, [controlsOpacity, startHideControlsTimer]);

  // Handle video tap
  const handleVideoTap = useCallback(() => {
    if (showControls) {
      setShowControls(false);
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      showControlsTemp();
    }
  }, [showControls, controlsOpacity, showControlsTemp]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
    showControlsTemp();
  }, [isPlaying, showControlsTemp]);

  // Handle seek
  const handleSeek = useCallback(
    value => {
      if (videoRef.current) {
        videoRef.current.seek(value);
        setCurrentTime(value);
      }
      showControlsTemp();
    },
    [showControlsTemp],
  );

  // Handle fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    onFullscreenToggle(!isFullscreen);
    showControlsTemp();
  }, [isFullscreen, onFullscreenToggle, showControlsTemp]);

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    setIsMuted(!isMuted);
    showControlsTemp();
  }, [isMuted, showControlsTemp]);

  // Video event handlers
  const onLoad = useCallback(data => {
    setDuration(data.duration);
    setIsLoading(false);
    console.log('[VideoPlayer] Video loaded:', data);
  }, []);

  const onProgress = useCallback(data => {
    setCurrentTime(data.currentTime);
  }, []);

  const onEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    // Reset video to beginning
    if (videoRef.current) {
      videoRef.current.seek(0);
    }
    showControlsTemp();
    console.log('[VideoPlayer] Video ended');
  }, [showControlsTemp]);

  const onError = useCallback(
    error => {
      console.error('[VideoPlayer] Video error:', error);
      setIsLoading(false);

      Alert.alert(
        i18n('error') || 'Playback Error',
        i18n('video_playback_error') ||
          'Failed to load video. This could be due to unsupported format or corrupted file.',
        [
          {
            text: i18n('retry') || 'Retry',
            onPress: () => {
              setIsLoading(true);
              // Force reload by resetting video component
              if (videoRef.current) {
                videoRef.current.seek(0);
              }
            },
          },
          { text: i18n('ok') || 'OK' },
        ],
      );
    },
    [i18n],
  );

  // Format time
  const formatTime = useCallback(seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  // Start timer when playing
  useEffect(() => {
    if (isPlaying && showControls) {
      startHideControlsTimer();
    } else if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
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
            ref={videoRef}
            source={videoSource}
            style={styles.video}
            resizeMode="contain"
            paused={!isPlaying}
            volume={isMuted ? 0 : volume}
            onLoad={onLoad}
            onProgress={onProgress}
            onEnd={onEnd}
            onError={onError}
            progressUpdateInterval={1000}
            // Performance optimizations
            playWhenInactive={false}
            playInBackground={false}
            allowsExternalPlayback={false}
            // Android specific optimizations
            hideShutterView={true}
            disableFocus={true}
            // Audio handling
            ignoreSilentSwitch="ignore"
            mixWithOthers="mix"
          />

          {/* Loading overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>
                {i18n('loading') || 'Loading'}...
              </Text>
            </View>
          )}

          {/* Controls overlay */}
          <Animated.View
            style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
            pointerEvents={showControls ? 'auto' : 'none'}
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
                maximumValue={duration}
                value={currentTime}
                onValueChange={handleSeek}
                minimumTrackTintColor={ThemeColors.colorPrimary || '#007AFF'}
                maximumTrackTintColor="rgba(255,255,255,0.3)"
                thumbStyle={styles.sliderThumb}
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
  sliderThumb: {
    backgroundColor: ThemeColors.colorWhite,
    width: 16,
    height: 16,
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
});
