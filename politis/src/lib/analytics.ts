/**
 * Privacy-respecting analytics abstraction.
 *
 * - Only a fixed set of product events is allowed.
 * - Properties are restricted to an allowlist of NON-personal values (content ids, counts, screen names).
 * - Profile data (age, income, children, region…) is never sent.
 * - Users can opt out from the Profile screen; the env flag can disable it globally.
 */
import { env } from './env';
import { logger } from './logger';

export type AnalyticsEvent =
  | 'signup_completed'
  | 'profile_completed'
  | 'home_viewed'
  | 'search_performed'
  | 'assistant_question'
  | 'benefit_viewed'
  | 'eligibility_started'
  | 'eligibility_completed'
  | 'procedure_started'
  | 'official_link_clicked'
  | 'task_created'
  | 'task_completed'
  | 'notification_opened'
  | 'paywall_viewed'
  | 'plus_activated';

export interface AnalyticsProps {
  /** Content id (benefit / procedure / task) — never a user identifier. */
  contentId?: string;
  contentType?: 'benefit' | 'procedure' | 'task';
  /** Eligibility status or similar coarse outcome. */
  result?: string;
  resultCount?: number;
  screen?: string;
  method?: 'email' | 'demo';
  /** e.g. 'mock' | 'remote' for the assistant. */
  mode?: string;
}

const ALLOWED_KEYS: (keyof AnalyticsProps)[] = ['contentId', 'contentType', 'result', 'resultCount', 'screen', 'method', 'mode'];

export interface AnalyticsSink {
  track(event: AnalyticsEvent, props: AnalyticsProps): void;
}

const devSink: AnalyticsSink = {
  track(event, props) {
    logger.info('analytics', event, props as Record<string, string | number | undefined>);
  },
};

let sink: AnalyticsSink = devSink;
let userOptedIn = true;

function sanitize(props: AnalyticsProps | undefined): AnalyticsProps {
  if (!props) return {};
  const clean: AnalyticsProps = {};
  for (const key of ALLOWED_KEYS) {
    const value = props[key];
    if (value !== undefined) (clean as Record<string, unknown>)[key] = value;
  }
  return clean;
}

export const analytics = {
  /** Plug in a real (privacy-friendly) provider here. */
  setSink(next: AnalyticsSink) {
    sink = next;
  },
  setOptIn(optIn: boolean) {
    userOptedIn = optIn;
  },
  track(event: AnalyticsEvent, props?: AnalyticsProps) {
    if (!env.analyticsEnabled || !userOptedIn) return;
    try {
      sink.track(event, sanitize(props));
    } catch (error) {
      logger.error('analytics', error);
    }
  },
};
