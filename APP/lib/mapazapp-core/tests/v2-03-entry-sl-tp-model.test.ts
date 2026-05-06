import { describe, expect, it } from "vitest";
import { buildEntrySlTpPlan, createDefaultEntrySlTpSettingsForTests } from "../src/entry-sl-tp-model";
import { createEntrySlTpFixtures } from "../src/entry-sl-tp-fixtures";
import { ENGINE_REALITY_SYMBOL_PROFILES } from "../src/engine-reality-fixtures";
import { simulateReplayTrade } from "../src/replay-trade-simulator";

const fx = createEntrySlTpFixtures();

describe("V2-03 Entry/SL/TP — A. BUY limpio fixed R", () => {
  it("ready, precios coherentes, rr >= minRr, canReplay", () => {
    const r = buildEntrySlTpPlan(fx.CLEAN_BUY_FIXED_R);
    expect(r.status).toBe("ready");
    expect(r.pricePlan).not.toBeNull();
    expect(r.rr).not.toBeNull();
    const p = r.pricePlan!;
    expect(p.entry).toBeGreaterThan(p.stopLoss);
    expect(p.takeProfit).toBeGreaterThan(p.entry);
    expect(r.rr!.rr).toBeGreaterThanOrEqual(fx.CLEAN_BUY_FIXED_R.settings.minRr);
    expect(r.canReplay).toBe(true);
    expect(r.reviewOnly).toBe(true);
    expect(r.replayInputPreview?.takeProfit).toBe(p.takeProfit);
  });
});

describe("V2-03 Entry/SL/TP — B. SELL espejo fixed R", () => {
  it("ready y geometria corta correcta", () => {
    const r = buildEntrySlTpPlan(fx.CLEAN_SELL_FIXED_R);
    expect(r.status).toBe("ready");
    const p = r.pricePlan!;
    expect(p.stopLoss).toBeGreaterThan(p.entry);
    expect(p.takeProfit).toBeLessThan(p.entry);
    expect(r.rr!.rr).toBeGreaterThanOrEqual(fx.CLEAN_SELL_FIXED_R.settings.minRr);
    expect(r.canReplay).toBe(true);
  });
});

describe("V2-03 Entry/SL/TP — C. R:R malo y TP mas corto que SL", () => {
  it("R:R bajo bloquea u observa segun preferObserveOverBlock", () => {
    const blocked = buildEntrySlTpPlan(fx.BAD_RR_TOO_CLOSE);
    expect(blocked.status).toBe("blocked");
    expect(blocked.blockingReasons.some((x) => x.code === "RR_BELOW_MINIMUM")).toBe(true);
    expect(blocked.canReplay).toBe(false);

    const obs = buildEntrySlTpPlan({
      ...fx.BAD_RR_TOO_CLOSE,
      settings: { ...fx.BAD_RR_TOO_CLOSE.settings, preferObserveOverBlock: true },
    });
    expect(obs.status).toBe("observe_only");
    expect(obs.blockingReasons.some((x) => x.code === "RR_BELOW_MINIMUM")).toBe(true);
  });

  it("rechaza reward mas corto que risk", () => {
    const r = buildEntrySlTpPlan(fx.REWARD_SHORTER_THAN_RISK);
    expect(r.status).toBe("blocked");
    expect(r.blockingReasons.some((x) => x.code === "REWARD_SHORTER_THAN_RISK")).toBe(true);
    expect(r.canReplay).toBe(false);
  });
});

describe("V2-03 Entry/SL/TP — D. Buffer dinamico (sin pips universales)", () => {
  it("buffer difiere entre XAUUSD y EURUSD con mismo atr", () => {
    const xau = buildEntrySlTpPlan({
      ...fx.CLEAN_BUY_FIXED_R,
      atr: 0.5,
    });
    const eur = buildEntrySlTpPlan({
      ...fx.EURUSD_PRECISION_ZONE,
      atr: 0.5,
    });
    expect(xau.pricePlan?.bufferPrice).toBeDefined();
    expect(eur.pricePlan?.bufferPrice).toBeDefined();
    expect(xau.pricePlan!.bufferPrice).not.toBe(eur.pricePlan!.bufferPrice);
  });
});

