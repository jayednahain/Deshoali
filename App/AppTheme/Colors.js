var ColorPrimary = {
  ColorPrimaryDark: '#1B34AA',
  ColorPrimary: '#2342DA',
  ColorPrimary200: '#9BABF8',
  ColorPrimary700: '#1B34AA',
  ColorPrimary500: '#2649F0',
};

// New Primary Green Color with lighter variations
var ColorPrimaryGreen = {
  ColorPrimaryGreen: '#4D870E',
  ColorPrimaryGreen50: '#A6C357',
  ColorPrimaryGreen100: '#B8CF6B',
  ColorPrimaryGreen200: '#CAD880',
  ColorPrimaryGreen300: '#DCE294',
  ColorPrimaryGreen400: '#EEEBA8',
  ColorPrimaryGreen500: '#F5F2BD',
  ColorPrimaryGreen600: '#F8F6D1',
  ColorPrimaryGreen700: '#FAFAE5',
  ColorPrimaryGreen800: '#FCFCF2',
  ColorPrimaryGreen900: '#FEFEF9',
};

// Warning and Text Colors
var ColorSystem = {
  ColorWarning: '#da4223',
  ColorTextOnLight: '#003c00', // Dark green text for white backgrounds
};

var ThemeLightColors = {
  ColorWhite: '#FFFFFF',
  ColorBlack: '#000',

  ColorGrayDark: '#101828',
  ColorGrayLight: '#667085',
  ColorGray300: '#D0D5DD',
  ColorGray50: '#F9FAFB',
  ColorGray500: '#667085',
  ColorGray700: '#344054',

  ...ColorPrimary,
  ...ColorPrimaryGreen,
  ...ColorSystem,

  ColorBlueLight: '#9BABF8',
  ColorBlue50: '#E9EDFE',
  ColorRedLight: '#F04438',
};

export { ThemeLightColors };
