"use client";

import { Check, Copy, Gift, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDay } from "@/lib/format";
import type { ReferralState } from "@/lib/services/referrals";

const formatDate = (iso: string) => formatDay(iso, { day: "numeric", month: "long", year: "numeric" });

/** «Φέρτε έναν φίλο»: the organization's link and the free months it brought. */
export function ReferralCard({ state }: { state: ReferralState }) {
  const [copied, setCopied] = useState(false);
  if (!state.url) return null;
  const url = state.url;
  const text = `Δοκίμασε το Βραχυχρόνια.ai: συμπληρώνει τη δήλωση ΑΑΔΕ με ένα κουμπί και δείχνει τα καθαρά από Airbnb και Booking. Με αυτόν τον σύνδεσμο παίρνουμε και οι δύο ${state.months} μήνες δωρεάν: ${url}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Αντιγράψτε τον σύνδεσμο:", url);
    }
  }
  async function share() {
    if (navigator.share) await navigator.share({ text }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }
  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Gift className="size-4 text-primary" /> Φέρτε έναν φίλο</span>}
        description={`Στείλτε τον σύνδεσμό σας σε άλλον οικοδεσπότη. Όταν φτιάξει λογαριασμό και προσθέσει το πρώτο του κατάλυμα, παίρνετε και οι δύο ${state.months} μήνες δωρεάν, μετά το τέλος της δωρεάν περιόδου (έως ${state.maxMonths} μήνες για εσάς).`}
      />
      <CardContent className="grid gap-3 text-sm">
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <code className="min-w-0 flex-1 truncate">{url}</code>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={copy}>{copied ? <Check /> : <Copy />} {copied ? "Αντιγράφηκε" : "Αντιγραφή συνδέσμου"}</Button>
          <Button size="sm" variant="outline" onClick={share}><Share2 /> Αποστολή</Button>
        </div>
        <p className="text-muted-foreground">
          {state.joined === 0
            ? "Κανείς δεν έχει γραφτεί ακόμη με τον σύνδεσμό σας."
            : `Γράφτηκαν ${state.joined} · πρόσθεσαν κατάλυμα ${state.rewarded}.`}
          {state.earnedMonths > 0 && <> Κερδίσατε <b className="text-foreground">{state.earnedMonths} μήνες</b>: δωρεάν μέχρι {formatDate(state.freeUntil)}.</>}
        </p>
        {state.pendingOwnReward && (
          <p className="rounded-lg bg-success-soft px-3 py-2 text-success">
            Ήρθατε με σύνδεσμο φίλου: με το πρώτο σας κατάλυμα παίρνετε κι εσείς {state.months} μήνες δωρεάν.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
