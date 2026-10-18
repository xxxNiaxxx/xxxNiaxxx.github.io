"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

type Setup = { secret: string; uri: string; qrSvg: string };

/** Two-step sign-in: on with a code from an authenticator app, off with the password. */
export function TwoStep({ enabled, recoveryCodesLeft }: { enabled: boolean; recoveryCodesLeft: number }) {
  const { run, pending } = useMutation();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [password, setPassword] = useState("");
  const [disabling, setDisabling] = useState(false);

  if (recovery) {
    return (
      <div className="grid gap-3 rounded-xl border border-success/30 bg-success-soft p-4">
        <p className="text-sm font-medium">Ο κωδικός 2 βημάτων ενεργοποιήθηκε ✓</p>
        <p className="text-[13px] text-muted-foreground">
          Κρατήστε αυτούς τους κωδικούς ανάκτησης σε ασφαλές μέρος (π.χ. γραμμένους σε χαρτί). Αν χάσετε το κινητό, ο καθένας μπαίνει μία φορά στη θέση του κωδικού της εφαρμογής. Δεν θα τους ξαναδείτε.
        </p>
        <pre className="grid grid-cols-2 gap-1 rounded-lg bg-surface p-3 font-mono text-sm">{recovery.map((c) => <span key={c}>{c}</span>)}</pre>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(recovery.join("\n")).then(() => toast.success("Αντιγράφηκαν"))}>Αντιγραφή</Button>
          <Button onClick={() => window.location.reload()}>Τους κράτησα</Button>
        </div>
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success">Ενεργός</Badge>
          <span className="text-[13px] text-muted-foreground">Κωδικοί ανάκτησης που απομένουν: {recoveryCodesLeft}</span>
        </div>
        {disabling ? (
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => api("/api/me/two-step", { body: { action: "disable", password } }), { success: "Ο κωδικός 2 βημάτων απενεργοποιήθηκε" });
            }}
          >
            <Field label="Ο κωδικός πρόσβασής σας" htmlFor="two-step-password">
              <PasswordInput id="two-step-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button type="submit" variant="outline" loading={pending} disabled={!password}>Απενεργοποίηση</Button>
          </form>
        ) : (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setDisabling(true)}>Απενεργοποίηση…</Button>
          </div>
        )}
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="grid gap-3">
        <p className="text-[13px] text-muted-foreground">
          Εκτός από τον κωδικό, η σύνδεση θα ζητά και 6 αριθμούς από μια εφαρμογή στο κινητό σας (Google Authenticator, Microsoft Authenticator κ.ά., δωρεάν). Έτσι, ακόμη κι αν κάποιος μάθει τον κωδικό σας, δεν μπορεί να μπει.
        </p>
        <div>
          <Button variant="outline" loading={pending} onClick={() => run(() => api<Setup>("/api/me/two-step", { body: { action: "start" } }), { refresh: false, onSuccess: setSetup })}>
            Ενεργοποίηση κωδικού 2 βημάτων
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => api<{ recoveryCodes: string[] }>("/api/me/two-step", { body: { action: "confirm", code } }), { refresh: false, onSuccess: (d) => setRecovery(d.recoveryCodes) });
      }}
    >
      <ol className="grid list-decimal gap-2 pl-5 text-[13px] text-muted-foreground">
        <li>Εγκαταστήστε στο κινητό το Google Authenticator ή το Microsoft Authenticator.</li>
        <li>
          Σκανάρετε τον κωδικό QR. Αν είστε στο ίδιο κινητό,{" "}
          <a href={setup.uri} className="font-medium text-accent underline-offset-4 hover:underline">πατήστε εδώ</a> ή γράψτε το κλειδί με το χέρι.
        </li>
        <li>Γράψτε τους 6 αριθμούς που δείχνει η εφαρμογή.</li>
      </ol>
      <div className="flex flex-wrap items-center gap-4">
        {/* SVG made on our server by the qrcode library from the otpauth link. */}
        <div className="rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: setup.qrSvg }} />
        <div className="grid gap-1 text-[13px]">
          <span className="text-muted-foreground">Κλειδί</span>
          <code className="break-all font-mono text-sm">{setup.secret.match(/.{1,4}/g)?.join(" ")}</code>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Κωδικός από την εφαρμογή" htmlFor="two-step-code">
          <Input id="two-step-code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Button type="submit" loading={pending} disabled={code.replace(/\D/g, "").length !== 6}>Ενεργοποίηση</Button>
      </div>
    </form>
  );
}
