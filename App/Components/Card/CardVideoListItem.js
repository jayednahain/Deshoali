import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Collapsible from 'react-native-collapsible';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowIconDownWhite, PlayButtonIcon } from '../../AppAssets/SvgLogos';
import { H4, TextPrimary } from '../../AppTheme';
import { retryVideoDownloadThunk } from '../../Features/Videos/VideosSlice';
import useAppLanguage from '../../Hooks/useAppLagnuage';
import { UtilityFunctions } from '../../UtilityFunctions/UtilityFunctions';
import ButtonSquare from '../Button/ButtonSquare';
import { Chip, ChipWarning } from '../Chip/Chip';

export default function CardVideoListItem({ cardItem }) {
  const dispatch = useDispatch();
  const { i18n } = useAppLanguage();

  // State for expand/collapse
  const [collapsed, setCollapsed] = useState(true);

  // Get current download from Redux to check if this video is currently downloading
  const currentDownload = useSelector(
    state => state.videosStore?.currentDownload,
  );

  const {
    id = null,
    name = '',
    filesize = 0,
    file_duration = 0,
    description = '',
    status = 'NEW',
    downloadProgress = 0,
    filepath = '',
    video_url = '', // Fallback for legacy support
  } = cardItem || {};

  // Validate video data
  if (id === null || id === undefined || !name) {
    console.warn('[CardVideoListItem] Invalid card item:', cardItem);
    return null;
  }

  // Check if this video is currently being downloaded
  const isCurrentlyDownloading = currentDownload === id;

  // Handle retry download - keep external as user specified
  const handleRetryDownload = () => {
    if (status !== 'FAILED') {
      console.warn(
        '[CardVideoListItem] Cannot retry - video status is not FAILED:',
        status,
      );
      return;
    }

    // Check if video has download path (filepath from API or video_url as fallback)
    if (!filepath && !video_url) {
      Alert.alert(
        i18n('error') || 'Error',
        i18n('video_path_missing') ||
          'Video file path is missing. Cannot retry download.',
        [{ text: i18n('ok') || 'OK' }],
      );
      return;
    }

    Alert.alert(
      i18n('retry_download') || 'Retry Download',
      i18n('retry_download_confirm') ||
        `Do you want to retry downloading "${name}"?`,
      [
        {
          text: i18n('cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: i18n('retry') || 'Retry',
          onPress: () => {
            console.log('[CardVideoListItem] Retrying download for video:', id);
            dispatch(retryVideoDownloadThunk(cardItem));
          },
        },
      ],
    );
  };

  // Render expanded description
  const renderCollapsedContent = () => {
    if (!description) return null;

    return (
      <Collapsible collapsed={collapsed} align="center">
        <TextPrimary textStyle={styles.descriptionText} ellipsizeMode="tail">
          {description}
        </TextPrimary>
      </Collapsible>
    );
  };

  // Render video duration chip
  const renderDuration = () => {
    if (!file_duration || file_duration <= 0) return null;

    const minutes = Math.floor(file_duration / 60);
    const seconds = Math.floor(file_duration % 60);
    const formattedTotalDuration = `${UtilityFunctions.getNumbersFromString(
      minutes,
    )}:${UtilityFunctions.getNumbersFromString(seconds, 2)}`;

    return <Chip text={formattedTotalDuration} />;
  };

  // Render file size chip
  const renderFileSize = () => {
    if (!filesize || filesize <= 0) return null;

    const readableFileSize = `${(filesize / (1024 * 1024)).toFixed(2)} MB`;
    return (
      <Chip text={UtilityFunctions.getNumbersFromString(readableFileSize)} />
    );
  };

  // Render status-based download chip
  const renderVideoDownloadStatus = () => {
    switch (status) {
      case 'NEW':
        return <ChipWarning text={i18n('new') || 'New'} />;

      case 'DOWNLOADING':
        const progressText = isCurrentlyDownloading
          ? `${Math.round(downloadProgress || 0)}%`
          : i18n('queued') || 'Queued';
        return <Chip text={progressText} style={styles.downloadingChip} />;

      case 'DOWNLOADED':
        return (
          <Chip
            text={i18n('downloaded') || 'Downloaded'}
            style={styles.downloadedChip}
          />
        );

      case 'FAILED':
        return (
          <TouchableOpacity
            onPress={handleRetryDownload}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>{i18n('retry') || 'Retry'}</Text>
          </TouchableOpacity>
        );

      default:
        return <ChipWarning text={status} />;
    }
  };

  // Render middle section with video info
  const renderMiddleSection = () => {
    return (
      <View style={styles.middleSection}>
        <H4 numberOfLines={2} ellipsizeMode="tail">
          {name}
        </H4>
        {renderCollapsedContent()}
        <View style={styles.chipContainer}>
          {renderDuration()}
          {renderFileSize()}
          {renderVideoDownloadStatus()}
        </View>
      </View>
    );
  };

  // Render main card content
  const renderMainContent = () => {
    return (
      <TouchableOpacity
        style={[
          styles.cardContainer,
          status === 'FAILED' && styles.failedCardContainer,
          isCurrentlyDownloading && styles.downloadingCardContainer,
        ]}
        onPress={() => {
          // dispatch(showErrorModal('rrrr', 'asdasddad'));
        }}
        activeOpacity={0.7}
      >
        <PlayButtonIcon />
        {renderMiddleSection()}
        <ButtonSquare
          logo={<ArrowIconDownWhite />}
          onPress={() => setCollapsed(!collapsed)}
        />
      </TouchableOpacity>
    );
  };

  // Render downloading overlay with progress
  const renderDownloadingOverlay = () => {
    if (!isCurrentlyDownloading) return null;

    const progress = Math.round(downloadProgress || 0);

    return (
      <View style={styles.overlayContainer}>
        <Text style={styles.overlayText}>
          {i18n('downloading') || 'Downloading'}...
        </Text>
        <Text style={styles.overlayProgress}>
          {UtilityFunctions.getFontSizeWithScale(progress)}%
        </Text>
        {progress > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.itemContainer}>
      {renderMainContent()}
      {renderDownloadingOverlay()}
    </View>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    marginBottom: 12,
  },
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#C9D2C0',
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  failedCardContainer: {
    backgroundColor: '#FFE6E6',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  downloadingCardContainer: {
    backgroundColor: '#E6F3FF',
    borderWidth: 1,
    borderColor: '#4DABF7',
  },
  middleSection: {
    // backgroundColor: 'red',
    width: '70%',
    paddingHorizontal: 8,
  },
  descriptionText: {
    marginVertical: 4,
  },
  chipContainer: {
    // backgroundColor: 'yellow',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  downloadingChip: {
    backgroundColor: '#4DABF7',
  },
  downloadedChip: {
    backgroundColor: '#51CF66',
  },
  retryButton: {
    // backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  overlayProgress: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  progressBarContainer: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4DABF7',
    borderRadius: 3,
  },
});
