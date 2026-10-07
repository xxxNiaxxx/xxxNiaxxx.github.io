/**
 * ⚠️ MOCK / DEMO DATA — NOT REAL GOVERNMENT INFORMATION.
 *
 * Authorities are generic descriptions (not specific real organisations) and every URL is a
 * safe placeholder under example.com. Production content must come from the `sources` table,
 * verified against the official publication.
 */
import type { Source } from '@/types/models';

export const MOCK_URL_BASE = 'https://example.com/politis-mock';

export function mockUrl(path: string): string {
  return `${MOCK_URL_BASE}/${path}`;
}

export function isMockUrl(url: string): boolean {
  return url.startsWith(MOCK_URL_BASE);
}

export const MOCK_AUTHORITIES = {
  welfare: 'Φορέας κοινωνικής πρόνοιας (δοκιμαστικό)',
  employment: 'Δημόσια υπηρεσία απασχόλησης (δοκιμαστικό)',
  tax: 'Φορολογική διοίκηση (δοκιμαστικό)',
  municipality: 'Δήμος κατοικίας (δοκιμαστικό)',
  education: 'Υπουργείο αρμόδιο για την παιδεία (δοκιμαστικό)',
  transport: 'Υπηρεσία μεταφορών (δοκιμαστικό)',
  citizen: 'Κέντρο εξυπηρέτησης πολιτών (δοκιμαστικό)',
  health: 'Φορέας υγείας (δοκιμαστικό)',
} as const;

export function mockSource(id: string, authority: string, path: string, lastVerified: string): Source {
  return { id: `src_${id}`, authority, url: mockUrl(path), lastVerified, isMock: true };
}
