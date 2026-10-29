import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApplyReady AI — Tailor your CV",
  description: "Create a job-tailored CV and cover letter in English, Greek, Spanish, French or German.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The page sets <html lang> to the chosen site language after loading.
  return <html lang="en"><body>{children}</body></html>;
}
