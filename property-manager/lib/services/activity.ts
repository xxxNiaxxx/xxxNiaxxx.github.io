import { db } from "@/lib/db";

export const ONLINE_MINUTES = 5;

/**
 * Who is using the app (for the app's administrators): signed-in users by
 * their last request, with their organization and how far they have set it up.
 */
export async function getActivity(now = new Date()) {
  const since = (ms: number) => new Date(now.getTime() - ms);
  const users = await db.user.findMany({
    where: { lastSeenAt: { gte: since(30 * 86_400_000) } },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      lastSeenAt: true,
      lastSeenClient: true,
      memberships: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          organization: {
            select: { name: true, isDemo: true, _count: { select: { properties: true, reservations: true } } },
          },
        },
      },
    },
  });
  const [totalUsers, newThisWeek] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since(7 * 86_400_000) } } }),
  ]);
  const items = users.map((u) => {
    const org = u.memberships[0]?.organization;
    const seen = u.lastSeenAt!;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      joinedAt: u.createdAt.toISOString(),
      lastSeenAt: seen.toISOString(),
      client: u.lastSeenClient === "app" ? ("app" as const) : ("web" as const),
      online: now.getTime() - seen.getTime() <= ONLINE_MINUTES * 60_000,
      organization: org?.name ?? null,
      demo: org?.isDemo ?? false,
      properties: org?._count.properties ?? 0,
      reservations: org?._count.reservations ?? 0,
    };
  });
  const count = (ms: number) => items.filter((i) => now.getTime() - new Date(i.lastSeenAt).getTime() <= ms).length;
  return {
    items,
    online: items.filter((i) => i.online).length,
    today: count(86_400_000),
    week: count(7 * 86_400_000),
    totalUsers,
    newThisWeek,
    checkedAt: now.toISOString(),
  };
}

export type ActivityDTO = Awaited<ReturnType<typeof getActivity>>;
