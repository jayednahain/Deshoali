const initialState = {
  // Video list data
  videoList: {
    categories: [],
  },
  videos: [], // Flattened list for easy access

  // Loading states
  isLoading: false,
  isError: false,
  error: '',

  // Download states
  downloadStatus: {}, // videoId -> { status, progress, filePath, etc. }
  downloadQueue: [],
  currentDownload: null,

  // Sync states
  lastSync: null,
  syncInProgress: false,

  // Offline mode
  isOffline: false,
};

export default initialState;
