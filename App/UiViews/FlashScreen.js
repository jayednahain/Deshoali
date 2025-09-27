import { StyleSheet, Text, View } from 'react-native';
import { ThemeLightColors } from '../AppTheme';

export default function FlashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>FlashScreen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ThemeLightColors.ColorWhite,
  },
  text: {
    fontSize: 24,
    color: ThemeLightColors.ColorGrayDark,
  },
});
