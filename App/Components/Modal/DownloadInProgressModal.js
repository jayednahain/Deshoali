import React from 'react';
import {
  BackHandler,
  Dimensions,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeColors } from '../../AppTheme';
import { hideDownloadInProgressModal } from '../../Features/Modal/modalSlice';
import useAppLanguage from '../../Hooks/useAppLagnuage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DownloadInProgressModal = () => {
  const { i18n } = useAppLanguage();
  const dispatch = useDispatch();

  const modalState = useSelector(
    state => state.modalStore.downloadInProgressModal,
  );
  const { visible: isVisible } = modalState;

  const handleDismiss = React.useCallback(() => {
    console.log('[DownloadInProgressModal] Dismiss pressed');
    dispatch(hideDownloadInProgressModal());
  }, [dispatch]);

  const handleBackPress = React.useCallback(() => {
    if (isVisible) {
      handleDismiss();
      return true;
    }
    return false;
  }, [isVisible, handleDismiss]);

  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );
    return () => backHandler.remove();
  }, [handleBackPress]);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <StatusBar
        backgroundColor="rgba(0, 0, 0, 0.5)"
        barStyle="light-content"
      />
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        hardwareAccelerated={true}
        onRequestClose={handleBackPress}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {i18n('download_warning') || 'Download Warning'}
              </Text>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalMessage}>
                {i18n('download_active') || 'Video download is in progress'}
              </Text>

              <Text style={styles.submessage}>
                {i18n('download_in_progress_message') ||
                  'Please wait for the current download to complete before starting another.'}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handleDismiss}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  {i18n('ok') || 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: ThemeColors.background,
    borderRadius: 16,
    width: Math.min(screenWidth - 40, 400),
    maxHeight: screenHeight * 0.6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.border,
  },
  modalTitle: {
    color: ThemeColors.text,
    textAlign: 'center',
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flex: 1,
  },
  modalMessage: {
    lineHeight: 22,
    color: ThemeColors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  submessage: {
    lineHeight: 20,
    color: ThemeColors.textSecondary,
    textAlign: 'center',
  },
  modalActions: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: ThemeColors.border,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: ThemeColors.primary,
  },
  primaryButtonText: {
    color: ThemeColors.background,
  },
});

export default DownloadInProgressModal;
