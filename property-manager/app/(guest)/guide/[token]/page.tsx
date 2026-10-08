import type { Metadata } from "next";
import Link from "next/link";
import { guestPageText } from "@/lib/i18n/guest-pages";
import { getGuide } from "@/lib/services/guest-pages";
import { LanguageSwitch } from "../../language-switch";

export const metadata: Metadata = { title: "Guest guide", robots: { index: false } };

/** Linkify plain URLs in a note. */
function Note({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return (
    <p className="whitespace-pre-line">
      {parts.map((p, i) => (/^https?:\/\//.test(p) ? <a key={i} href={p} className="text-accent underline break-all" target="_blank" rel="noreferrer">{p}</a> : p))}
    </p>
  );
}

export default async function GuidePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  const { lang } = await searchParams;
  const { lang: language, t } = guestPageText(lang ?? "en");
  const g = await getGuide(token, language);
  if (!g) return <p className="rounded-xl border border-border bg-surface p-5 text-sm">{t.notFound}</p>;
  const where = [g.address, g.city].filter(Boolean).join(", ");

  return (
    <>
      <LanguageSwitch path={`/guide/${token}`} current={language} />
      <p className="text-sm text-muted-foreground">{t.guideTitle}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{g.propertyName}</h1>
      {g.description && <p className="mt-3 text-sm whitespace-pre-line text-muted-foreground">{g.description}</p>}

      <div className="mt-6 grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
        {where && (
          <div>
            <div className="text-xs text-muted-foreground">{t.address}</div>
            <div className="font-medium">{where}</div>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`} target="_blank" rel="noreferrer" className="text-xs text-accent underline">{t.openMap}</a>
          </div>
        )}
        {(g.checkInTime || g.checkOutTime) && (
          <div className="grid grid-cols-2 gap-3">
            {g.checkInTime && <div><div className="text-xs text-muted-foreground">{t.checkInFrom}</div><div className="font-medium">{g.checkInTime}</div></div>}
            {g.checkOutTime && <div><div className="text-xs text-muted-foreground">{t.checkOutBy}</div><div className="font-medium">{g.checkOutTime}</div></div>}
          </div>
        )}
      </div>

      <h2 className="mt-8 text-lg font-semibold">{t.info}</h2>
      {g.notes.length ? (
        <ul className="mt-3 grid gap-3 text-sm">
          {g.notes.map((n, i) => <li key={i} className="rounded-xl border border-border bg-surface p-4"><Note text={n} /></li>)}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{t.noInfo}</p>
      )}

      {g.houseRules && (
        <>
          <h2 className="mt-8 text-lg font-semibold">{t.houseRules}</h2>
          <p className="mt-3 rounded-xl border border-border bg-surface p-4 text-sm whitespace-pre-line">{g.houseRules}</p>
        </>
      )}

      {g.directBooking && (
        <Link href={`/book/${token}?lang=${language}`} className="mt-8 block rounded-xl bg-primary p-4 text-center text-sm font-medium text-primary-foreground">
          {t.bookTitle} →
        </Link>
      )}
    </>
  );
}
