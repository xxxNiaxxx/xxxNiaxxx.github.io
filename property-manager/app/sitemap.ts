import type { MetadataRoute } from "next";
import { LAST_REVIEWED } from "@/lib/tax/gr";
import { GUIDES } from "./odigoi/guides";

const BASE = (process.env.NEXT_PUBLIC_APP_URL || "https://aivrachychronia.vercel.app").replace(/\/$/, "");

/** The public pages, for search engines. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/waitlist`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/ypologistis`, lastModified: LAST_REVIEWED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/odigoi`, lastModified: LAST_REVIEWED, changeFrequency: "monthly", priority: 0.8 },
    ...GUIDES.map((g) => ({ url: `${BASE}/odigoi/${g.slug}`, lastModified: LAST_REVIEWED, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${BASE}/help`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
