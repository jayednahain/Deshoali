import { StyleSheet } from 'react-native';
import { UtilityFunctions } from '../UtilityFunctions/UtilityFunctions';

var textStyleCommon = {
  includeFontPadding: false,
  // color: ThemeLightColors.ColorBlack,
};

var TextStyle = StyleSheet.create({
  h1: {
    ...textStyleCommon,
    fontSize: UtilityFunctions.getFontSizeWithScale(24),
    lineHeight: UtilityFunctions.getFontSizeWithScale(30),
    fontWeight: '600',
  },
  h2: {
    ...textStyleCommon,
    fontSize: UtilityFunctions.getFontSizeWithScale(22),
    lineHeight: UtilityFunctions.getFontSizeWithScale(28),
    fontWeight: '500',
  },
  h3: {
    ...textStyleCommon,
    fontSize: UtilityFunctions.getFontSizeWithScale(20),
    lineHeight: UtilityFunctions.getFontSizeWithScale(25),
    fontWeight: '500',
  },
  h4: {
    ...textStyleCommon,
    fontSize: UtilityFunctions.getFontSizeWithScale(18),
    lineHeight: UtilityFunctions.getFontSizeWithScale(23),
    fontWeight: '400',
  },
  h5: {
    ...textStyleCommon,
    fontSize: UtilityFunctions.getFontSizeWithScale(16),
    lineHeight: UtilityFunctions.getFontSizeWithScale(20),
    fontWeight: '400',
  },
  h6: {
    ...textStyleCommon,
    fontSize: UtilityFunctions.getFontSizeWithScale(14),
    lineHeight: UtilityFunctions.getFontSizeWithScale(18),
    fontWeight: '400',
  },

  textPrimary: {
    ...textStyleCommon,
    fontSize: UtilityFunctions.getFontSizeWithScale(12),
    lineHeight: UtilityFunctions.getFontSizeWithScale(16),
  },
  textSecondary: {
    ...textStyleCommon,
    fontSize: UtilityFunctions.getFontSizeWithScale(10),
    lineHeight: UtilityFunctions.getFontSizeWithScale(16),
  },
});

// var TextStyle = StyleSheet.create({
//   h1: {
//     ...textStyleCommon,
//     fontSize: UtilityFunctions.getFontSizeWithScale(28), // Increased for better hierarchy
//     lineHeight: UtilityFunctions.getFontSizeWithScale(36),
//     fontWeight: '700', // Bold for main headlines
//   },
//   h2: {
//     ...textStyleCommon,
//     fontSize: UtilityFunctions.getFontSizeWithScale(24), // Better contrast with H1
//     lineHeight: UtilityFunctions.getFontSizeWithScale(30),
//     fontWeight: '600',
//   },
//   h3: {
//     ...textStyleCommon,
//     fontSize: UtilityFunctions.getFontSizeWithScale(20),
//     lineHeight: UtilityFunctions.getFontSizeWithScale(26), // Better line height
//     fontWeight: '600', // Slightly bolder
//   },
//   h4: {
//     ...textStyleCommon,
//     fontSize: UtilityFunctions.getFontSizeWithScale(18),
//     lineHeight: UtilityFunctions.getFontSizeWithScale(24), // Better line height
//     fontWeight: '500', // Medium weight
//   },
//   h5: {
//     ...textStyleCommon,
//     fontSize: UtilityFunctions.getFontSizeWithScale(16),
//     lineHeight: UtilityFunctions.getFontSizeWithScale(22), // Better line height
//     fontWeight: '500', // Medium weight
//   },
//   h6: {
//     ...textStyleCommon,
//     fontSize: UtilityFunctions.getFontSizeWithScale(14),
//     lineHeight: UtilityFunctions.getFontSizeWithScale(20), // Better line height
//     fontWeight: '500', // Medium instead of light
//   },

//   textPrimary: {
//     ...textStyleCommon,
//     fontSize: UtilityFunctions.getFontSizeWithScale(16), // Body text should be 16px minimum
//     lineHeight: UtilityFunctions.getFontSizeWithScale(24), // 1.5x line height for readability
//     fontWeight: '400',
//   },
//   textSecondary: {
//     ...textStyleCommon,
//     fontSize: UtilityFunctions.getFontSizeWithScale(14), // Secondary text should be readable
//     lineHeight: UtilityFunctions.getFontSizeWithScale(20),
//     fontWeight: '400',
//   },
// });

export { TextStyle };
