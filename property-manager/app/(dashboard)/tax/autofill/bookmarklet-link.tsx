"use client";

import { Bookmark, Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bookmarkletFor } from "@/lib/aade-autofill";
import { api } from "@/lib/client/api";

/** A bookmark address with a fresh key, so the bookmark fetches the stays itself. */
async function newBookmarklet() {
  const { key } = await api<{ key: string }>("/api/aade/autofill-key", { method: "POST" });
  return bookmarkletFor(key);
}

/** The draggable bookmark (computer). Made on request: each one carries its own key. */
export function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [href, setHref] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // React refuses javascript: hrefs, so it is set on the element directly.
  useEffect(() => {
    if (href) ref.current?.setAttribute("href", href);
  }, [href]);
  if (!href) {
    return (
      <Button
        variant="outline"
        loading={pending}
        onClick={async () => {
          setPending(true);
          try {
            setHref(await newBookmarklet());
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Δεν έγινε");
          } finally {
            setPending(false);
          }
        }}
      >
        <Bookmark /> Ετοιμασία κουμπιού
      </Button>
    );
  }
  return (
    <a
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        toast.info("Σύρετε το κουμπί στη γραμμή σελιδοδεικτών· δεν χρειάζεται να το πατήσετε εδώ.");
      }}
      className="inline-flex cursor-grab items-center gap-2 rounded-lg border-2 border-dashed border-primary px-4 py-2 font-medium text-primary"
    >
      <Bookmark className="size-4" /> Συμπλήρωση ΑΑΔΕ
    </a>
  );
}

/** Copies a bookmark address with a fresh key, to paste as the URL of a phone bookmark. */
export function CopyCodeButton() {
  const [text, setText] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setDone(true);
    toast.success("Αντιγράφηκε· συνεχίστε στο βήμα 2");
  };
  return (
    <Button
      size="lg"
      loading={pending}
      onClick={async () => {
        setPending(true);
        let value = text;
        try {
          if (!value) {
            value = await newBookmarklet();
            setText(value);
          }
          await copy(value);
        } catch (e) {
          // Some browsers only copy right after a tap: the address is ready now, a second tap copies it.
          if (value) toast.info("Πατήστε ξανά το κουμπί για να αντιγραφεί");
          else toast.error(e instanceof Error ? e.message : "Η αντιγραφή απέτυχε");
        } finally {
          setPending(false);
        }
      }}
    >
      {done ? <Check /> : <Copy />} {done ? "Αντιγράφηκε" : text ? "Αντιγραφή" : "Αντιγραφή κουμπιού"}
    </Button>
  );
}

/** Turns off every «Συμπλήρωση ΑΑΔΕ» bookmark of the user. */
export function RevokeBookmarksButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      onClick={async () => {
        if (!confirm("Να απενεργοποιηθούν όλοι οι σελιδοδείκτες «Συμπλήρωση ΑΑΔΕ» σας; Θα χρειαστεί να τους ξαναβάλετε.")) return;
        setPending(true);
        try {
          const { revoked } = await api<{ revoked: number }>("/api/aade/autofill-key", { method: "DELETE" });
          toast.success(revoked ? "Οι σελιδοδείκτες απενεργοποιήθηκαν" : "Δεν υπήρχε ενεργός σελιδοδείκτης");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Δεν έγινε");
        } finally {
          setPending(false);
        }
      }}
    >
      Απενεργοποίηση σελιδοδεικτών
    </Button>
  );
}
