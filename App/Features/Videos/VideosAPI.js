import BaseUrlInstance from '../../Service/BaseUrlInstance';

const getVideos = async () => {
  try {
    // https://api.redfynix.com/api/v1/media-files/list
    const response = await BaseUrlInstance.get('api/v1/media-files/list');
    return response.data;
  } catch (error) {
    if (error.isNetworkError) {
      const networkError = new Error(
        'No internet connection. Please check your network settings.',
      );
      networkError.isNetworkError = true;
      networkError.code = 'NETWORK_ERROR';
      throw networkError;
    }

    // For other errors, re-throw as is
    throw error;
  }
};

export { getVideos };
