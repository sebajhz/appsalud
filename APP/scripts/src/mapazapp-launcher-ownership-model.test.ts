import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertLauncherOwnershipSafety,
  createDefaultLauncherOwnershipModel,
  evaluatePortOwnership,
  evaluateSingleInstance,
} from "./mapazapp-launcher-ownership-model";

test("D11.5 A — default ownership model is not_locked and safe", () => {
  const m = createDefaultLauncherOwnershipModel({ generatedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(m.instanceStatus, "not_locked");
  const s = assertLauncherOwnershipSafety(m);
  assert.equal(s.ok, true);
});

test("D11.5 B — injected deps mark ports available", () => {
  const base = createDefaultLauncherOwnershipModel({ generatedAt: "t0" });
  const m = evaluatePortOwnership(
    base,
    { ports: [{ role: "api", port: 3001 }] },
    { resolveStatus: () => "available" },
  );
  assert.equal(m.ownedPorts.length, 1);
  assert.equal(m.ownedPorts[0]?.status, "available");
  assert.equal(m.conflicts.length, 0);
});

test("D11.5 C — occupied_by_other adds conflict token", () => {
  const base = createDefaultLauncherOwnershipModel({ generatedAt: "t0" });
  const m = evaluatePortOwnership(
    base,
    { ports: [{ role: "dashboard", port: 5173 }] },
    { resolveStatus: () => "occupied_by_other" },
  );
  assert.ok(m.conflicts.some((c) => c.includes("occupied_by_other")));
});

test("D11.5 D — owned_by_launcher requires explicit resolver", () => {
  const base = createDefaultLauncherOwnershipModel({ generatedAt: "t0" });
  const m = evaluatePortOwnership(
    base,
    { ports: [{ role: "api", port: 3001 }] },
    { resolveStatus: () => "owned_by_launcher" },
  );
  assert.equal(m.ownedPorts[0]?.status, "owned_by_launcher");
});

test("D11.5 E — stale lock keeps lockId (not removed by evaluator)", () => {
  const base = createDefaultLauncherOwnershipModel({
    generatedAt: "t0",
    lockId: "mapazapp-lock-simulated",
  });
  const m = evaluateSingleInstance(base, {
    lockId: "mapazapp-lock-simulated",
    conflictingLock: false,
    staleLockSignal: true,
    launcherHoldsLock: false,
  });
  assert.equal(m.instanceStatus, "stale");
  assert.equal(m.lockId, "mapazapp-lock-simulated");
});

test("D11.5 F — JSON has no private path markers", () => {
  const m = createDefaultLauncherOwnershipModel({ generatedAt: "t0" });
  const s = assertLauncherOwnershipSafety(m);
  assert.equal(s.ok, true);
});

test("D11.5 F2 — safety rejects secretish conflict tokens", () => {
  const m: ReturnType<typeof createDefaultLauncherOwnershipModel> = {
    ...createDefaultLauncherOwnershipModel({ generatedAt: "t0" }),
    conflicts: ["Bearer sk-test-1234567890abcdef"],
  };
  const s = assertLauncherOwnershipSafety(m);
  assert.equal(s.ok, false);
});

test("D11.5 G — static scan avoids fs write, listen, spawn, child_process, taskkill", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "mapazapp-launcher-ownership-model.ts"), "utf8");
  assert.ok(!src.includes("writeFileSync"));
  assert.ok(!src.includes("listen("));
  assert.ok(!src.includes("createServer"));
  assert.ok(!src.includes("child_process"));
  assert.ok(!src.includes("spawn"));
  assert.ok(!src.includes("taskkill"));
});
