/** One value of the AADE stay declaration, with the AADE form's label. */
export interface DeclarationField {
  key: string;
  label: string;
  value: string | null;
  /** Left empty on the AADE form when there is no value. */
  optional?: boolean;
  /** Shown instead of a value when an optional field is empty. */
  hint?: string;
  /** Where a missing value is filled in. */
  fix?: "guest" | "reservation" | "property";
}

export interface DeclarationStep {
  kind: "start" | "copy" | "pick" | "tick" | "missing" | "end";
  title: string;
  instructions: string[];
  /** What to paste, pick or tick. */
  value?: string;
  field?: DeclarationField;
}

/** Fields picked from a list on the AADE form rather than typed. */
const LISTS = new Set(["paymentMethod", "platform"]);
/** The AADE form's label where ours says more. */
const AADE_LABEL: Record<string, string> = { bookingNumber: "Σημειώσεις" };

/**
 * The declaration as plain steps for someone on a phone: open the AADE form,
 * then each field in the form's order (copy and paste, pick from a list, or
 * tick a box), then submit. Optional fields without a value are skipped.
 */
export function declarationSteps(fields: DeclarationField[]): DeclarationStep[] {
  const ama = fields.find((f) => f.key === "ama")?.value;
  const steps: DeclarationStep[] = [
    {
      kind: "start",
      title: "Ανοίξτε τη φόρμα της ΑΑΔΕ",
      instructions: [
        "Πατήστε «Άνοιγμα ΑΑΔΕ» εδώ κάτω και μπείτε στο Μητρώο με τους κωδικούς Taxisnet.",
        ama ? `Επιλέξτε το ακίνητο με ΑΜΑ ${ama}.` : "Επιλέξτε το ακίνητό σας.",
        "Πατήστε «Υποβολή Νέας Δήλωσης».",
        "Γυρίστε σε αυτή τη σελίδα (από τις καρτέλες του browser) και πατήστε «Επόμενο».",
      ],
    },
  ];
  for (const f of fields) {
    if (f.key === "ama") continue;
    if (!f.value && f.optional) continue;
    const label = AADE_LABEL[f.key] ?? f.label;
    if (!f.value) {
      steps.push({ kind: "missing", title: label, instructions: [`Για το πεδίο «${label}» δεν έχουμε ακόμη τιμή.`], field: f });
    } else if (f.key === "foreigner") {
      steps.push({
        kind: "tick",
        title: "Αλλοδαπός",
        value: f.value,
        instructions:
          f.value === "Ναι"
            ? ["Στην ΑΑΔΕ τσεκάρετε το κουτάκι «Αλλοδαπός».", "Έτσι ανοίγουν τα πεδία για όνομα και διαβατήριο."]
            : ["Στην ΑΑΔΕ αφήστε το κουτάκι «Αλλοδαπός» κενό."],
      });
    } else if (LISTS.has(f.key)) {
      steps.push({ kind: "pick", title: label, value: f.value, instructions: [`Στην ΑΑΔΕ πατήστε στο πεδίο «${label}».`, "Διαλέξτε από τη λίστα:"] });
    } else {
      const value = f.key === "bookingNumber" ? `Αρ. κράτησης ${f.value}` : f.value;
      steps.push({
        kind: "copy",
        title: label,
        value,
        field: f,
        instructions: [
          "Πατήστε «Αντιγραφή» εδώ κάτω.",
          `Στην ΑΑΔΕ πατήστε παρατεταμένα στο πεδίο «${label}» και διαλέξτε «Επικόλληση».`,
          ...(f.key === "checkIn" || f.key === "checkOut" || f.key === "cancelDate"
            ? ["Αν ανοίξει ημερολόγιο, διαλέξτε απλώς αυτή την ημερομηνία."]
            : []),
          "Γυρίστε εδώ και πατήστε «Επόμενο».",
        ],
      });
    }
  }
  steps.push({
    kind: "end",
    title: "Υποβολή",
    instructions: [
      "Στην ΑΑΔΕ ελέγξτε ότι όλα είναι σωστά.",
      "Πατήστε «Ενέργειες» → «Υποβολή».",
      "Γυρίστε εδώ και πατήστε «Το υπέβαλα», για να το θυμάται η εφαρμογή.",
    ],
  });
  return steps;
}
