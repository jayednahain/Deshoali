import { PixelRatio } from 'react-native';
import AppStore from './../ReduxStore/store';

const UtilityFunctions = {
  getFontSizeWithScale(fontSize) {
    var fontScale = PixelRatio.getFontScale();
    var updatedFontSize = fontSize * fontScale;
    return updatedFontSize;
  },

  getNumbersFromString(val, padLength) {
    if (typeof val === 'undefined' || val === null || val === 'null') return;
    const state = AppStore.getState();
    const language =
      state.appConfig?.language || state.themeAndLanguage?.language;

    // Pad the number if padLength is specified
    let str = val.toString();
    if (padLength && typeof padLength === 'number') {
      str = str.padStart(padLength, '0');
    }

    if (language === 'bng') {
      var mapObj = {
        0: '০',
        1: '১',
        2: '২',
        3: '৩',
        4: '৪',
        5: '৫',
        6: '৬',
        7: '৭',
        8: '৮',
        9: '৯',
      };
      str = str.replace(/0|1|2|3|4|5|6|7|8|9/gi, function (matched) {
        return mapObj[matched];
      });
    }
    return str;
  },
};

export { UtilityFunctions };
