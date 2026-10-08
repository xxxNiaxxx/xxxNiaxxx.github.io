import { route } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/auth";
import { waitlistCsv } from "@/lib/services/waitlist";

export const GET = route(async () => {
  await requirePlatformAdmin();
  return new Response(await waitlistCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
