import { inflateRawSync } from "node:zlib";

/**
 * Reads one file out of a .zip archive (a .docx is a zip). Minimal on purpose:
 * no dependency, and a hard cap on the inflated size so a crafted "zip bomb"
 * cannot exhaust memory.
 */
export function readZipEntry(zip: Buffer, name: string, maxBytes = 5_000_000): Buffer | null {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0 || eocd + 22 > zip.length) return null;
  const count = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);
  for (let i = 0; i < count && offset + 46 <= zip.length; i++) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) return null;
    const method = zip.readUInt16LE(offset + 10);
    const compressed = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const local = zip.readUInt32LE(offset + 42);
    const entryName = zip.toString("utf8", offset + 46, offset + 46 + nameLength);
    if (entryName === name) {
      if (local + 30 > zip.length) return null;
      const dataStart = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(dataStart, dataStart + compressed);
      if (method === 0) return data.length <= maxBytes ? Buffer.from(data) : null;
      if (method !== 8) return null;
      try {
        return inflateRawSync(data, { maxOutputLength: maxBytes });
      } catch {
        return null;
      }
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}
