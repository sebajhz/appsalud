/**
 * D9.19 — Transport readiness skeletons (no action endpoint, no POST transport).
 * Static audits + pure gate/token assertions; future HTTP cases stay skipped.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  createDefaultActionGatePolicy,
  evaluateActionGate,
} from "@workspace/mapazapp-core";
import {
  CANONICAL_ACTION_TOKEN_HEADER,
  createDefaultApiActionTokenConfig,
  validateApiActionTokenConfig,
} from "./apiActionTokenConfig";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "..");
/** Monorepo APP/ (artifacts/api-server/src/config → ../../../..). */
const appRoot = join(__dirname, "..", "..", "..", "..");
const scriptsSrc = join(appRoot, "scripts", "src");
const dispatcherTs = join(scriptsSrc, "mapazapp-launcher-action-dispatcher.ts");

const paths = {
  mapazappRoutesTs: join(srcRoot, "mapazapp", "routes.ts"),
  appTs: join(srcRoot, "app.ts"),
  indexTs: join(srcRoot, "index.ts"),
  routesIndexTs: join(srcRoot, "routes", "index.ts"),
  actionTokenMwTs: join(srcRoot, "middleware", "actionTokenMiddleware.ts"),
  actionTokenCfgTs: join(srcRoot, "config", "apiActionTokenConfig.ts"),
} as const;

function stripBlockComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "");
}

function stripLineComments(src: string): string {
  return src
    .split(/\r?\n/)
    .map((line) => {
      const idx = line.indexOf("//");
      if (idx === -1) return line;
      return line.slice(0, idx);
    })
    .join("\n");
}

function readSrc(rel: keyof typeof paths): string {
  return readFileSync(paths[rel], "utf8");
}

function collectNonTestTsFiles(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "dist" || name === "node_modules") continue;
      collectNonTestTsFiles(full, out);
      continue;
    }
    if (!name.endsWith(".ts")) continue;
    if (name.includes(".test.")) continue;
    out.push(full);
  }
}

