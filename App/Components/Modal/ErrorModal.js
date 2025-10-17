import React from 'react';
import {
  Alert,
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
  hideErrorModal,
  selectErrorModal,
} from '../../Features/Modal/modalSlice';
import useAppLanguage from '../../Hooks/useAppLagnuage';

/**
 * ErrorModal Component
 *
 * Displays different types of error modals:
 * - API errors (network issues, server errors)
 * - Download errors (file system, storage issues)
 * - General application errors
 *
 * Features:
 * - Retry functionality with custom actions
 * - Cancellation support
 * - Different UI variants based on error type
 * - Multi-language support
 */

const ErrorModal = () => {
  const dispatch = useDispatch();
  const { i18n } = useAppLanguage();
  const errorModal = useSelector(selectErrorModal);

  const {
    visible: isVisible,
    title,
    message,
    type,
    retryAction,
    canCancel,
  } = errorModal;

  // Handle cancel/dismiss
  const handleCancel = React.useCallback(() => {
    console.log('[ErrorModal] Cancel button pressed');
    dispatch(hideErrorModal());
  }, [dispatch]);

  // Handle back button on Android
  React.useEffect(() => {
    if (!isVisible) return;

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (canCancel) {
          handleCancel();
        }
        return true; // Prevent default behavior
      },
    );

    return () => backHandler.remove();
  }, [isVisible, canCancel, handleCancel]);

  // Handle retry action
  const handleRetry = () => {
    console.log('[ErrorModal] Retry button pressed, type:', type);

    dispatch(hideErrorModal());

    // Execute retry action if provided
    if (retryAction && typeof retryAction === 'function') {
      try {
        retryAction();
      } catch (error) {
        console.error('[ErrorModal] Error executing retry action:', error);
      }
    }
  };

  // Handle exit app (for critical errors)
  const handleExitApp = () => {
    console.log('[ErrorModal] Exit app requested');

    Alert.alert(
      i18n('exit_app') || 'Exit App',
      i18n('exit_app_confirm') || 'Are you sure you want to exit the app?',
      [
        {
          text: i18n('cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: i18n('exit') || 'Exit',
          style: 'destructive',
          onPress: () => {
            dispatch(hideErrorModal());
            BackHandler.exitApp();
          },
        },
      ],
    );
  };

  // Render error icon based on type
  const renderErrorIcon = () => {
    const iconStyle = [styles.errorIcon];
    let iconText = '⚠️';

    switch (type) {
      case 'network_error':
        iconText = '🌐';
        iconStyle.push(styles.networkErrorIcon);
        break;
      case 'download_error':
        iconText = '📥';
        iconStyle.push(styles.downloadErrorIcon);
        break;
      case 'storage_error':
        iconText = '💾';
        iconStyle.push(styles.storageErrorIcon);
        break;
      default:
        iconText = '❌';
        iconStyle.push(styles.apiErrorIcon);
    }

    return <Text style={iconStyle}>{iconText}</Text>;
  };

  // Render action buttons based on error type
  const renderActionButtons = () => {
    return (
      <View style={styles.buttonContainer}>
        {/* Cancel/Dismiss Button */}
        {canCancel && (
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>
              {i18n('cancel') || 'Cancel'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Retry Button */}
        <TouchableOpacity
          style={[styles.button, styles.retryButton]}
          onPress={handleRetry}
        >
          <Text style={styles.retryButtonText}>{i18n('retry') || 'Retry'}</Text>
        </TouchableOpacity>

        {/* Exit App Button (for critical storage errors) */}
        {type === 'storage_error' && (
          <TouchableOpacity
            style={[styles.button, styles.exitButton]}
            onPress={handleExitApp}
          >
            <Text style={styles.exitButtonText}>
              {i18n('exit_app') || 'Exit App'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={canCancel ? handleCancel : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Error Icon */}
          <View style={styles.iconContainer}>{renderErrorIcon()}</View>

          {/* Title */}
          <Text style={styles.title}>{title || i18n('error') || 'Error'}</Text>

          {/* Message */}
          <Text style={styles.message}>
            {message ||
              i18n('something_went_wrong') ||
              'Something went wrong. Please try again.'}
          </Text>

          {/* Additional info for specific error types */}
          {type === 'network_error' && (
            <Text style={styles.additionalInfo}>
              {i18n('check_connection') ||
                'Please check your internet connection and try again.'}
            </Text>
          )}

          {type === 'storage_error' && (
            <Text style={styles.additionalInfo}>
              {i18n('insufficient_storage_details') ||
                'Free up some space and restart the app.'}
            </Text>
          )}

          {/* Action Buttons */}
          {renderActionButtons()}
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
  },
  apiErrorIcon: {
    color: '#FF6B6B',
  },
  networkErrorIcon: {
    color: '#4DABF7',
  },
  downloadErrorIcon: {
    color: '#FFD43B',
  },
  storageErrorIcon: {
    color: '#FF8A65',
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
    marginBottom: 16,
  },
  additionalInfo: {
    fontSize: 14,
    color: ThemeColors.colorGray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    fontStyle: 'italic',
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
  retryButton: {
    backgroundColor: ThemeColors.colorPrimary || '#007AFF',
  },
  retryButtonText: {
    color: ThemeColors.colorWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  exitButton: {
    backgroundColor: '#FF6B6B',
  },
  exitButtonText: {
    color: ThemeColors.colorWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorModal;
