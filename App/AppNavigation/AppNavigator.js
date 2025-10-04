import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import VideoListScreen from '../UiViews/VideoListScreen';
import VideoPlayerScreen from '../UiViews/VideoPlayerScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="VideoList"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="VideoList"
          component={VideoListScreen}
          options={{
            title: 'Deshoali Videos',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="VideoPlayer"
          component={VideoPlayerScreen}
          options={{
            title: 'Video Player',
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
