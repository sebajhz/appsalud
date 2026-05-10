import { readdirSync, readFileSync, statSync } from "fs";
import { basename, dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** APP/artifacts/mt5 from api-server/src/mapazapp */
const MT5_ROOT = join(__dirname, "../../../mt5");

const FORBIDDEN_COMMAND_BASENAMES = new Set([
  "commands.csv",
  "commands.json",
  "orders.csv",
  "orders.json",
  "mt5_commands.csv",
  "mt5_commands.json",
]);

function collectMq5Files(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...collectMq5Files(p));
    else if (ent.name.endsWith(".mq5")) out.push(p);
  }
  return out;
}

function collectAllFiles(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...collectAllFiles(p));
    else out.push(p);
  }
  return out;
}

function stripMq5Comments(source: string): string {
  let s = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const lines = s.split(/\r?\n/);
  return lines
    .map((line) => {
      const idx = line.indexOf("//");
      if (idx === -1) return line;
      return line.slice(0, idx);
    })
    .join("\n");
}

describe("B1 — MQL5 trade API ban (static)", () => {
  it("finds at least one .mq5 under APP/artifacts/mt5", () => {
    expect(statSync(MT5_ROOT, { throwIfNoEntry: false })?.isDirectory()).toBe(true);
    const mq5 = collectMq5Files(MT5_ROOT);
    expect(mq5.length).toBeGreaterThan(0);
  });

  it("each .mq5 has no banned trade APIs outside comments", () => {
    const mq5Files = collectMq5Files(MT5_ROOT);
    const bannedPatterns: { name: string; re: RegExp }[] = [
      { name: "OrderSend", re: /\bOrderSend\b/ },
      { name: "OrderSendAsync", re: /\bOrderSendAsync\b/ },
      { name: "CTrade", re: /\bCTrade\b/ },
      { name: "Trade.mqh include", re: /#include\s*<\s*Trade\/Trade\.mqh\s*>/i },
      { name: "trade.Buy", re: /\btrade\s*\.\s*Buy\b/i },
      { name: "trade.Sell", re: /\btrade\s*\.\s*Sell\b/i },
      { name: "Buy(", re: /\bBuy\s*\(/ },
      { name: "Sell(", re: /\bSell\s*\(/ },
      { name: "PositionOpen", re: /\bPositionOpen\b/ },
      { name: "PositionClose", re: /\bPositionClose\b/ },
      { name: "OrderSendResult", re: /\bOrderSendResult\b/ },
    ];

    for (const file of mq5Files) {
      const stripped = stripMq5Comments(readFileSync(file, "utf8"));
      for (const { name, re } of bannedPatterns) {
        expect(re.test(stripped), `${basename(file)} must not contain ${name} in executable code`).toBe(false);
      }
    }
  });

  it("no obvious inbound command/order manifest files under APP/artifacts/mt5", () => {
    const files = collectAllFiles(MT5_ROOT);
    const bad = files.filter((f) => FORBIDDEN_COMMAND_BASENAMES.has(basename(f).toLowerCase()));
    expect(bad, `unexpected command files: ${bad.join(", ")}`).toEqual([]);
  });
});
