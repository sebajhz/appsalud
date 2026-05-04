import { atrAtIndex, calculateAtrSeries } from "./atr";
import type { Candle } from "./candle";
import type { CanonicalSymbol, ParameterSetId, StrategyId, ZoneId } from "./ids";
import { detectDisplacement } from "./displacement";
import { detectFvgAtIndex } from "./fvg-detector";
import { tryConvertFvgToIfvg } from "./ifvg-converter";
import {
  detectLowerPoolSweepForBuy,
  detectUpperPoolSweepForSell,
  type LiquiditySweepResult,
} from "./liquidity-sweep";
import { evaluateTradeHardGates } from "./risk-primitives";
import type { IfvgStrategySettings } from "./strategy-settings";
import type { SymbolMarketSpec } from "./symbol-profile";
import { detectSwings, type SwingPoint } from "./swing-detector";
import { buildZoneCandidateFromIfvg, type ZoneCandidate } from "./zone-candidate";
import type { StrategyPipelineWarning } from "./no-trade-reason";
import type { HardGateSnapshot, NoTradeReasonCode } from "./risk-primitives";

export interface DetectionDiagnostics {
  swingCount: number;
  fvgCount: number;
  ifvgCount: number;
  displacementFound: boolean;
}

export interface DetectIfvgZoneCandidatesInput {
  candles: Candle[];
  symbolProfile: SymbolMarketSpec;
  settings: IfvgStrategySettings;
  strategyId: StrategyId;
  parameterSetId?: ParameterSetId;
  canonicalSymbol: CanonicalSymbol;
  brokerSymbol?: string;
  /** Defaults to `Date.now()` ISO. */
  nowMs?: number;
  /** When provided, failed gates populate `noTradeReasons` and suppress high-score semantics. */
  hardGates?: HardGateSnapshot;
}

export interface DetectIfvgZoneCandidatesResult {
  candidates: ZoneCandidate[];
  diagnostics: DetectionDiagnostics;
  assumptionsWarnings: string[];
  noTradeReasons: NoTradeReasonCode[];
  pipelineWarnings: StrategyPipelineWarning[];
  hardGateEvaluation: { ok: boolean; reasons: NoTradeReasonCode[] } | null;
}

function lastSwingBefore(swings: SwingPoint[], type: "HIGH" | "LOW", beforeIndex: number): SwingPoint | null {
  let best: SwingPoint | null = null;
  for (const s of swings) {
    if (s.type !== type) continue;
    if (s.confirmedAtIndex >= beforeIndex) continue;
    if (!best || s.index > best.index) best = s;
  }
  return best;
}

function sweepToleranceCtx(
  atr: number,
  spreadPrice: number,
  tickSize: number,
  settings: IfvgStrategySettings,
) {
  return {
    atr,
    spreadPrice,
    tickSize,
    sweepToleranceAtr: settings.sweep.sweepToleranceAtr,
    sweepSpreadFactor: settings.sweep.sweepSpreadFactor,
    minSweepTicks: settings.sweep.minSweepTicks,
    nearSweepToleranceAtr: settings.sweep.nearSweepToleranceAtr,
    nearSweepSpreadFactor: settings.sweep.nearSweepSpreadFactor,
    minNearSweepTicks: settings.sweep.minNearSweepTicks,
  };
}

function displacementInWindow(
  candles: Candle[],
  from: number,
  to: number,
  atrSeries: (number | null)[],
  want: "BULLISH" | "BEARISH",
  settings: IfvgStrategySettings,
): boolean {
  const lo = Math.max(1, from);
  const hi = Math.min(candles.length - 1, to);
  for (let k = lo; k <= hi; k++) {
    const atr = atrAtIndex(atrSeries, k);
    const prev = candles[k - 1];
    const d = detectDisplacement(candles[k], prev, atr, settings.displacement);
    if (want === "BULLISH" && d.direction === "BULLISH") return true;
    if (want === "BEARISH" && d.direction === "BEARISH") return true;
  }
  return false;
}

/**
 * Pure IFVG zone candidate pipeline — synthetic / offline only. No I/O.
 */
