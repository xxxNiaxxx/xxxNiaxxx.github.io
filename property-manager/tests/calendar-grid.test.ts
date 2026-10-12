import { describe, expect, it } from "vitest";
import { monthGrid, weekSegments } from "@/lib/calendar-grid";

describe("month grid", () => {
  it("covers the month with whole Monday–Sunday weeks", () => {
    const g = monthGrid("2026-10-12");
    expect(g.from).toBe("2026-09-28"); // 1 October 2026 is a Thursday
    expect(g.to).toBe("2026-11-02");
    expect(g.weeks).toHaveLength(5);
    expect(g.weeks[0][3]).toBe("2026-10-01");
    expect(g.weeks.at(-1)!.at(-1)).toBe("2026-11-01");
  });

  it("places each stay over its nights, in lanes that don't overlap", () => {
    const stays = [
      { id: "a", checkIn: "2026-10-04", checkOut: "2026-10-07" }, // Sun → Wed: crosses into the next week
      { id: "b", checkIn: "2026-10-05", checkOut: "2026-10-06" },
      { id: "c", checkIn: "2026-10-07", checkOut: "2026-10-09" }, // same day a leaves: same lane
    ];
    const week = weekSegments("2026-10-05", stays);
    expect(week.map((s) => [s.stay.id, s.start, s.end, s.lane, s.continuesLeft])).toEqual([
      ["a", 0, 2, 0, true],
      ["b", 0, 1, 1, false],
      ["c", 2, 4, 0, false],
    ]);
    const before = weekSegments("2026-09-28", stays);
    expect(before.map((s) => [s.stay.id, s.start, s.end, s.continuesRight])).toEqual([["a", 6, 7, true]]);
  });
});
