import type { Metadata } from "next";
import { formatGuestDate } from "@/lib/i18n/guest-messages";
import { guestPageText } from "@/lib/i18n/guest-pages";
import { getBookingPage } from "@/lib/services/guest-pages";
import { LanguageSwitch } from "../../language-switch";
import { BookingForm } from "./booking-form";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const p = await getBookingPage((await params).token);
  return { title: p ? p.propertyName : "Booking" };
}

export default async function BookPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  const { lang } = await searchParams;
  const { lang: language, t } = guestPageText(lang ?? "en");
  const p = await getBookingPage(token);
  if (!p) return <p className="rounded-xl border border-border bg-surface p-5 text-sm">{t.noBooking}</p>;
  const price = new Intl.NumberFormat("el-GR", { style: "currency", currency: p.currency }).format(p.basePrice);

  return (
    <>
      <LanguageSwitch path={`/book/${token}`} current={language} />
      <p className="text-sm text-muted-foreground">{t.bookTitle}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{p.propertyName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {p.city} · {t.maxGuests.replace("{n}", String(p.maxGuests))}
      </p>
      <p className="mt-4 text-3xl font-semibold tabular-nums">{price} <span className="text-base font-normal text-muted-foreground">{t.perNight}</span></p>
      <p className="mt-1 text-sm text-accent">{t.bookIntro}</p>
      {p.description && <p className="mt-4 text-sm whitespace-pre-line text-muted-foreground">{p.description}</p>}

      <BookingForm token={token} t={t} language={language} today={p.today} maxGuests={p.maxGuests} currency={p.currency} />

      {p.taken.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold">{t.bookedDates}</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            {p.taken.map((r) => (
              <li key={r.from} className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                {formatGuestDate(r.from, language)} – {formatGuestDate(r.to, language)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {p.houseRules && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold">{t.houseRules}</h2>
          <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{p.houseRules}</p>
        </div>
      )}
    </>
  );
}
