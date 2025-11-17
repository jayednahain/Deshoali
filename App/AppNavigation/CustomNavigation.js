import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import VideoDetails from '../UiViews/VideoDetails';
// import VideoList from '../UiViews/VideoList'; // Old implementation
import VideoListNew from '../UiViews/VideoListNew'; // NEW: Modal-centric implementation
import { useAppLanguage } from '../Hooks/useAppLagnuage';
import { ThemeColors } from '../AppTheme';
import { StatusBar } from 'react-native';

const Stack = createStackNavigator();

const AppNavigation = () => {
  const { i18n } = useAppLanguage();

  const navigationOption = (navigation, title = 'Default Title') => {
    return {
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      title: i18n('video_list_title'),

      headerStyle: {
        // Vibrant header for a modern, colorful feel
        backgroundColor: '#4cdc59', // Indigo/Violet
        // Add a bit of height for presence
        // height: 60,
        // borderRadius: 10,
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 21,
        color: '#FFFFFF',
        letterSpacing: 0.5,
        // Subtle text shadow for pop (mostly iOS)
        textShadowColor: 'rgba(0,0,0,0.25)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
    };
  };

  return (
    <NavigationContainer>
      <StatusBar
        backgroundColor={ThemeColors.colorPrimary}
        barStyle="light-content"
      />
      <Stack.Navigator initialRouteName="AudioListView">
        <Stack.Screen
          name="AudioListView"
          component={VideoListNew}
          options={({ navigation }) =>
            navigationOption(navigation, 'Video List')
          }
        />
        <Stack.Screen
          name="VideoDetails"
          component={VideoDetails}
          options={{
            headerShown: false, // We'll handle the header in VideoDetails component
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigation;