export function detectIfvgZoneCandidates(input: DetectIfvgZoneCandidatesInput): DetectIfvgZoneCandidatesResult {
  const { candles, symbolProfile, settings, strategyId, parameterSetId, canonicalSymbol, brokerSymbol } = input;
  const assumptionsWarnings: string[] = [
    "V1 skeleton: single candle series used for all logical TFs (ATR/sweep/displacement/FVG).",
  ];
  const pipelineWarnings: StrategyPipelineWarning[] = [];
  const noTradeReasons: NoTradeReasonCode[] = [];

  const hardGateEvaluation = input.hardGates ? evaluateTradeHardGates(input.hardGates) : null;
  if (hardGateEvaluation && !hardGateEvaluation.ok) {
    noTradeReasons.push(...hardGateEvaluation.reasons);
  }

  if (candles.length < settings.atrPeriod + 3) {
    pipelineWarnings.push("INSUFFICIENT_CANDLES_FOR_ATR");
  }

  const atrSeries = calculateAtrSeries(candles, settings.atrPeriod);
  const swings = detectSwings(candles, settings.swing);

  let fvgCount = 0;
  let ifvgCount = 0;
  let displacementFound = false;
  const candidates: ZoneCandidate[] = [];
  const nowIso = new Date(input.nowMs ?? Date.now()).toISOString();

  for (let i = 1; i < candles.length - 1; i++) {
    const atr = atrAtIndex(atrSeries, i);
    const fvg = detectFvgAtIndex(candles, i, atr, settings.fvg, `fvg_${i}_${candles[i].time}`);
    if (!fvg) continue;
    fvgCount++;

    const ifvg = tryConvertFvgToIfvg(
      fvg,
      candles,
      atrSeries,
      symbolProfile.spreadPrice,
      symbolProfile.tickSize,
      settings.ifvg,
      `ifvg_${fvg.id}`,
    );
    if (!ifvg) continue;
    ifvgCount++;

    const atrSweep =
      atrAtIndex(atrSeries, ifvg.invalidationIndex) ??
      atrAtIndex(atrSeries, i) ??
      atr ??
      symbolProfile.spreadPrice;
    const ctx = sweepToleranceCtx(atrSweep, symbolProfile.spreadPrice, symbolProfile.tickSize, settings);

    let sweepResult: LiquiditySweepResult;
    if (ifvg.direction === "BULLISH") {
      const swingLow = lastSwingBefore(swings, "LOW", ifvg.invalidationIndex);
      if (!swingLow) {
        sweepResult = {
          status: "NO_SWEEP",
          pool: "BUY_SETUP_LOWER_SWING",
          sweepEventIndex: null,
          reclaimIndex: null,
          swingLevel: 0,
        };
      } else {
        sweepResult = detectLowerPoolSweepForBuy(
          candles,
          swingLow.price,
          swingLow.confirmedAtIndex + 1,
          ifvg.invalidationIndex,
          ctx,
          { reclaimBars: settings.sweep.reclaimBars },
        );
      }
      const from =
        sweepResult.reclaimIndex ?? sweepResult.sweepEventIndex ?? swingLow?.confirmedAtIndex ?? i;
      const disp = displacementInWindow(
        candles,
        from,
        ifvg.invalidationIndex,
        atrSeries,
        "BULLISH",
        settings,
      );
      if (disp) displacementFound = true;
    } else {
      const swingHigh = lastSwingBefore(swings, "HIGH", ifvg.invalidationIndex);
      if (!swingHigh) {
        sweepResult = {
          status: "NO_SWEEP",
          pool: "SELL_SETUP_UPPER_SWING",
          sweepEventIndex: null,
          reclaimIndex: null,
          swingLevel: 0,
        };
      } else {
        sweepResult = detectUpperPoolSweepForSell(
          candles,
          swingHigh.price,
          swingHigh.confirmedAtIndex + 1,
          ifvg.invalidationIndex,
          ctx,
          { reclaimBars: settings.sweep.reclaimBars },
        );
      }
      const from =
        sweepResult.reclaimIndex ?? sweepResult.sweepEventIndex ?? swingHigh?.confirmedAtIndex ?? i;
      const disp = displacementInWindow(
        candles,
        from,
        ifvg.invalidationIndex,
        atrSeries,
        "BEARISH",
        settings,
      );
      if (disp) displacementFound = true;
    }

    const atrZone = atrAtIndex(atrSeries, ifvg.invalidationIndex) ?? atr ?? symbolProfile.spreadPrice;
    const zid: ZoneId = `zone_${ifvg.id}` as ZoneId;
    candidates.push(
      buildZoneCandidateFromIfvg({
        ifvg,
        symbolProfile,
        atr: atrZone,
        zonePaddingAtrFactor: settings.zone.zonePaddingAtrFactor,
        zonePaddingSpreadFactor: settings.zone.zonePaddingSpreadFactor,
        minZoneTicks: settings.zone.minZoneTicks,
        zoneId: zid,
        strategyId,
        parameterSetId,
        canonicalSymbol,
        brokerSymbol,
        sweepStatus: sweepResult.status,
        createdAtIso: nowIso,
      }),
    );
  }

  return {
    candidates,
    diagnostics: {
      swingCount: swings.length,
      fvgCount,
      ifvgCount,
      displacementFound,
    },
    assumptionsWarnings,
    noTradeReasons,
    pipelineWarnings,
    hardGateEvaluation,
  };
}
