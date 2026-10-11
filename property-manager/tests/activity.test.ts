import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getActivity } from "@/lib/services/activity";
import { createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-10-11T12:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

describe("live users", () => {
  beforeAll(async () => {
    await resetDatabase();
    const a = await createTenant("Online");
    const b = await createTenant("Earlier");
    const c = await createTenant("Never");
    await db.user.update({ where: { id: a.userId }, data: { lastSeenAt: minutesAgo(2), lastSeenClient: "app" } });
    await db.user.update({ where: { id: b.userId }, data: { lastSeenAt: minutesAgo(60 * 30), lastSeenClient: "web" } });
    void c;
  });

  it("counts who is online now, in the last day and week", async () => {
    const a = await getActivity(NOW);
    expect(a.online).toBe(1);
    expect(a.today).toBe(1);
    expect(a.week).toBe(2);
    expect(a.totalUsers).toBe(3);
    expect(a.items.map((i) => [i.organization, i.client, i.online])).toEqual([
      ["Online", "app", true],
      ["Earlier", "web", false],
    ]);
  });
});
