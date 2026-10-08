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

/** myAADE, where the declaration is submitted (Μητρώο Ακινήτων Βραχυχρόνιας Διαμονής). */
export const AADE_PORTAL_URL = "https://www.aade.gr/myaade";
