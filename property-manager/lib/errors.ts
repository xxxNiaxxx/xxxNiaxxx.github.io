/** Errors thrown by services; route handlers map them to HTTP responses. */
export class AppError extends Error {
  constructor(
    public readonly code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "VALIDATION" | "BAD_REQUEST",
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what: string) => new AppError("NOT_FOUND", `${what} not found`);
export const conflict = (message: string, details?: unknown) => new AppError("CONFLICT", message, details);
export const badRequest = (message: string, details?: unknown) => new AppError("BAD_REQUEST", message, details);
