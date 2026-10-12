import { describe, expect, it } from "vitest";
import { declarationSteps } from "@/lib/declaration-steps";

describe("step-by-step declaration", () => {
  it("opens the form, then each field the way it is filled on the AADE form, then submits", () => {
    const steps = declarationSteps([
      { key: "ama", label: "Αρ. Μητρώου Ακινήτου (ΑΜΑ)", value: "00003478449" },
      { key: "checkIn", label: "Άφιξη", value: "11/10/2026" },
      { key: "paymentMethod", label: "Τρόπος πληρωμής μισθώματος", value: "Λογαριασμός Πληρωμών Ημεδαπής" },
      { key: "platform", label: "Ηλεκτρονική πλατφόρμα", value: null, optional: true },
      { key: "foreigner", label: "Αλλοδαπός", value: "Ναι" },
      { key: "idNumber", label: "Αρ. Διαβατηρίου / Ταυτότητα Ε.Ε.", value: null, fix: "guest" },
      { key: "bookingNumber", label: "Σημειώσεις: αριθμός κράτησης", value: "5292188575", optional: true },
    ]);
    expect(steps.map((s) => s.kind)).toEqual(["start", "copy", "pick", "tick", "missing", "copy", "end"]);
    expect(steps[0].instructions.join(" ")).toContain("ΑΜΑ 00003478449");
    expect(steps[5]).toMatchObject({ title: "Σημειώσεις", value: "Αρ. κράτησης 5292188575" });
  });
});
