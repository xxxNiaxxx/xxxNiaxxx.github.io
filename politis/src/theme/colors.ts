/**
 * Centralized color tokens. Never hardcode colors in components — import from here.
 */
export const colors = {
  primary: '#1D3F8F',
  primaryPressed: '#16316F',
  primarySoft: '#EAF0FB',
  primaryBorder: '#C9D6F2',
  onPrimary: '#FFFFFF',

  accent: '#5B4BC4',
  accentSoft: '#EFEDFB',

  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F3F8',
  border: '#E3E7EF',
  borderStrong: '#CBD2DE',

  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',

  success: '#15803D',
  successSoft: '#E7F6EC',
  warning: '#B45309',
  warningSoft: '#FEF3E2',
  danger: '#B91C1C',
  dangerSoft: '#FDECEC',
  neutral: '#64748B',
  neutralSoft: '#EEF1F5',

  skeleton: '#E7EAF1',
  overlay: 'rgba(15, 23, 42, 0.4)',
  shadow: '#0F172A',
} as const;

export type ColorToken = keyof typeof colors;

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary' | 'accent';

export const toneColors: Record<Tone, { fg: string; bg: string }> = {
  success: { fg: colors.success, bg: colors.successSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  neutral: { fg: colors.neutral, bg: colors.neutralSoft },
  primary: { fg: colors.primary, bg: colors.primarySoft },
  accent: { fg: colors.accent, bg: colors.accentSoft },
};
