import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { APP_NAME } from "@/lib/brand";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
      <Link href="/" className="mb-10 flex items-center gap-2.5 font-semibold tracking-tight">
        <Logo /> {APP_NAME}
      </Link>
      <article className="space-y-4 text-[15px] leading-relaxed text-foreground [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
        {children}
      </article>
    </div>
  );
}
