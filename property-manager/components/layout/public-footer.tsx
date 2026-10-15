import Link from "next/link";
import { APP_NAME, INDEPENDENCE_NOTE, SUPPORT_EMAIL } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Footer of the public pages: who we are not, contact and the legal pages. */
export function PublicFooter({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-2 text-xs text-muted-foreground", className)}>
      <p>{INDEPENDENCE_NOTE}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>© {new Date().getFullYear()} {APP_NAME}</span>
        {SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-foreground">{SUPPORT_EMAIL}</a>}
        <Link href="/help" className="hover:text-foreground">Βοήθεια</Link>
        <Link href="/privacy" className="hover:text-foreground">Απόρρητο</Link>
        <Link href="/terms" className="hover:text-foreground">Όροι χρήσης</Link>
        <Link href="/dpa" className="hover:text-foreground">GDPR</Link>
      </div>
    </div>
  );
}
