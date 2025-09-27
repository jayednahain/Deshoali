import { Text } from 'react-native';
import { TextStyle } from './Style';

const createTypography = style => {
  return ({ children, numberOfLines, textStyle }) => (
    <Text numberOfLines={numberOfLines} style={[style, textStyle]}>
      {children}
    </Text>
  );
};

export const H1 = createTypography(TextStyle.h1);
export const H2 = createTypography(TextStyle.h2);
export const H3 = createTypography(TextStyle.h3);
export const H4 = createTypography(TextStyle.h4);
export const H5 = createTypography(TextStyle.h5);
export const H6 = createTypography(TextStyle.h6);
export const TextPrimary = createTypography(TextStyle.textPrimary);
export const TextSecondary = createTypography(TextStyle.textSecondary);
