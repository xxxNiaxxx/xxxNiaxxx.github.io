"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "./api";

/**
 * Runs a mutation, shows success/error feedback and refreshes server data.
 * Field errors are returned so forms can show them inline.
 */
export function useMutation() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function run<T>(fn: () => Promise<T>, opts: { success?: string; onSuccess?: (data: T) => void; refresh?: boolean } = {}) {
    setPending(true);
    setFieldErrors({});
    try {
      const data = await fn();
      if (opts.success) toast.success(opts.success);
      opts.onSuccess?.(data);
      if (opts.refresh !== false) router.refresh();
      return data;
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("Κάτι πήγε στραβά. Δοκιμάστε ξανά.", 0);
      setFieldErrors(err.fieldErrors);
      toast.error(err.message);
      return undefined;
    } finally {
      setPending(false);
    }
  }

  return { run, pending, fieldErrors, setFieldErrors };
}
