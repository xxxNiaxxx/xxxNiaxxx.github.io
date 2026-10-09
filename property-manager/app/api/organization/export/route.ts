import { route } from "@/lib/api";
import { requireOrganization } from "@/lib/auth";
import { exportOrganizationData } from "@/lib/services/data-export";

/** All of the organization's data as a JSON file. Works without an active subscription. */
export const GET = route(async () => {
  const { user, membership } = await requireOrganization();
  const data = await exportOrganizationData({ userId: user.id, organizationId: membership.organizationId, role: membership.role });
  return new Response(JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="vrachychronia-${data.exportedAt.slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
