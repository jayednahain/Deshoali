import { useSelector } from 'react-redux';

var language = require('./../AppAssets/StaticData/Language.json');

export const useAppLanguage = () => {
  const currentLanguage = useSelector(state => state.appConfig.language);

  const i18n = key => {
    try {
      if (currentLanguage === 'eng') return language[key].english;
      else return language[key].bangla;
    } catch (error) {
      console.warn(error);
      return key; // Return key as fallback
    }
  };

  return { i18n, currentLanguage };
};

export default useAppLanguage;
