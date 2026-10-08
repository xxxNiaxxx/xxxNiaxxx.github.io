import { route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { deleteTransaction } from "@/lib/services/financials";

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  await deleteTransaction(await requireRole("ADMIN"), id);
  return { deleted: true };
});
