import { PixelRatio } from 'react-native';

const UtilityFunctions = {
  getFontSizeWithScale(fontSize) {
    var fontScale = PixelRatio.getFontScale();
    var updatedFontSize = fontSize * fontScale;
    return updatedFontSize;
  },
};

export { UtilityFunctions };
