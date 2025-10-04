import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DOWNLOAD_STATUS } from '../service/downloadManager';

const VideoCard = ({
  video,
  downloadStatus,
  onPress,
  onDownload,
  isOffline = false,
}) => {
  const videoId = video.id || video.title;
  const status = downloadStatus[videoId];

  const getStatusDisplay = () => {
    if (!status) {
      return { text: 'Pending', color: '#666', showProgress: false };
    }

    switch (status.status) {
      case DOWNLOAD_STATUS.PENDING:
        return { text: 'Pending', color: '#666', showProgress: false };
      case DOWNLOAD_STATUS.DOWNLOADING:
        return {
          text: `${status.progress || 0}%`,
          color: '#007AFF',
          showProgress: true,
        };
      case DOWNLOAD_STATUS.COMPLETED:
        return { text: 'Downloaded', color: '#4CAF50', showProgress: false };
      case DOWNLOAD_STATUS.FAILED:
        return { text: 'Failed', color: '#F44336', showProgress: false };
      case DOWNLOAD_STATUS.PAUSED:
        return { text: 'Paused', color: '#FF9800', showProgress: false };
      default:
        return { text: 'Pending', color: '#666', showProgress: false };
    }
  };

  const statusInfo = getStatusDisplay();
  const isDownloaded = status?.status === DOWNLOAD_STATUS.COMPLETED;
  const isDownloading = status?.status === DOWNLOAD_STATUS.DOWNLOADING;
  const canPlay = isDownloaded || (!isOffline && video.sources?.[0]);

  const handlePress = () => {
    if (canPlay && onPress) {
      onPress(video, status);
    }
  };

  const handleDownloadPress = () => {
    if (!isDownloaded && !isDownloading && onDownload) {
      onDownload(video);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, !canPlay && styles.disabledCard]}
      onPress={handlePress}
      disabled={!canPlay}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: video.thumb }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        {isOffline && !isDownloaded && (
          <View style={styles.offlineOverlay}>
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
        {isDownloaded && (
          <View style={styles.downloadedBadge}>
            <Text style={styles.downloadedText}>✓</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {video.title}
        </Text>

        <Text style={styles.subtitle} numberOfLines={1}>
          {video.subtitle}
        </Text>

        <Text style={styles.description} numberOfLines={3}>
          {video.description}
        </Text>

        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>

            {isDownloading && (
              <ActivityIndicator
                size="small"
                color="#007AFF"
                style={styles.loadingIndicator}
              />
            )}
          </View>

          {statusInfo.showProgress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${status.progress || 0}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {!isDownloaded && !isDownloading && (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={handleDownloadPress}
            >
              <Text style={styles.downloadButtonText}>Download</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  disabledCard: {
    opacity: 0.6,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  offlineOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  downloadedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    marginBottom: 12,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  downloadButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default VideoCard;
