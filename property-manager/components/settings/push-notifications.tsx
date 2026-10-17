"use client";

import { Bell, BellOff, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { api, ApiError } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

type State = "checking" | "unsupported" | "denied" | "off" | "on";

function keyBytes(base64: string) {
  const b = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js");
}

/**
 * «Ειδοποιήσεις στο κινητό»: Web Push on this browser. On Android, Chrome
 * shows them even when it is closed.
 */
export function PushNotifications({ description }: { description: string }) {
  const [state, setState] = useState<State>("checking");
  const { run, pending } = useMutation();

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      try {
        const sub = await (await registration()).pushManager.getSubscription();
        setState(sub ? "on" : "off");
      } catch {
        setState("unsupported");
      }
    })();
  }, []);

  const enable = () =>
    run(
      async () => {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          throw new ApiError("Δεν δόθηκε άδεια για ειδοποιήσεις.", 0);
        }
        const { publicKey } = await api<{ publicKey: string }>("/api/push/key");
        const reg = await registration();
        await navigator.serviceWorker.ready;
        const sub = await Promise.race([
          reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new ApiError("Ο browser δεν απάντησε. Ελέγξτε τη σύνδεση στο internet και δοκιμάστε ξανά (σε ανώνυμη περιήγηση οι ειδοποιήσεις δεν λειτουργούν).", 0)), 20000),
          ),
        ]);
        await api("/api/push/subscribe", { body: sub.toJSON() });
        setState("on");
      },
      { success: "Οι ειδοποιήσεις ενεργοποιήθηκαν σε αυτή τη συσκευή", refresh: false },
    );

  const disable = () =>
    run(
      async () => {
        const sub = await (await registration()).pushManager.getSubscription();
        if (sub) {
          await api("/api/push/subscribe", { method: "DELETE", body: { endpoint: sub.endpoint } });
          await sub.unsubscribe();
        }
        setState("off");
      },
      { success: "Οι ειδοποιήσεις απενεργοποιήθηκαν σε αυτή τη συσκευή", refresh: false },
    );

  return (
    <Card>
      <CardHeader title="Ειδοποιήσεις στο κινητό" description={description} />
      <CardContent className="grid gap-3 text-sm">
        {state === "checking" && <p className="text-muted-foreground">Έλεγχος…</p>}
        {state === "unsupported" && (
          <p className="text-muted-foreground">Αυτός ο browser δεν υποστηρίζει ειδοποιήσεις. Ανοίξτε την εφαρμογή στο Chrome του κινητού σας (Android).</p>
        )}
        {state === "denied" && (
          <p className="text-muted-foreground">
            Οι ειδοποιήσεις είναι μπλοκαρισμένες για αυτή τη σελίδα. Στο Chrome: πατήστε το εικονίδιο αριστερά από τη διεύθυνση →
            «Άδειες» → «Ειδοποιήσεις» → «Να επιτρέπονται», και ανανεώστε τη σελίδα.
          </p>
        )}
        {state === "off" && (
          <div>
            <Button onClick={() => void enable()} loading={pending}><Bell /> Ενεργοποίηση σε αυτή τη συσκευή</Button>
            <p className="mt-2 text-xs text-muted-foreground">Ο browser θα ρωτήσει αν επιτρέπετε ειδοποιήσεις: πατήστε «Να επιτρέπεται».</p>
          </div>
        )}
        {state === "on" && (
          <>
            <p className="font-medium text-success">✓ Ενεργές σε αυτή τη συσκευή, ακόμα κι όταν ο browser είναι κλειστός.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" loading={pending} onClick={() => void run(() => api("/api/push/test", { method: "POST" }), { success: "Στάλθηκε· θα εμφανιστεί σε λίγα δευτερόλεπτα", refresh: false })}>
                <Send /> Δοκιμαστική ειδοποίηση
              </Button>
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => void disable()}><BellOff /> Απενεργοποίηση</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
