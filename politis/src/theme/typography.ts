import type { TextStyle } from 'react-native';

/**
 * Centralized typography tokens. Sizes follow the Politis spec.
 * Text scales with the OS font size (allowFontScaling) up to `maxFontScale`.
 */
export const typography = {
  screenTitle: { fontSize: 30, lineHeight: 38, fontWeight: '700', letterSpacing: -0.4 },
  sectionTitle: { fontSize: 21, lineHeight: 28, fontWeight: '600', letterSpacing: -0.2 },
  cardTitle: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  subtitle: { fontSize: 17, lineHeight: 25, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  captionStrong: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  button: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export const maxFontScale = 1.6;
