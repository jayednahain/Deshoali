import { createSlice } from '@reduxjs/toolkit';

/**
 * Modal State Management
 * Manages all modal states in the application
 */

const initialState = {
  // Error Modal States
  errorModal: {
    visible: false,
    title: '',
    message: '',
    type: 'api_error', // 'api_error', 'network_error', 'download_error'
    hasOfflineVideos: false, // Show offline button if true
    offlineVideoCount: 0, // Number of offline videos available
    canCancel: true, // Show cancel button
  },

  // Storage Modal States
  storageModal: {
    visible: false,
    availableSpace: 0,
    requiredSpace: 1048576, // 1GB in KB
    canProceed: false,
  },

  // Download In Progress Modal States
  downloadInProgressModal: {
    visible: false,
    currentVideoName: '',
    progress: 0,
  },

  // NEW: Downloading Process Modal States (Phase 2)
  downloadingProcessModal: {
    visible: false,
    currentVideoName: '',
    currentVideoProgress: 0, // 0-100%
    totalVideos: 0, // Total videos to download
    completedVideos: 0, // Videos already downloaded
  },

  // General Modal States
  isAnyModalVisible: false,
};

const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    // Error Modal Actions
    showErrorModal: (state, action) => {
      const {
        title,
        message,
        type = 'api_error',
        hasOfflineVideos = false,
        offlineVideoCount = 0,
        canCancel = true,
      } = action.payload;

      state.errorModal = {
        visible: true,
        title,
        message,
        type,
        hasOfflineVideos,
        offlineVideoCount,
        canCancel,
      };
      state.isAnyModalVisible = true;

      console.log('[ModalSlice] Showing error modal:', {
        title,
        type,
        hasOfflineVideos,
        offlineVideoCount,
      });
    },

    hideErrorModal: state => {
      state.errorModal = {
        ...initialState.errorModal,
        visible: false,
      };
      state.isAnyModalVisible =
        state.storageModal.visible || state.downloadInProgressModal.visible;

      console.log('[ModalSlice] Hiding error modal');
    },

    // Storage Modal Actions
    showStorageModal: (state, action) => {
      const {
        availableSpace,
        requiredSpace = 1048576,
        canProceed = false,
      } = action.payload;

      state.storageModal = {
        visible: true,
        availableSpace,
        requiredSpace,
        canProceed,
      };
      state.isAnyModalVisible = true;

      console.log('[ModalSlice] Showing storage modal:', {
        availableSpace,
        requiredSpace,
      });
    },

    hideStorageModal: state => {
      state.storageModal = {
        ...initialState.storageModal,
        visible: false,
      };
      state.isAnyModalVisible =
        state.errorModal.visible || state.downloadInProgressModal.visible;

      console.log('[ModalSlice] Hiding storage modal');
    },

    // Download In Progress Modal Actions
    showDownloadInProgressModal: (state, action) => {
      const { currentVideoName, progress = 0 } = action.payload;

      state.downloadInProgressModal = {
        visible: true,
        currentVideoName,
        progress,
      };
      state.isAnyModalVisible = true;

      console.log('[ModalSlice] Showing download progress modal:', {
        currentVideoName,
        progress,
      });
    },

    hideDownloadInProgressModal: state => {
      state.downloadInProgressModal = {
        ...initialState.downloadInProgressModal,
        visible: false,
      };
      state.isAnyModalVisible =
        state.errorModal.visible || state.storageModal.visible;

      console.log('[ModalSlice] Hiding download progress modal');
    },

    updateDownloadInProgressModal: (state, action) => {
      const { currentVideoName, progress } = action.payload;

      if (state.downloadInProgressModal.visible) {
        if (currentVideoName !== undefined) {
          state.downloadInProgressModal.currentVideoName = currentVideoName;
        }
        if (progress !== undefined) {
          state.downloadInProgressModal.progress = progress;
        }

        console.log('[ModalSlice] Updated download progress modal:', {
          currentVideoName,
          progress,
        });
      }
    },

    // NEW: Downloading Process Modal Actions (Phase 2)
    showDownloadingProcessModal: (state, action) => {
      const {
        currentVideoName = '',
        currentVideoProgress = 0,
        totalVideos = 0,
        completedVideos = 0,
      } = action.payload;

      state.downloadingProcessModal = {
        visible: true,
        currentVideoName,
        currentVideoProgress,
        totalVideos,
        completedVideos,
      };
      state.isAnyModalVisible = true;

      console.log('[ModalSlice] Showing downloading process modal:', {
        currentVideoName,
        totalVideos,
        completedVideos,
      });
    },

    hideDownloadingProcessModal: state => {
      console.log(
        '[ModalSlice] 🚫 HIDING downloading process modal - BEFORE:',
        {
          visible: state.downloadingProcessModal.visible,
        },
      );

      state.downloadingProcessModal = {
        ...initialState.downloadingProcessModal,
        visible: false,
      };
      state.isAnyModalVisible =
        state.errorModal.visible ||
        state.storageModal.visible ||
        state.downloadInProgressModal.visible;

      console.log('[ModalSlice] 🚫 HIDING downloading process modal - AFTER:', {
        visible: state.downloadingProcessModal.visible,
        isAnyModalVisible: state.isAnyModalVisible,
      });
    },

    updateDownloadingProcessModal: (state, action) => {
      const {
        currentVideoName,
        currentVideoProgress,
        totalVideos,
        completedVideos,
      } = action.payload;

      if (state.downloadingProcessModal.visible) {
        if (currentVideoName !== undefined) {
          state.downloadingProcessModal.currentVideoName = currentVideoName;
        }
        if (currentVideoProgress !== undefined) {
          state.downloadingProcessModal.currentVideoProgress =
            currentVideoProgress;
        }
        if (totalVideos !== undefined) {
          state.downloadingProcessModal.totalVideos = totalVideos;
        }
        if (completedVideos !== undefined) {
          state.downloadingProcessModal.completedVideos = completedVideos;
        }

        console.log(
          '[ModalSlice] Updated downloading process modal:',
          action.payload,
        );
      }
    },

    // Hide All Modals
    hideAllModals: state => {
      state.errorModal.visible = false;
      state.storageModal.visible = false;
      state.downloadInProgressModal.visible = false;
      state.downloadingProcessModal.visible = false;
      state.isAnyModalVisible = false;

      console.log('[ModalSlice] Hiding all modals');
    },

    // Reset Modal State
    resetModalState: state => {
      return { ...initialState };
    },
  },
});

// Export action creators
export const {
  showErrorModal,
  hideErrorModal,
  showStorageModal,
  hideStorageModal,
  showDownloadInProgressModal,
  hideDownloadInProgressModal,
  updateDownloadInProgressModal,
  showDownloadingProcessModal,
  hideDownloadingProcessModal,
  updateDownloadingProcessModal,
  hideAllModals,
  resetModalState,
} = modalSlice.actions;

// Selectors
export const selectErrorModal = state =>
  state.modalStore?.errorModal || initialState.errorModal;
export const selectStorageModal = state =>
  state.modalStore?.storageModal || initialState.storageModal;
export const selectDownloadInProgressModal = state =>
  state.modalStore?.downloadInProgressModal ||
  initialState.downloadInProgressModal;
export const selectDownloadingProcessModal = state =>
  state.modalStore?.downloadingProcessModal ||
  initialState.downloadingProcessModal;
export const selectIsAnyModalVisible = state =>
  state.modalStore?.isAnyModalVisible || false;

// Export reducer
export default modalSlice.reducer;
