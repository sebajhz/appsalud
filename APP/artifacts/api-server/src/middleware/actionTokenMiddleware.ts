/**
 * D9.17 — Action-token verification middleware skeleton (not mounted in app.ts).
 * Does not invoke launcher-side dispatch or remap callers; no cookie auth.
 */

import { timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler } from "express";
import type { ApiActionTokenConfig } from "../config/apiActionTokenConfig";

export interface ActionTokenMiddlewareOptions {
  config: ApiActionTokenConfig;
  getExpectedToken: () => string | null | Promise<string | null>;
  /** Reserved for future structured logging without echoing secrets. */
  logger?: unknown;
}

const BODY_MISSING = {
  ok: false,
  error: {
    code: "ACTION_TOKEN_REQUIRED",
    message: "Action token is required.",
  },
} as const;

const BODY_INVALID = {
  ok: false,
  error: {
    code: "ACTION_TOKEN_INVALID",
    message: "Action token is invalid.",
  },
} as const;

const BODY_QUERY = {
  ok: false,
  error: {
    code: "ACTION_TOKEN_QUERY_REJECTED",
    message: "Action token must be sent in the configured header.",
  },
} as const;

/** Query keys that must never carry the transport secret (D9.18). */
const BLOCKED_QUERY_KEYS = new Set(["token", "action_token", "x-mapazapp-action-token"]);

function readHeaderToken(req: Request, headerName: string): string | undefined {
  const lower = headerName.toLowerCase();
  const raw = req.headers[lower];
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw) && raw.length > 0) return raw[0]?.trim();
  return undefined;
}

function hasBlockedQueryToken(query: Request["query"], rejectQueryToken: boolean): boolean {
  if (!rejectQueryToken) return false;
  if (!query || typeof query !== "object") return false;
  for (const key of Object.keys(query)) {
    if (BLOCKED_QUERY_KEYS.has(key.toLowerCase())) return true;
  }
  return false;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function createActionTokenMiddleware(
  options: ActionTokenMiddlewareOptions,
): RequestHandler {
  const { config, getExpectedToken } = options;

  return function actionTokenMiddleware(req, res, next): void {
    if (!config.actionTokenRequired || config.actionTokenPolicy === "disabled") {
      next();
      return;
    }

    if (!config.safeErrorEnvelopeEnabled) {
      res.status(500).json({
        ok: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." },
      });
      return;
    }

    if (hasBlockedQueryToken(req.query, config.rejectQueryToken)) {
      res.status(400).json(BODY_QUERY);
      return;
    }

    const presented = readHeaderToken(req, config.tokenHeaderName);
    if (!presented) {
      res.status(401).json(BODY_MISSING);
      return;
    }

    void (async () => {
      let expected: string | null;
      try {
        expected = await getExpectedToken();
      } catch {
        res.status(403).json(BODY_INVALID);
        return;
      }

      if (expected === null || expected === "") {
        res.status(403).json(BODY_INVALID);
        return;
      }

      if (!timingSafeStringEqual(presented, expected)) {
        res.status(403).json(BODY_INVALID);
        return;
      }

      next();
    })().catch(() => {
      if (!res.headersSent) {
        res.status(403).json(BODY_INVALID);
      }
    });
  };
}
