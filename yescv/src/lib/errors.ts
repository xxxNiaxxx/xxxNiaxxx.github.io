/**
 * Error codes the API returns. The browser maps each code to a localised
 * message, so server messages never need translating and never echo user input
 * or configuration secrets.
 */
export const errorCodes = [
  "invalid_input",
  "too_large",
  "rate_limited",
  "global_limit",
  "duplicate",
  "limiter_not_configured",
  "ai_not_configured",
  "ai_timeout",
  "ai_unavailable",
  "ai_bad_output",
  "export_failed",
  "image_invalid",
  "image_unreadable",
  "file_invalid",
  "file_no_text",
  "premium_locked",
  "checkout_unavailable",
  "purchase_pending",
  "purchase_revoked",
  "server_error",
] as const;
export type ErrorCode = (typeof errorCodes)[number];

const statusFor: Record<ErrorCode, number> = {
  invalid_input: 400,
  too_large: 413,
  rate_limited: 429,
  global_limit: 429,
  duplicate: 409,
  limiter_not_configured: 503,
  ai_not_configured: 503,
  ai_timeout: 504,
  ai_unavailable: 502,
  ai_bad_output: 502,
  export_failed: 500,
  image_invalid: 400,
  image_unreadable: 422,
  file_invalid: 400,
  file_no_text: 422,
  premium_locked: 403,
  checkout_unavailable: 503,
  purchase_pending: 404,
  purchase_revoked: 410,
  server_error: 500,
};

export class AppError extends Error {
  constructor(public readonly code: ErrorCode, public readonly detail?: string) {
    super(code);
    this.name = "AppError";
  }
  get status(): number {
    return statusFor[this.code];
  }
}
