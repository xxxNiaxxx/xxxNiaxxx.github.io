"use server";

import { AuthError } from "next-auth";
import { ZodError } from "zod";
import { signIn, signOut } from "@/lib/auth/config";
import { AppError } from "@/lib/errors";
import { appOrigin, clientIp, tooManyAttempts } from "@/lib/request";
import { registerAccount } from "@/lib/services/accounts";
import { joinWaitlist } from "@/lib/services/waitlist";

export interface AuthFormState {
  error?: string;
  done?: boolean;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

function safeNext(next: FormDataEntryValue | null) {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

export async function loginAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "");
  try {
    await signIn("credentials", {
      email,
      password: String(form.get("password") ?? ""),
      redirectTo: safeNext(form.get("next")),
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError) return { error: "Λάθος email ή κωδικός.", values: { email } };
    throw e; // NEXT_REDIRECT must propagate
  }
}

export async function registerAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const values = {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    organizationName: String(form.get("organizationName") ?? ""),
  };
  const invite = String(form.get("invite") ?? "") || undefined;
  const access = String(form.get("access") ?? "") || undefined;
  try {
    await registerAccount({
      ...values,
      organizationName: values.organizationName || undefined,
      invite,
      access,
      password: String(form.get("password") ?? ""),
    });
  } catch (e) {
    if (e instanceof ZodError) return { error: "Διορθώστε τα σημειωμένα πεδία.", fieldErrors: fieldErrorsOf(e), values };
    if (e instanceof AppError) return { error: e.message, values };
    throw e;
  }
  await signIn("credentials", { email: values.email, password: String(form.get("password")), redirectTo: "/dashboard" });
  return {};
}

const fieldErrorsOf = (e: ZodError) => {
  const fieldErrors: Record<string, string> = {};
  for (const i of e.issues) fieldErrors[String(i.path[0])] ??= i.message;
  return fieldErrors;
};

export async function waitlistAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const platforms = form.getAll("platforms").map(String);
  const values: Record<string, string> = {
    ...Object.fromEntries(["name", "email", "phone", "city", "propertiesCount", "regime", "device", "playEmail", "message"].map((k) => [k, String(form.get(k) ?? "")])),
    platforms: platforms.join(","),
    consent: form.get("consent") === "on" ? "on" : "",
  };
  // Hidden field that people never see; bots fill it in.
  if (String(form.get("website") ?? "")) return { done: true };
  if (tooManyAttempts(`waitlist:${await clientIp()}`, 5, 10 * 60_000)) {
    return { error: "Πολλές αιτήσεις σε λίγο χρόνο. Δοκιμάστε ξανά σε λίγα λεπτά.", values };
  }
  try {
    await joinWaitlist(
      { ...values, platforms, consent: values.consent === "on" },
      await appOrigin(),
    );
    return { done: true };
  } catch (e) {
    if (e instanceof ZodError) return { error: "Διορθώστε τα σημειωμένα πεδία.", fieldErrors: fieldErrorsOf(e), values };
    if (e instanceof AppError) return { error: e.message, values };
    throw e;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

/** Signs out and comes back to the given page after signing in with another account. */
export async function switchAccountAction(form: FormData) {
  const next = safeNext(form.get("next"));
  await signOut({ redirectTo: `/login?next=${encodeURIComponent(next)}` });
}
