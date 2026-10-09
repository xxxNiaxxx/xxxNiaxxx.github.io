import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { APP_NAME } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Κρατήσεις από όλες τις πλατφόρμες, ΑΑΔΕ, φόροι, check-in και βοηθός AI για Έλληνες οικοδεσπότες βραχυχρόνιας μίσθωσης.",
  // Absolute links for the link preview image (Facebook, Viber, WhatsApp).
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  openGraph: { siteName: APP_NAME, locale: "el_GR", type: "website" },
};

export const viewport: Viewport = { themeColor: "#fafaf9", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-right" richColors closeButton toastOptions={{ className: "!rounded-xl" }} />
      </body>
    </html>
  );
}
