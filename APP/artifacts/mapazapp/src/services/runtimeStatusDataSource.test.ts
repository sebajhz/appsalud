import { describe, expect, it, vi } from "vitest";
import {
  createHttpRuntimeStatusDataSource,
  createUnavailableRuntimeStatusViewModel,
  getRuntimeStatusApiBaseUrlFromEnv,
} from "./runtimeStatusDataSource";

function buildValidD51bEnvelope(extraRoot?: Record<string, unknown>): Record<string, unknown> {
  return {
    ok: true,
    data: {
      runtimeMode: "mock",
      api: {
        status: "ok",
        url: "http://127.0.0.1:3001",
        port: 3001,
        lastCheckedAt: null,
        error: null,
      },
      dashboard: {
        status: "unknown",
        url: null,
        port: null,
        lastCheckedAt: null,
        error: null,
      },
      mt5: {
        status: "not_configured",
        enabled: false,
        terminalPath: null,
        dataFolder: null,
        mql5FilesFolder: null,
        lastCheckedAt: null,
        error: null,
      },
      bridge: {
        status: "not_configured",
        enabled: false,
        bridgeFolder: null,
        expectedFiles: [],
        lastSeenAt: null,
        lastFile: null,
        error: null,
      },
      data: {
        status: "unknown",
        sourceMode: "mock",
        symbol: null,
        timeframe: null,
        candleCount: null,
        lastCandleTime: null,
        warnings: [],
      },
      safety: {
        executionEnabled: false,
        sendToMt5Enabled: false,
        canAutoExecute: false,
        autoApprovalEnabled: false,
        registryMutationAllowed: false,
        manualReviewRequired: true,
      },
      overall: {
        status: "unknown",
        message: "Components not verified; conservative development posture only.",
      },
      generatedAt: "2026-01-01T00:00:00.000Z",
      readOnly: true,
    },
    warnings: [],
    errors: [],
    source: "mock",
    mockOnly: true,
    reviewOnly: true,
    executionEnabled: false,
    registryMutationAllowed: false,
    autoApprovalEnabled: false,
    ...extraRoot,
  };
}

function assertViewModelSafetyCopy(json: string): void {
  expect(json).not.toMatch(/"executionEnabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"sendToMt5Enabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"canAutoExecute"\s*:\s*true\b/);
  expect(json).not.toMatch(/"autoApprovalEnabled"\s*:\s*true\b/);
  expect(json).not.toMatch(/"registryMutationAllowed"\s*:\s*true\b/);
  expect(json).not.toMatch(/"approved"\s*:\s*true\b/);
  const low = json.toLowerCase();
  expect(low).not.toContain("ready to trade");
  expect(low).not.toContain("ready for trading");
  expect(low).not.toContain("live trading");
  expect(low).not.toContain("real trading");
  expect(low).not.toContain("execute order");
  expect(low).not.toContain("send order");
  expect(low).not.toContain("ordersend");
  expect(low).not.toContain("ctrade");
  expect(low).not.toContain("mt5 connected");
  expect(low).not.toContain("bridge connected");
}

