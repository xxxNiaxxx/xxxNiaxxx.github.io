import { created, readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { createInvitation, listInvitations } from "@/lib/services/invitations";

/** Pending invitations (owner/admin only; empty for members). */
export const GET = route(async () => listInvitations(await requireOrganizationMember()));

/** { email, role: "MEMBER" | "ADMIN" } → { invitation, token, path } — share `origin + path`. */
export const POST = route(async (req) => created(await createInvitation(await requireOrganizationMember(), await readJson(req))));
