/** Product name shown in the UI. Override with NEXT_PUBLIC_APP_NAME. */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Βραχυχρόνια.ai";
export const APP_TAGLINE = "Οι βραχυχρόνιες μισθώσεις σας, οργανωμένες.";
/** Public contact for privacy and account-deletion requests. */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";
/** Shown to testers on the waitlist, sign-up page and emails. */
export const FREE_UNTIL_NOTE = "Η εφαρμογή είναι διαθέσιμη δωρεάν μέχρι το τέλος του 2026.";
/**
 * On every public page: we are not the tax authority or a platform, and the
 * host submits the declarations. Ad networks check for implied affiliation.
 */
export const INDEPENDENCE_NOTE =
  "Το Βραχυχρόνια.ai είναι ανεξάρτητη εφαρμογή. Δεν ανήκει ούτε συνεργάζεται με την ΑΑΔΕ ή άλλη δημόσια υπηρεσία, ούτε με την Airbnb ή τη Booking.com. Τις δηλώσεις τις υποβάλλετε εσείς, στη σελίδα της ΑΑΔΕ.";
