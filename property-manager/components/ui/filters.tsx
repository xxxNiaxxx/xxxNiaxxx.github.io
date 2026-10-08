"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** URL-driven filters: every change updates the query string; the server re-renders. */
export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const set = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return { params, set, pending };
}

export function SearchInput({ placeholder = "Search…", param = "q", className }: { placeholder?: string; param?: string; className?: string }) {
  const { params, set, pending } = useQueryParams();
  const [value, setValue] = useState(params.get(param) ?? "");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => set({ [param]: value.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <Search className={cn("absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground", pending && "animate-pulse")} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-lg border border-border bg-surface pr-8 pl-9 text-sm shadow-sm placeholder:text-subtle-foreground focus:border-accent/60 focus:ring-2 focus:ring-accent/15 focus:outline-none"
      />
      {value && (
        <button onClick={() => setValue("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-subtle-foreground hover:text-foreground" aria-label="Clear search">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function FilterSelect({
  param,
  label,
  options,
  className,
}: {
  param: string;
  label: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const { params, set } = useQueryParams();
  return (
    <Select
      aria-label={label}
      value={params.get(param) ?? "all"}
      onChange={(e) => set({ [param]: e.target.value })}
      className={cn("w-full sm:w-auto sm:min-w-40", className)}
    >
      <option value="all">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
