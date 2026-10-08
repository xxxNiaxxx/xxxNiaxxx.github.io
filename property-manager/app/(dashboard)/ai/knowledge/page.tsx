import { Brain } from "lucide-react";
import type { Metadata } from "next";
import { AddMemoryForm, MemoryItem } from "@/components/ai/knowledge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { listMemories } from "@/lib/ai/memory";
import { getPageContext } from "@/lib/auth/page";
import { getFormOptions } from "@/lib/services/options";

export const metadata: Metadata = { title: "Γνώσεις AI" };

const SECTIONS = [
  { kind: "GUEST_INFO", title: "Πληροφορίες για επισκέπτες", description: "Μπαίνουν στις οδηγίες άφιξης (Wi-Fi, πάρκινγκ, πρόσβαση, κανόνες σπιτιού)." },
  { kind: "PREFERENCE", title: "Προτιμήσεις της ομάδας", description: "Πώς θέλετε να δουλεύει και να γράφει ο βοηθός." },
  { kind: "MESSAGE_TEMPLATE", title: "Πρότυπα που έμαθε από τις διορθώσεις σας", description: "Όταν διορθώνετε ένα μήνυμα του βοηθού και το εγκρίνετε, κρατά τη δική σας εκδοχή — μία ανά τύπο μηνύματος και γλώσσα." },
] as const;

export default async function KnowledgePage() {
  const { ctx } = await getPageContext();
  const [memories, options] = await Promise.all([listMemories(ctx), getFormOptions(ctx)]);
  const aiEnabled = Boolean(process.env.AI_API_KEY);
  return (
    <>
      <PageHeader
        back={{ href: "/ai", label: "Βοηθός AI" }}
        title="Γνώσεις AI"
        description="Ό,τι έχει μάθει ο βοηθός από εσάς. Μπορείτε επίσης να του γράψετε στη συνομιλία «Θυμήσου ότι…»."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid min-w-0 content-start gap-6">
          {SECTIONS.map((s) => {
            const items = memories.filter((m) => m.kind === s.kind);
            return (
              <Card key={s.kind}>
                <CardHeader title={s.title} description={s.description} />
                <CardContent>
                  {items.length ? (
                    <ul className="grid gap-3">{items.map((m) => <MemoryItem key={m.id} memory={m} />)}</ul>
                  ) : (
                    <EmptyState icon={<Brain />} title="Τίποτα ακόμη" className="py-6" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Μάθετε κάτι στον βοηθό" />
            <CardContent>
              <AddMemoryForm properties={options.properties} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 text-[13px] leading-relaxed text-muted-foreground">
              {aiEnabled
                ? "Με σύνδεση σε μοντέλο AI, ο βοηθός χρησιμοποιεί όλες τις γνώσεις και μεταφράζει τις πληροφορίες στη γλώσσα κάθε επισκέπτη."
                : "Χωρίς σύνδεση σε μοντέλο AI, οι πληροφορίες για επισκέπτες μπαίνουν μόνο σε μηνύματα της ίδιας γλώσσας (ελληνικές σημειώσεις σε Έλληνες, λατινικούς χαρακτήρες σε αγγλόφωνους). Με κλειδί AI μεταφράζονται αυτόματα."}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
