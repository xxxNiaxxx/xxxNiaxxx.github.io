"use client";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** fetch wrapper for the app's REST API: unwraps `{ data }` and throws ApiError. */
export async function api<T = unknown>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError("Σφάλμα δικτύου — ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.", 0);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = json?.error;
    const fieldErrors: Record<string, string> = {};
    if (Array.isArray(err?.details)) {
      for (const d of err.details) if (d?.path && !fieldErrors[d.path]) fieldErrors[d.path] = d.message;
    }
    throw new ApiError(err?.message ?? `Το αίτημα απέτυχε (${res.status})`, res.status, fieldErrors);
  }
  return json?.data as T;
}

/** Plain object from a form, with empty strings kept (schemas treat "" as "not set"). */
export function formValues(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v)]));
}
