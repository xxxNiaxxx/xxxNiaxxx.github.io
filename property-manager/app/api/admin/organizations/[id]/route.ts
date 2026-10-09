import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/auth";
import { setBillingExempt } from "@/lib/services/billing";

/** { billingExempt } — free of charge, e.g. partners and testers. */
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  await requirePlatformAdmin();
  const { billingExempt } = z.object({ billingExempt: z.boolean() }).parse(await readJson(req));
  return setBillingExempt(id, billingExempt);
});
