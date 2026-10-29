import { inflateRawSync } from "node:zlib";

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

/** Reads one file out of a .zip (enough for checking .docx contents in tests). */
export function readZipEntry(zip: Buffer, name: string): string | null {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) return null;
  const count = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = zip.readUInt16LE(offset + 10);
    const compressed = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const local = zip.readUInt32LE(offset + 42);
    const entryName = zip.toString("utf8", offset + 46, offset + 46 + nameLength);
    if (entryName === name) {
      const dataStart = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(dataStart, dataStart + compressed);
      return (method === 8 ? inflateRawSync(data) : data).toString("utf8");
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

export function aiReply(result: unknown, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: typeof result === "string" ? result : JSON.stringify(result) } }] }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
