/**
 * Values for the AADE short-term stay declaration (Μητρώο Ακινήτων
 * Βραχυχρόνιας Διαμονής). Same values as property-manager/lib/aade.ts.
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

/** AADE short-term rental page, the entry point to the Μητρώο Ακινήτων Βραχυχρόνιας Διαμονής where the declaration is submitted. */
export const AADE_PORTAL_URL = "https://www.aade.gr/brahyhronia-misthosi-akiniton";
