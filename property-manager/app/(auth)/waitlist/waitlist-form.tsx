"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { WAITLIST_PLATFORM_GROUPS } from "@/lib/waitlist-options";
import { waitlistAction, type AuthFormState } from "../actions";


export function WaitlistForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(waitlistAction, {});
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const [device, setDevice] = useState(v.device ?? "");

  if (state.done) {
    return (
      <div className="mt-8 rounded-xl border border-border bg-surface p-5" role="status">
        <CheckCircle2 className="size-6 text-success" />
        <p className="mt-3 font-medium">Σας καταχωρίσαμε στη λίστα αναμονής!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Μόλις ανοίξει θέση θα λάβετε email με τον σύνδεσμο εγγραφής. Ελέγξτε και τα ανεπιθύμητα (spam).
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 grid gap-4">
      {/* Honeypot: hidden from people, filled in by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Field label="Ονοματεπώνυμο" htmlFor="name" error={err.name}>
        <Input id="name" name="name" autoComplete="name" required defaultValue={v.name} aria-invalid={!!err.name} />
      </Field>
      <Field label="Email" htmlFor="email" error={err.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email} aria-invalid={!!err.email} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Τηλέφωνο (προαιρετικό)" htmlFor="phone" error={err.phone}>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} />
        </Field>
        <Field label="Πόλη / περιοχή" htmlFor="city" error={err.city}>
          <Input id="city" name="city" autoComplete="address-level2" defaultValue={v.city} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Πόσα ακίνητα έχετε;" htmlFor="propertiesCount" error={err.propertiesCount}>
          <Input id="propertiesCount" name="propertiesCount" type="number" inputMode="numeric" min={1} max={1000} defaultValue={v.propertiesCount} aria-invalid={!!err.propertiesCount} />
        </Field>
        <Field label="Φορολογικά" htmlFor="regime" error={err.regime}>
          <Select id="regime" name="regime" defaultValue={v.regime ?? ""}>
            <option value="">—</option>
            <option value="INDIVIDUAL">Ιδιώτης</option>
            <option value="BUSINESS">Επιχείρηση (με έναρξη)</option>
          </Select>
        </Field>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[13px] font-medium">Πού έχετε τις κρατήσεις σας; <span className="font-normal text-muted-foreground">(όσα ισχύουν)</span></legend>
        {WAITLIST_PLATFORM_GROUPS.map((group) => (
          <div key={group.label} className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">{group.label}</span>
            <div className="flex flex-wrap gap-2">
              {group.options.map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                  <input type="checkbox" name="platforms" value={value} defaultChecked={v.platforms?.split(",").includes(value)} className="size-4 accent-[var(--color-accent)]" />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
      <Field label="Τι κινητό έχετε;" htmlFor="device" error={err.device} hint={device === "IPHONE" ? "Η εφαρμογή για iPhone έρχεται αργότερα· μέχρι τότε δουλεύει κανονικά από τον browser του κινητού." : undefined}>
        <Select id="device" name="device" value={device} onChange={(e) => setDevice(e.target.value)}>
          <option value="">—</option>
          <option value="ANDROID">Android</option>
          <option value="IPHONE">iPhone</option>
          <option value="NONE">Θα το δοκιμάσω μόνο στον υπολογιστή</option>
        </Select>
      </Field>
      {device === "ANDROID" && (
        <Field
          label="Gmail για το Google Play (αν διαφέρει)"
          htmlFor="playEmail"
          error={err.playEmail}
          hint="Η εφαρμογή Android είναι σε δοκιμαστική έκδοση στο Google Play και σας προσθέτουμε ως δοκιμαστή με τον λογαριασμό Google του κινητού σας."
        >
          <Input id="playEmail" name="playEmail" type="email" defaultValue={v.playEmail} placeholder="…@gmail.com" aria-invalid={!!err.playEmail} />
        </Field>
      )}
      <Field label="Κάτι που θέλετε να μας πείτε; (προαιρετικό)" htmlFor="message" error={err.message}>
        <Textarea id="message" name="message" rows={3} maxLength={1000} defaultValue={v.message} placeholder="π.χ. άλλη πλατφόρμα ή channel manager που χρησιμοποιείτε, τι σας δυσκολεύει σήμερα στη διαχείριση" />
      </Field>
      <div className="grid gap-1.5">
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="consent" required defaultChecked={v.consent === "on"} className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]" aria-invalid={!!err.consent} />
          <span>
            Συμφωνώ να κρατηθούν τα στοιχεία μου για να με ειδοποιήσετε για τη δοκιμή της εφαρμογής, σύμφωνα με την{" "}
            <a href="/privacy" target="_blank" className="underline underline-offset-4">πολιτική απορρήτου</a>. Μπορώ να ζητήσω διαγραφή τους οποτεδήποτε.
          </span>
        </label>
        {err.consent && <p className="text-xs text-danger" role="alert">{err.consent}</p>}
      </div>
      {state.error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="mt-1">
        Μπείτε στη λίστα αναμονής
      </Button>
    </form>
  );
}
