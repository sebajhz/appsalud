import { describe, expect, it } from "vitest";
import { calculateTotalR } from "../src/backtest-metrics";
import { createIfvgReplayBacktestFixtures } from "../src/ifvg-replay-backtest-fixtures";
import { inferFvgCenterBarIndexFromSourceIfvgId, runIfvgReplayBacktest } from "../src/ifvg-replay-backtest";
import { createEngineRealityFixtures } from "../src/engine-reality-fixtures";
import { detectIfvgZoneCandidates } from "../src/strategy-detection";
import type { ZoneCandidate } from "../src/zone-candidate";

const fx = createIfvgReplayBacktestFixtures();

describe("V2-04 IFVG replay backtest — A. insufficient_data", () => {
  it("retorna insufficient_data con pocas velas", () => {
    const r = runIfvgReplayBacktest(fx.INSUFFICIENT_BARS);
    expect(r.status).toBe("insufficient_data");
    expect(r.summary.candidateCount).toBe(0);
    expect(r.executionEnabled).toBe(false);
    expect(r.registryMutationAllowed).toBe(false);
  });
});

describe("V2-04 IFVG replay backtest — B. no_candidates", () => {
  it("serie plana sin FVG devuelve no_candidates", () => {
    const r = runIfvgReplayBacktest(fx.NO_CANDIDATE_FLAT);
    expect(r.status).toBe("no_candidates");
    expect(r.detection?.candidates.length).toBe(0);
  });
});

describe("V2-04 IFVG replay backtest — C. clean fixture", () => {
  it("completed o completed_with_warnings con al menos un trace", () => {
    const r = runIfvgReplayBacktest(fx.CLEAN_ONE_TP);
    expect(["completed", "completed_with_warnings"]).toContain(r.status);
    expect(r.traces.length).toBeGreaterThan(0);
    expect(r.detection?.candidates.length).toBeGreaterThan(0);
  });
});

describe("V2-04 IFVG replay backtest — D. resumen", () => {
  it("incluye conteos y totalR / winRate coherentes", () => {
    const r = runIfvgReplayBacktest(fx.CLEAN_ONE_TP);
    expect(r.summary.candidateCount).toBeGreaterThan(0);
    expect(r.summary.replayedTradeCount).toBe(r.trades.length);
    if (r.trades.length > 0) {
      expect(r.summary.totalR).toBe(calculateTotalR(r.trades));
      expect(r.summary.winRate).not.toBeNull();
    } else {
      expect(r.summary.winRate).toBeNull();
    }
  });
});

describe("V2-04 IFVG replay backtest — E. perdida", () => {
  it("fixture loss puede producir stop_loss o resultR negativo", () => {
    const r = runIfvgReplayBacktest(fx.LOSS_AFTER_CONFIRM);
    const sl = r.traces.filter((t) => t.replay?.status === "stop_loss");
    const neg = r.trades.filter((t) => t.resultR < 0);
    const ok = sl.length > 0 || neg.length > 0 || r.summary.losses > 0;
    expect(ok).toBe(true);
  });
});

describe("V2-04 IFVG replay backtest — F. metricas agregadas", () => {
  it("totalR del resumen coincide con trades", () => {
    const r = runIfvgReplayBacktest(fx.MIXED_MANY_CANDIDATES);
    if (r.trades.length > 0) {
      expect(r.summary.totalR).toBeCloseTo(calculateTotalR(r.trades), 8);
    }
  });
});

describe("V2-04 IFVG replay backtest — G. banderas de seguridad", () => {
  it("sin ejecucion ni mutacion de registry", () => {
    const r = runIfvgReplayBacktest(fx.CLEAN_ONE_TP);
    expect(r.executionEnabled).toBe(false);
    expect(r.registryMutationAllowed).toBe(false);
    expect(r.reviewOnly).toBe(true);
  });
});

describe("V2-04 IFVG replay backtest — H. diagnostico indice candidato", () => {
  it("id no parseable -> inferencia null y diagnostico en backtest", () => {
    expect(inferFvgCenterBarIndexFromSourceIfvgId("custom_bad_id")).toBeNull();
    const er = createEngineRealityFixtures().CLEAN_BULLISH_IFVG;
    const det = detectIfvgZoneCandidates({
      candles: er.candles,
      symbolProfile: er.symbolProfile,
      settings: fx.CLEAN_ONE_TP.strategySettings!,
      strategyId: er.strategyId,
      parameterSetId: er.parameterSetId,
      canonicalSymbol: er.canonicalSymbol,
    });
    const base = det.candidates[0]!;
    const badZone: ZoneCandidate = { ...base, zoneId: "Z_BAD_TEST" as never, sourceIfvgId: "custom_bad_id" };

    const r = runIfvgReplayBacktest({
      ...fx.CLEAN_ONE_TP,
      testOnlyAppendZones: [badZone],
      backtestSettings: { ...fx.CLEAN_ONE_TP.backtestSettings, maxCandidates: 99 },
    });
    expect(r.diagnostics.some((d) => d.code === "CANDIDATE_INDEX_UNAVAILABLE")).toBe(true);
  });
});

describe("V2-04 IFVG replay backtest — I. filas BacktestTrade", () => {
  it("trades tienen campos minimos compatibles", () => {
    const r = runIfvgReplayBacktest(fx.CLEAN_ONE_TP);
    for (const t of r.trades) {
      expect(t.tradeId).toBeTruthy();
      expect(t.runId).toBeTruthy();
      expect(t.strategyId).toBeTruthy();
      expect(t.parameterSetId).toBeTruthy();
      expect(t.direction === "BUY" || t.direction === "SELL").toBe(true);
      expect(Number.isFinite(t.resultR)).toBe(true);
      expect(t.entryTime.length).toBeGreaterThan(5);
    }
  });
});

describe("V2-04 IFVG replay backtest — gates cuenta", () => {
  it("sin approvedParameterSetForAccount no replaya (gate trade plan)", () => {
    const clean = fx.CLEAN_ONE_TP;
    const r = runIfvgReplayBacktest({
      ...clean,
      accountGuardInput: {
        ...clean.accountGuardInput,
        approvedParameterSetForAccount: false,
      },
    });
    expect(r.summary.replayedTradeCount).toBe(0);
  });
});
