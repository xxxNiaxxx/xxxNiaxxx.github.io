import { describe, expect, it } from "vitest";
import { ACCESS_DAYS, approvalMessage, internationalPhone } from "@/lib/waitlist-options";

describe("sharing an approval link", () => {
  it("turns Greek and international numbers into wa.me digits", () => {
    expect(internationalPhone("694 818 8872")).toBe("306948188872");
    expect(internationalPhone("+30 694-818-8872")).toBe("306948188872");
    expect(internationalPhone("0049 151 23456789")).toBe("4915123456789");
    expect(internationalPhone("2310 123456")).toBe("302310123456");
    expect(internationalPhone("12345")).toBeNull();
    expect(internationalPhone(null)).toBeNull();
  });

  it("writes a short personal message with the link", () => {
    const m = approvalMessage("Μαρία Παπαδοπούλου", "https://x.test/waitlist/access/abc", "Δήμητρα Χ.");
    expect(m).toContain("Γεια σας Μαρία!");
    expect(m).toContain("Είμαι η Δήμητρα, οικοδέσποινα κι εγώ.");
    expect(m).toContain(`ισχύει ${ACCESS_DAYS} ημέρες`);
    expect(m).toContain("https://x.test/waitlist/access/abc");
    // Without a sender name it still reads well.
    expect(approvalMessage("Anna", "https://x.test/a")).not.toContain("Είμαι η");
  });
});
