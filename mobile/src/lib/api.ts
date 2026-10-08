import Constants from "expo-constants";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
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

let config: { baseUrl: string; token: string | null; onUnauthorized?: () => void } = {
  baseUrl: defaultServerUrl(),
  token: null,
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
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(`Can't reach the server at ${config.baseUrl}. Is it running and on the same Wi-Fi?`, 0);
  }
  const json = (await res.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
  if (!res.ok) {
    if (res.status === 401 && config.token) config.onUnauthorized?.();
    throw new ApiError(json?.error?.message ?? `Request failed (${res.status})`, res.status);
  }
  return json?.data as T;
}
