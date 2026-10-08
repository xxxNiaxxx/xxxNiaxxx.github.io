/**
 * Technical logging, kept separate from user-facing messages.
 * Never pass profile data or other personal information to the logger.
 */
type LogContext = Record<string, string | number | boolean | undefined>;

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return typeof error === 'string' ? error : 'Unknown error';
}

export const logger = {
  error(scope: string, error: unknown, context?: LogContext) {
    if (__DEV__) console.warn(`[politis:${scope}]`, describe(error), context ?? '');
    // Production: forward to a crash-reporting service here (without PII).
  },
  info(scope: string, message: string, context?: LogContext) {
    if (__DEV__) console.log(`[politis:${scope}]`, message, context ?? '');
  },
};
