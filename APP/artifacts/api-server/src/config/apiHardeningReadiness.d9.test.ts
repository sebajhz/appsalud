/**
 * D9.11 / D9.12 / D9.13 — Readiness / audit tests vs the D9.10 hardening model.
 * D9.12: explicit listen host in `index.ts`. D9.13: CORS allowlist wired from `apiCorsConfig`.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  createDefaultApiHardeningConfig,
  validateApiHardeningConfig,
} from "./apiHardeningConfig";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "..");

const paths = {
  appTs: join(srcRoot, "app.ts"),
  indexTs: join(srcRoot, "index.ts"),
  routesIndexTs: join(srcRoot, "routes", "index.ts"),
  mapazappRoutesTs: join(srcRoot, "mapazapp", "routes.ts"),
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

describe("D9 API hardening readiness (audit)", () => {
  describe("A — bootstrap wiring", () => {
    it("index.ts imports apiHardeningConfig; app.ts uses apiCorsConfig only", () => {
      const appSrc = readSrc("appTs");
      const indexSrc = readSrc("indexTs");
      expect(appSrc.includes("config/apiHardeningConfig")).toBe(false);
      expect(appSrc.includes("apiHardeningConfig")).toBe(false);
      expect(appSrc.includes("./config/apiCorsConfig")).toBe(true);
      expect(appSrc.includes("createCorsOptionsFromEnv")).toBe(true);
      expect(
        indexSrc.includes("createApiHardeningConfigFromEnv") ||
          indexSrc.includes("validateApiHardeningConfig"),
      ).toBe(true);
      expect(indexSrc.includes("./config/apiHardeningConfig")).toBe(true);
    });
  });

  describe("B — explicit listen host (D9.12)", () => {
    it("index.ts uses app.listen(port, host, callback)", () => {
      const indexSrc = readSrc("indexTs");
      expect(indexSrc).toMatch(/app\.listen\(\s*port\s*,\s*host\s*,/);
      expect(indexSrc.includes("app.listen(port, (err)")).toBe(false);
      expect(indexSrc.includes("app.listen(port,(err)")).toBe(false);
    });
  });

  describe("C — CORS allowlist wired (D9.13)", () => {
    it("app.ts uses createCorsOptionsFromEnv(), not bare cors()", () => {
      const appSrc = readSrc("appTs");
      expect(appSrc).not.toMatch(/app\.use\(\s*cors\s*\(\s*\)\s*\)/);
      expect(appSrc).toMatch(/app\.use\(\s*cors\s*\(\s*createCorsOptionsFromEnv\s*\(\s*\)\s*\)\s*\)/);
      expect(appSrc).not.toMatch(/origin\s*:\s*["']\*["']/);
    });
  });

  describe("D — Mapazapp router has no mutating route registrar", () => {
    it("mapazapp/routes.ts has no router.post after comment strip", () => {
      const raw = readSrc("mapazappRoutesTs");
      const src = stripLineComments(stripBlockComments(raw));
      expect(src.includes("router.post(")).toBe(false);
    });
  });

  describe("E — D9.10 model represents future safe posture", () => {
    it("createDefaultApiHardeningConfig validates clean", () => {
      const cfg = createDefaultApiHardeningConfig();
      expect(cfg.host).toBe("127.0.0.1");
      expect(cfg.corsPolicy).toBe("allowlist");
      expect(cfg.actionTransportPolicy).toBe("disabled");
      expect(cfg.actionTokenRequired).toBe(true);

      const v = validateApiHardeningConfig(cfg);
      expect(v.ok).toBe(true);
      expect(v.errors).toHaveLength(0);
    });
  });

  describe("F — D9.10 model rejects unsafe enabled-transport shapes", () => {
    it("enabled + 0.0.0.0 host fails validation", () => {
      const cfg = createDefaultApiHardeningConfig({
        host: "0.0.0.0",
        actionTransportPolicy: "enabled",
        corsPolicy: "allowlist",
      });
      expect(validateApiHardeningConfig(cfg).ok).toBe(false);
    });

    it("enabled + permissive_dev CORS fails validation", () => {
      const cfg = createDefaultApiHardeningConfig({
        corsPolicy: "permissive_dev",
        actionTransportPolicy: "enabled",
      });
      expect(validateApiHardeningConfig(cfg).ok).toBe(false);
    });

    it("enabled + token not required fails validation", () => {
      const cfg = createDefaultApiHardeningConfig({
        actionTransportPolicy: "enabled",
        corsPolicy: "allowlist",
        actionTokenRequired: false,
      });
      expect(validateApiHardeningConfig(cfg).ok).toBe(false);
    });
  });

  describe("G — future expectations (skipped until implemented)", () => {
    it.skip("D9.15 future: reject mutating action request without transport token", () => {
      /* Implemented when action transport + token middleware ship */
    });

    it.skip("D9.16 future: reject unknown actionId at HTTP boundary", () => {
      /* Implemented with action transport router + allowlist */
    });
  });

  describe("H — runtime sources: no accidental action transport surface", () => {
    it("core server files omit action-transport path markers and token literals", () => {
      const files: (keyof typeof paths)[] = [
        "appTs",
        "indexTs",
        "routesIndexTs",
        "mapazappRoutesTs",
      ];
      for (const key of files) {
        const raw = readSrc(key);
        expect(raw.includes("/api/mapazapp/actions")).toBe(false);
        expect(raw.includes("ACTION_TOKEN =")).toBe(false);
        expect(raw.includes("ACTION_SECRET =")).toBe(false);
      }
    });

    it("mapazapp routes stay registrar-clean for POST-shaped handlers", () => {
      const raw = readSrc("mapazappRoutesTs");
      const src = stripLineComments(stripBlockComments(raw));
      expect(src.includes("router.post(")).toBe(false);
    });

    it("listen entrypoint does not recommend 0.0.0.0 as default bind", () => {
      const indexSrc = readSrc("indexTs");
      expect(indexSrc.includes("createDefaultApiHardeningConfig")).toBe(false);
      expect(indexSrc).not.toMatch(/listen\s*\(\s*[^,]+,\s*["']0\.0\.0\.0["']/);
    });
  });
});
