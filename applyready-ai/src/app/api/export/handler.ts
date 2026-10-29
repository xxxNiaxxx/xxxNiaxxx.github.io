import { AppError } from "@/lib/errors";
import { verifyEntitlementToken } from "@/lib/entitlements";
import { contentDisposition, exportBlocks, exportFilename } from "@/lib/export/common";
import { renderDocx } from "@/lib/export/docx";
import { renderPdf } from "@/lib/export/pdf";
import { clientIp, handleError, hashKey, readJson } from "@/lib/http";
import { consumeExport } from "@/lib/ratelimit";
import { exportSchema, type ExportRequest } from "@/lib/schema";
import { getPurchase } from "@/lib/stripe";
import { isPremiumTheme } from "@/lib/themes";

const MAX_BODY_BYTES = 120_000;

const titles: Record<ExportRequest["document"], string> = { cv: "Curriculum Vitae", letter: "Cover letter" };
const mime = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Premium themes need a valid token AND a purchase record that is still paid. */
async function assertThemeAllowed(input: ExportRequest) {
  if (!isPremiumTheme(input.theme)) return;
  const entitlement = verifyEntitlementToken(input.entitlement);
  if (!entitlement || entitlement.theme !== input.theme) throw new AppError("premium_locked");
  const purchase = await getPurchase(entitlement.sessionId);
  if (!purchase || purchase.status !== "paid" || purchase.theme !== input.theme) throw new AppError("premium_locked");
}

export async function handleExport(request: Request, format: "pdf" | "docx") {
  try {
    const input = await readJson(request, exportSchema, MAX_BODY_BYTES);
    await consumeExport(hashKey(clientIp(request)));
    await assertThemeAllowed(input);
    const blocks = exportBlocks(input);
    const meta = { title: titles[input.document], language: input.language };
    let bytes: Uint8Array;
    try {
      bytes = format === "pdf" ? await renderPdf(blocks, input.theme, meta) : await renderDocx(blocks, input.theme, meta);
    } catch {
      throw new AppError("export_failed", format);
    }
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime[format],
        "Content-Disposition": contentDisposition(exportFilename(input.document, input.theme, format)),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleError(`export_${format}`, error);
  }
}
