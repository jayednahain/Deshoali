import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Video from 'react-native-video';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const VideoPlayerScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const videoRef = useRef(null);

  const { video, filePath, streamUrl, isLocal } = route.params;

  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume] = useState(1.0);

  const handleBackPress = useCallback(() => {
    if (fullscreen) {
      setFullscreen(false);
      return true;
    }
    navigation.goBack();
    return true;
  }, [fullscreen, navigation]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );
    return () => backHandler.remove();
  }, [fullscreen, navigation, handleBackPress]);

  useEffect(() => {
    // Hide controls after 3 seconds of inactivity
    const timer = setTimeout(() => {
      if (showControls && !paused) {
        setShowControls(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls, paused]);

  const handleLoad = data => {
    setDuration(data.duration);
    setLoading(false);
    setError(null);
  };

  const handleProgress = data => {
    setCurrentTime(data.currentTime);
  };

  const handleError = err => {
    console.error('Video player error:', err);
    setLoading(false);
    setError('Failed to load video. Please try again.');

    Alert.alert(
      'Playback Error',
      'Failed to load video. Please check your connection and try again.',
      [
        {
          text: 'Retry',
          onPress: () => {
            setError(null);
            setLoading(true);
          },
        },
        { text: 'Go Back', onPress: () => navigation.goBack() },
      ],
    );
  };

  const handleEnd = () => {
    setPaused(true);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.seek(0);
    }
  };

  const togglePlayPause = () => {
    setPaused(!paused);
  };

  const toggleMute = () => {
    setMuted(!muted);
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const seekTo = time => {
    if (videoRef.current) {
      videoRef.current.seek(time);
    }
  };

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoPress = () => {
    setShowControls(!showControls);
  };

  const renderVideoSource = () => {
    if (isLocal && filePath) {
      return { uri: `file://${filePath}` };
    } else if (streamUrl) {
      return { uri: streamUrl };
    }
    return null;
  };

  const videoSource = renderVideoSource();

  if (!videoSource) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Invalid video source</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, fullscreen && styles.fullscreenContainer]}>
      <StatusBar hidden={fullscreen} />

      <TouchableOpacity
        style={styles.videoContainer}
        onPress={handleVideoPress}
        activeOpacity={1}
      >
        <Video
          ref={videoRef}
          source={videoSource}
          style={[styles.video, fullscreen && styles.fullscreenVideo]}
          onLoad={handleLoad}
          onProgress={handleProgress}
          onError={handleError}
          onEnd={handleEnd}
          paused={paused}
          muted={muted}
          volume={volume}
          resizeMode="contain"
          progressUpdateInterval={1000}
        />

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {showControls && !loading && !error && (
          <View style={styles.controlsOverlay}>
            {/* Top Controls */}
            <View style={styles.topControls}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackPress}
              >
                <Text style={styles.controlText}>←</Text>
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <Text style={styles.videoTitle} numberOfLines={1}>
                  {video.title}
                </Text>
                <Text style={styles.videoSubtitle}>
                  {isLocal ? 'Downloaded' : 'Streaming'}
                </Text>
              </View>
            </View>

            {/* Center Controls */}
            <View style={styles.centerControls}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayPause}
              >
                <Text style={styles.playButtonText}>{paused ? '▶' : '⏸'}</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          duration > 0 ? (currentTime / duration) * 100 : 0
                        }%`,
                      },
                    ]}
                  />
                  <TouchableOpacity
                    style={[
                      styles.progressThumb,
                      {
                        left: `${
                          duration > 0 ? (currentTime / duration) * 100 : 0
                        }%`,
                      },
                    ]}
                    onPress={e => {
                      const { locationX } = e.nativeEvent;
                      const progressBarWidth = screenWidth - 120; // Approximate width
                      const seekTime =
                        (locationX / progressBarWidth) * duration;
                      seekTo(seekTime);
                    }}
                  />
                </View>

                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={toggleMute}
                >
                  <Text style={styles.controlText}>{muted ? '🔇' : '🔊'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={toggleFullscreen}
                >
                  <Text style={styles.controlText}>
                    {fullscreen ? '⤡' : '⤢'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {!fullscreen && (
        <View style={styles.videoInfo}>
          <Text style={styles.infoTitle}>{video.title}</Text>
          <Text style={styles.infoSubtitle}>{video.subtitle}</Text>
          <Text style={styles.infoDescription}>{video.description}</Text>

          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.statusText,
                isLocal ? styles.downloadedStatus : styles.streamingStatus,
              ]}
            >
              {isLocal ? '✓ Downloaded' : '📡 Streaming'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenVideo: {
    width: screenHeight,
    height: screenWidth,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  videoSubtitle: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  centerControls: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
  },
  bottomControls: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    top: -4,
    marginLeft: -6,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  videoInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  infoSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 12,
  },
  infoDescription: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 20,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  downloadedStatus: {
    color: '#4CAF50',
  },
  streamingStatus: {
    color: '#007AFF',
  },
});

export default VideoPlayerScreen;
