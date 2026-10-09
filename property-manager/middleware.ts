import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap edge redirect for signed-out visitors. Real authentication and
 * organization checks happen server-side in every page and API handler.
 */
const AUTH_PAGES = ["/login", "/register"];
/** Readable without signing in (Google Play requires public URLs for these). */
const PUBLIC = [...AUTH_PAGES, "/logout", "/privacy", "/terms", "/dpa", "/account-deletion", "/invite", "/waitlist", "/help", "/checkin", "/guide", "/book"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");
  // "/" is the public landing page (signed-in visitors are sent on to the dashboard by the page).
  if (!hasSession && pathname !== "/" && !PUBLIC.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  if (hasSession && AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image|logo-mark.png|logo-full.png).*)"],
};
