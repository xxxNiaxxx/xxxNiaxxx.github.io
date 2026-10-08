import { Alert, Platform } from 'react-native';
import { create } from 'zustand';

/**
 * Cross-platform dialogs. Native uses Alert; web renders an in-app dialog (<DialogHost />)
 * because React Native's Alert is a no-op on web and browser dialogs can be blocked
 * (e.g. inside sandboxed iframes, where confirm() returns false without asking).
 */
export interface DialogRequest {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  /** Present for confirmations; absent for plain messages. */
  resolve?: (ok: boolean) => void;
}

export const useDialogStore = create<{ current: DialogRequest | null; set: (d: DialogRequest | null) => void }>((set) => ({
  current: null,
  set: (current) => set({ current }),
}));

export function showMessage(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    useDialogStore.getState().set({ title, message });
    return;
  }
  Alert.alert(title, message, [{ text: 'Εντάξει' }]);
}

/** Resolves true when the user confirms. */
export function confirmDialog(title: string, message: string, confirmLabel: string, destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => useDialogStore.getState().set({ title, message, confirmLabel, destructive, resolve }));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Άκυρο', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}
