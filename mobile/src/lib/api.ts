import Constants from "expo-constants";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Validation messages by field name. */
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

/**
 * Default server: EXPO_PUBLIC_API_URL, otherwise the computer running
 * `expo start` (same LAN IP the phone already reaches) on port 3000.
 */
export function defaultServerUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:3000` : "http://localhost:3000";
}

let config: { baseUrl: string; token: string | null; organizationId: string | null; onUnauthorized?: () => void } = {
  baseUrl: defaultServerUrl(),
  token: null,
  organizationId: null,
};

export function configureApi(next: Partial<typeof config>) {
  config = { ...config, ...next };
}

export function getBaseUrl() {
  return config.baseUrl;
}

/** Calls the REST API, unwraps `{ data }`, throws ApiError with a friendly message. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}${path}`, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
        // Only a preference: the server ignores teams the user is not a member of.
        ...(config.organizationId ? { "X-Organization-Id": config.organizationId } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(`Δεν υπάρχει σύνδεση με τον server (${config.baseUrl}). Ελέγξτε τη σύνδεσή σας στο internet.`, 0);
  }
  const json = (await res.json().catch(() => null)) as { data?: T; error?: { message?: string; details?: unknown } } | null;
  if (!res.ok) {
    if (res.status === 401 && config.token) config.onUnauthorized?.();
    const fieldErrors: Record<string, string> = {};
    if (Array.isArray(json?.error?.details)) {
      for (const d of json.error.details as { path?: string; message?: string }[]) {
        if (d.path && d.message) fieldErrors[d.path.split(".")[0]] ??= d.message;
      }
    }
    throw new ApiError(json?.error?.message ?? `Το αίτημα απέτυχε (${res.status})`, res.status, fieldErrors);
  }
  return json?.data as T;
}
