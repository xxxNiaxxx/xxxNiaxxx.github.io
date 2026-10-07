import { Text, type TextProps } from 'react-native';
import { colors, maxFontScale, typography, type TypographyVariant } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

/** The only Text component used in the app — guarantees consistent typography and font scaling. */
export function AppText({ variant = 'body', color = colors.text, align, style, ...rest }: AppTextProps) {
  const isHeading = variant === 'screenTitle' || variant === 'sectionTitle';
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={maxFontScale}
      accessibilityRole={isHeading ? 'header' : undefined}
      style={[typography[variant], { color, textAlign: align }, style]}
      {...rest}
    />
  );
}
