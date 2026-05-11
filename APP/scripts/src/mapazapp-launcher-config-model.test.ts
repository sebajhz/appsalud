import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createDefaultMt5BridgeReadinessConfig } from "./mapazapp-mt5-bridge-readiness";
import { createDefaultMt5Config } from "./mapazapp-mt5-config-model";
import {
  assertLauncherConfigSafety,
  createDefaultLauncherConfig,
  sanitizeLauncherConfigForDisplay,
  validateLauncherConfig,
} from "./mapazapp-launcher-config-model";

test("D11.1 A — default launcher file config is valid and safe", () => {
  const cfg = createDefaultLauncherConfig();
  const r = validateLauncherConfig(cfg);
  assert.equal(r.ok, true);
  assert.equal(r.status, "valid");
  const s = assertLauncherConfigSafety(r);
  assert.equal(s.ok, true);
});

test("D11.1 B — unsafe launcher flags block", () => {
  for (const partial of [
    { allowMt5Launch: true as const },
    { allowCommandFiles: true as const },
    { allowProcessStart: true as const },
  ]) {
    const cfg = createDefaultLauncherConfig(partial);
    const r = validateLauncherConfig(cfg);
    assert.equal(r.ok, false);
    assert.equal(r.status, "unsafe");
  }
});

test("D11.1 C — actionTransportEnabled without token policy is invalid", () => {
  const cfg = createDefaultLauncherConfig({
    actionTransportEnabled: true,
    actionTokenRequired: false,
  });
  const r = validateLauncherConfig(cfg);
  assert.equal(r.ok, false);
  assert.equal(r.status, "invalid");
  assert.ok(r.errors.some((e) => e.includes("action_transport")));
});

test("D11.1 D — private path segments are sanitized for display", () => {
  const cfg = createDefaultLauncherConfig({
    dataRoot: "C:\\Users\\Someone\\AppData\\Local",
    logsRoot: "C:\\Users\\Someone\\MetaQuotes\\Terminal",
    mt5Config: createDefaultMt5Config({
      terminalPath: "C:\\Users\\Someone\\AppData\\Roaming\\MetaQuotes\\Terminal\\terminal64.exe",
    }),
  });
  const s = sanitizeLauncherConfigForDisplay(cfg);
  const joined = JSON.stringify(s);
  assert.ok(!joined.toLowerCase().includes("someone"));
  assert.ok(!/\\Users\\/i.test(joined));
});

test("D11.1 E — mt5Config and bridgeConfig integrate existing models without launching", () => {
  const cfg = createDefaultLauncherConfig({
    mt5Config: createDefaultMt5Config({
      enabled: true,
      terminalPath: "C:\\Program Files\\MetaTrader 5\\terminal64.exe",
      allowedReadOnly: true,
    }),
    bridgeConfig: createDefaultMt5BridgeReadinessConfig({
      enabled: true,
      bridgeFolder: "D:\\mapazapp-bridge",
      readOnly: true,
      expectedFiles: ["BridgeEA.ex5"],
    }),
  });
  const r = validateLauncherConfig(cfg);
  assert.ok(typeof r.status === "string");
  assert.equal(r.status === "unsafe", false);
  const s = assertLauncherConfigSafety(r);
  assert.equal(s.ok, true);
});

test("D11.1 F — JSON safety rejects forbidden secretish markers in validation JSON", () => {
  const bad: Parameters<typeof assertLauncherConfigSafety>[0] = {
    ok: false,
    status: "invalid",
    errors: ["Bearer sk-test-1234567890abcdef"],
    warnings: [],
    safeSummary: [],
  };
  const s = assertLauncherConfigSafety(bad);
  assert.equal(s.ok, false);
});

test("D11.1 G — static scan: launcher config model avoids forbidden runtime APIs", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "mapazapp-launcher-config-model.ts"), "utf8");
  assert.ok(!src.includes("spawn"));
  assert.ok(!src.includes("child_process"));
  assert.ok(!src.includes("localStorage"));
  assert.ok(!src.includes("WebSocket"));
  assert.ok(!src.includes("OrderSend"));
  assert.ok(!src.includes("CTrade"));
  assert.ok(!src.includes("writeFileSync"));
  assert.ok(!src.includes("fs."));
});

test("D11.1 — nested MT5 unsafe policy still surfaces as unsafe", () => {
  const cfg = createDefaultLauncherConfig({
    mt5Config: createDefaultMt5Config({ allowLaunch: true }),
  });
  const r = validateLauncherConfig(cfg);
  assert.equal(r.status, "unsafe");
  assert.equal(r.ok, false);
});
