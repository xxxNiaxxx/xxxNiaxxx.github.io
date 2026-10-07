import type { EligibilityStatus } from '@/types/models';
import { eligibilityPresentation } from '@/lib/labels';
import { Badge } from './ui';

export function EligibilityBadge({ status, short = false }: { status: EligibilityStatus; short?: boolean }) {
  const p = eligibilityPresentation[status];
  return <Badge label={short ? p.shortLabel : p.label} tone={p.tone} symbol={p.symbol} />;
}
