import { handleExport } from "../handler";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handleExport(request, "docx");
}
