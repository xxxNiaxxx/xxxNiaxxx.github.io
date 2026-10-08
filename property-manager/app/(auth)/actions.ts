"use server";

import { AuthError } from "next-auth";
import { ZodError } from "zod";
import { signIn, signOut } from "@/lib/auth/config";
import { AppError } from "@/lib/errors";
import { registerAccount } from "@/lib/services/accounts";

export interface AuthFormState {
  error?: string;
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
  try {
    await registerAccount({ ...values, password: String(form.get("password") ?? "") });
  } catch (e) {
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const i of e.issues) fieldErrors[String(i.path[0])] ??= i.message;
      return { error: "Διορθώστε τα σημειωμένα πεδία.", fieldErrors, values };
    }
    if (e instanceof AppError) return { error: e.message, values };
    throw e;
  }
  await signIn("credentials", { email: values.email, password: String(form.get("password")), redirectTo: "/dashboard" });
  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
