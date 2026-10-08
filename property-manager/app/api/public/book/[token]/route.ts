import { readJson, route, searchParamsObject } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { appOrigin, clientIp, tooManyAttempts } from "@/lib/request";
import { quoteStay, requestBooking } from "@/lib/services/guest-pages";

/** Public: price and availability of ?checkIn=&checkOut= on the direct booking page. */
export const GET = route<{ token: string }>(async (req, { token }) => quoteStay(token, searchParamsObject(req)));

/** Public: a booking request (becomes a pending direct reservation). */
export const POST = route<{ token: string }>(async (req, { token }) => {
  const body = (await readJson(req)) as Record<string, unknown>;
  if (body && typeof body === "object" && body.website) return { requested: true }; // honeypot
  if (tooManyAttempts(`book:${await clientIp()}`, 5, 10 * 60_000)) throw new AppError("BAD_REQUEST", "tooMany");
  return requestBooking(token, body, await appOrigin());
});
