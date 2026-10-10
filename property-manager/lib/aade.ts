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

export const PAYMENT_METHODS = {
  PAYMENT_ACCOUNT_GR: "Λογαριασμός πληρωμών ημεδαπής",
  PAYMENT_ACCOUNT_FOREIGN: "Λογαριασμός πληρωμών αλλοδαπής",
  CARD: "Κάρτα",
  CASH: "Μετρητά",
  OTHER: "Άλλος τρόπος",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;
export const PAYMENT_METHOD_KEYS = Object.keys(PAYMENT_METHODS) as [PaymentMethod, ...PaymentMethod[]];

/** Booking platforms pay the host into a bank account; direct stays have no default. */
export function defaultPaymentMethod(source: string): PaymentMethod | null {
  return ["DIRECT", "MANUAL", "OTHER", "TRAVEL_AGENCY"].includes(source) ? null : "PAYMENT_ACCOUNT_GR";
}

/** «Ηλεκτρονική πλατφόρμα» of the declaration; sources not listed were not booked through a platform. */
export const PLATFORM_NAMES: Record<string, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  VRBO: "Vrbo",
  EXPEDIA: "Expedia",
  AGODA: "Agoda",
  TRIP_COM: "Trip.com",
  HOLIDU: "Holidu",
  HOMETOGO: "HomeToGo",
};

const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const GREECE = new Set(["gr", "greece", "hellas", "ελλαδα", "ελλας"]);

/** Whether a free-text country (ISO code or name, Greek or English) is Greece. */
export function isGreece(country: string | null | undefined) {
  return !!country && GREECE.has(normalize(country));
}

/** AADE short-term rental page, the entry point to the Μητρώο Ακινήτων Βραχυχρόνιας Διαμονής where the declaration is submitted. */
export const AADE_PORTAL_URL = "https://www.aade.gr/brahyhronia-misthosi-akiniton";
