/**
 * D9.12.1 — Runtime status `api.url` / `api.port` aligned with API hardening env resolution.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app";
import { buildRuntimeStatusPayload } from "./adapters/runtimeStatus";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mapazappRoutesPath = join(__dirname, "routes.ts");

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

function assertNoUnsafeRuntimeStatusJson(json: string): void {
  expect(json).not.toMatch(/"executionEnabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"sendToMt5Enabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"canAutoExecute"\s*:\s*true\b/);
  expect(json).not.toMatch(/"autoApprovalEnabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"registryMutationAllowed"\s*:\s*true\b/);
  expect(json).not.toMatch(/"approved"\s*:\s*true\b/);
  const low = json.toLowerCase();
  expect(low).not.toContain("ready to trade");
  expect(low).not.toContain("live trading");
  expect(low).not.toContain("real trading");
  expect(low).not.toContain("execute order");
  expect(low).not.toContain("send order");
  expect(low).not.toContain("ordersend");
  expect(low).not.toContain("ctrade");
  expect(low).not.toContain("mt5 connected");
  expect(low).not.toContain("bridge connected");
  expect(low).not.toContain("appdata");
  expect(low).not.toContain("metaquotes");
  expect(low).not.toContain("terminal64.exe");
  expect(low).not.toContain("c:\\users");
  expect(low).not.toContain("/users/");
  expect(low).not.toContain("login");
  expect(low).not.toContain("balance");
  expect(low).not.toContain("equity");
  expect(low).not.toContain("investor");
  expect(low).not.toMatch(/\baccount\b/);
}

describe("D9.12.1 runtime status API host/port alignment", () => {
  it("A. default env bag yields api.port 3001 and loopback url", () => {
    const payload = buildRuntimeStatusPayload({});
    const api = payload.api as { url: string | null; port: number | null };
    expect(api.port).toBe(3001);
    expect(api.url).toBe("http://127.0.0.1:3001");

    const d = payload as Record<string, unknown>;
    expect((d.mt5 as { status: string }).status).toBe("not_configured");
    expect((d.bridge as { status: string }).status).toBe("not_configured");
    expect((d.safety as { executionEnabled: boolean }).executionEnabled).toBe(
      false,
    );
  });

  it("B. MAPAZAPP_API_PORT wins over PORT", () => {
    const payload = buildRuntimeStatusPayload({
      MAPAZAPP_API_PORT: "3010",
      PORT: "3001",
    });
    const api = payload.api as { url: string | null; port: number | null };
    expect(api.port).toBe(3010);
    expect(api.url).toContain(":3010");
  });

  it("C. PORT alone selects port", () => {
    const payload = buildRuntimeStatusPayload({ PORT: "3005" });
    const api = payload.api as { url: string | null; port: number | null };
    expect(api.port).toBe(3005);
    expect(api.url).toBe("http://127.0.0.1:3005");
  });

  it("D. MAPAZAPP_API_HOST=localhost yields 127.0.0.1 in url", () => {
    const payload = buildRuntimeStatusPayload({
      MAPAZAPP_API_HOST: "localhost",
      PORT: "3001",
    });
    const api = payload.api as { url: string | null; port: number | null };
    expect(api.url).toBe("http://127.0.0.1:3001");
  });

  it("E. serialized payload avoids unsafe operational tokens", () => {
    const payload = buildRuntimeStatusPayload({
      MAPAZAPP_API_PORT: "3010",
      PORT: "3001",
    });
    assertNoUnsafeRuntimeStatusJson(JSON.stringify(payload));
  });

  it("F. GET /api/mapazapp/runtime/status still safe when process.env differs", async () => {
    const res = await request(app).get("/api/mapazapp/runtime/status");
    expect(res.status).toBe(200);
    const raw = JSON.stringify(res.body);
    assertNoUnsafeRuntimeStatusJson(raw);
    expect(res.body.data.api.status).toBe("ok");
    expect(res.body.data.mt5.status).toBe("not_configured");
    expect(res.body.data.bridge.status).toBe("not_configured");
    expect(res.body.executionEnabled).toBe(false);
  });

  it("G. mapazapp routes remain without action POST surface", () => {
    const raw = readFileSync(mapazappRoutesPath, "utf8");
    const src = stripLineComments(stripBlockComments(raw));
    expect(src.includes("router.post(")).toBe(false);
    expect(raw.includes("/api/mapazapp/actions")).toBe(false);
  });
});
