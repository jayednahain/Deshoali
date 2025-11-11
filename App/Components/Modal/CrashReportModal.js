import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemeColors } from '../../AppTheme';
import CrashReportService from '../../Service/CrashReportService';

const CrashReportModal = ({ isVisible, crashReport, onClose, onRetry }) => {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    try {
      setIsSharing(true);
      await CrashReportService.shareCrashReport(crashReport, 'text');
    } catch (error) {
      Alert.alert('Error', 'Failed to share crash report');
    } finally {
      setIsSharing(false);
    }
  };

  const handleExportLogs = async () => {
    try {
      setIsSharing(true);
      await CrashReportService.exportLogs();
    } catch (error) {
      Alert.alert('Error', 'Failed to export logs');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRetry = () => {
    CrashReportService.clearCurrentCrash();
    onClose();
    if (onRetry) {
      onRetry();
    }
  };

  if (!crashReport) {
    return null;
  }

  return (
    <Modal
      isVisible={isVisible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.7}
      useNativeDriver={true}
      onBackdropPress={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>⚠️ App Crashed</Text>
          <Text style={styles.subtitle}>
            Crash Report Generated - {crashReport.timestamp}
          </Text>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {/* Device Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Device Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Device:</Text>
              <Text style={styles.value}>{crashReport.deviceInfo.model}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>OS Version:</Text>
              <Text style={styles.value}>
                Android {crashReport.deviceInfo.osVersion}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>App Version:</Text>
              <Text style={styles.value}>
                {crashReport.deviceInfo.appVersion} (
                {crashReport.deviceInfo.buildNumber})
              </Text>
            </View>
          </View>

          {/* Error Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Error Details</Text>
            <View style={styles.errorBox}>
              <Text style={styles.errorType}>{crashReport.error.name}</Text>
              <Text style={styles.errorMessage}>
                {crashReport.error.message}
              </Text>
            </View>
          </View>

          {/* Stack Trace */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stack Trace</Text>
            <View style={styles.stackTraceBox}>
              <Text style={styles.stackTrace}>{crashReport.error.stack}</Text>
            </View>
          </View>

          {/* Recent Logs */}
          {crashReport.logs && crashReport.logs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Recent Logs ({crashReport.logs.length})
              </Text>
              <View style={styles.logsBox}>
                {crashReport.logs.map((log, index) => (
                  <View key={index} style={styles.logEntry}>
                    <Text style={styles.logTime}>[{log.timestamp}]</Text>
                    <Text
                      style={[
                        styles.logLevel,
                        {
                          color:
                            log.level === 'ERROR'
                              ? ThemeColors.colorWarning
                              : log.level === 'WARN'
                              ? ThemeColors.colorWarning
                              : ThemeColors.text,
                        },
                      ]}
                    >
                      {log.level}
                    </Text>
                    <Text style={styles.logMessage}>{log.message}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recent Errors */}
          {crashReport.recentErrors && crashReport.recentErrors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Recent Errors ({crashReport.recentErrors.length})
              </Text>
              <View style={styles.errorsBox}>
                {crashReport.recentErrors.map((error, index) => (
                  <View key={index} style={styles.errorEntry}>
                    <Text style={styles.errorTime}>[{error.timestamp}]</Text>
                    <Text style={styles.errorEntryMessage}>
                      {error.message}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleExportLogs}
            disabled={isSharing}
          >
            <Text style={styles.secondaryButtonText}>📋 Export Logs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleShare}
            disabled={isSharing}
          >
            <Text style={styles.secondaryButtonText}>
              {isSharing ? 'Sharing...' : '📤 Share Report'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.retryButton]}
            onPress={handleRetry}
            disabled={isSharing}
          >
            <Text style={styles.retryButtonText}>🔄 Retry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.closeButton]}
            onPress={onClose}
            disabled={isSharing}
          >
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: ThemeColors.cardBackground,
    borderRadius: 12,
    maxHeight: '90%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  header: {
    backgroundColor: ThemeColors.colorWarning,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 47, 49, 0.3)',
  },
  title: {
    fontWeight: '700',
    color: ThemeColors.colorWhite,
    marginBottom: 4,
    fontSize: 18,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    color: ThemeColors.text,
    marginBottom: 8,
    paddingLeft: 4,
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 6,
    marginBottom: 4,
  },
  label: {
    fontWeight: '600',
    color: ThemeColors.textSecondary,
    width: '40%',
    fontSize: 12,
  },
  value: {
    color: ThemeColors.text,
    flex: 1,
    fontSize: 12,
  },
  errorBox: {
    backgroundColor: 'rgba(217, 47, 49, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: ThemeColors.colorWarning,
    padding: 10,
    borderRadius: 6,
  },
  errorType: {
    fontWeight: '700',
    color: ThemeColors.colorWarning,
    marginBottom: 4,
    fontSize: 13,
  },
  errorMessage: {
    color: ThemeColors.text,
    lineHeight: 18,
    fontSize: 12,
  },
  stackTraceBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  stackTrace: {
    fontSize: 10,
    color: ThemeColors.textSecondary,
    fontFamily: 'Courier New',
    lineHeight: 14,
  },
  logsBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 6,
    padding: 8,
    maxHeight: 150,
  },
  logEntry: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  logTime: {
    fontSize: 9,
    color: ThemeColors.textSecondary,
    fontFamily: 'Courier New',
    marginRight: 4,
  },
  logLevel: {
    fontSize: 9,
    fontWeight: '600',
    marginRight: 6,
    minWidth: 40,
  },
  logMessage: {
    fontSize: 9,
    color: ThemeColors.text,
    flex: 1,
  },
  errorsBox: {
    backgroundColor: 'rgba(217, 47, 49, 0.05)',
    borderRadius: 6,
    padding: 8,
    maxHeight: 120,
  },
  errorEntry: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 47, 49, 0.1)',
  },
  errorTime: {
    fontSize: 9,
    color: ThemeColors.colorWarning,
    fontFamily: 'Courier New',
    marginRight: 6,
  },
  errorEntryMessage: {
    fontSize: 9,
    color: ThemeColors.colorWarning,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderTopWidth: 1,
    borderTopColor: ThemeColors.border,
  },
  button: {
    flex: 0.48,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  secondaryButton: {
    backgroundColor: ThemeColors.inputBackground,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  secondaryButtonText: {
    fontWeight: '600',
    color: ThemeColors.text,
    fontSize: 12,
  },
  retryButton: {
    flex: 0.48,
    backgroundColor: ThemeColors.colorWarning,
  },
  retryButtonText: {
    fontWeight: '600',
    color: ThemeColors.colorWhite,
    fontSize: 12,
  },
  closeButton: {
    flex: 0.48,
    backgroundColor: ThemeColors.colorWarning,
  },
  closeButtonText: {
    fontWeight: '600',
    color: ThemeColors.colorWhite,
    fontSize: 12,
  },
});

export default CrashReportModal;
