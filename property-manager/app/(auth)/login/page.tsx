import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your properties.</p>
      <LoginForm next={next} />
      <p className="mt-6 text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-border-strong bg-surface p-4 text-[13px] text-muted-foreground">
        <p className="font-medium text-foreground">Demo account</p>
        <p className="mt-1">
          demo@demo-hospitality.test · <span className="font-mono">demo1234</span>
        </p>
      </div>
    </>
  );
}
