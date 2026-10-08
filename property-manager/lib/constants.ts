export const TASK_TYPES = ["CLEANING", "MAINTENANCE", "CHECK_IN", "CHECK_OUT", "INSPECTION", "OTHER"] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

/** Common task titles offered in the task form, grouped by task type. */
export const TASK_TITLE_PRESETS: Record<(typeof TASK_TYPES)[number], string[]> = {
  CLEANING: ["Καθαρισμός αλλαγής", "Βαθύς καθαρισμός", "Αλλαγή λευκών ειδών", "Καθαρισμός πισίνας"],
  CHECK_IN: ["Προετοιμασία άφιξης", "Υποδοχή επισκεπτών", "Παράδοση κλειδιών"],
  CHECK_OUT: ["Έλεγχος αναχώρησης", "Παραλαβή κλειδιών"],
  MAINTENANCE: ["Επισκευή υδραυλικών", "Επισκευή ηλεκτρολογικών", "Συντήρηση κλιματιστικού", "Κηπουρική", "Απεντόμωση"],
  INSPECTION: ["Έλεγχος ακινήτου", "Έλεγχος πυροσβεστήρα & ανιχνευτών καπνού", "Απογραφή εξοπλισμού"],
  OTHER: ["Ανεφοδιασμός αναλωσίμων", "Αγορές για το κατάλυμα"],
};
