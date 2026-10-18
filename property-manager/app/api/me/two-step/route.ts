import QRCode from "qrcode";
import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { confirmTwoStep, disableTwoStep, startTwoStep, twoStepStatus } from "@/lib/services/security";

export const GET = route(async () => twoStepStatus((await requireUser()).id));

const body = z.object({ action: z.enum(["start", "confirm", "disable"]) }).passthrough();

/**
 * Two-step sign-in: "start" returns the secret and a QR code for the
 * authenticator app, "confirm" (with a code) turns it on and returns the
 * recovery codes, "disable" (with the password) turns it off.
 */
export const POST = route(async (req) => {
  const user = await requireUser();
  const input = body.parse(await readJson(req));
  if (input.action === "start") {
    const { secret, uri } = await startTwoStep(user.id);
    return { secret, uri, qrSvg: await QRCode.toString(uri, { type: "svg", margin: 1, width: 180 }) };
  }
  if (input.action === "confirm") return confirmTwoStep(user.id, input);
  await disableTwoStep(user.id, input);
  return { ok: true };
});
