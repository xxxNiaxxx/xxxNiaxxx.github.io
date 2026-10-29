/**
 * Where a visitor came from (e.g. "facebook-group", "instagram-reel-a"), taken
 * from ?utm_source= by the browser and sent as a header. Only this short
 * label is logged, so we can see which post or ad works without cookies,
 * analytics or any personal data.
 */
export function cleanSource(value: string | null | undefined): string | undefined {
  const v = value?.trim().toLowerCase();
  return v && /^[a-z0-9][a-z0-9._-]{0,39}$/.test(v) ? v : undefined;
}

export function sourceFrom(request: Request): string | undefined {
  return cleanSource(request.headers.get("x-applyready-source"));
}
