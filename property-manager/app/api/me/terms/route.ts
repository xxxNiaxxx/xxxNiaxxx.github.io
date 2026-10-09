import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { acceptTerms } from "@/lib/services/settings";

/** Accepts the current terms of service and data processing agreement. */
export const POST = route(async () => acceptTerms((await requireUser()).id));