describe("D9.19 — action transport readiness skeletons", () => {
  describe("1 — No action endpoint surface", () => {
    it("mapazapp routes omit /api/mapazapp/actions and router.post after comment strip", () => {
      const raw = readSrc("mapazappRoutesTs");
      expect(raw.includes("/api/mapazapp/actions")).toBe(false);
      const src = stripLineComments(stripBlockComments(raw));
      expect(src.includes("router.post(")).toBe(false);
    });
  });

  describe("2 — Future transport expects header token policy", () => {
    it("actionTokenMiddleware exists; default config requires token; header canonical", () => {
      const mwSrc = readSrc("actionTokenMwTs");
      expect(mwSrc.includes("createActionTokenMiddleware")).toBe(true);

      const cfg = createDefaultApiActionTokenConfig();
      expect(cfg.actionTokenRequired).toBe(true);
      expect(cfg.tokenHeaderName).toBe(CANONICAL_ACTION_TOKEN_HEADER);
      expect(cfg.redactTokenInLogs).toBe(true);
      expect(validateApiActionTokenConfig(cfg).ok).toBe(true);
    });

    it("log redaction paths cover x-mapazapp-action-token fragment (header redacted)", () => {
      const redactSrc = readFileSync(join(srcRoot, "lib", "logRedaction.ts"), "utf8");
      expect(redactSrc.toLowerCase()).toContain("x-mapazapp-action-token");
    });
  });

  describe("3 — Future transport expects shared gates", () => {
    it("evaluateActionGate exists; validate_environment blocked for api/dashboard by default", () => {
      const apiDecision = evaluateActionGate(
        {
          actionId: "validate_environment",
          callerSource: "api",
          transportGatePresent: false,
          launcherAvailable: false,
        },
        createDefaultActionGatePolicy(),
      );
      expect(apiDecision.allowed).toBe(false);
      expect(apiDecision.status === "requires_launcher" || apiDecision.status === "requires_transport_gate").toBe(
        true,
      );

      const dashDecision = evaluateActionGate(
        {
          actionId: "validate_environment",
          callerSource: "dashboard",
          transportGatePresent: false,
        },
        createDefaultActionGatePolicy(),
      );
      expect(dashDecision.allowed).toBe(false);

      const launcherDecision = evaluateActionGate(
        {
          actionId: "validate_environment",
          callerSource: "launcher",
          launcherAvailable: true,
          transportGatePresent: false,
        },
        createDefaultActionGatePolicy(),
      );
      expect(launcherDecision.allowed).toBe(true);

      const scriptDecision = evaluateActionGate(
        {
          actionId: "validate_environment",
          callerSource: "script",
          launcherAvailable: true,
        },
        createDefaultActionGatePolicy(),
      );
      expect(scriptDecision.allowed).toBe(true);
    });
  });

  describe("4 — Dispatcher source (scripts): validate_environment only executed path", () => {
    it("dispatchLauncherAction present; only validate_environment reaches preflight branch", () => {
      const raw = readFileSync(dispatcherTs, "utf8");
      expect(raw.includes("export async function dispatchLauncherAction")).toBe(true);
      expect(raw.includes('request.actionId === "validate_environment"')).toBe(true);
      expect(raw.includes("DISPATCH_ONLY_VALIDATE_ENV_MESSAGE")).toBe(true);
      expect(raw.includes("nonValidateAllowedActionResult")).toBe(true);
    });
  });

  describe("5 — Explicit skips for future HTTP boundary", () => {
    it.skip("future POST validate_environment rejected without transport token", () => {
      /* Wire supertest + mounted action stack when transport lands */
    });

    it.skip("future POST unknown actionId rejected", () => {});

    it.skip("future POST blocked action returns safe ActionResult envelope", () => {});

    it.skip("future POST never enables trading flags in ActionResult safety", () => {});

    it.skip("future POST responses omit private path segments", () => {});
  });

  describe("6 — Static scan: api-server product TS stays non-operational for actions", () => {
    const productFiles: string[] = [];
    collectNonTestTsFiles(srcRoot, productFiles);

    it("no /api/mapazapp/actions and no router.post in mapazapp routes", () => {
      const raw = readSrc("mapazappRoutesTs");
      expect(raw.includes("/api/mapazapp/actions")).toBe(false);
      expect(stripLineComments(stripBlockComments(raw)).includes("router.post(")).toBe(false);
    });

    it("core bootstrap files omit spawn/child_process/WebSocket/localStorage markers", () => {
      for (const key of ["appTs", "indexTs", "routesIndexTs"] as const) {
        const raw = readSrc(key);
        expect(raw.includes("child_process")).toBe(false);
        expect(raw.includes("child-process")).toBe(false);
        expect(/\bspawn\s*\(/.test(raw)).toBe(false);
        expect(raw.includes("WebSocket")).toBe(false);
        expect(raw.includes("localStorage")).toBe(false);
      }
    });

    it("product TS files omit hardcoded shared-secret literals and action transport path", () => {
      for (const file of productFiles) {
        const raw = readFileSync(file, "utf8");
        expect(raw.includes("/api/mapazapp/actions")).toBe(false);
        expect(raw.includes("ACTION_SECRET")).toBe(false);
        expect(raw.includes("MAPazapp_ACTION_SECRET")).toBe(false);
      }
    });

    it("createActionTokenMiddleware factory never imports launcher dispatcher", () => {
      const mw = readSrc("actionTokenMwTs");
      expect(mw.includes("dispatchLauncherAction")).toBe(false);
    });

    it("app.ts does not mount action token middleware yet", () => {
      expect(readSrc("appTs").includes("actionTokenMiddleware")).toBe(false);
      expect(readSrc("appTs").includes("createActionTokenMiddleware")).toBe(false);
    });
  });
});
