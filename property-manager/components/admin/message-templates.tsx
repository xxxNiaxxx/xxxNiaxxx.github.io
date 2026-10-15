"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MessageTemplate } from "@/lib/message-templates";

export function MessageTemplates({ groups }: { groups: { title: string; templates: MessageTemplate[] }[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (t: MessageTemplate) => {
    try {
      await navigator.clipboard.writeText(t.text);
      setCopied(t.id);
      toast.success(t.text.includes("[") ? "Αντιγράφηκε · αλλάξτε ό,τι είναι σε [αγκύλες]" : "Αντιγράφηκε");
    } catch {
      toast.error("Η αντιγραφή απέτυχε· επιλέξτε το κείμενο με το χέρι");
    }
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      {groups.map((g) => (
        <section key={g.title} className="grid gap-3">
          <h2 className="text-base font-semibold">{g.title}</h2>
          {g.templates.map((t) => (
            <Card key={t.id} className="grid gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium">{t.title}</h3>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{t.when}</p>
                </div>
                <Button size="sm" variant={copied === t.id ? "outline" : "default"} onClick={() => copy(t)} className="shrink-0">
                  {copied === t.id ? <Check /> : <Copy />} {copied === t.id ? "Αντιγράφηκε" : "Αντιγραφή"}
                </Button>
              </div>
              <p className="rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line">{t.text}</p>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}
