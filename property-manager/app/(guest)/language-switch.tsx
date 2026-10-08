import Link from "next/link";
import { GUEST_PAGE_LANGUAGES } from "@/lib/i18n/guest-pages";

const NAMES: Record<string, string> = { el: "Ελληνικά", en: "English", de: "Deutsch", fr: "Français", it: "Italiano", es: "Español" };

/** Links to the same guest page in the other languages. */
export function LanguageSwitch({ path, current }: { path: string; current: string }) {
  return (
    <nav aria-label="Language" className="mb-6 flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs">
      {GUEST_PAGE_LANGUAGES.map((l) => (
        <Link key={l} href={`${path}?lang=${l}`} className={l === current ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"} hrefLang={l}>
          {NAMES[l]}
        </Link>
      ))}
    </nav>
  );
}
