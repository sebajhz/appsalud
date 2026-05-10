/**
 * D9.14.1 — Safe JSON error responses for the api-server (no Mapazapp mock envelope).
 */
import type { ErrorRequestHandler } from "express";

function readHttpErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const o = err as Record<string, unknown>;
  if (typeof o.status === "number" && Number.isFinite(o.status)) return o.status;
  if (typeof o.statusCode === "number" && Number.isFinite(o.statusCode)) {
    return o.statusCode;
  }
  return undefined;
}

function readErrorType(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const t = (err as { type?: unknown }).type;
  return typeof t === "string" ? t : undefined;
}

function isPayloadTooLarge(err: unknown): boolean {
  if (readHttpErrorStatus(err) === 413) return true;
  return readErrorType(err) === "entity.too.large";
}

function isInvalidJsonBody(err: unknown): boolean {
  const t = readErrorType(err);
  if (t === "entity.parse.failed") return true;
  const status = readHttpErrorStatus(err);
  return err instanceof SyntaxError && status === 400;
}

export const safeErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (isPayloadTooLarge(err)) {
    res.status(413).json({
      ok: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body is too large.",
      },
    });
    return;
  }

  if (isInvalidJsonBody(err)) {
    res.status(400).json({
      ok: false,
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON request body.",
      },
    });
    return;
  }

  res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error.",
    },
  });
};
