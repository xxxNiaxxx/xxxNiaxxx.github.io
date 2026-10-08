import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { setStayDeclaration } from "@/lib/services/tax";

/** Record the AADE stay declaration status: { status: "DECLARED" | "PENDING" | "NOT_REQUIRED" } */
export const POST = route<{ id: string }>(async (req, { id }) =>
  setStayDeclaration(await requireOrganizationMember(), id, await readJson(req)),
);
