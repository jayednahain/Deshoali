import React from 'react';
import {
  BackHandler,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeColors } from '../../AppTheme';
import {
  hideStorageModal,
  selectStorageModal,
} from '../../Features/Modal/modalSlice';
import useAppLanguage from '../../Hooks/useAppLagnuage';

/**
 * StorageModal Component
 *
 * Displays insufficient storage warning modal
 *
 * Features:
 * - Shows available vs required storage space
 * - Exit app option for critical storage issues
 * - Storage tips and recommendations
 * - Multi-language support
 */

const StorageModal = () => {
  const dispatch = useDispatch();
  const { i18n } = useAppLanguage();
  const storageModal = useSelector(selectStorageModal);

  const {
    visible: isVisible,
    availableSpace,
    requiredSpace,
    canProceed,
  } = storageModal;

  // Handle dismiss (only for non-critical cases)
  const handleDismiss = React.useCallback(() => {
    console.log('[StorageModal] Dismiss button pressed');
    dispatch(hideStorageModal());
  }, [dispatch]);

  // Handle Android back button
  React.useEffect(() => {
    if (!isVisible) return;

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (canProceed) {
          handleDismiss();
        }
        return true; // Prevent default behavior
      },
    );

    return () => backHandler.remove();
  }, [isVisible, canProceed, handleDismiss]);

  // Format bytes to human readable format
  const formatStorage = bytes => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
  };

  // Calculate deficit
  const deficit = requiredSpace - availableSpace;
  const deficitFormatted = formatStorage(deficit * 1024); // Convert KB to bytes for formatting

  // Handle exit app
  const handleExitApp = () => {
    console.log(
      '[StorageModal] Exit app requested due to insufficient storage',
    );
    BackHandler.exitApp();
  };

  // Handle retry storage check
  const handleRetryCheck = () => {
    console.log('[StorageModal] Retry storage check requested');
    dispatch(hideStorageModal());
    // The parent component should handle re-checking storage
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={canProceed ? handleDismiss : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Storage Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.storageIcon}>💾</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {i18n('insufficient_storage') || 'Insufficient Storage'}
          </Text>

          {/* Storage Details */}
          <View style={styles.storageDetailsContainer}>
            <View style={styles.storageRow}>
              <Text style={styles.storageLabel}>
                {i18n('available') || 'Available'}:
              </Text>
              <Text style={styles.storageValue}>
                {formatStorage(availableSpace * 1024)}
              </Text>
            </View>

            <View style={styles.storageRow}>
              <Text style={styles.storageLabel}>
                {i18n('required') || 'Required'}:
              </Text>
              <Text style={styles.storageValue}>
                {formatStorage(requiredSpace * 1024)}
              </Text>
            </View>

            <View style={[styles.storageRow, styles.deficitRow]}>
              <Text style={styles.deficitLabel}>
                {i18n('need_to_free') || 'Need to free'}:
              </Text>
              <Text style={styles.deficitValue}>{deficitFormatted}</Text>
            </View>
          </View>

          {/* Message */}
          <Text style={styles.message}>
            {i18n('insufficient_storage_message') ||
              'Not enough storage space for video downloads. Please free up some space and try again.'}
          </Text>

          {/* Storage Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>
              {i18n('storage_tips') || 'Tips to free up space'}:
            </Text>
            <Text style={styles.tipText}>
              • {i18n('delete_unused_apps') || 'Delete unused apps'}
            </Text>
            <Text style={styles.tipText}>
              • {i18n('clear_cache') || 'Clear app cache and data'}
            </Text>
            <Text style={styles.tipText}>
              • {i18n('move_photos') || 'Move photos/videos to cloud storage'}
            </Text>
            <Text style={styles.tipText}>
              •{' '}
              {i18n('delete_old_downloads') || 'Delete old downloads and files'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {canProceed ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.dismissButton]}
                  onPress={handleDismiss}
                >
                  <Text style={styles.dismissButtonText}>
                    {i18n('continue_anyway') || 'Continue Anyway'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.retryButton]}
                  onPress={handleRetryCheck}
                >
                  <Text style={styles.retryButtonText}>
                    {i18n('check_again') || 'Check Again'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.retryButton]}
                  onPress={handleRetryCheck}
                >
                  <Text style={styles.retryButtonText}>
                    {i18n('check_again') || 'Check Again'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.exitButton]}
                  onPress={handleExitApp}
                >
                  <Text style={styles.exitButtonText}>
                    {i18n('exit_app') || 'Exit App'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: ThemeColors.colorWhite,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  storageIcon: {
    fontSize: 64,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
  storageDetailsContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deficitRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginBottom: 0,
  },
  storageLabel: {
    fontSize: 14,
    color: ThemeColors.colorBlack,
    fontWeight: '500',
  },
  storageValue: {
    fontSize: 14,
    color: ThemeColors.colorBlack,
    fontWeight: '600',
  },
  deficitLabel: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  deficitValue: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  message: {
    fontSize: 16,
    color: ThemeColors.colorBlack,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  dismissButton: {
    backgroundColor: ThemeColors.colorGray || '#E0E0E0',
    borderWidth: 1,
    borderColor: ThemeColors.colorGray || '#BDBDBD',
  },
  dismissButtonText: {
    color: ThemeColors.colorBlack,
    fontSize: 14,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: ThemeColors.colorPrimary || '#007AFF',
  },
  retryButtonText: {
    color: ThemeColors.colorWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  exitButton: {
    backgroundColor: '#FF6B6B',
  },
  exitButtonText: {
    color: ThemeColors.colorWhite,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StorageModal;
