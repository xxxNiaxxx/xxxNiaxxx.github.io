import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { reportError } from "@/lib/monitoring/errors";

const statusByCode: Record<AppError["code"], number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
  BAD_REQUEST: 400,
  PAYMENT_REQUIRED: 402,
};

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: statusByCode[error.code] },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: error.issues[0]?.message ?? "Μη έγκυρα στοιχεία",
          details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      { status: 422 },
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Δεν βρέθηκε" } }, { status: 404 });
  }
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Κάτι πήγε στραβά. Δοκιμάστε ξανά." } },
    { status: 500 },
  );
}

type Handler<P> = (req: NextRequest, params: P) => Promise<unknown>;

/** Wraps a route handler: JSON-serialises the result and maps errors. */
export function route<P extends Record<string, string> = Record<string, never>>(handler: Handler<P>) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      const result = await handler(req, await context.params);
      if (result instanceof Response) return result;
      return NextResponse.json({ data: result ?? null });
    } catch (error) {
      const response = errorResponse(error);
      if (response.status === 500) await reportError(error, { source: "api", path: `${req.method} ${req.nextUrl.pathname}` });
      return response;
    }
  };
}

export function created(data: unknown) {
  return NextResponse.json({ data }, { status: 201 });
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("BAD_REQUEST", "Μη έγκυρο αίτημα");
  }
}

export function searchParamsObject(req: NextRequest): Record<string, string> {
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}
