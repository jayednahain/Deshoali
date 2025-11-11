import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Share } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import RNFS from 'react-native-fs';

const CRASH_STORAGE_KEY = 'crash_reports';
const LOG_STORAGE_KEY = 'app_logs';
const MAX_LOGS = 500; // Keep last 500 log entries
const MAX_CRASH_REPORTS = 10; // Keep last 10 crash reports

class CrashReportService {
  constructor() {
    this.logs = [];
    this.currentCrash = null;
  }

  /**
   * Initialize crash and log monitoring
   */
  async initialize() {
    try {
      // Load existing logs
      const savedLogs = await AsyncStorage.getItem(LOG_STORAGE_KEY);
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
      console.log('[CrashReportService] Initialized');
    } catch (error) {
      console.error('[CrashReportService] Init Error:', error);
    }
  }

  /**
   * Add log entry with timestamp
   */
  addLog(message, level = 'INFO', data = null) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        data: data ? JSON.stringify(data) : null,
      };

      this.logs.push(logEntry);

      // Keep only last MAX_LOGS entries
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(-MAX_LOGS);
      }

      // Persist logs
      AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs)).catch(
        err => console.error('Error persisting logs:', err),
      );

      // Also log to console
      if (level === 'ERROR') {
        console.error(`[${timestamp}] ${message}`, data);
      } else if (level === 'WARN') {
        console.warn(`[${timestamp}] ${message}`, data);
      } else {
        console.log(`[${timestamp}] ${message}`, data);
      }
    } catch (error) {
      console.error('Error adding log:', error);
    }
  }

  /**
   * Capture crash information
   */
  async captureError(error, errorInfo = {}) {
    try {
      const timestamp = new Date().toISOString();
      const deviceModel = await DeviceInfo.getModel();
      const osVersion = await DeviceInfo.getSystemVersion();
      const appVersion = await DeviceInfo.getVersion();
      const buildNumber = await DeviceInfo.getBuildNumber();

      const crashReport = {
        id: `crash_${Date.now()}`,
        timestamp,
        error: {
          message: error?.message || 'Unknown Error',
          stack: error?.stack || 'No stack trace',
          name: error?.name || 'Error',
        },
        errorInfo,
        deviceInfo: {
          model: deviceModel,
          osVersion,
          appVersion,
          buildNumber,
        },
        logs: this.getLast50Logs(),
        recentErrors: this.getRecentErrors(10),
      };

      this.currentCrash = crashReport;

      // Store crash report
      this.saveCrashReport(crashReport);

      // Add to logs
      this.addLog(
        `CRASH: ${error?.message || 'Unknown Error'}`,
        'ERROR',
        crashReport,
      );

      return crashReport;
    } catch (err) {
      console.error('[CrashReportService] Error capturing error:', err);
      return null;
    }
  }

  /**
   * Save crash report to storage
   */
  saveCrashReport(crashReport) {
    try {
      let reports = [];
      const savedReports = AsyncStorage.getItem(CRASH_STORAGE_KEY);

      if (savedReports) {
        reports = JSON.parse(savedReports);
      }

      reports.push(crashReport);

      // Keep only last MAX_CRASH_REPORTS
      if (reports.length > MAX_CRASH_REPORTS) {
        reports = reports.slice(-MAX_CRASH_REPORTS);
      }

      AsyncStorage.setItem(CRASH_STORAGE_KEY, JSON.stringify(reports)).catch(
        err => console.error('Error saving crash report:', err),
      );
    } catch (error) {
      console.error('Error saving crash report:', error);
    }
  }

  /**
   * Get last N logs
   */
  getLast50Logs() {
    return this.logs.slice(-50);
  }

  /**
   * Get recent errors from logs
   */
  getRecentErrors(count = 5) {
    return this.logs.filter(log => log.level === 'ERROR').slice(-count);
  }

  /**
   * Get all crash reports
   */
  async getAllCrashReports() {
    try {
      const reports = await AsyncStorage.getItem(CRASH_STORAGE_KEY);
      return reports ? JSON.parse(reports) : [];
    } catch (error) {
      console.error('Error getting crash reports:', error);
      return [];
    }
  }

  /**
   * Get current crash
   */
  getCurrentCrash() {
    return this.currentCrash;
  }

  /**
   * Clear current crash
   */
  clearCurrentCrash() {
    this.currentCrash = null;
  }

  /**
   * Format crash report for display
   */
  formatCrashReport(crashReport) {
    if (!crashReport) return '';

    const lines = [
      '=== CRASH REPORT ===',
      `Time: ${crashReport.timestamp}`,
      `App Version: ${crashReport.deviceInfo.appVersion} (${crashReport.deviceInfo.buildNumber})`,
      `Device: ${crashReport.deviceInfo.model}`,
      `OS: Android ${crashReport.deviceInfo.osVersion}`,
      '',
      '=== ERROR ===',
      `Type: ${crashReport.error.name}`,
      `Message: ${crashReport.error.message}`,
      '',
      '=== STACK TRACE ===',
      crashReport.error.stack,
      '',
      '=== RECENT LOGS ===',
      ...crashReport.logs.map(
        log =>
          `[${log.timestamp}] ${log.level}: ${log.message}${
            log.data ? ` | ${log.data}` : ''
          }`,
      ),
      '',
      '=== RECENT ERRORS ===',
      ...crashReport.recentErrors.map(
        log =>
          `[${log.timestamp}] ${log.level}: ${log.message}${
            log.data ? ` | ${log.data}` : ''
          }`,
      ),
    ];

    return lines.join('\n');
  }

  /**
   * Share crash report via multiple options
   */
  async shareCrashReport(crashReport, format = 'text') {
    try {
      const formattedReport = this.formatCrashReport(crashReport);

      if (format === 'text') {
        await Share.share({
          message: formattedReport,
          title: `Crash Report - ${crashReport.timestamp}`,
        });
      } else if (format === 'file') {
        // Save to file and share
        const fileName = `crash_report_${Date.now()}.txt`;
        const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

        await RNFS.writeFile(filePath, formattedReport, 'utf8');

        await Share.share({
          url: `file://${filePath}`,
          title: `Crash Report - ${crashReport.timestamp}`,
        });
      }
    } catch (error) {
      console.error('Error sharing crash report:', error);
      Alert.alert('Error', 'Failed to share crash report');
    }
  }

  /**
   * Export all logs to file
   */
  async exportLogs() {
    try {
      const logsText = this.logs
        .map(
          log =>
            `[${log.timestamp}] ${log.level}: ${log.message}${
              log.data ? ` | ${log.data}` : ''
            }`,
        )
        .join('\n');

      const fileName = `logs_${Date.now()}.txt`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, logsText, 'utf8');

      await Share.share({
        url: `file://${filePath}`,
        title: `App Logs - ${new Date().toISOString()}`,
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      Alert.alert('Error', 'Failed to export logs');
    }
  }

  /**
   * Clear all crash reports
   */
  clearAllCrashReports() {
    try {
      AsyncStorage.removeItem(CRASH_STORAGE_KEY).catch(err =>
        console.error('Error clearing crash reports:', err),
      );
      this.currentCrash = null;
    } catch (error) {
      console.error('Error clearing crash reports:', error);
    }
  }

  /**
   * Clear all logs
   */
  clearAllLogs() {
    try {
      this.logs = [];
      AsyncStorage.removeItem(LOG_STORAGE_KEY).catch(err =>
        console.error('Error clearing logs:', err),
      );
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  }
}

// Export singleton instance
export default new CrashReportService();
