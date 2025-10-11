import { StyleSheet, View } from 'react-native';
import { H6, ThemeColors } from '../../AppTheme';

function Chip({ text, textStyle }) {
  return (
    <View style={styles.chipContainerStyle}>
      <H6 textStyle={[{ color: ThemeColors.colorWhite }, textStyle]}>{text}</H6>
    </View>
  );
}

const ChipWarning = ({ text, textStyle }) => {
  return (
    <View
      style={{
        ...styles.chipContainerStyle,
        backgroundColor: ThemeColors.colorWarning,
      }}
    >
      <H6 textStyle={[{ color: ThemeColors.colorWhite }, textStyle]}>{text}</H6>
    </View>
  );
};

const styles = StyleSheet.create({
  chipContainerStyle: {
    borderRadius: 10,
    backgroundColor: ThemeColors.colorPrimary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    color: ThemeColors.colorWhite,
    marginRight: 10,
  },
});

export { Chip, ChipWarning };
