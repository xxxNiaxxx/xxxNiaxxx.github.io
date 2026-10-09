"use client";

import { Check, CheckCircle2, Download, MessageCircleQuestion, Pencil, SkipForward } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { InterviewState } from "@/lib/ai/interview";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { cn } from "@/lib/utils";

type Suggestion = { key: string; label: string; question: string; answer: string };

export function KnowledgeInterview({ state, properties }: { state: InterviewState; properties: { id: string; name: string }[] }) {
  const router = useRouter();
  const propertyId = state.property.id;
  /** A question the manager chose to change; otherwise the next open one. */
  const [editing, setEditing] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<{ topic: string; question: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const { run, pending, fieldErrors } = useMutation();

  const current = followUp
    ? state.answers.find((a) => a.key === followUp.topic)
    : editing
      ? state.answers.find((a) => a.key === editing)
      : state.next;
  const percent = Math.round((state.answered / state.total) * 100);

  const done = () => {
    setAnswer("");
    setEditing(null);
  };

  const submit = () => {
    if (!current || !answer.trim()) return;
    run(
      () => api<{ followUp: string | null }>("/api/ai/interview", { body: { action: "answer", propertyId, topic: current.key, answer, followUp: followUp?.question } }),
      {
        onSuccess: (r) => {
          done();
          setFollowUp(r.followUp ? { topic: current.key, question: r.followUp } : null);
        },
      },
    );
  };

  const skip = () => {
    if (!current) return;
    if (followUp) {
      setFollowUp(null);
      done();
      return;
    }
    run(() => api("/api/ai/interview", { body: { action: "skip", propertyId, topic: current.key } }), { onSuccess: done });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid min-w-0 grid-cols-1 content-start gap-6">
        <Card>
          <CardContent className="grid gap-4 pt-5">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Κατάλυμα" htmlFor="interview-property" className="min-w-48 flex-1">
                <Select
                  id="interview-property"
                  value={propertyId}
                  onChange={(e) => {
                    setFollowUp(null);
                    done();
                    router.push(`/ai/knowledge/interview?property=${e.target.value}`);
                  }}
                >
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <div className="min-w-40 flex-1">
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Πρόοδος</span>
                  <span className="font-medium">{state.answered} από {state.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} />
                </div>
              </div>
            </div>

            {current ? (
              <form
                className="grid gap-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <div className="flex items-start gap-2.5">
                  <MessageCircleQuestion className="mt-0.5 size-5 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="font-medium">{followUp ? followUp.question : current.question}</p>
                    {followUp ? (
                      <p className="mt-1 text-[13px] text-muted-foreground">Διευκρίνιση για «{current.label}» — προστίθεται στην απάντησή σας.</p>
                    ) : (
                      current.hint && <p className="mt-1 text-[13px] text-muted-foreground">{current.hint}</p>
                    )}
                  </div>
                </div>
                <Field label="Η απάντησή σας" htmlFor="interview-answer" error={fieldErrors.answer} className="[&_label]:sr-only">
                  <Textarea
                    id="interview-answer"
                    autoFocus
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                    }}
                    className="min-h-20 bg-background"
                    placeholder={current.key === "checkInTime" || current.key === "checkOutTime" ? "π.χ. 15:00" : "Γράψτε όπως θα το λέγατε στον επισκέπτη…"}
                  />
                </Field>
                <div className="flex flex-wrap justify-end gap-2">
                  {editing && !followUp && (
                    <Button type="button" variant="ghost" onClick={done}>Ακύρωση</Button>
                  )}
                  <Button type="button" variant="outline" onClick={skip} disabled={pending}>
                    <SkipForward /> {followUp ? "Δεν χρειάζεται" : "Παράλειψη"}
                  </Button>
                  <Button type="submit" loading={pending} disabled={!answer.trim()}><Check /> Αποθήκευση</Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-success/30 bg-success-soft p-4">
                <CheckCircle2 className="size-5 text-success" />
                <p className="min-w-0 flex-1 text-sm">
                  Τελειώσαμε! Ο βοηθός ξέρει ό,τι χρειάζεται για το «{state.property.name}». Οι απαντήσεις μπαίνουν στις απαντήσεις προς επισκέπτες και στον οδηγό επισκέπτη.
                </p>
                {state.answers.some((a) => a.status === "skipped") && (
                  <Button size="sm" variant="outline" onClick={() => run(() => api("/api/ai/interview", { body: { action: "reset", propertyId } }))}>
                    Ρώτα ξανά όσα παρέλειψα
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Οι απαντήσεις σας" description="Μπορείτε να αλλάξετε οποιαδήποτε απάντηση." />
          <CardContent>
            <ul className="divide-y divide-border">
              {state.answers.map((a) => (
                <li key={a.key} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{a.label}</span>
                      {a.status === "skipped" && <Badge tone="neutral">Παραλείφθηκε</Badge>}
                      {a.status === "open" && <Badge tone="warning">Χωρίς απάντηση</Badge>}
                    </div>
                    {a.answer && <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{a.answer}</p>}
                  </div>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setFollowUp(null);
                      setEditing(a.key);
                      setAnswer(a.answer ?? "");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <Pencil /> {a.answer ? "Αλλαγή" : "Απάντηση"}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 content-start gap-6">
        <ListingImport propertyId={propertyId} answered={new Set(state.answers.filter((a) => a.answer).map((a) => a.key))} />
        <Card>
          <CardContent className="pt-5 text-[13px] leading-relaxed text-muted-foreground">
            {state.aiEnabled
              ? "Ο βοηθός AI διαβάζει τις απαντήσεις σας και ρωτά διευκρινίσεις όπου ένας επισκέπτης θα έμενε με απορία."
              : "Ο βοηθός ρωτά διευκρινίσεις σε ό,τι συνήθως λείπει (π.χ. πού είναι η κλειδοθήκη). Με σύνδεση σε μοντέλο AI οι ερωτήσεις προσαρμόζονται στις απαντήσεις σας."}
            {" "}Μη γράφετε κωδικούς πόρτας ή συναγερμού: τους στέλνετε εσείς λίγο πριν την άφιξη.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ListingImport({ propertyId, answered }: { propertyId: string; answered: Set<string> }) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [suggestions, setSuggestions] = useState<(Suggestion & { use: boolean })[] | null>(null);
  const { run, pending, fieldErrors } = useMutation();

  const read = (body: { url?: string; text?: string }) =>
    run(() => api<{ readPage: boolean; suggestions: Suggestion[] }>("/api/ai/interview", { body: { action: "import", propertyId, ...body } }), {
      refresh: false,
      onSuccess: (r) => {
        setBlocked(!r.readPage);
        if (!r.readPage) setShowPaste(true);
        setSuggestions(r.readPage ? r.suggestions.map((s) => ({ ...s, use: !answered.has(s.key) })) : null);
      },
    });

  const save = () =>
    run(
      () => api("/api/ai/interview", { body: { action: "apply", propertyId, answers: suggestions!.filter((s) => s.use && s.answer.trim()).map((s) => ({ topic: s.key, answer: s.answer })) } }),
      {
        success: "Οι απαντήσεις αποθηκεύτηκαν",
        onSuccess: () => {
          setSuggestions(null);
          setText("");
        },
      },
    );

  return (
    <Card>
      <CardHeader title="Πάρε τα από το Booking.com ή το Airbnb" description="Ο βοηθός διαβάζει τη σελίδα του καταλύματος και προτείνει απαντήσεις. Τις ελέγχετε πριν αποθηκευτούν." />
      <CardContent className="grid gap-3">
        {suggestions ? (
          suggestions.length ? (
            <>
              <ul className="grid gap-3">
                {suggestions.map((s, i) => (
                  <li key={s.key} className={cn("grid gap-2 rounded-xl border border-border p-3", !s.use && "opacity-60")}>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--color-accent)]"
                        checked={s.use}
                        onChange={(e) => setSuggestions(suggestions.map((x, j) => (j === i ? { ...x, use: e.target.checked } : x)))}
                      />
                      {s.label}
                      {answered.has(s.key) && <Badge tone="warning">αντικαθιστά την απάντησή σας</Badge>}
                    </label>
                    <Textarea
                      aria-label={s.label}
                      value={s.answer}
                      onChange={(e) => setSuggestions(suggestions.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
                      className="min-h-16 text-sm"
                    />
                  </li>
                ))}
              </ul>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setSuggestions(null)}>Ακύρωση</Button>
                <Button loading={pending} disabled={!suggestions.some((s) => s.use)} onClick={save}><Check /> Αποθήκευση επιλεγμένων</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Δεν βρέθηκαν πληροφορίες στη σελίδα. Δοκιμάστε να επικολλήσετε το κείμενο ολόκληρης της σελίδας.{" "}
              <button type="button" className="text-accent underline" onClick={() => { setSuggestions(null); setShowPaste(true); }}>Επικόλληση</button>
            </p>
          )
        ) : (
          <>
            <form
              className="grid gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                read({ url });
              }}
            >
              <Field label="Σύνδεσμος της σελίδας" htmlFor="listing-url" error={fieldErrors.url}>
                <Input id="listing-url" type="url" inputMode="url" placeholder="https://www.booking.com/hotel/gr/…" value={url} onChange={(e) => setUrl(e.target.value)} />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" variant="outline" loading={pending && !showPaste} disabled={!url.trim()}><Download /> Ανάγνωση</Button>
              </div>
            </form>
            {blocked && (
              <p className="rounded-lg bg-warning-soft p-3 text-[13px] text-warning">
                Η σελίδα δεν μας επέτρεψε να τη διαβάσουμε (συμβαίνει συχνά με Booking.com και Airbnb). Επικολλήστε το κείμενό της παρακάτω.
              </p>
            )}
            {showPaste ? (
              <form
                className="grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  read({ text });
                }}
              >
                <Field
                  label="Κείμενο της σελίδας"
                  htmlFor="listing-text"
                  error={fieldErrors.text}
                  hint="Ανοίξτε τη σελίδα του καταλύματος, πατήστε Ctrl+A (στο κινητό: «Επιλογή όλων»), αντιγράψτε και επικολλήστε εδώ."
                >
                  <Textarea id="listing-text" value={text} onChange={(e) => setText(e.target.value)} className="min-h-28 text-sm" />
                </Field>
                <div className="flex justify-end">
                  <Button type="submit" variant="outline" loading={pending && showPaste} disabled={text.trim().length < 50}><Download /> Ανάγνωση κειμένου</Button>
                </div>
              </form>
            ) : (
              <button type="button" className="justify-self-start text-[13px] text-accent underline" onClick={() => setShowPaste(true)}>
                ή επικολλήστε το κείμενο της σελίδας
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
