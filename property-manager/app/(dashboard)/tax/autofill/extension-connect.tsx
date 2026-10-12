"use client";

import { Check, Download, PlugZap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";

/** Chrome Web Store page of the extension, once it is published. */
const STORE_URL = process.env.NEXT_PUBLIC_EXTENSION_URL;

type State = "checking" | "absent" | "ready" | "connected";

/**
 * Finds the «Βραχυχρόνια.ai – Δήλωση ΑΑΔΕ» extension (its connect.js answers on
 * this page) and hands it a key with «Σύνδεση επέκτασης».
 */
export function ExtensionConnect() {
  const [state, setState] = useState<State>("checking");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window || e.data?.source !== "vrachy-ext") return;
      if (e.data.type === "ready") setState(e.data.connected ? "connected" : "ready");
      if (e.data.type === "connected") {
        setPending(false);
        if (e.data.ok) {
          setState("connected");
          toast.success("Η επέκταση συνδέθηκε");
        } else toast.error("Η σύνδεση απέτυχε· ξαναδοκιμάστε");
      }
    };
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "vrachy-app", type: "hello" }, location.origin);
    const t = setTimeout(() => setState((s) => (s === "checking" ? "absent" : s)), 1500);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(t);
    };
  }, []);

  const connect = async () => {
    setPending(true);
    try {
      const { key } = await api<{ key: string }>("/api/aade/autofill-key", { method: "POST" });
      window.postMessage({ source: "vrachy-app", type: "connect", key }, location.origin);
    } catch (e) {
      setPending(false);
      toast.error(e instanceof Error ? e.message : "Δεν έγινε");
    }
  };

  if (state === "checking") return <p className="text-muted-foreground">Έλεγχος για την επέκταση…</p>;
  if (state === "connected")
    return (
      <div className="grid gap-2">
        <p className="flex items-center gap-2 font-medium text-success">
          <Check className="size-4" /> Η επέκταση είναι εγκατεστημένη και συνδεδεμένη.
        </p>
        <p className="text-muted-foreground">
          Ανοίξτε τη φόρμα της ΑΑΔΕ («Υποβολή Νέας Δήλωσης»): γεμίζει μόνη της. Ελέγξτε και πατήστε εσείς την υποβολή.
        </p>
        <div>
          <Button variant="outline" size="sm" loading={pending} onClick={connect}>
            Νέα σύνδεση
          </Button>
        </div>
      </div>
    );
  if (state === "ready")
    return (
      <div className="grid gap-2">
        <p className="text-muted-foreground">Η επέκταση είναι εγκατεστημένη. Ένα βήμα ακόμα:</p>
        <div>
          <Button loading={pending} onClick={connect}>
            <PlugZap /> Σύνδεση επέκτασης
          </Button>
        </div>
      </div>
    );
  return (
    <div className="grid gap-2">
      {STORE_URL ? (
        <>
          <p className="text-muted-foreground">Εγκαταστήστε την επέκταση (δωρεάν, ένα κλικ) και γυρίστε σε αυτή τη σελίδα για τη σύνδεση.</p>
          <div>
            <Button asChild>
              <a href={STORE_URL} target="_blank" rel="noreferrer">
                <Download /> Εγκατάσταση επέκτασης
              </a>
            </Button>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">
          Η επέκταση έρχεται σύντομα στο Chrome Web Store. Για δοκιμή:{" "}
          <a className="font-medium text-primary underline" href="/vrachychronia-extension.zip" download>
            κατεβάστε την
          </a>
          , αποσυμπιέστε τη, και στο chrome://extensions ενεργοποιήστε «Λειτουργία προγραμματιστή» → «Φόρτωση μη συσκευασμένης» → τον
          φάκελο. Μετά ανανεώστε αυτή τη σελίδα.
        </p>
      )}
    </div>
  );
}