describe("V2-03 Entry/SL/TP — E. SL beyond_sweep", () => {
  it("coloca SL mas alla del sweep con buffer", () => {
    const base = buildEntrySlTpPlan(fx.CLEAN_BUY_FIXED_R);
    const sweep = buildEntrySlTpPlan(fx.BEYOND_SWEEP_SL);
    expect(sweep.status).toBe("ready");
    expect(sweep.pricePlan!.stopLoss).toBeLessThan(base.pricePlan!.stopLoss);
  });
});

describe("V2-03 Entry/SL/TP — F. Trade ya pasado / chase", () => {
  it("currentPrice con chase excesivo -> observe_only con lateTradePolicy", () => {
    const r = buildEntrySlTpPlan(fx.PASSED_TRADE_CHASE);
    expect(r.status).toBe("observe_only");
    expect(r.warningReasons.some((x) => x.code === "ENTRY_CHASE_EXCEEDED")).toBe(true);
    expect(r.canReplay).toBe(true);
  });

  it("misma señal con lateTradePolicy blocked", () => {
    const r = buildEntrySlTpPlan({
      ...fx.PASSED_TRADE_CHASE,
      settings: { ...fx.PASSED_TRADE_CHASE.settings, lateTradePolicy: "blocked" },
    });
    expect(r.status).toBe("blocked");
    expect(r.blockingReasons.some((x) => x.code === "ENTRY_CHASE_EXCEEDED")).toBe(true);
    expect(r.canReplay).toBe(false);
  });
});

describe("V2-03 Entry/SL/TP — G. Integracion replay", () => {
  it("replayInputPreview + velas alcanzan TP", () => {
    const plan = buildEntrySlTpPlan(fx.REPLAY_CHAIN_BUY);
    expect(plan.status).toBe("ready");
    expect(plan.replayInputPreview).not.toBeNull();
    const replay = simulateReplayTrade({
      ...plan.replayInputPreview!,
      candles: fx.REPLAY_CHAIN_BUY.recentCandles!,
    });
    expect(replay.status).toBe("take_profit");
    expect(replay.resultR).toBeGreaterThan(0);
  });
});

describe("V2-03 Entry/SL/TP — H. Datos faltantes", () => {
  it("sin symbolProfile -> insufficient_data", () => {
    const r = buildEntrySlTpPlan({
      zoneCandidate: fx.CLEAN_BUY_FIXED_R.zoneCandidate,
      symbolProfile: null,
      settings: createDefaultEntrySlTpSettingsForTests(),
    });
    expect(r.status).toBe("insufficient_data");
    expect(r.blockingReasons[0]?.code).toBe("MISSING_SYMBOL_PROFILE");
  });

  it("sin zona ni plan -> insufficient_data", () => {
    const r = buildEntrySlTpPlan({
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      settings: createDefaultEntrySlTpSettingsForTests(),
    });
    expect(r.status).toBe("insufficient_data");
  });

  it("manual_reference sin explicitEntry -> invalid", () => {
    const r = buildEntrySlTpPlan({
      zoneCandidate: fx.CLEAN_BUY_FIXED_R.zoneCandidate,
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      atr: 0.5,
      settings: {
        ...createDefaultEntrySlTpSettingsForTests(),
        entryMode: "manual_reference",
      },
    });
    expect(r.status).toBe("invalid");
    expect(r.blockingReasons.some((x) => x.code === "MISSING_EXPLICIT_ENTRY")).toBe(true);
  });
});

describe("V2-03 Entry/SL/TP — opposing liquidity + hybrid", () => {
  it("opposing_liquidity TP listo", () => {
    const r = buildEntrySlTpPlan(fx.OPPOSING_LIQUIDITY_TP);
    expect(r.status).toBe("ready");
    expect(r.pricePlan!.takeProfit).toBe(102.4);
  });

  it("hybrid elige liquidez cuando cumple min R", () => {
    const r = buildEntrySlTpPlan(fx.HYBRID_TP);
    expect(r.status).toBe("ready");
    expect(r.pricePlan!.takeProfit).toBeCloseTo(101.2, 10);
  });
});
