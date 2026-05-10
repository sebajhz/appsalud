import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createUnavailableRuntimeStatusViewModel,
  type RuntimeStatusViewModel,
} from "@/services/runtimeStatusDataSource";
import {
  RUNTIME_STATUS_PANEL_DEFAULT_TITLE,
  RUNTIME_STATUS_PANEL_SUBTITLE,
  buildRuntimeStatusPanelRows,
  getRuntimeStatusPanelSafetyText,
} from "./runtimeStatusPanelPresenter";

const __dirname = dirname(fileURLToPath(import.meta.url));

function rowByTestId(rows: ReturnType<typeof buildRuntimeStatusPanelRows>, id: string) {
  const r = rows.find((x) => x.testId === id);
  expect(r).toBeTruthy();
  return r!;
}

function assertNoUnsafeTokens(blob: string): void {
  const low = blob.toLowerCase();
  expect(low).not.toContain("ready to trade");
  expect(low).not.toContain("ready for trading");
  expect(low).not.toContain("live trading");
  expect(low).not.toContain("real trading");
  expect(low).not.toMatch(/\bexecute order\b/);
  expect(low).not.toMatch(/\bsend order\b/);
  expect(low).not.toContain("mt5 connected");
  expect(low).not.toContain("bridge connected");
  expect(low).not.toMatch(/\bapproved\b/);
  expect(low).not.toContain("profitable");
  expect(blob).not.toMatch(/"executionEnabled"\s*:\s*true\b/);
}

describe("D6.2.1 runtimeStatusPanelPresenter", () => {
  it("A. unavailable state rows", () => {
    const vm = createUnavailableRuntimeStatusViewModel(
      "API base URL is not configured. Runtime status is unavailable in the dashboard.",
    );
    const rows = buildRuntimeStatusPanelRows(vm);
    expect(rowByTestId(rows, "runtime-status-source").value).toBe("Unavailable");
    expect(["Not configured", "Unknown"]).toContain(rowByTestId(rows, "runtime-status-mt5").value);
    expect(["Not configured", "Unknown"]).toContain(rowByTestId(rows, "runtime-status-bridge").value);
    expect(rowByTestId(rows, "runtime-status-execution").value).toBe("Disabled");
    expect(rowByTestId(rows, "runtime-status-overall").value).not.toBe("OK");
  });

  it("B. blocked state rows and message", () => {
    const vm: RuntimeStatusViewModel = {
      ok: false,
      source: "blocked",
      runtimeMode: "unknown",
      apiStatus: "unknown",
      dashboardStatus: "unknown",
      mt5Status: "unknown",
      bridgeStatus: "unknown",
      overallStatus: "blocked",
      message: "Runtime status blocked: response contained unsafe execution wording or disallowed flags.",
      safety: {
        executionEnabled: false,
        sendToMt5Enabled: false,
        canAutoExecute: false,
        autoApprovalEnabled: false,
        registryMutationAllowed: false,
        manualReviewRequired: true,
      },
    };
    const rows = buildRuntimeStatusPanelRows(vm);
    expect(rowByTestId(rows, "runtime-status-source").value).toBe("Blocked");
    expect(vm.message.toLowerCase()).toContain("blocked");
    expect(rowByTestId(rows, "runtime-status-execution").value).toBe("Disabled");
    assertNoUnsafeTokens(vm.message + JSON.stringify(rows));
  });

  it("C. API snapshot with overall unknown", () => {
    const vm: RuntimeStatusViewModel = {
      ok: false,
      source: "api",
      runtimeMode: "mock",
      apiStatus: "ok",
      dashboardStatus: "unknown",
      mt5Status: "not_configured",
      bridgeStatus: "not_configured",
      overallStatus: "unknown",
      message: "Components not verified; conservative development posture only.",
      safety: {
        executionEnabled: false,
        sendToMt5Enabled: false,
        canAutoExecute: false,
        autoApprovalEnabled: false,
        registryMutationAllowed: false,
        manualReviewRequired: true,
      },
    };
    const rows = buildRuntimeStatusPanelRows(vm);
    expect(rowByTestId(rows, "runtime-status-source").value).toBe("API snapshot");
    expect(rowByTestId(rows, "runtime-status-api").value).toBe("OK");
    expect(rowByTestId(rows, "runtime-status-dashboard").value).toBe("Unknown");
    expect(rowByTestId(rows, "runtime-status-mt5").value).toBe("Not configured");
    expect(rowByTestId(rows, "runtime-status-bridge").value).toBe("Not configured");
    expect(rowByTestId(rows, "runtime-status-overall").value).toBe("Unknown");
    expect(rowByTestId(rows, "runtime-status-execution").value).toBe("Disabled");
  });

  it("D. safety text", () => {
    const vm = createUnavailableRuntimeStatusViewModel("x");
    const t = getRuntimeStatusPanelSafetyText(vm);
    expect(t.toLowerCase()).toContain("execution is disabled");
    expect(t.toLowerCase()).toContain("does not send orders");
    expect(t.toLowerCase()).not.toContain("ready to trade");
  });

  it("E. no unsafe tokens in presenter outputs + panel copy", () => {
    const vms: RuntimeStatusViewModel[] = [
      createUnavailableRuntimeStatusViewModel(
        "API base URL is not configured. Runtime status is unavailable in the dashboard.",
      ),
      {
        ok: false,
        source: "blocked",
        runtimeMode: "unknown",
        apiStatus: "unknown",
        dashboardStatus: "unknown",
        mt5Status: "unknown",
        bridgeStatus: "unknown",
        overallStatus: "blocked",
        message: "Runtime status blocked: unsafe flags.",
        safety: {
          executionEnabled: false,
          sendToMt5Enabled: false,
          canAutoExecute: false,
          autoApprovalEnabled: false,
          registryMutationAllowed: false,
          manualReviewRequired: true,
        },
      },
      {
        ok: false,
        source: "api",
        runtimeMode: "mock",
        apiStatus: "ok",
        dashboardStatus: "unknown",
        mt5Status: "not_configured",
        bridgeStatus: "not_configured",
        overallStatus: "unknown",
        message: "Components not verified; conservative development posture only.",
        safety: {
          executionEnabled: false,
          sendToMt5Enabled: false,
          canAutoExecute: false,
          autoApprovalEnabled: false,
          registryMutationAllowed: false,
          manualReviewRequired: true,
        },
      },
    ];

    let blob = `${RUNTIME_STATUS_PANEL_DEFAULT_TITLE}|${RUNTIME_STATUS_PANEL_SUBTITLE}`;
    for (const vm of vms) {
      const rows = buildRuntimeStatusPanelRows(vm);
      blob += JSON.stringify(rows);
      blob += getRuntimeStatusPanelSafetyText(vm);
      blob += vm.message;
    }
    assertNoUnsafeTokens(blob);
  });

  it("F. RuntimeStatusPanel.tsx static scan — no side effects or unsafe copy", () => {
    const srcPath = join(__dirname, "RuntimeStatusPanel.tsx");
    const src = readFileSync(srcPath, "utf8");
    expect(src.includes("<button")).toBe(false);
    expect(src.includes("useEffect")).toBe(false);
    expect(src.includes("fetch(")).toBe(false);
    expect(src.includes("localStorage")).toBe(false);
    expect(src.includes("import.meta.env")).toBe(false);
    expect(src.toLowerCase()).not.toContain("ready to trade");
    expect(src.toLowerCase()).not.toContain("mt5 connected");
    expect(src.toLowerCase()).not.toContain("bridge connected");
  });
});
