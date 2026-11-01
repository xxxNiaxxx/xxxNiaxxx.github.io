import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/brand";
import { LAST_REVIEWED } from "@/lib/tax/gr";
import { GUIDES, guideBySlug } from "../guides";

export const dynamicParams = false;
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/odigoi/${guide.slug}` },
    openGraph: { title: guide.title, description: guide.description, type: "article" },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();
  const others = GUIDES.filter((g) => g.slug !== guide.slug);
  // For search engines: what the page is and when its numbers were checked.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    dateModified: LAST_REVIEWED,
    inLanguage: "el",
    publisher: { "@type": "Organization", name: APP_NAME },
  };
  return (
    <article className="space-y-4 text-[15px] leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_li]:text-muted-foreground [&_p]:text-muted-foreground [&_strong]:text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/odigoi" className="text-sm text-muted-foreground hover:text-foreground">← Όλοι οι οδηγοί</Link>
      <h1 className="text-3xl font-semibold tracking-tight">{guide.title}</h1>
      <p className="text-xs">Ενημερώθηκε {LAST_REVIEWED.split("-").reverse().join("/")} · από την ομάδα του {APP_NAME}</p>
      {guide.body()}
      <h2>Διαβάστε επίσης</h2>
      <ul>
        {others.map((g) => (
          <li key={g.slug}><Link href={`/odigoi/${g.slug}`} className="text-foreground underline underline-offset-4">{g.title}</Link></li>
        ))}
      </ul>
    </article>
  );
}
