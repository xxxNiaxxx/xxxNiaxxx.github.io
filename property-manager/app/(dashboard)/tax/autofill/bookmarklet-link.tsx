"use client";

import { Bookmark, Copy } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AUTOFILL_BOOKMARKLET } from "@/lib/aade-autofill";

/** The draggable bookmark. React refuses javascript: hrefs, so it is set after mount. */
export function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("href", AUTOFILL_BOOKMARKLET);
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-2">
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
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(AUTOFILL_BOOKMARKLET);
            toast.success("Ο κώδικας αντιγράφηκε");
          } catch {
            toast.error("Η αντιγραφή απέτυχε");
          }
        }}
      >
        <Copy /> Αντιγραφή κώδικα
      </Button>
    </div>
  );
}
