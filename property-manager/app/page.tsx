import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { Landing } from "@/components/landing/landing";

/** Signed in: the dashboard. Otherwise: what the app is, and the waitlist. */
export default async function Home() {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");
  return <Landing />;
}
