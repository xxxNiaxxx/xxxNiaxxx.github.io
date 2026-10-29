import { readZipEntry } from "@/lib/zip";

export const greekCv = `Μαρία Παπαδοπούλου
Αθήνα · maria@example.com

## Εμπειρία
- Υπεύθυνη εξυπηρέτησης πελατών, Ξενοδοχείο Ακρόπολις (2019–2024)
- Συντονισμός ομάδας 6 ατόμων

## Εκπαίδευση
Πτυχίο Τουριστικών Σπουδών, Πανεπιστήμιο Πειραιώς (2018)

## Δεξιότητες
- Ελληνικά, Αγγλικά, Γερμανικά: Größe, Straße, Übung
- Español: niño, acción · Français: garçon, élève, œuvre`;

export const englishJob = "We are hiring a front office manager with team leadership, customer service and German language skills.";

export function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.7", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Reads one file out of a .zip as text (enough for checking .docx contents in tests). */
export function readZipText(zip: Buffer, name: string): string | null {
  return readZipEntry(zip, name)?.toString("utf8") ?? null;
}

export function aiReply(result: unknown, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: typeof result === "string" ? result : JSON.stringify(result) } }] }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
