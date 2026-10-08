import { readJson, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { clientIp, tooManyAttempts } from "@/lib/request";
import { submitCheckin } from "@/lib/services/guest-pages";

/** Public: the guest submits the online check-in (token = the secret link). */
export const POST = route<{ token: string }>(async (req, { token }) => {
  if (tooManyAttempts(`checkin:${await clientIp()}`, 20, 10 * 60_000)) throw new AppError("BAD_REQUEST", "tooMany");
  return submitCheckin(token, await readJson(req));
});
