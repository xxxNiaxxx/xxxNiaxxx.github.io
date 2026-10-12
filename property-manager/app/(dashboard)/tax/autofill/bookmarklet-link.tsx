"use client";

import { Bookmark, Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AUTOFILL_BOOKMARKLET } from "@/lib/aade-autofill";

/** The draggable bookmark (computer). React refuses javascript: hrefs, so it is set after mount. */
export function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("href", AUTOFILL_BOOKMARKLET);
  }, []);
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

/** Copies the bookmark's address, to paste as the URL of a phone bookmark. */
export function CopyCodeButton() {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="lg"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(AUTOFILL_BOOKMARKLET);
          setDone(true);
          toast.success("Αντιγράφηκε· συνεχίστε στο βήμα 2");
        } catch {
          toast.error("Η αντιγραφή απέτυχε");
        }
      }}
    >
      {done ? <Check /> : <Copy />} {done ? "Αντιγράφηκε" : "Αντιγραφή κουμπιού"}
    </Button>
  );
}
