import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getVideos } from './VideosAPI';

const initialState = {
  videos: [],
  isLoading: false,
  isError: false,
  errorMessage: '',
};

export const fetchVideosThunk = createAsyncThunk(
  'Videos/fetchVideos',
  async () => {
    const response = await getVideos();
    return response;
  },
);

const videoSlice = createSlice({
  name: 'videos',
  initialState: initialState,
  extraReducers: builder => {
    builder
      .addCase(fetchVideosThunk.pending, state => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
      })
      .addCase(fetchVideosThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.errorMessage = '';
        state.videos = action.payload.data;
      })
      .addCase(fetchVideosThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.error.message;
      });
  },
});

// export { fetchVideosThunk as fetchVideos };
export default videoSlice.reducer;
