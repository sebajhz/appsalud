import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("D6.3.1 runtime status panel integration (static scans)", () => {
  it("A. RuntimeStatusPanelContainer.tsx — imports and safety constraints", () => {
    const srcPath = join(__dirname, "RuntimeStatusPanelContainer.tsx");
    const src = readFileSync(srcPath, "utf8");
    expect(src).toContain("RuntimeStatusPanel");
    expect(src).toContain("createHttpRuntimeStatusDataSource");
    expect(src).toContain("getRuntimeStatusApiBaseUrlFromEnv");
    expect(src.includes("setInterval")).toBe(false);
    expect(src.includes("WebSocket")).toBe(false);
    expect(src.includes("localStorage")).toBe(false);
    expect(src.includes("<button")).toBe(false);
    const low = src.toLowerCase();
    expect(low).not.toContain("ready to trade");
    expect(low).not.toContain("mt5 connected");
    expect(low).not.toContain("bridge connected");
    expect(low).not.toContain("execute order");
    expect(low).not.toContain("send order");
  });

  it("B. ConfigPage.tsx — container wired; no unsafe runtime controls/copy", () => {
    const srcPath = join(__dirname, "..", "pages", "ConfigPage.tsx");
    const src = readFileSync(srcPath, "utf8");
    expect(src).toContain("RuntimeStatusPanelContainer");
    expect(src).toContain("<RuntimeStatusPanelContainer");
    expect(src.includes("setInterval")).toBe(false);
    expect(src.includes("WebSocket")).toBe(false);
    expect(src.includes("<button")).toBe(false);
    const low = src.toLowerCase();
    expect(low).not.toContain("ready to trade");
    expect(low).not.toContain("mt5 connected");
    expect(low).not.toContain("bridge connected");
    expect(low).not.toContain("execute order");
    expect(low).not.toContain("send order");
  });

  it("C. App.tsx — no dedicated runtime route added", () => {
    const srcPath = join(__dirname, "..", "App.tsx");
    const src = readFileSync(srcPath, "utf8");
    expect(src).not.toMatch(/Route\s+path=\"\/runtime/i);
    expect(src).not.toMatch(/path=\{'\/runtime/);
  });

  it("D. Data source + presenter tests remain canonical for fetch/fallback policy", () => {
    /** Covered by `runtimeStatusDataSource.test.ts` and `runtimeStatusPanelPresenter.test.ts`. */
    expect(true).toBe(true);
  });
});
