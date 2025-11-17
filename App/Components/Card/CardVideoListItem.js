import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Collapsible from 'react-native-collapsible';
import { useSelector } from 'react-redux';
import {
  ArrowIconDownWhite,
  ArrowIconUp,
  PlayButtonIcon,
} from '../../AppAssets/SvgLogos';
import { H4, TextPrimary, ThemeColors } from '../../AppTheme';
import useAppLanguage from '../../Hooks/useAppLagnuage';
import { UtilityFunctions } from '../../UtilityFunctions/UtilityFunctions';
import ButtonSquare from '../Button/ButtonSquare';
import { Chip, ChipWarning } from '../Chip/Chip';

export default function CardVideoListItem({ cardItem, index = 0 }) {
  const navigation = useNavigation();
  const { i18n } = useAppLanguage();

  // State for expand/collapse
  const [collapsed, setCollapsed] = useState(true);

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
    // downloadProgress = 0,
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

  // Handle navigation to video details page
  const handleVideoPress = () => {
    // Only allow navigation if video is downloaded
    if (status !== 'DOWNLOADED') {
      Alert.alert(
        i18n('video_not_available') || 'Video Not Available',
        i18n('video_not_downloaded') ||
        'This video is not downloaded yet. Please download it first to play.',
        [{ text: i18n('ok') || 'OK' }],
      );
      return;
    }

    // Navigate to video details with video data
    navigation.navigate('VideoDetails', {
      videoData: cardItem,
    });
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
      default:
        return null;
    }
  };

  const renderMiddleSection = () => {
    return (
      <View style={styles.middleSection}>
        <H4
          textStyle={{
            fontWeight: !collapsed ? '600' : 'normal',
            color: ThemeColors.text,
            // color: !collapsed && ThemeColors.colorWhite,
          }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
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

  let renderFailedDownloadOverlay = () => {
    if (status == 'FAILED') {
      return (
        <View style={styles.overlayContainer}>
          <Text style={styles.overlayText}>
            {i18n('download_failed') || 'Download Failed'}
          </Text>
        </View>
      );
    }
  };

  const renderMainContent = () => {
    const palette = ['#FDE68A', '#BFDBFE', '#C7F9CC', '#E9D5FF', '#FECACA', '#BAE6FD'];
    const accentPalette = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#0EA5E9'];
    const bgColor = palette[index % palette.length];
    const accentColor = accentPalette[index % accentPalette.length];
    return (
      <TouchableOpacity
        style={[
          styles.cardContainer,
          status === 'FAILED' && styles.failedCardContainer,
          isCurrentlyDownloading && styles.downloadingCardContainer,
          { backgroundColor: bgColor },
          // !collapsed && {
          //   borderColor: ThemeColors.colorPrimary,
          //   borderWidth: 2,
          // },
        ]}
        onPress={() => {
          handleVideoPress();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />
        <View style={styles.leftIconHolder}>
          <PlayButtonIcon />
        </View>
        {renderMiddleSection()}
        <ButtonSquare
          logo={!collapsed ? <ArrowIconUp /> : <ArrowIconDownWhite />}
          onPress={() => setCollapsed(!collapsed)}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.itemContainer}>
      {renderMainContent()}
      {renderFailedDownloadOverlay()}
      {/* {renderDownloadingOverlay()} */}
    </View>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#C9D2C0',
    borderRadius: 16,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
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
  accentStrip: {
    width: 6,
    alignSelf: 'stretch',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    marginRight: 10,
  },
  middleSection: {
    // backgroundColor: 'red',
    flex: 1,
    paddingHorizontal: 8,
  },
  leftIconHolder: {
    width: 15,
    height: 15,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    marginLeft: 13
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

  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(172, 57, 57, 0.75)',
    // Match the card's radius so corners don't show square overlays
    borderRadius: 16,
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
