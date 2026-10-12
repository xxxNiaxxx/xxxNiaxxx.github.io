"use client";

import { Check, Copy, Download, PlugZap } from "lucide-react";
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
        <>
          <p className="text-muted-foreground">Η επέκταση έρχεται σύντομα στο Chrome Web Store. Μέχρι τότε, για δοκιμή:</p>
          <ol className="grid list-decimal gap-2 pl-5 text-muted-foreground">
            <li>
              <a className="font-medium text-primary underline" href="/vrachychronia-extension.zip" download>
                Κατεβάστε την επέκταση
              </a>{" "}
              και αποσυμπιέστε το αρχείο (δεξί κλικ → «Εξαγωγή όλων»).
            </li>
            <li>
              Πατήστε αυτό το κουμπί, μετά κάντε κλικ στη γραμμή διευθύνσεων του Chrome, επικόλληση (Ctrl+V) και Enter. Ο Chrome δεν επιτρέπει
              σε σελίδες να ανοίγουν αυτή τη διεύθυνση με σύνδεσμο.
              <div className="mt-2">
                <CopyExtensionsAddress />
              </div>
            </li>
            <li>
              Ενεργοποιήστε πάνω δεξιά τη <strong>«Λειτουργία προγραμματιστή»</strong>, πατήστε <strong>«Φόρτωση μη συσκευασμένης»</strong>{" "}
              και διαλέξτε τον φάκελο που αποσυμπιέσατε.
            </li>
            <li>Γυρίστε σε αυτή τη σελίδα και ανανεώστε τη: θα εμφανιστεί το κουμπί «Σύνδεση επέκτασης».</li>
          </ol>
        </>
      )}
    </div>
  );
}

/** chrome://extensions can't be opened from a web page: copy it for the address bar. */
function CopyExtensionsAddress() {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText("chrome://extensions");
          setDone(true);
          toast.success("Αντιγράφηκε· επικολλήστε το στη γραμμή διευθύνσεων");
        } catch {
          toast.error("Η αντιγραφή απέτυχε· γράψτε chrome://extensions στη γραμμή διευθύνσεων");
        }
      }}
    >
      {done ? <Check /> : <Copy />} chrome://extensions
    </Button>
  );
}
