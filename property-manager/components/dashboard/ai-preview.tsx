"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS = [
  "Ποιος έρχεται αύριο;",
  "Τι χρειάζεται την προσοχή μου σήμερα;",
  "Πόσα έβγαλα αυτόν τον μήνα;",
  "Ποιο ακίνητο αποδίδει καλύτερα;",
];

export function AIPreview() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const ask = (q: string) => q.trim() && router.push(`/ai?q=${encodeURIComponent(q.trim())}`);
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="rounded-lg bg-accent-soft p-1.5 text-accent">
          <Sparkles className="size-4" />
        </span>
        Βοηθός AI
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(value);
        }}
        className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/15"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ρωτήστε τον βοηθό AI…"
          aria-label="Ρωτήστε τον βοηθό AI"
          className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="rounded-lg bg-primary p-1.5 text-primary-foreground disabled:opacity-30"
          aria-label="Αποστολή"
        >
          <ArrowUp className="size-4" />
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
