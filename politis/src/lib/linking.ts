import * as WebBrowser from 'expo-web-browser';
import { isMockUrl } from '@/data/mock';
import { analytics, type AnalyticsProps } from './analytics';
import { showMessage } from './dialog';
import { logger } from './logger';

/**
 * Opens an official source. Mock/demo URLs are never opened as if they were official pages —
 * the user is told the content is demo data instead.
 */
export async function openOfficialUrl(url: string, props?: AnalyticsProps): Promise<void> {
  analytics.track('official_link_clicked', props);
  if (isMockUrl(url)) {
    showMessage(
      'Δοκιμαστική πηγή',
      'Αυτό το περιεχόμενο είναι δοκιμαστικό. Στην πλήρη έκδοση, εδώ θα ανοίγει η επίσημη σελίδα του αρμόδιου φορέα.',
    );
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch (error) {
    logger.error('linking.open', error);
    showMessage('Κάτι πήγε στραβά.', 'Δεν μπορέσαμε να ανοίξουμε τη σελίδα. Δοκίμασε ξανά.');
  }
}
