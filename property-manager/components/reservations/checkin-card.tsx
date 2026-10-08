"use client";

import { Check, CheckCircle2, Copy, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { formatDateTime } from "@/lib/format";

/** Message with the link, in the guest's language (others get English). */
const INVITE: Record<string, (name: string, url: string) => string> = {
  el: (n, u) => `Γεια σας ${n}! Για να είναι όλα έτοιμα για την άφιξή σας, ολοκληρώστε το online check-in (1 λεπτό): ${u}`,
  en: (n, u) => `Hi ${n}! To have everything ready for your arrival, please complete your online check-in (1 minute): ${u}`,
  de: (n, u) => `Hallo ${n}! Damit bei Ihrer Ankunft alles bereit ist, schließen Sie bitte den Online-Check-in ab (1 Minute): ${u}`,
  fr: (n, u) => `Bonjour ${n} ! Pour que tout soit prêt à votre arrivée, merci de compléter votre check-in en ligne (1 minute) : ${u}`,
  it: (n, u) => `Ciao ${n}! Per avere tutto pronto al tuo arrivo, completa il check-in online (1 minuto): ${u}`,
  es: (n, u) => `¡Hola ${n}! Para tenerlo todo listo a tu llegada, completa el check-in online (1 minuto): ${u}`,
};

export function CheckinCard({
  reservationId,
  guestFirstName,
  guestLanguage,
  checkinPath,
  completedAt,
  arrivalTime,
  rulesAccepted,
}: {
  reservationId: string;
  guestFirstName: string;
  guestLanguage: string;
  checkinPath: string | null;
  completedAt: string | null;
  arrivalTime: string | null;
  rulesAccepted: boolean;
}) {
  const [path, setPath] = useState(checkinPath);
  const [copied, setCopied] = useState<string | null>(null);
  const { run, pending } = useMutation();
  const url = path && typeof window !== "undefined" ? `${window.location.origin}${path}` : null;

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Η αντιγραφή απέτυχε — επιλέξτε το κείμενο και αντιγράψτε το.");
    }
  }

  if (completedAt) {
    return (
      <div className="grid gap-1 text-sm">
        <p className="flex items-center gap-2 font-medium text-success"><CheckCircle2 className="size-4" /> Ολοκληρώθηκε {formatDateTime(completedAt)}</p>
        <p className="text-muted-foreground">
          {arrivalTime ? `Ώρα άφιξης: ${arrivalTime}` : "Δεν έδωσε ώρα άφιξης"}{rulesAccepted ? " · αποδέχτηκε τους κανόνες" : ""}. Τα στοιχεία (ΑΦΜ/διαβατήριο, τηλέφωνο) μπήκαν στον επισκέπτη και στη δήλωση ΑΑΔΕ.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2 text-sm">
      <p className="text-muted-foreground">Ο επισκέπτης συμπληρώνει μόνος του ΑΦΜ ή διαβατήριο, τηλέφωνο, ώρα άφιξης και αποδέχεται τους κανόνες — στη γλώσσα του.</p>
      {url ? (
        <>
          <div className="truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs">{url}</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => copy((INVITE[guestLanguage] ?? INVITE.en)(guestFirstName, url), "msg")}>
              {copied === "msg" ? <Check /> : <Copy />} Αντιγραφή μηνύματος
            </Button>
            <Button size="sm" variant="outline" onClick={() => copy(url, "link")}>
              {copied === "link" ? <Check /> : <Link2 />} Μόνο ο σύνδεσμος
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Στείλτε το από το Airbnb, το Booking, email ή Viber.</p>
        </>
      ) : (
        <div>
          <Button size="sm" loading={pending} onClick={() => run(() => api<{ path: string }>(`/api/reservations/${reservationId}/checkin-link`, { method: "POST" }), { refresh: false, onSuccess: (r) => setPath(r.path) })}>
            <Link2 /> Δημιουργία συνδέσμου check-in
          </Button>
        </div>
      )}
    </div>
  );
}
