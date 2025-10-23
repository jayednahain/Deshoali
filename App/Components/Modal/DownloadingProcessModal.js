import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { ThemeColors } from '../../AppTheme';
import { selectDownloadingProcessModal } from '../../Features/Modal/modalSlice';

/**
 * DownloadingProcessModal - Shows download progress
 * Cannot be closed by user during downloads
 *
 * Displays:
 * - Current video name
 * - Single file progress (0-100%)
 * - Total progress (X/Y videos)
 * - Warning messages
 */
const DownloadingProcessModal = () => {
  const modalState = useSelector(selectDownloadingProcessModal);

  const {
    visible,
    currentVideoName,
    currentVideoProgress,
    totalVideos,
    completedVideos,
  } = modalState;

  // Debug logging
  useEffect(() => {
    console.log('[DownloadingProcessModal] 👁️ Visibility changed:', {
      visible,
      completedVideos,
      totalVideos,
      currentVideoName,
    });
  }, [visible, completedVideos, totalVideos, currentVideoName]);

  if (!visible) {
    console.log(
      '[DownloadingProcessModal] ❌ Modal is HIDDEN - returning null',
    );
    return null;
  }

  console.log('[DownloadingProcessModal] ✅ Modal is VISIBLE - rendering');

  const nextVideoNumber = completedVideos + 1; // Currently downloading video number
  const progressPercentage = Math.round(currentVideoProgress || 0);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        // Prevent closing - user cannot dismiss during downloads
        console.log('[DownloadingProcessModal] Cannot close during download');
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Modal Title */}
          <Text style={styles.title}>ডাউনলোড হচ্ছে</Text>

          {/* Warning Message */}
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>ইন্টারনেট সংযোগ চালু রাখুন !</Text>
            <Text style={styles.warningText}>
              অনুগ্রহ পূর্বক মোবাইল এপ কার্যক্রম চালু রাখুন !
            </Text>
          </View>

          {/* Total Progress: X/Y */}
          <View style={styles.totalProgressContainer}>
            <Text style={styles.totalProgressText}>
              {completedVideos}/{totalVideos}
            </Text>
            <Text style={styles.totalProgressLabel}>ভিডিও ডাউনলোড সম্পন্ন</Text>
          </View>

          {/* Current Video Info */}
          <View style={styles.currentVideoContainer}>
            <Text style={styles.currentVideoLabel}>
              বর্তমান ভিডিও ({nextVideoNumber}/{totalVideos}):
            </Text>
            <Text style={styles.currentVideoName} numberOfLines={2}>
              {currentVideoName || 'Loading...'}
            </Text>
          </View>

          {/* Single File Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: ThemeColors.colorWhite,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ThemeColors.colorBlack,
    marginBottom: 16,
    textAlign: 'center',
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginVertical: 2,
  },
  totalProgressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  totalProgressText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: ThemeColors.colorPrimary || '#007AFF',
  },
  totalProgressLabel: {
    fontSize: 14,
    color: ThemeColors.colorGray,
    marginTop: 4,
  },
  currentVideoContainer: {
    width: '100%',
    marginBottom: 16,
  },
  currentVideoLabel: {
    fontSize: 12,
    color: ThemeColors.colorGray,
    marginBottom: 4,
  },
  currentVideoName: {
    fontSize: 16,
    fontWeight: '600',
    color: ThemeColors.colorBlack,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ThemeColors.colorPrimary || '#007AFF',
    borderRadius: 6,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: ThemeColors.colorBlack,
  },
});

export default DownloadingProcessModal;
