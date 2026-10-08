/** Greek labels for every enum value shown in the UI. */
export const LABELS: Record<string, string> = {
  // Reservation status
  PENDING: "Εκκρεμεί",
  CONFIRMED: "Επιβεβαιωμένη",
  CANCELLED: "Ακυρώθηκε",
  COMPLETED: "Ολοκληρώθηκε",
  // Property status / kind
  ACTIVE: "Ενεργό",
  INACTIVE: "Ανενεργό",
  APARTMENT: "Διαμέρισμα",
  DETACHED_HOUSE: "Μονοκατοικία",
  // Task status
  TODO: "Προς εκτέλεση",
  IN_PROGRESS: "Σε εξέλιξη",
  // Priority
  LOW: "Χαμηλή",
  MEDIUM: "Μεσαία",
  HIGH: "Υψηλή",
  URGENT: "Επείγον",
  // Task type
  CLEANING: "Καθαρισμός",
  MAINTENANCE: "Συντήρηση",
  CHECK_IN: "Check-in",
  CHECK_OUT: "Check-out",
  INSPECTION: "Επιθεώρηση",
  OTHER: "Άλλο",
  // Source
  MANUAL: "Χειροκίνητη",
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  VRBO: "Vrbo",
  EXPEDIA: "Expedia / Hotels.com",
  AGODA: "Agoda",
  TRIP_COM: "Trip.com",
  HOLIDU: "Holidu",
  HOMETOGO: "HomeToGo",
  TRAVEL_AGENCY: "Ταξιδιωτικό γραφείο",
  DIRECT: "Απευθείας",
  // Transaction
  INCOME: "Έσοδο",
  EXPENSE: "Έξοδο",
  BOOKING: "Κρατήσεις",
  UTILITIES: "Λογαριασμοί (ΔΕΚΟ)",
  SUPPLIES: "Αναλώσιμα",
  PLATFORM_FEE: "Προμήθεια πλατφόρμας",
  // Roles
  OWNER: "Ιδιοκτήτης",
  ADMIN: "Διαχειριστής",
  MEMBER: "Μέλος",
  // Messages
  INBOUND: "Εισερχόμενο",
  OUTBOUND: "Εξερχόμενο",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  INTERNAL: "Εσωτερικό",
  DRAFT: "Πρόχειρο",
  SENT: "Στάλθηκε",
  FAILED: "Απέτυχε",
  // AI actions
  PROPOSED: "Προς έγκριση",
  APPROVED: "Εγκρίθηκε",
  EXECUTED: "Εκτελέστηκε",
  REJECTED: "Απορρίφθηκε",
  // Stay declarations
  DECLARED: "Δηλώθηκε",
  NOT_REQUIRED: "Δεν απαιτείται",
  // Tax regime
  AUTO: "Αυτόματο",
  INDIVIDUAL: "Ιδιώτης",
  BUSINESS: "Επιχείρηση",
};

export function label(value: string) {
  return LABELS[value] ?? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}
