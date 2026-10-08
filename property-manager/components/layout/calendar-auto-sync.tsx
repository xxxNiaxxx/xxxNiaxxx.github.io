"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Asks the server to read the iCal calendars when the app opens (it skips ones read in the last 30 minutes). */
export function CalendarAutoSync() {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/calendars/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: { created: number; updated: number; cancelled: number } } | null) => {
        const d = j?.data;
        if (d && d.created + d.updated + d.cancelled > 0) router.refresh();
      })
      .catch(() => {});
    // Once per page load is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
