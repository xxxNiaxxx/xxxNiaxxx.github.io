/**
 * Browser-only: shrinks a screenshot before upload so it stays well under the
 * server limit and the AI reads it faster. Text stays legible at 2000 px.
 */
const MAX_SIDE = 2000;
const MAX_DATA_URL = 3_900_000; // ≈ 2.9 MB of image data, under the 3 MB server limit

export const MAX_SOURCE_IMAGE_BYTES = 10_000_000;

export async function imageToDataUrl(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#ffffff"; // transparent PNG areas become white, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.8, 0.65, 0.5]) {
      const url = canvas.toDataURL("image/jpeg", quality);
      if (url.length <= MAX_DATA_URL) return url;
    }
    throw new Error("too large");
  } finally {
    bitmap.close();
  }
}
