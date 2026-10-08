import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { formatGuestDate } from "@/lib/i18n/guest-messages";
import { guestPageText } from "@/lib/i18n/guest-pages";
import { getCheckin } from "@/lib/services/guest-pages";
import { LanguageSwitch } from "../../language-switch";
import { CheckinForm } from "./checkin-form";

export const metadata: Metadata = { title: "Online check-in", robots: { index: false } };

export default async function CheckinPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  const { lang } = await searchParams;
  const data = await getCheckin(token);
  const { lang: language, t } = guestPageText(lang ?? data?.language);
  if (!data) return <p className="rounded-xl border border-border bg-surface p-5 text-sm">{t.notFound}</p>;

  return (
    <>
      <LanguageSwitch path={`/checkin/${token}`} current={language} />
      <p className="text-sm text-muted-foreground">{t.checkinTitle}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{data.propertyName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data.city}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">{t.arrival}</div>
          <div className="font-medium">{formatGuestDate(data.checkIn, language)}</div>
          {data.checkInTime && <div className="text-xs text-muted-foreground">{t.checkInFrom} {data.checkInTime}</div>}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t.departure}</div>
          <div className="font-medium">{formatGuestDate(data.checkOut, language)}</div>
          {data.checkOutTime && <div className="text-xs text-muted-foreground">{t.checkOutBy} {data.checkOutTime}</div>}
        </div>
      </div>

      {data.completed ? (
        <p className="mt-6 flex items-center gap-2 rounded-xl bg-success-soft p-4 text-sm text-success"><CheckCircle2 className="size-5" /> {t.alreadyDone}</p>
      ) : (
        <>
          <p className="mt-6 text-sm">{t.hello} {data.guestFirstName}! {t.checkinIntro}</p>
          <CheckinForm token={token} t={t} houseRules={data.houseRules} prefill={data.prefill} />
        </>
      )}
      {data.guidePath && (
        <Link href={`${data.guidePath}?lang=${language}`} className="mt-6 block rounded-xl border border-border bg-surface p-4 text-sm font-medium hover:bg-muted">
          📖 {t.guide} →
        </Link>
      )}
    </>
  );
}
