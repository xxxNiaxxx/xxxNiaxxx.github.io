// Kept in sync with property-manager (lib/constants.ts, lib/tax/gr.ts, lib/i18n/guest-language.ts).

export const TASK_TYPES = ["CLEANING", "MAINTENANCE", "CHECK_IN", "CHECK_OUT", "INSPECTION", "OTHER"] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

/** Common task titles, grouped by task type. */
export const TASK_TITLE_PRESETS: Record<TaskType, string[]> = {
  CLEANING: ["Καθαρισμός αλλαγής", "Βαθύς καθαρισμός", "Αλλαγή λευκών ειδών", "Καθαρισμός πισίνας"],
  CHECK_IN: ["Προετοιμασία άφιξης", "Υποδοχή επισκεπτών", "Παράδοση κλειδιών"],
  CHECK_OUT: ["Έλεγχος αναχώρησης", "Παραλαβή κλειδιών"],
  MAINTENANCE: ["Επισκευή υδραυλικών", "Επισκευή ηλεκτρολογικών", "Συντήρηση κλιματιστικού", "Κηπουρική", "Απεντόμωση"],
  INSPECTION: ["Έλεγχος ακινήτου", "Έλεγχος πυροσβεστήρα & ανιχνευτών καπνού", "Απογραφή εξοπλισμού"],
  OTHER: ["Ανεφοδιασμός αναλωσίμων", "Αγορές για το κατάλυμα"],
};

export const RESERVATION_SOURCES = ["MANUAL", "AIRBNB", "BOOKING_COM", "DIRECT", "OTHER"] as const;

export const TRANSACTION_CATEGORIES = ["BOOKING", "CLEANING", "MAINTENANCE", "UTILITIES", "SUPPLIES", "PLATFORM_FEE", "OTHER"] as const;

export const COMPLIANCE_ITEMS = [
  { key: "fireExtinguisher", label: "Πυροσβεστήρας" },
  { key: "smokeDetectors", label: "Ανιχνευτές καπνού" },
  { key: "firstAidKit", label: "Φαρμακείο πρώτων βοηθειών" },
  { key: "emergencyLighting", label: "Φωτισμός ασφαλείας & σήμανση εξόδων" },
  { key: "electricianDeclaration", label: "Υπεύθυνη δήλωση ηλεκτρολόγου" },
  { key: "amaDisplayed", label: "Ο ΑΜΑ εμφανίζεται σε κάθε αγγελία" },
] as const;

export const GUEST_LANGUAGES = [
  { code: "el", name: "Ελληνικά" },
  { code: "en", name: "Αγγλικά" },
  { code: "de", name: "Γερμανικά" },
  { code: "fr", name: "Γαλλικά" },
  { code: "it", name: "Ιταλικά" },
  { code: "es", name: "Ισπανικά" },
  { code: "pt", name: "Πορτογαλικά" },
  { code: "nl", name: "Ολλανδικά" },
  { code: "pl", name: "Πολωνικά" },
  { code: "cs", name: "Τσεχικά" },
  { code: "sv", name: "Σουηδικά" },
  { code: "sr", name: "Σερβικά" },
] as const;

export const languageName = (code: string | null | undefined) => GUEST_LANGUAGES.find((l) => l.code === code)?.name ?? code ?? "";

export const MEMORY_KIND_LABELS = {
  GUEST_INFO: "Πληροφορία για επισκέπτες",
  PREFERENCE: "Προτίμηση ομάδας",
  MESSAGE_TEMPLATE: "Πρότυπο μηνύματος",
} as const;

export const MESSAGE_KIND_LABELS: Record<string, string> = { checkin: "Οδηγίες άφιξης", thanks: "Ευχαριστήριο", general: "Γενικό" };
