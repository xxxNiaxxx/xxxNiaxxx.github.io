import { created, route } from "@/lib/api";
import { requireOrganizationMember, requireUser } from "@/lib/auth";
import { createAutofillKey, revokeAutofillKeys } from "@/lib/services/autofill-keys";

/** A key for a new «Συμπλήρωση ΑΑΔΕ» bookmark. */
export const POST = route(async () => created(await createAutofillKey(await requireOrganizationMember())));

/** Turns off all the user's bookmarks. */
export const DELETE = route(async () => revokeAutofillKeys((await requireUser()).id));
