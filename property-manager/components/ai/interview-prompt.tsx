import { MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** "The assistant has questions for you": a way into the knowledge interview, with its progress. */
export function InterviewPrompt({ propertyId, answered, total, open }: { propertyId?: string; answered?: number; total?: number; open?: boolean }) {
  const href = `/ai/knowledge/interview${propertyId ? `?property=${propertyId}` : ""}`;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-3">
      <MessageCircleQuestion className="size-5 shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-sm">
        {answered === undefined
          ? "Μη γράφετε τα πάντα μόνοι σας: ο βοηθός σάς κάνει τις σημαντικές ερωτήσεις ή τις βρίσκει στη σελίδα σας στο Booking.com."
          : open
            ? `Ο βοηθός έχει ερωτήσεις για το κατάλυμα · ${answered} από ${total} απαντημένες.`
            : `Απαντήσατε στις ερωτήσεις του βοηθού (${answered} από ${total}).`}
      </p>
      <Button asChild size="sm" variant={open === false ? "ghost" : "default"}>
        <Link href={href}>{answered === undefined ? "Ξεκινήστε" : open ? (answered ? "Συνέχεια" : "Ξεκινήστε") : "Προβολή"}</Link>
      </Button>
    </div>
  );
}
