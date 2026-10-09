import type { Instrumentation } from "next";

/** Unexpected errors in pages, server actions and plain route handlers reach the administrators too. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // The condition is replaced at build time, so the edge bundle never includes the Node-only reporter.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportError } = await import("./lib/monitoring/errors");
    await reportError(error, { source: context.routeType === "route" ? "api" : "page", path: `${request.method} ${request.path}` });
  }
};
