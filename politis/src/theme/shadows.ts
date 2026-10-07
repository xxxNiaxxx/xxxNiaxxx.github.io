import { Platform, type ViewStyle } from 'react-native';
import { colors } from './colors';

export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: { shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
    android: { elevation: 1 },
    default: { boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)' } as ViewStyle,
  }),
  floating: Platform.select<ViewStyle>({
    ios: { shadowColor: colors.shadow, shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 6 },
    default: { boxShadow: '0 6px 20px rgba(15, 23, 42, 0.16)' } as ViewStyle,
  }),
};
