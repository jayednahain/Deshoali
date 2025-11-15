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
  hideInternetErrorModal,
  selectInternetErrorModal,
} from '../../Features/Modal/modalSlice';
import { useNetworkStatus } from '../../Hooks/useNetworkStatus';

// Global callback storage for retry action
let globalRetryCallback = null;

// Export function to set retry callback from outside
export const setInternetErrorModalRetryCallback = retryCallback => {
  globalRetryCallback = retryCallback;
};

const InternetErrorModal = () => {
  const dispatch = useDispatch();
  const { visible: isVisible } = useSelector(selectInternetErrorModal);
  const { isOnline } = useNetworkStatus();

  // Handle retry action
  const handleRetry = React.useCallback(() => {
    console.log('[InternetErrorModal] Retry button pressed, online:', isOnline);

    if (!isOnline) {
      console.log('[InternetErrorModal] Still offline, cannot retry');
      return;
    }

    dispatch(hideInternetErrorModal());

    // Execute retry action if provided
    if (globalRetryCallback && typeof globalRetryCallback === 'function') {
      try {
        globalRetryCallback();
      } catch (error) {
        console.error(
          '[InternetErrorModal] Error executing retry action:',
          error,
        );
      }
    }
  }, [dispatch, isOnline]);

  // Handle cancel/dismiss
  const handleCancel = React.useCallback(() => {
    console.log('[InternetErrorModal] Cancel button pressed');
    dispatch(hideInternetErrorModal());
  }, [dispatch]);

  // Handle back button on Android
  React.useEffect(() => {
    if (!isVisible) return;

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleCancel();
        return true; // Prevent default behavior
      },
    );

    return () => backHandler.remove();
  }, [isVisible, handleCancel]);

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Internet Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.errorIcon}>🌐</Text>
          </View>

          {/* Title in Bengali */}
          <Text style={styles.title}>ইন্টারনেট সংযোগ বিচ্ছিন্ন করা হয়েছে</Text>

          {/* Message */}
          <Text style={styles.message}>
            আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Retry Button */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.retryButton,
                !isOnline && styles.disabledButton,
              ]}
              onPress={handleRetry}
              disabled={!isOnline}
            >
              <Text
                style={[
                  styles.retryButtonText,
                  !isOnline && styles.disabledButtonText,
                ]}
              >
                আবার চেষ্টা করুন
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>বাতিল করুন</Text>
            </TouchableOpacity>
          </View>

          {/* Online status indicator */}
          {!isOnline && (
            <Text style={styles.statusText}>⚠️ এখনও অফলাইনে আছেন</Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: ThemeColors.colorWhite,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
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
  errorIcon: {
    fontSize: 48,
    textAlign: 'center',
    color: '#4DABF7',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: ThemeColors.colorBlack,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: ThemeColors.colorBlack,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  retryButton: {
    backgroundColor: ThemeColors.colorPrimary || '#007AFF',
  },
  retryButtonText: {
    color: ThemeColors.colorWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: ThemeColors.colorGray || '#E0E0E0',
    borderWidth: 1,
    borderColor: ThemeColors.colorGray || '#BDBDBD',
  },
  cancelButtonText: {
    color: ThemeColors.colorBlack,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#666666',
  },
  statusText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default InternetErrorModal;
