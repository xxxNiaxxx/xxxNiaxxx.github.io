export const languages = ["en", "el", "es", "fr", "de"] as const;
export type Language = (typeof languages)[number];

/** Native names, shown in the language pickers. */
export const languageLabels: Record<Language, string> = {
  en: "English",
  el: "Ελληνικά",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
};

/** English names, used in the AI prompt. */
export const languageNames: Record<Language, string> = {
  en: "English",
  el: "Greek",
  es: "Spanish",
  fr: "French",
  de: "German",
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (languages as readonly string[]).includes(value);
}
