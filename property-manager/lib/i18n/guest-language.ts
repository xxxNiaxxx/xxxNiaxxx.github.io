/**
 * Language used when writing to a guest. A guest may have an explicit
 * preference; otherwise it is derived from their country (ISO code or name,
 * in Greek or English), falling back to English.
 */
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

export type GuestLanguage = (typeof GUEST_LANGUAGES)[number]["code"];
export const GUEST_LANGUAGE_CODES = GUEST_LANGUAGES.map((l) => l.code) as [GuestLanguage, ...GuestLanguage[]];

export function languageName(code: string) {
  return GUEST_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Country (ISO-2 code or name in Greek/English) → language. */
const COUNTRY_LANGUAGE: Record<string, GuestLanguage> = {};
const add = (lang: GuestLanguage, ...keys: string[]) => keys.forEach((k) => (COUNTRY_LANGUAGE[normalize(k)] = lang));
add("el", "GR", "CY", "Greece", "Cyprus", "Hellas", "Ελλάδα", "Ελλάς", "Κύπρος");
add("de", "DE", "AT", "LI", "Germany", "Austria", "Deutschland", "Österreich", "Liechtenstein", "Γερμανία", "Αυστρία");
add("fr", "FR", "LU", "MC", "France", "Luxembourg", "Monaco", "Γαλλία", "Λουξεμβούργο");
add("it", "IT", "SM", "Italy", "Italia", "San Marino", "Ιταλία");
add("es", "ES", "MX", "AR", "CO", "CL", "Spain", "España", "Mexico", "Argentina", "Ισπανία", "Μεξικό", "Αργεντινή");
add("pt", "PT", "BR", "Portugal", "Brazil", "Brasil", "Πορτογαλία", "Βραζιλία");
add("nl", "NL", "Netherlands", "Holland", "Nederland", "Ολλανδία", "Κάτω Χώρες");
add("pl", "PL", "Poland", "Polska", "Πολωνία");
add("cs", "CZ", "Czechia", "Czech Republic", "Česko", "Τσεχία");
add("sv", "SE", "Sweden", "Sverige", "Σουηδία");
add("sr", "RS", "ME", "BA", "Serbia", "Srbija", "Montenegro", "Σερβία", "Μαυροβούνιο");
// Belgium and Switzerland are multilingual: French is the most common choice for guests writing in.
add("fr", "BE", "CH", "Belgium", "Switzerland", "Βέλγιο", "Ελβετία");

export function languageForCountry(country: string | null | undefined): GuestLanguage {
  if (!country) return "en";
  return COUNTRY_LANGUAGE[normalize(country)] ?? "en";
}

export function guestLanguage(guest: { language?: string | null; country?: string | null }): GuestLanguage {
  const explicit = GUEST_LANGUAGE_CODES.find((c) => c === guest.language);
  return explicit ?? languageForCountry(guest.country);
}
