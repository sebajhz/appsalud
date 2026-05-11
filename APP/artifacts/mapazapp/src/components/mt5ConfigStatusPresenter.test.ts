/**
 * D10.4 — Presenter + panel source governance (read-only draft).
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  MT5_CONFIG_STATUS_REQUIRED_COPY,
  createMockMt5ConfigStatusViewModel,
} from "./mt5ConfigStatusPresenter";

const __dirname = dirname(fileURLToPath(import.meta.url));
const panelPath = join(__dirname, "Mt5ConfigStatusPanel.tsx");
const panelSrc = readFileSync(panelPath, "utf8");
const presenterPath = join(__dirname, "mt5ConfigStatusPresenter.ts");
const presenterSrc = readFileSync(presenterPath, "utf8");

const BANNED_SUBSTRINGS = [
  "MT5 connected",
  "Ready to trade",
  "ready to trade",
  "fetch(",
  "localStorage",
  "WebSocket",
  "onClick",
  "<button",
  "POST",
  "C:\\\\Users",
  "AppData",
  "MetaQuotes",
  "terminal64.exe",
  '"executionEnabled":true',
  '"sendToMt5Enabled":true',
  "executionEnabled: true",
  "sendToMt5Enabled: true",
] as const;

describe("D10.4 mt5ConfigStatusPresenter", () => {
  it("includes exact required copy strings", () => {
    expect(MT5_CONFIG_STATUS_REQUIRED_COPY).toHaveLength(5);
    for (const line of MT5_CONFIG_STATUS_REQUIRED_COPY) {
      expect(line.length).toBeGreaterThan(0);
    }
  });

  it("mock view model exposes bullets matching required copy", () => {
    const vm = createMockMt5ConfigStatusViewModel();
    expect(vm.bullets).toEqual([...MT5_CONFIG_STATUS_REQUIRED_COPY]);
  });
});

function assertBannedAbsent(src: string, context: string): void {
  const low = src.toLowerCase();
  for (const frag of BANNED_SUBSTRINGS) {
    if (frag === "POST") {
      expect(/\bpost\b/.test(low), `${context}: ${frag} (word-boundary)`).toBe(false);
      continue;
    }
    expect(low.includes(frag.toLowerCase()), `${context}: ${frag}`).toBe(false);
  }
}

describe("D10.4 Mt5ConfigStatusPanel.tsx static governance", () => {
  it("omits operational surfaces (buttons, fetch, storage, websocket, POST)", () => {
    assertBannedAbsent(panelSrc, "panel");
  });
});

describe("D10.9 mt5ConfigStatusPresenter.ts static governance", () => {
  it("omits operational surfaces and private path markers", () => {
    assertBannedAbsent(presenterSrc, "presenter");
  });
});
