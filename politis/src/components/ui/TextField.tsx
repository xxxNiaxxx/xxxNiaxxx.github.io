import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, maxFontScale, radius, spacing, typography } from '@/theme';
import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({ label, hint, error, style, ...rest }, ref) {
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color={colors.textSecondary}>
        {label}
      </AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.textMuted}
        maxFontSizeMultiplier={maxFontScale}
        style={[styles.input, error ? { borderColor: colors.danger } : null, style]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityRole="alert">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color={colors.textMuted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  input: {
    ...typography.body,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    color: colors.text,
  },
});
