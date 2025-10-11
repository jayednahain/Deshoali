import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import VideoList from '../UiViews/VideoList';
import { useAppLanguage } from './../Hooks/useAppLagnuage';

const Stack = createStackNavigator();

const AppNavigation = () => {
  const { i18n } = useAppLanguage();

  const navigationOption = (navigation, title = 'Default Title') => {
    return {
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      title: i18n('video_list_title'),
      headerStyle: {
        backgroundColor: '#4D870E',
        borderRadius: 10,
      },
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#FFFFFF',
      },
    };
  };

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="AudioListView">
        <Stack.Screen
          name="AudioListView"
          component={VideoList}
          options={({ navigation }) =>
            navigationOption(navigation, 'Video List')
          }
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigation;
