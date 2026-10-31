import { describe, expect, it } from "vitest";
import { daysSince, followUpDue, newApplication, parseApplications, sortApplications, type TrackedApplication } from "@/lib/tracker";

const now = new Date("2027-03-10T10:00:00Z");
const app = (over: Partial<TrackedApplication>): TrackedApplication => ({ id: "x", company: "Hotel A", role: "Receptionist", sentOn: "2027-03-01", status: "sent", ...over });

describe("tracker", () => {
  it("counts days and knows when a follow-up is due", () => {
    expect(daysSince("2027-03-03", now)).toBe(7);
    expect(followUpDue(app({ sentOn: "2027-03-03" }), now)).toBe(true);
    expect(followUpDue(app({ sentOn: "2027-03-05" }), now)).toBe(false);
    expect(followUpDue(app({ sentOn: "2027-03-01", status: "interview" }), now)).toBe(false);
  });
  it("creates trimmed entries dated today", () => {
    const created = newApplication("  Hotel Β  ", " Σερβιτόρος ", now);
    expect(created).toMatchObject({ company: "Hotel Β", role: "Σερβιτόρος", sentOn: "2027-03-10", status: "sent" });
  });
  it("ignores damaged or foreign data in storage", () => {
    expect(parseApplications("not json")).toEqual([]);
    expect(parseApplications(JSON.stringify([app({}), { id: 1 }, app({ status: "hired" as never })]))).toHaveLength(1);
  });
  it("puts due follow-ups first, then newest", () => {
    const list = sortApplications([app({ id: "new", sentOn: "2027-03-09" }), app({ id: "due", sentOn: "2027-02-20" }), app({ id: "old", sentOn: "2027-02-01", status: "rejected" })], now);
    expect(list.map((a) => a.id)).toEqual(["due", "new", "old"]);
  });
});
