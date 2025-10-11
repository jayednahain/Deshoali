import { PixelRatio } from 'react-native';
import { useSelector } from 'react-redux';

export const useUtilityFunctions = () => {
  const language = useSelector(state => state.appConfig.language);

  const getFontSizeWithScale = fontSize => {
    var fontScale = PixelRatio.getFontScale();
    var updatedFontSize = fontSize * fontScale;
    return updatedFontSize;
  };

  const getNumbersFromString = val => {
    if (typeof val === 'undefined' || val == null || val == 'null') return;
    let str = val.toString();
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
  };

  return {
    getFontSizeWithScale,
    getNumbersFromString,
    language,
  };
};
