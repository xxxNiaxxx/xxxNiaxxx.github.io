import type { Urgency } from '@/types/models';
import type { Tone } from '@/theme';

export const urgencyPresentation: Record<Urgency, { label: string; tone: Tone; symbol: string }> = {
  overdue: { label: 'Έληξε', tone: 'danger', symbol: '⛔' },
  high: { label: 'Επείγον', tone: 'danger', symbol: '❗' },
  medium: { label: 'Σύντομα', tone: 'warning', symbol: '⏳' },
  low: { label: 'Χωρίς βιασύνη', tone: 'neutral', symbol: '🗓️' },
  none: { label: 'Χωρίς προθεσμία', tone: 'neutral', symbol: '•' },
};
