import { useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Orientation from 'react-native-orientation-locker';
import { ThemeColors } from '../AppTheme';
import VideoPlayer from '../Components/Player/VideoPlayer';
import { useAppLanguage } from '../Hooks/useAppLagnuage';

export default function VideoDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { i18n } = useAppLanguage();

  const { videoData } = route.params || {};
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Enhanced video data validation
  useEffect(() => {
    if (!videoData) {
      console.warn('[VideoDetails] No video data provided');
      Alert.alert(
        i18n('error') || 'Error',
        i18n('invalid_video_data') ||
          'Invalid video data provided. Please try again.',
        [
          {
            text: i18n('ok') || 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
      return;
    }

    console.log('[VideoDetails] Video data:', {
      id: videoData.id,
      name: videoData.name,
      status: videoData.status,
      localFilePath: videoData.localFilePath,
    });

    if (videoData.status !== 'DOWNLOADED') {
      let errorMessage =
        'This video is not downloaded yet. Please download it first to play.';
      let errorTitle = 'Video Not Available';

      if (videoData.status === 'DOWNLOADING') {
        errorTitle = 'Download In Progress';
        errorMessage =
          'This video is currently downloading. Please wait for download to complete.';
      } else if (videoData.status === 'FAILED') {
        errorTitle = 'Download Failed';
        errorMessage = 'Video download failed. Please try downloading again.';
      }

      Alert.alert(
        i18n('video_not_available') || errorTitle,
        i18n('video_not_downloaded') || errorMessage,
        [
          {
            text: i18n('ok') || 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
      return;
    }

    if (!videoData.localFilePath) {
      console.warn(
        '[VideoDetails] Video marked as DOWNLOADED but no localFilePath',
      );
      Alert.alert(
        i18n('error') || 'Playback Error',
        i18n('video_file_missing') ||
          'Video file not found. Please try downloading again.',
        [
          {
            text: i18n('ok') || 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
      return;
    }
  }, [videoData, navigation, i18n]);

  // Initialize orientation to portrait on mount
  useEffect(() => {
    Orientation.lockToPortrait();

    return () => {
      // Ensure portrait mode when leaving screen
      Orientation.lockToPortrait();
    };
  }, []);

  // Handle back button with fullscreen support
  useEffect(() => {
    const backAction = () => {
      if (isFullscreen) {
        // Exit fullscreen and return to portrait
        setIsFullscreen(false);
        Orientation.lockToPortrait();
        return true; // Prevent default back action
      }
      return false; // Allow default back action
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, [isFullscreen]);

  // Handle fullscreen toggle
  const handleFullscreenToggle = useCallback(fullscreen => {
    console.log('[VideoDetails] Fullscreen toggle:', fullscreen);
    setIsFullscreen(fullscreen);
  }, []);

  // Handle navigation back
  const handleGoBack = useCallback(() => {
    console.log('[VideoDetails] Back pressed, fullscreen:', isFullscreen);
    if (isFullscreen) {
      setIsFullscreen(false);
      Orientation.lockToPortrait();
    } else {
      navigation.goBack();
    }
  }, [isFullscreen, navigation]);

  // Validation fallback UI
  if (
    !videoData ||
    videoData.status !== 'DOWNLOADED' ||
    !videoData.localFilePath
  ) {
    return (
      <View style={styles.container}>
        <StatusBar
          backgroundColor="#6D28D9"
          barStyle="light-content"
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {i18n('video_loading_error') ||
              'Unable to load video. Please try again.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>
              {i18n('go_back') || 'Go Back'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const {
    name = '',
    description = '',
    filesize = 0,
    file_duration = 0,
  } = videoData;

  return (
    <View
      style={[styles.container, isFullscreen && styles.fullscreenContainer]}
    >
      <StatusBar
        hidden={isFullscreen}
        backgroundColor={isFullscreen ? ThemeColors.colorBlack : ThemeColors.colorPrimary}
        barStyle="light-content"
      />

      {/* Header - Hide in fullscreen */}
      {!isFullscreen && (
        <View style={styles.header}>
          {/* Decorative subtle overlay for flair */}
          <View style={styles.headerDecor} />
          <View style={styles.headerInner}>
            <TouchableOpacity
              style={styles.backPill}
              onPress={handleGoBack}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.backIcon}>‹</Text>
              <Text style={styles.backLabel}>{i18n('back') || 'Back'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {name}
            </Text>
            {/* Spacer to keep title perfectly centered */}
            <View style={styles.headerRightSpacer} />
          </View>
        </View>
      )}

      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: ThemeColors.colorBlack,
        }}
      >
        {/* Video Player Container */}
        <View
          style={[
            styles.playerContainer,
            isFullscreen && styles.fullscreenPlayer,
          ]}
        >
          <VideoPlayer
            videoData={videoData}
            onFullscreenToggle={handleFullscreenToggle}
            isFullscreen={isFullscreen}
          />
        </View>

        {/* Video Information - Hide in fullscreen */}
        {/* {!isFullscreen && (
        <View style={styles.infoContainer}>
          <Text style={styles.videoTitle}>{name}</Text>

          {description ? (
            <Text style={styles.videoDescription}>{description}</Text>
          ) : null}

          <View style={styles.metaInfo}>
            <Text style={styles.metaText}>
              {i18n('duration') || 'Duration'}: {Math.floor(file_duration / 60)}
              :{(file_duration % 60).toString().padStart(2, '0')}
            </Text>
            <Text style={styles.metaText}>
              {i18n('size') || 'Size'}: {(filesize / (1024 * 1024)).toFixed(1)}{' '}
              MB
            </Text>
            <Text style={styles.metaText}>
              {i18n('status') || 'Status'}: {videoData.status}
            </Text>
            {videoData.filetype && (
              <Text style={styles.metaText}>
                {i18n('format') || 'Format'}: {videoData.filetype}
              </Text>
            )}
            {videoData.downloadedAt && (
              <Text style={styles.metaText}>
                {i18n('downloaded') || 'Downloaded'}:{' '}
                {new Date(videoData.downloadedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      )} */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.colorWhite,
  },
  fullscreenContainer: {
    backgroundColor: ThemeColors.colorBlack,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: ThemeColors.colorPrimary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    position: 'relative',
  },
  headerDecor: {
    position: 'absolute',
    right: -30,
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#10B981', // soft coral halo
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backPill: {
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#07b881',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 22,
    elevation: 3,
    shadowColor: '#6a6a6a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  backIcon: {
    color: ThemeColors.colorWhite,
    fontSize: 18,
    marginTop: -1, // optical alignment
    alignItems: 'center',
  },
  backLabel: {
    color: ThemeColors.colorWhite,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerTitle: {
    flex: 1,
    color: ThemeColors.colorWhite,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerRightSpacer: { width: 90 },
  playerContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: ThemeColors.colorBlack,
  },
  fullscreenPlayer: {
    flex: 1,
    aspectRatio: undefined,
  },
  infoContainer: {
    flex: 1,
    padding: 16,
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: ThemeColors.colorBlack,
    marginBottom: 12,
  },
  videoDescription: {
    fontSize: 16,
    color: ThemeColors.colorGray,
    lineHeight: 24,
    marginBottom: 16,
  },
  metaInfo: {
    borderTopWidth: 1,
    borderTopColor: ThemeColors.colorLightGray || '#E0E0E0',
    paddingTop: 16,
  },
  metaText: {
    fontSize: 14,
    color: ThemeColors.colorGray,
    marginBottom: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: ThemeColors.colorRed || '#FF0000',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: ThemeColors.colorPrimary || '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: ThemeColors.colorWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
