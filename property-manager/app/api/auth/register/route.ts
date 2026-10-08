import { created, readJson, route } from "@/lib/api";
import { registerAccount } from "@/lib/services/accounts";

export const POST = route(async (req) => {
  const { userId, organizationId } = await registerAccount(await readJson(req));
  return created({ userId, organizationId });
});
