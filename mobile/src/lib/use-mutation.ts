import { useState } from "react";
import { Alert, Platform } from "react-native";
import { ApiError } from "./api";

/** Runs a change against the API; shows errors and keeps per-field messages for forms. */
export function useMutation() {
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function run<T>(fn: () => Promise<T>, opts: { errorTitle?: string; onSuccess?: (data: T) => void } = {}) {
    setPending(true);
    setFieldErrors({});
    try {
      const data = await fn();
      opts.onSuccess?.(data);
      return data;
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("Κάτι πήγε στραβά. Δοκιμάστε ξανά.", 0);
      setFieldErrors(err.fieldErrors);
      notify(opts.errorTitle ?? "Δεν αποθηκεύτηκε", err.message);
      return undefined;
    } finally {
      setPending(false);
    }
  }

  return { run, pending, fieldErrors };
}

/** Alert that also works in the browser preview (react-native-web has no Alert). */
export function notify(title: string, message?: string) {
  if (Platform.OS === "web") window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

/** Asks before a destructive action. */
export function confirm(title: string, message: string | undefined, action: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(message ? `${title}\n\n${message}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Όχι", style: "cancel" },
    { text: action, style: "destructive", onPress: onConfirm },
  ]);
}
