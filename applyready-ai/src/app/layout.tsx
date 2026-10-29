import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApplyReady AI — Tailor your CV",
  description: "Create a job-tailored CV and cover letter in English, Greek, Spanish, French or German.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "dark light" };

// Applies a saved light-mode choice before first paint, so dark-mode users and
// light-mode users never see a flash of the other scheme. Dark is the default.
const colorSchemeScript = `try{if(localStorage.getItem("applyready.colorScheme")==="light")document.documentElement.dataset.colorScheme="light"}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The page sets <html lang> to the chosen site language after loading.
  return (
    <html lang="en" data-color-scheme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: colorSchemeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