describe("D6.1 runtimeStatusDataSource", () => {
  it("A. no apiBaseUrl — no fetch, unavailable, conservative flags", async () => {
    const fetchMock = vi.fn();
    const ds = createHttpRuntimeStatusDataSource({
      fetchImpl: fetchMock as typeof fetch,
    });
    const vm = await ds.getRuntimeStatus();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(vm.source).toBe("unavailable");
    expect(vm.ok).toBe(false);
    expect(vm.safety.executionEnabled).toBe(false);
    expect(vm.safety.sendToMt5Enabled).toBe(false);
    expect(vm.safety.canAutoExecute).toBe(false);
    expect(["not_configured", "unknown"]).toContain(vm.mt5Status);
    expect(["not_configured", "unknown"]).toContain(vm.bridgeStatus);
    expect(vm.overallStatus).not.toBe("ok");
  });

  it("B. successful response — source api, conservative statuses, overall not ok", async () => {
    const envelope = buildValidD51bEnvelope();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(envelope), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const ds = createHttpRuntimeStatusDataSource({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetchImpl: fetchMock,
    });
    const vm = await ds.getRuntimeStatus();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/mapazapp/runtime/status",
      expect.objectContaining({ method: "GET" }),
    );
    expect(vm.source).toBe("api");
    expect(vm.apiStatus).toBe("ok");
    expect(vm.dashboardStatus).toBe("unknown");
    expect(vm.mt5Status).toBe("not_configured");
    expect(vm.bridgeStatus).toBe("not_configured");
    expect(vm.safety.executionEnabled).toBe(false);
    expect(vm.safety.sendToMt5Enabled).toBe(false);
    expect(vm.safety.canAutoExecute).toBe(false);
    expect(vm.ok).toBe(false);
    expect(vm.overallStatus).not.toBe("ok");
  });

  it("C. fetch failure — unavailable, no execution flags true", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    const ds = createHttpRuntimeStatusDataSource({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetchImpl: fetchMock,
    });
    const vm = await ds.getRuntimeStatus();
    expect(vm.source).toBe("unavailable");
    expect(vm.ok).toBe(false);
    expect(vm.safety.executionEnabled).toBe(false);
    expect(vm.dashboardStatus).not.toBe("ok");
    expect(vm.mt5Status).not.toBe("ok");
    expect(vm.bridgeStatus).not.toBe("ok");
  });

  it("D. non-200 — unavailable, not ok", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("{}", {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const ds = createHttpRuntimeStatusDataSource({
      apiBaseUrl: "http://127.0.0.1:3001/",
      fetchImpl: fetchMock,
    });
    const vm = await ds.getRuntimeStatus();
    expect(vm.source).toBe("unavailable");
    expect(vm.ok).toBe(false);
  });

  it("E. invalid JSON — unavailable", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("not-json", {
        status: 200,
      }),
    );
    const ds = createHttpRuntimeStatusDataSource({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetchImpl: fetchMock,
    });
    const vm = await ds.getRuntimeStatus();
    expect(vm.source).toBe("unavailable");
    expect(vm.ok).toBe(false);
  });

  it("F. unsafe root envelope — executionEnabled true — blocked", async () => {
    const envelope = buildValidD51bEnvelope({ executionEnabled: true });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(envelope), { status: 200 }));
    const ds = createHttpRuntimeStatusDataSource({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetchImpl: fetchMock,
    });
    const vm = await ds.getRuntimeStatus();
    expect(vm.source).toBe("blocked");
    expect(vm.ok).toBe(false);
    expect(vm.overallStatus).toBe("blocked");
  });

  it("G. unsafe data.safety — sendToMt5Enabled true — blocked", async () => {
    const envelope = buildValidD51bEnvelope();
    const data = envelope.data as Record<string, unknown>;
    data.safety = {
      executionEnabled: false,
      sendToMt5Enabled: true,
      canAutoExecute: false,
      autoApprovalEnabled: false,
      registryMutationAllowed: false,
      manualReviewRequired: true,
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(envelope), { status: 200 }));
    const ds = createHttpRuntimeStatusDataSource({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetchImpl: fetchMock,
    });
    const vm = await ds.getRuntimeStatus();
    expect(vm.source).toBe("blocked");
    expect(vm.ok).toBe(false);
  });

  it("G2. unsafe data.safety — canAutoExecute true — blocked", async () => {
    const envelope = buildValidD51bEnvelope();
    const data = envelope.data as Record<string, unknown>;
    data.safety = {
      executionEnabled: false,
      sendToMt5Enabled: false,
      canAutoExecute: true,
      autoApprovalEnabled: false,
      registryMutationAllowed: false,
      manualReviewRequired: true,
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(envelope), { status: 200 }));
    const ds = createHttpRuntimeStatusDataSource({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetchImpl: fetchMock,
    });
    const vm = await ds.getRuntimeStatus();
    expect(vm.source).toBe("blocked");
    expect(vm.ok).toBe(false);
  });

  it("H. fake connected text — blocked", async () => {
    const envelope = buildValidD51bEnvelope({ leak: "MT5 connected for demo" });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(envelope), { status: 200 }));
    const ds = createHttpRuntimeStatusDataSource({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetchImpl: fetchMock,
    });
    const vm = await ds.getRuntimeStatus();
    expect(vm.source).toBe("blocked");
    expect(vm.ok).toBe(false);

    const envelope2 = buildValidD51bEnvelope({ leak: "bridge connected now" });
    const fetchMock2 = vi.fn(async () => new Response(JSON.stringify(envelope2), { status: 200 }));
    const ds2 = createHttpRuntimeStatusDataSource({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetchImpl: fetchMock2,
    });
    const vm2 = await ds2.getRuntimeStatus();
    expect(vm2.source).toBe("blocked");
  });

  it("I. private path markers in payload — blocked; view model omits leaked paths", async () => {
    const envelope = buildValidD51bEnvelope({
      leak: "C:\\Users\\Someone\\AppData\\Roaming\\MetaQuotes\\Terminal\\terminal64.exe",
    });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(envelope), { status: 200 }));
    const ds = createHttpRuntimeStatusDataSource({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetchImpl: fetchMock,
    });
    const vm = await ds.getRuntimeStatus();
    expect(vm.source).toBe("blocked");
    const raw = JSON.stringify(vm);
    expect(raw.toLowerCase()).not.toContain("appdata");
    expect(raw.toLowerCase()).not.toContain("metaquotes");
    expect(raw.toLowerCase()).not.toContain("terminal64.exe");
    expect(raw.toLowerCase()).not.toContain("c:\\\\users");
    expect(raw).not.toContain("/Users/");

    const envelopeUnix = buildValidD51bEnvelope({ leak: "/Users/someone/project" });
    const fetchUnix = vi.fn(async () => new Response(JSON.stringify(envelopeUnix), { status: 200 }));
    const dsUnix = createHttpRuntimeStatusDataSource({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetchImpl: fetchUnix,
    });
    const vmUnix = await dsUnix.getRuntimeStatus();
    expect(vmUnix.source).toBe("blocked");
    expect(JSON.stringify(vmUnix)).not.toContain("/Users/");
  });

  it("J. env helper reads VITE_MAPAZAPP_API_BASE_URL", () => {
    expect(
      getRuntimeStatusApiBaseUrlFromEnv({
        VITE_MAPAZAPP_API_BASE_URL: "http://127.0.0.1:3001",
      }),
    ).toBe("http://127.0.0.1:3001");
    expect(getRuntimeStatusApiBaseUrlFromEnv({})).toBeUndefined();
    expect(getRuntimeStatusApiBaseUrlFromEnv({ VITE_MAPAZAPP_API_BASE_URL: "" })).toBeUndefined();
  });

  it("K. safety copy on api view model JSON", async () => {
    const envelope = buildValidD51bEnvelope();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(envelope), { status: 200 }));
    const ds = createHttpRuntimeStatusDataSource({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetchImpl: fetchMock,
    });
    const vm = await ds.getRuntimeStatus();
    assertViewModelSafetyCopy(JSON.stringify(vm));
  });

  it("K2. safety copy on unavailable helper", () => {
    const vm = createUnavailableRuntimeStatusViewModel("Runtime status unavailable: test.");
    assertViewModelSafetyCopy(JSON.stringify(vm));
  });
});
