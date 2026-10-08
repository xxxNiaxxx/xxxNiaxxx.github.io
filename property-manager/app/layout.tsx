import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { APP_NAME } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Διαχείριση βραχυχρόνιων μισθώσεων με βοηθό τεχνητής νοημοσύνης.",
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
