import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { checkinLink } from "@/lib/services/guest-pages";

/** The guest's online check-in link → { path } */
export const POST = route<{ id: string }>(async (_req, { id }) => checkinLink(await requireOrganizationMember(), id));
