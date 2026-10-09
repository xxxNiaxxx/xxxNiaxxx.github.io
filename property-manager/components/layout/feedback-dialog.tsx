"use client";

import { MessageSquarePlus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { cn } from "@/lib/utils";

const KINDS = [
  ["BUG", "Πρόβλημα"],
  ["IDEA", "Ιδέα"],
  ["OTHER", "Σχόλιο"],
] as const;

/** "Στείλτε σχόλιο": testers report a problem or an idea from any page. */
export function FeedbackDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("BUG");
  const [message, setMessage] = useState("");
  const pathname = usePathname();
  const { run, pending, fieldErrors } = useMutation();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface/70 hover:text-foreground">
            <MessageSquarePlus className="size-[18px] text-subtle-foreground" /> Στείλτε σχόλιο
          </button>
        )}
      </DialogTrigger>
      <DialogContent title="Στείλτε σχόλιο" description="Κάτι δεν δουλεύει ή θα θέλατε κάτι καινούργιο; Το διαβάζουμε όλο.">
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => api("/api/feedback", { body: { kind, message, page: pathname, client: "web" } }), {
              success: "Ευχαριστούμε! Το λάβαμε.",
              refresh: false,
              onSuccess: () => {
                setMessage("");
                setOpen(false);
              },
            });
          }}
        >
          <div className="flex gap-1.5" role="radiogroup" aria-label="Είδος">
            {KINDS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={cn("rounded-full px-3 py-1 text-[13px] font-medium ring-1 ring-border", kind === k ? "bg-primary text-primary-foreground ring-primary" : "bg-surface text-muted-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            aria-label="Μήνυμα"
            placeholder={kind === "BUG" ? "Τι κάνατε, τι περιμένατε και τι έγινε;" : kind === "IDEA" ? "Τι θα σας βοηθούσε;" : "Γράψτε μας…"}
          />
          {fieldErrors.message && <p className="text-xs text-danger">{fieldErrors.message}</p>}
          <p className="text-xs text-muted-foreground">Στέλνεται μαζί η σελίδα όπου βρίσκεστε ({pathname}).</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Ακύρωση</Button>
            <Button type="submit" loading={pending} disabled={message.trim().length < 3}>Αποστολή</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
