import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeColors } from '../../AppTheme';

/**
 * BottomButtonSectionWithText Component
 *
 * Floating bottom section that alerts user about incomplete downloads
 * and provides a retry option.
 *
 * Features:
 * - Shows warning text about pending videos
 * - Retry button to resume downloads
 * - Floats over content at bottom of screen
 * - Dismissable or persistent based on props
 *
 * @param {string} warningText - Warning message to display
 * @param {string} buttonText - Text for retry button
 * @param {Function} onRetryPress - Callback when retry button is pressed
 * @param {number} pendingCount - Optional: number of pending videos
 * @param {boolean} visible - Controls visibility (default: true)
 */
const BottomButtonSectionWithText = ({
  warningText = 'কিছু সংখ্যক ভিডিও ডাউনলোড বাকি আছে।',
  buttonText = 'আবার চেষ্টা করুন',
  onRetryPress,
  pendingCount,
  visible = true,
}) => {
  if (!visible) return null;

  const displayText = pendingCount
    ? `${pendingCount}টি ভিডিও ডাউনলোড বাকি আছে।`
    : warningText;

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Warning Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.warningIcon}>⚠️</Text>
        </View>

        {/* Warning Text */}
        <View style={styles.textContainer}>
          <Text style={styles.warningText}>{displayText}</Text>
        </View>

        {/* Retry Button */}
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetryPress}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF3CD', // Light yellow warning background
    borderTopWidth: 2,
    borderTopColor: '#FFD43B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 1000, // Float over content
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    marginRight: 8,
  },
  warningIcon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: ThemeColors.colorPrimary || '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: ThemeColors.colorWhite,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BottomButtonSectionWithText;
