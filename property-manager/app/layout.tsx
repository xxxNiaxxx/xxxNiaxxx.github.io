import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { APP_NAME } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Operations dashboard and AI assistant for short-term rental managers.",
};

export const viewport: Viewport = { themeColor: "#fafaf9", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-right" richColors closeButton toastOptions={{ className: "!rounded-xl" }} />
      </body>
    </html>
  );
}
