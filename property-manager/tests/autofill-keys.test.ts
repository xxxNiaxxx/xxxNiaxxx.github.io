import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { OPTIONS, GET } from "@/app/api/aade/pending/route";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { createAutofillKey, declarationsForKey, revokeAutofillKeys } from "@/lib/services/autofill-keys";
import { createReservation } from "@/lib/services/reservations";
import { signOutEverywhere } from "@/lib/services/settings";
import { setStayDeclaration } from "@/lib/services/tax";
import { createGuest, createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-10-12T10:00:00Z");

describe("«Συμπλήρωση ΑΑΔΕ» bookmark keys", () => {
  let ctx: OrgContext;
  let other: OrgContext;
  let propertyId: string;
  let guestId: string;

  beforeAll(async () => {
    // The pages read the clock themselves: pin «today» to NOW so the fixed dates below stay valid.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    await resetDatabase();
    ctx = await createTenant("Keys");
    other = await createTenant("Other");
    propertyId = (await db.property.create({
      data: { organizationId: ctx.organizationId, name: "Serene Vintage", city: "Αθήνα", country: "Ελλάδα", basePrice: 60, maxGuests: 2, ama: "00003478449", kind: "APARTMENT" },
    })).id;
    guestId = (await createGuest(ctx, "Martin", "Gjonoca")).id;
    const otherProperty = await db.property.create({ data: { organizationId: other.organizationId, name: "X", city: "Αθήνα", country: "Ελλάδα", basePrice: 60, maxGuests: 2 } });
    const otherGuest = await createGuest(other, "Not", "Mine");
    await createReservation(other, { propertyId: otherProperty.id, guestId: otherGuest.id, guestsCount: 1, checkIn: "2026-10-05", checkOut: "2026-10-08", totalAmount: 100, source: "AIRBNB" });
  });

  afterAll(() => vi.useRealTimers());

  it("lists the started stays still to be declared, the most recent first, with the form values", async () => {
    const current = await createReservation(ctx, { propertyId, guestId, guestsCount: 1, checkIn: "2026-10-11", checkOut: "2026-10-18", totalAmount: 425.53, source: "BOOKING_COM", confirmationCode: "5292188575" });
    const older = await createReservation(ctx, { propertyId, guestId, guestsCount: 1, checkIn: "2026-10-01", checkOut: "2026-10-04", totalAmount: 200, source: "AIRBNB" });
    const declared = await createReservation(ctx, { propertyId, guestId, guestsCount: 1, checkIn: "2026-09-20", checkOut: "2026-09-22", totalAmount: 150, source: "AIRBNB" });
    await setStayDeclaration(ctx, declared.id, { status: "DECLARED" });
    // Not started yet: nothing to declare today.
    await createReservation(ctx, { propertyId, guestId, guestsCount: 1, checkIn: "2026-10-25", checkOut: "2026-10-27", totalAmount: 150, source: "AIRBNB" });

    const { key } = await createAutofillKey(ctx);
    expect(key).toMatch(/^afk_[\w-]{40,}$/);
    const stays = await declarationsForKey(key, NOW);
    expect(stays.map((s) => s.reservationId)).toEqual([current.id, older.id]);
    expect(stays[0]).toMatchObject({
      guestName: "Martin Gjonoca",
      propertyName: "Serene Vintage",
      checkIn: "2026-10-11",
      checkOut: "2026-10-18",
      missing: ["Αρ. Διαβατηρίου / Ταυτότητα Ε.Ε."],
      values: { checkIn: "11/10/2026", checkOut: "18/10/2026", amount: "425,53", platform: "Booking.com", foreigner: "Ναι", guestName: "Martin Gjonoca", bookingNumber: "5292188575" },
    });
    // Only a hash of the key is stored.
    const row = await db.autofillKey.findFirstOrThrow({ where: { userId: ctx.userId } });
    expect(row.keyHash).not.toContain(key);
    expect(row.lastUsedAt).toEqual(NOW);
  });

  it("refuses unknown keys, keys of former members, and keys after signing out everywhere or revoking", async () => {
    await expect(declarationsForKey(undefined, NOW)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(declarationsForKey("afk_nope", NOW)).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const member = await db.user.create({ data: { email: "member@test.local", name: "M", passwordHash: "x" } });
    await db.organizationMember.create({ data: { organizationId: ctx.organizationId, userId: member.id, role: "MEMBER" } });
    const memberCtx: OrgContext = { userId: member.id, organizationId: ctx.organizationId, role: "MEMBER" };
    const { key: memberKey } = await createAutofillKey(memberCtx);
    expect((await declarationsForKey(memberKey, NOW)).length).toBe(2);
    await db.organizationMember.delete({ where: { organizationId_userId: { organizationId: ctx.organizationId, userId: member.id } } });
    await expect(declarationsForKey(memberKey, NOW)).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const { key: a } = await createAutofillKey(ctx);
    const { key: b } = await createAutofillKey(ctx);
    // Two bookmarks (phone and computer) work side by side.
    expect((await declarationsForKey(a, NOW)).length).toBe(2);
    expect((await declarationsForKey(b, NOW)).length).toBe(2);
    await signOutEverywhere(ctx.userId);
    await expect(declarationsForKey(a, NOW)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(declarationsForKey(b, NOW)).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const { key: c } = await createAutofillKey(ctx);
    expect(await revokeAutofillKeys(ctx.userId)).toEqual({ revoked: 1 });
    await expect(declarationsForKey(c, NOW)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("answers the AADE page cross-origin, with the key in a header and nothing cached", async () => {
    const pre = OPTIONS();
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-origin")).toBe("*");
    expect(pre.headers.get("access-control-allow-headers")).toBe("x-autofill-key");

    const { key } = await createAutofillKey(ctx);
    const ok = await GET(new NextRequest("http://localhost/api/aade/pending", { headers: { "x-autofill-key": key } }));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("access-control-allow-origin")).toBe("*");
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(((await ok.json()) as { data: unknown[] }).data.length).toBe(2);

    const bad = await GET(new NextRequest("http://localhost/api/aade/pending"));
    expect(bad.status).toBe(401);
    expect(bad.headers.get("access-control-allow-origin")).toBe("*");
  });
});
