"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { PRICE_SURVEY, type PriceSurveyAnswer, surveyMessage } from "@/lib/surveys";
import { cn } from "@/lib/utils";

const LATER = "price-survey-later";
const LATER_DAYS = 3;

/** «Μια ερώτηση από την ομάδα» on the home page, until the user answers it. */
export function PriceSurvey() {
  const [hidden, setHidden] = useState(false);
  const [done, setDone] = useState(false);
  const [answer, setAnswer] = useState<PriceSurveyAnswer | null>(null);
  const [comment, setComment] = useState("");
  const { run, pending } = useMutation();
  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(LATER));
      if (at && Date.now() - at < LATER_DAYS * 86_400_000) setHidden(true);
    } catch {}
  }, []);
  if (hidden) return null;

  if (done) {
    return (
      <Card className="mb-6 border-accent/40">
        <CardContent className="py-5 text-sm">
          <b>Ευχαριστούμε πολύ! 🙏</b> Τη διαβάζουμε όλη και φτιάχνουμε την εφαρμογή με βάση όσα μας λέτε.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-accent/40">
      <CardHeader title="Μια ερώτηση από την ομάδα του Βραχυχρόνια.ai" description={PRICE_SURVEY.note} />
      <CardContent>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!answer) return;
            void run(
              () => api("/api/feedback", { body: { kind: "OTHER", message: surveyMessage(answer, comment), page: PRICE_SURVEY.id, client: "web" } }),
              { refresh: false, onSuccess: () => setDone(true) },
            );
          }}
        >
          <p className="font-medium">{PRICE_SURVEY.question}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Απάντηση">
            {PRICE_SURVEY.answers.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={answer === a}
                onClick={() => setAnswer(a)}
                className={cn("min-w-20 rounded-full px-4 py-1.5 text-sm font-medium ring-1 ring-border", answer === a ? "bg-primary text-primary-foreground ring-primary" : "bg-surface text-muted-foreground hover:text-foreground")}
              >
                {a}
              </button>
            ))}
          </div>
          {answer && (
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} aria-label={PRICE_SURVEY.followUp} placeholder={PRICE_SURVEY.followUp} />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={pending} disabled={!answer}>Αποστολή</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                try {
                  localStorage.setItem(LATER, String(Date.now()));
                } catch {}
                setHidden(true);
              }}
            >
              Αργότερα
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
