/**
 * Legal texts: version of the terms users accept, and who provides the service.
 * Bump TERMS_VERSION when the terms of service or the data processing agreement
 * change in substance: users are asked to accept the new version.
 */
export const TERMS_VERSION = "2026-10-10";

/** Legal name (and ΑΦΜ) of whoever provides the service. Set NEXT_PUBLIC_OPERATOR_NAME. */
export const OPERATOR_NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME || "";

/** Providers that process data for the service (GDPR sub-processors). */
export const SUBPROCESSORS = [
  { name: "Vercel Inc.", purpose: "Φιλοξενία της εφαρμογής (διακομιστές)", location: "ΕΕ — Φρανκφούρτη, Γερμανία· εταιρεία με έδρα τις ΗΠΑ" },
  { name: "Neon Inc.", purpose: "Βάση δεδομένων", location: "ΕΕ — Φρανκφούρτη, Γερμανία· εταιρεία με έδρα τις ΗΠΑ" },
  { name: "Πάροχος αποστολής email (SMTP)", purpose: "Αποστολή email (υπενθυμίσεις, αναφορές, λίστα αναμονής)", location: "ΕΕ / ΗΠΑ" },
  { name: "OpenAI (μόνο αν είναι ενεργός ο βοηθός AI)", purpose: "Παραγωγή απαντήσεων του βοηθού AI", location: "ΗΠΑ" },
] as const;
