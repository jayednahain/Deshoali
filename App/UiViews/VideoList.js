import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeColors } from '../AppTheme';
import CardVideoListItem from '../Components/Card/CardVideoListItem';
import { fetchVideosThunk } from '../Features/Videos/VideosSlice';
import { useAppStatus } from '../Hooks/useAppStatus';
import { useNetworkStatus } from '../Hooks/useNetworkStatus';

export default function VideoList() {
  const dispatch = useDispatch();
  // const { isOnline } = useNetworkStatus();
  const { isOnline } = useNetworkStatus();
  const { appStatus } = useAppStatus();

  useEffect(() => {
    console.log('App is active:', appStatus);
  }, [appStatus]);

  const { videos, isLoading, errorMessage, isError } = useSelector(
    state => state.videosStore,
  );

  useEffect(() => {
    if (isOnline) {
      dispatch(fetchVideosThunk());
    }
  }, [isOnline, dispatch]);

  if (!isOnline) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No Internet Connection</Text>
        <Text style={styles.subText}>Please check your network settings</Text>
      </View>
    );
  }

  const renderVideoItem = ({ item }) => {
    return (
      <CardVideoListItem
        // isDownloading={true}
        isDownloaded={true}
        cardItem={item}
      />
    );
  };
  const renderVideoList = () => {
    return (
      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={item => item.id}
      />
    );
  };

  let mainContent = null;

  if (isLoading) {
    mainContent = <Text>Loading videos...</Text>;
  } else if (isError) {
    mainContent = <Text style={styles.errorText}>{errorMessage}</Text>;
  } else if (videos.length === 0) {
    mainContent = <Text>No videos available.</Text>;
  } else {
    mainContent = renderVideoList();
  }

  return <View style={styles.container}>{mainContent}</View>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: ThemeColors.colorWhite,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
