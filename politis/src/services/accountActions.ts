import { router } from 'expo-router';
import { confirmDialog, showMessage } from '@/lib/dialog';
import { useAppStore } from '@/store/appStore';
import { authService } from './authService';

/**
 * PLACEHOLDER: full server-side account deletion (an Edge Function using the service role,
 * never the client) is not part of the MVP. For now we clear all local data and sign out.
 */
export async function confirmDeleteAccount() {
  const ok = await confirmDialog(
    'Διαγραφή λογαριασμού',
    'Θα διαγραφούν το προφίλ, οι εργασίες και οι προτιμήσεις σου από αυτή τη συσκευή. Αυτή η ενέργεια δεν αναιρείται.',
    'Διαγραφή',
    true,
  );
  if (!ok) return;
  await authService.signOut();
  useAppStore.getState().reset();
  router.replace('/welcome');
}

/** PLACEHOLDER: data export. A production version would generate a JSON file and share it. */
export function exportDataPlaceholder() {
  showMessage('Εξαγωγή δεδομένων', 'Σύντομα θα μπορείς να κατεβάζεις όλα τα δεδομένα σου σε ένα αρχείο.');
}

export async function confirmSignOut(isDemo: boolean) {
  const ok = await confirmDialog(
    'Αποσύνδεση',
    isDemo ? 'Στη δοκιμαστική λειτουργία, η αποσύνδεση διαγράφει τα δεδομένα από τη συσκευή.' : 'Θέλεις σίγουρα να αποσυνδεθείς;',
    'Αποσύνδεση',
    true,
  );
  if (!ok) return;
  await authService.signOut();
  router.replace('/welcome');
}
