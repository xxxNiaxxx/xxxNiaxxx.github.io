import { Alert, Platform } from 'react-native';

/** Cross-platform message dialog (React Native's Alert is a no-op on web). */
export function showMessage(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    globalThis.alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message, [{ text: 'Εντάξει' }]);
}

/** Cross-platform confirmation dialog. Resolves true when the user confirms. */
export function confirmDialog(title: string, message: string, confirmLabel: string, destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Άκυρο', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}
