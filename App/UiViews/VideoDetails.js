import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemeColors } from '../AppTheme';
import VideoPlayer from '../Components/Player/VideoPlayer';
import { useAppLanguage } from '../Hooks/useAppLagnuage';

export default function VideoDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { i18n } = useAppLanguage();

  // Get video data from navigation params
  const { videoData } = route.params || {};

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Validate video data
  useEffect(() => {
    if (!videoData) {
      Alert.alert(
        i18n('error') || 'Error',
        i18n('invalid_video_data') || 'Invalid video data',
        [
          {
            text: i18n('ok') || 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
      return;
    }

    // Check if video is downloaded and can be played
    if (videoData.status !== 'DOWNLOADED') {
      Alert.alert(
        i18n('video_not_available') || 'Video Not Available',
        i18n('video_not_downloaded') ||
          'This video is not downloaded yet. Please download it first to play.',
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

  // Handle back button
  useEffect(() => {
    const backAction = () => {
      if (isFullscreen) {
        setIsFullscreen(false);
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
    setIsFullscreen(fullscreen);
  }, []);

  // Handle navigation back
  const handleGoBack = useCallback(() => {
    if (isFullscreen) {
      setIsFullscreen(false);
    } else {
      navigation.goBack();
    }
  }, [isFullscreen, navigation]);

  if (!videoData || videoData.status !== 'DOWNLOADED') {
    return null; // Will be handled by useEffect alerts
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
        backgroundColor={ThemeColors.colorBlack}
        barStyle="light-content"
      />

      {/* Header - Hide in fullscreen */}
      {!isFullscreen && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>
              ← {i18n('back') || 'Back'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {name}
          </Text>
        </View>
      )}

      {/* Video Player */}
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
      {!isFullscreen && (
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
          </View>
        </View>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: ThemeColors.colorPrimary || '#007AFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    color: ThemeColors.colorWhite,
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    color: ThemeColors.colorWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
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
});
