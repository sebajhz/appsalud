import type { SweepStatus } from "./liquidity-sweep";
import type { HardGateSnapshot } from "./risk-primitives";
import { evaluateTradeHardGates } from "./risk-primitives";

export type ScoreClassification =
  | "NO_TRADE"
  | "OBSERVE"
  | "WAIT_CONFIRMATION"
  | "TRADE_READY_WITH_REVIEW"
  | "STRONG_SETUP";

export interface StrategyScoreBreakdown {
  context: number;
  liquidity: number;
  displacement: number;
  ifvg: number;
  retest: number;
  confirmation: number;
  riskSpread: number;
}

export interface StrategyScoreResult {
  total: number;
  breakdown: StrategyScoreBreakdown;
  classification: ScoreClassification;
  hardGatesFailed: boolean;
}

const W_CONTEXT = 20;
const W_LIQ = 15;
const W_DISP = 15;
const W_IFVG = 20;
const W_RETEST = 10;
const W_CONF = 10;
const W_RISK = 10;

export function liquiditySubscoreFromSweep(status: SweepStatus): number {
  switch (status) {
    case "CONFIRMED_SWEEP":
      return 1;
    case "NEAR_SWEEP":
      return 0.45;
    case "POSSIBLE_BREAK_RISK":
      return 0.15;
    default:
      return 0;
  }
}

export interface StrategyScoreComponentInput {
  /** 0–1 context alignment (caller supplies until context detector exists). */
  contextAlign01: number;
  sweepStatus: SweepStatus;
  /** 0–1 displacement quality. */
  displacement01: number;
  /** 0–1 IFVG / FVG quality. */
  ifvg01: number;
  /** 0–1 retest quality. */
  retest01: number;
  /** 0–1 confirmation quality. */
  confirmation01: number;
  /** 0–1 R:R / spread / risk placeholder (not duplicate hard gates). */
  riskSpread01: number;
  hardGates?: HardGateSnapshot;
}

function classify(total: number, gatesOk: boolean): ScoreClassification {
  if (!gatesOk) return "NO_TRADE";
  if (total <= 44) return "NO_TRADE";
  if (total <= 59) return "OBSERVE";
  if (total <= 74) return "WAIT_CONFIRMATION";
  if (total <= 84) return "TRADE_READY_WITH_REVIEW";
  return "STRONG_SETUP";
}

/**
 * Blueprint §17 — score is advisory; hard gates from risk-primitives override.
 */
export function computeStrategyScore(input: StrategyScoreComponentInput): StrategyScoreResult {
  const gateResult = input.hardGates ? evaluateTradeHardGates(input.hardGates) : { ok: true, reasons: [] };
  const gatesOk = gateResult.ok;

  const breakdown: StrategyScoreBreakdown = {
    context: W_CONTEXT * input.contextAlign01,
    liquidity: W_LIQ * liquiditySubscoreFromSweep(input.sweepStatus),
    displacement: W_DISP * input.displacement01,
    ifvg: W_IFVG * input.ifvg01,
    retest: W_RETEST * input.retest01,
    confirmation: W_CONF * input.confirmation01,
    riskSpread: W_RISK * input.riskSpread01,
  };

  let total =
    breakdown.context +
    breakdown.liquidity +
    breakdown.displacement +
    breakdown.ifvg +
    breakdown.retest +
    breakdown.confirmation +
    breakdown.riskSpread;

  if (!gatesOk) {
    total = Math.min(total, 44);
  }

  return {
    total: Math.round(total),
    breakdown,
    classification: classify(total, gatesOk),
    hardGatesFailed: !gatesOk,
  };
}
