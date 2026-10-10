/**
 * Values for the AADE short-term stay declaration (Μητρώο Ακινήτων
 * Βραχυχρόνιας Διαμονής). Shared by server and browser code.
 */

export const GUEST_ID_TYPES = {
  ID_CARD: "Δελτίο ταυτότητας",
  PASSPORT: "Διαβατήριο",
  TAX_ID: "ΑΦΜ",
} as const;
export type GuestIdType = keyof typeof GUEST_ID_TYPES;
export const GUEST_ID_TYPE_KEYS = Object.keys(GUEST_ID_TYPES) as [GuestIdType, ...GuestIdType[]];

/** Labels as in the AADE form's «Τρόπος πληρωμής μισθώματος» list, plus card (POS) payments. */
export const PAYMENT_METHODS = {
  PAYMENT_ACCOUNT_GR: "Λογαριασμός Πληρωμών Ημεδαπής",
  PAYMENT_ACCOUNT_FOREIGN: "Λογαριασμός Πληρωμών Αλλοδαπής",
  CARD: "Κάρτα (POS)",
  CASH: "Μετρητά",
  OTHER: "Λοιποί",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;
export const PAYMENT_METHOD_KEYS = Object.keys(PAYMENT_METHODS) as [PaymentMethod, ...PaymentMethod[]];

/** Booking platforms pay the host into a bank account; direct stays have no default. */
export function defaultPaymentMethod(source: string): PaymentMethod | null {
  return ["DIRECT", "MANUAL", "OTHER", "TRAVEL_AGENCY"].includes(source) ? null : "PAYMENT_ACCOUNT_GR";
}

/** The option to pick in the AADE «Τρόπος πληρωμής μισθώματος» list: card (POS) payments settle into a Greek payment account. */
export const AADE_PAYMENT_OPTION: Record<PaymentMethod, string> = {
  PAYMENT_ACCOUNT_GR: PAYMENT_METHODS.PAYMENT_ACCOUNT_GR,
  PAYMENT_ACCOUNT_FOREIGN: PAYMENT_METHODS.PAYMENT_ACCOUNT_FOREIGN,
  CARD: PAYMENT_METHODS.PAYMENT_ACCOUNT_GR,
  CASH: PAYMENT_METHODS.CASH,
  OTHER: PAYMENT_METHODS.OTHER,
};

/**
 * The option to pick in the AADE «Ηλεκτρονική πλατφόρμα» list. Vrbo is the
 * former HomeAway; platforms AADE does not list go under «Άλλες ψηφιακές
 * πλατφόρμες». Sources not listed here were not booked through a platform.
 */
export const OTHER_PLATFORMS = "Άλλες ψηφιακές πλατφόρμες";
export const PLATFORM_NAMES: Record<string, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  VRBO: "HomeAway",
  EXPEDIA: OTHER_PLATFORMS,
  AGODA: OTHER_PLATFORMS,
  TRIP_COM: OTHER_PLATFORMS,
  HOLIDU: OTHER_PLATFORMS,
  HOMETOGO: OTHER_PLATFORMS,
};

const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const GREECE = new Set(["gr", "greece", "hellas", "ελλαδα", "ελλας"]);

/** Whether a free-text country (ISO code or name, Greek or English) is Greece. */
export function isGreece(country: string | null | undefined) {
  return !!country && GREECE.has(normalize(country));
}

/** AADE short-term rental page, the entry point to the Μητρώο Ακινήτων Βραχυχρόνιας Διαμονής where the declaration is submitted. */
export const AADE_PORTAL_URL = "https://www.aade.gr/brahyhronia-misthosi-akiniton";
