import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_APP_URL || "https://aivrachychronia.vercel.app").replace(/\/$/, "");

/** Search engines may read the public pages; the app itself and the guests' pages stay out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/waitlist", "/ypologistis", "/odigoi", "/help", "/privacy", "/terms"], disallow: ["/api/", "/checkin/", "/guide/", "/book/", "/invite/", "/unsubscribe/", "/register"] },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
