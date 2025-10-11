import { Text } from 'react-native';
import { TextStyle } from './Style';

const createTypography = style => {
  return ({ children, numberOfLines, textStyle }) => (
    <Text numberOfLines={numberOfLines} style={[style, textStyle]}>
      {children}
    </Text>
  );
};

const H1 = createTypography(TextStyle.h1);
const H2 = createTypography(TextStyle.h2);
const H3 = createTypography(TextStyle.h3);
const H4 = createTypography(TextStyle.h4);
const H5 = createTypography(TextStyle.h5);
const H6 = createTypography(TextStyle.h6);
const TextPrimary = createTypography(TextStyle.textPrimary);
const TextSecondary = createTypography(TextStyle.textSecondary);

export { H1, H2, H3, H4, H5, H6, TextPrimary, TextSecondary };
