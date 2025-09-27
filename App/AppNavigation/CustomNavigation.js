import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AudioListView from '../UiViews/AudioListView';
import FlashScreen from '../UiViews/FlashScreen';
// import ButtonPrimaryNavBarRounded from '../UiComponents/ButtonPrimaryNavBarRounded'; // Uncomment when component exists

const Stack = createStackNavigator();

// headerTitle: () => <H5 textTitle={title} />,
// headerLeft: () => <ButtonPrimaryNavBarRounded onPress={() => {
//     console.warn("ButtonPrimaryNavBarRoundedButtonPrimaryNavBarRounded")
//     navigation.goBack()
// }} />

const navigationOption = (navigation, title = 'Default Title') => {
  return {
    headerShadowVisible: false,
    headerTitleAlign: 'center',
    title: title,
    // Simple title instead of custom component
    // headerTitle: () => <H5>{title}</H5>,
  };
};

const AppNavigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="AudioListView">
        <Stack.Screen
          name="AudioListView"
          component={AudioListView}
          options={({ navigation }) =>
            navigationOption(navigation, 'Audio List')
          }
        />
        <Stack.Screen
          name="FlashScreen"
          component={FlashScreen}
          options={({ navigation }) =>
            navigationOption(navigation, 'Audio List')
          }
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigation;
