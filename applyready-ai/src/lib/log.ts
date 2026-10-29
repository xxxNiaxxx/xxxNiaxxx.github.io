/**
 * The only logger server code uses. It takes an event code and a few
 * non-sensitive fields (status codes, ids we generated, counts) — never CV
 * text, job ads, revision requests, API keys, emails or payment details.
 */
type Safe = string | number | boolean | undefined;

export function logEvent(event: string, fields: Record<string, Safe> = {}): void {
  if (process.env.NODE_ENV === "test") return;
  const clean: Record<string, Safe> = {};
  for (const [key, value] of Object.entries(fields)) {
    clean[key] = typeof value === "string" ? value.slice(0, 80) : value;
  }
  console.info(JSON.stringify({ event, ...clean }));
}
