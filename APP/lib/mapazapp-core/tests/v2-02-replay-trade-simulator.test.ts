import { describe, expect, it } from "vitest";
import { ENGINE_REALITY_SYMBOL_PROFILES } from "../src/engine-reality-fixtures";
import { createReplayTradeFixtures } from "../src/replay-trade-fixtures";
import { simulateReplayTrade } from "../src/replay-trade-simulator";
import type { TradeReviewPlan } from "../src/trade-plan-types";

const fx = createReplayTradeFixtures();

describe("V2-02 Replay Trade Simulator — A. Validacion", () => {
  it("retorna insufficient_data cuando candles faltan", () => {
    const result = simulateReplayTrade({
      direction: "BUY",
      entryPrice: 100,
      stopLoss: 99,
      takeProfit: 102,
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      candles: [],
      entryModel: "manual_reference_price",
      exitModel: "explicit_tp_sl",
    });
    expect(result.status).toBe("insufficient_data");
  });

  it("retorna invalidated para R:R invalido", () => {
    const result = simulateReplayTrade(fx.BAD_RR_INVALID);
    expect(result.status).toBe("invalidated");
    expect(result.reason.code).toBe("RR_BELOW_MINIMUM");
  });
});

describe("V2-02 Replay Trade Simulator — B. Entry trigger", () => {
  it("BUY zone_touch se activa al tocar el area", () => {
    const result = simulateReplayTrade(fx.CLEAN_BUY_TP);
    expect(result.entryTimeUtc).not.toBeNull();
    expect(result.events.some((e) => e.type === "entry_triggered")).toBe(true);
  });

  it("SELL zone_touch funciona en espejo", () => {
    const result = simulateReplayTrade(fx.SELL_TP);
    expect(result.direction).toBe("SELL");
    expect(result.entryTimeUtc).not.toBeNull();
  });
});

describe("V2-02 Replay Trade Simulator — C. Outcomes", () => {
  it("TP produce take_profit y resultR positivo", () => {
    const result = simulateReplayTrade(fx.CLEAN_BUY_TP);
    expect(result.status).toBe("take_profit");
    expect(result.resultR).toBeGreaterThan(0);
  });

  it("SL produce stop_loss y resultR negativo", () => {
    const result = simulateReplayTrade(fx.CLEAN_BUY_SL);
    expect(result.status).toBe("stop_loss");
    expect(result.resultR).toBeLessThan(0);
  });

  it("expira antes de entry", () => {
    const result = simulateReplayTrade(fx.EXPIRED_BEFORE_ENTRY);
    expect(result.status).toBe("expired");
  });

  it("marca missed antes de entry", () => {
    const result = simulateReplayTrade(fx.MISSED_BEFORE_ENTRY);
    expect(result.status).toBe("missed");
  });
});

describe("V2-02 Replay Trade Simulator — D. Ambiguedad misma vela", () => {
  it("conservative_sl_first devuelve stop_loss", () => {
    const result = simulateReplayTrade({
      ...fx.SAME_CANDLE_AMBIGUOUS,
      settings: { pathAssumption: "conservative_sl_first" },
    });
    expect(result.status).toBe("stop_loss");
  });

  it("optimistic_tp_first devuelve take_profit", () => {
    const result = simulateReplayTrade({
      ...fx.SAME_CANDLE_AMBIGUOUS,
      settings: { pathAssumption: "optimistic_tp_first" },
    });
    expect(result.status).toBe("take_profit");
  });

  it("ambiguous devuelve ambiguous_same_candle", () => {
    const result = simulateReplayTrade({
      ...fx.SAME_CANDLE_AMBIGUOUS,
      settings: { pathAssumption: "ambiguous" },
    });
    expect(result.status).toBe("ambiguous_same_candle");
  });
});

describe("V2-02 Replay Trade Simulator — E. MAE/MFE", () => {
  it("calcula excursion favorable y adversa para BUY", () => {
    const result = simulateReplayTrade(fx.CLEAN_BUY_TP);
    expect(result.mfeR).toBeGreaterThan(0);
    expect(result.maeR).toBeGreaterThanOrEqual(0);
    expect(result.metrics?.maxFavorableExcursionR).toBe(result.mfeR);
  });

  it("calcula excursion favorable y adversa para SELL", () => {
    const result = simulateReplayTrade(fx.SELL_TP);
    expect(result.mfeR).toBeGreaterThan(0);
    expect(result.maeR).toBeGreaterThanOrEqual(0);
  });
});

describe("V2-02 Replay Trade Simulator — F. Precision simbolo", () => {
  it("normaliza precios segun perfil XAUUSD y EURUSD", () => {
    const xau = simulateReplayTrade(fx.CLEAN_BUY_TP);
    const eur = simulateReplayTrade(fx.SYMBOL_PRECISION_COMPARISON);
    expect(xau.entryPrice).toBe(100);
    expect(eur.entryPrice).toBe(1.10015);
    expect(eur.status).toBe("take_profit");
  });
});

describe("V2-02 Replay Trade Simulator — G. Integracion TradeReviewPlan", () => {
  it("consume TradeReviewPlan minimo como input", () => {
    const plan: TradeReviewPlan = {
      status: "TRADE_READY",
      action: "TRADE_READY",
      direction: "BUY",
      canonicalSymbol: "XAUUSD",
      zoneId: "Z_TEST" as never,
      targetModel: "fixed_R",
      entryAreaLow: 99.9,
      entryAreaHigh: 100.1,
      referenceEntryPrice: 100,
      stopLoss: 99,
      takeProfit: 102,
      metrics: null,
      reasons: [],
      noTradeReasons: [],
      failedHardGates: [],
      simpleSummary: "fixture",
      reviewReady: true,
    };
    const result = simulateReplayTrade({
      tradePlan: plan,
      candles: fx.CLEAN_BUY_TP.candles,
      symbolProfile: ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD,
      entryModel: "zone_touch",
      exitModel: "fixed_r",
    });
    expect(result.status).toBe("take_profit");
    expect(result.direction).toBe("BUY");
  });
});
