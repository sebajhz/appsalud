import type { CandidateTimingMetadata } from "./candidate-timing";
import type { ConfirmationResult } from "./confirmation-detector";
import type { DisplacementResult } from "./displacement";
import type { EntrySlTpModelResult } from "./entry-sl-tp-types";
import type { RetestResult } from "./retest-detector";
import type { SweepStatus } from "./liquidity-sweep";
import type { ParameterSetCompatibilityResult } from "./strategy-registry-types";
import type { TradePlanAccountGuardInput, TradePlanHardGate } from "./trade-plan-types";
import type { ZoneCandidate } from "./zone-candidate";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { DecisionModelSettings } from "./decision-model-settings";

/** Stable machine codes for decision audit / UI mapping. */
export type DecisionReasonCode =
  | "OK"
  | "SYMBOL_PROFILE_MISSING"
  | "ZONE_MISSING"
  | "ENTRY_SL_TP_MISSING"
  | "ENTRY_SL_TP_INSUFFICIENT"
  | "ENTRY_SL_TP_INVALID"
  | "RR_BELOW_MINIMUM"
  | "SL_TP_GEOMETRY_INVALID"
  | "TIMING_LOOKAHEAD_UNSAFE"
  | "ACCOUNT_GUARD_BLOCKS"
  | "REGISTRY_BLOCKS_TRADE_REVIEW"
  | "ZONE_INVALIDATED"
  | "ZONE_EXPIRED"
  | "ZONE_USED"
  | "TARGET_ALREADY_PASSED_BLOCKED"
  | "TARGET_TOO_CLOSE_BLOCKED"
  | "ENTRY_CHASE_BLOCKED"
  | "CONTEXT_PLACEHOLDER_NEUTRAL"
  | "CONTEXT_INPUT_MISSING"
  | "COMPONENT_INSUFFICIENT_INPUT";

export type DecisionVariantClassification =
  | "primary_setup"
  | "accepted_variant"
  | "weak_observe_variant"
  | "invalid_variant";

export type DecisionConfidenceBand =
  | "no_trade"
  | "observe"
  | "wait"
  | "review_candidate"
  | "high_confidence_review_candidate";

export interface DecisionReasonRef {
  code: DecisionReasonCode;
  message: string;
}

export interface DecisionHardGateResult {
  hardGatePassed: boolean;
  blockingReasons: DecisionReasonRef[];
  warningReasons: DecisionReasonRef[];
}

export interface DecisionExplainabilityItem {
  componentId: string;
  label: string;
  score: number;
  weight: number;
  contribution: number;
  reasonCodes: DecisionReasonCode[];
  explanationSimple: string;
}

export interface DecisionScoreComponent {
  id:
    | "sweepQuality"
    | "displacementQuality"
    | "ifvgQuality"
    | "zoneQuality"
    | "retestQuality"
    | "confirmationQuality"
    | "entrySlTpQuality"
    | "timingQuality"
    | "contextQuality"
    | "spreadVolatilityQuality";
  score: number;
  weight: number;
  contribution: number;
  reasonCodes: DecisionReasonCode[];
  explanationSimple: string;
}

export interface DecisionSoftScoreResult {
  /** Rounded 0–100 weighted sum of component scores. */
  totalScore: number;
  components: DecisionScoreComponent[];
  /** Pre-round sum for determinism checks in tests. */
  weightedSumRaw: number;
}

export interface DecisionModelResult {
  hardGates: DecisionHardGateResult;
  softScore: DecisionSoftScoreResult;
  confidenceBand: DecisionConfidenceBand;
  variant: DecisionVariantClassification;
  explainability: DecisionExplainabilityItem[];
  reviewOnly: true;
  canAutoExecute: false;
  registryMutationAllowed: false;
}

export interface DecisionModelInput {
  settings: DecisionModelSettings;
  /** Minimum R:R required (e.g. from Entry/SL/TP or trade plan settings). */
  minRr: number;
  symbolProfile: SymbolMarketSpec | null;
  zoneCandidate: ZoneCandidate | null;
  /** Result of `buildEntrySlTpPlan` when available. */
  entrySlTp: EntrySlTpModelResult | null;
  sweepStatus: SweepStatus | undefined;
  displacement: DisplacementResult | null | undefined;
  /** Optional FVG gap size / ATR at detection (higher signal when set). */
  fvgSizeAtr?: number | null;
  retest: RetestResult | null | undefined;
  confirmation: ConfirmationResult | null | undefined;
  candidateTiming: CandidateTimingMetadata | null | undefined;
  accountGuard: TradePlanAccountGuardInput | undefined;
  registryCompatibility: ParameterSetCompatibilityResult | null | undefined;
  /** When true, lifecycle invalidation is a hard block. */
  zoneInvalidated?: boolean;
  zoneExpired?: boolean;
  zoneUsed?: boolean;
  /**
   * Explicit HTF / bias quality 0–100 for v1; when omitted, settings.contextPlaceholderScore is used
   * with CONTEXT_PLACEHOLDER_NEUTRAL (not hidden).
   */
  contextQualityScore?: number | null;
  /** ATR in price units for spread–volatility ratio (confirmation bar or zone TF). */
  confirmationAtr: number | null | undefined;
  /** Optional failures from `collectTradePlanHardGateFailures` at the same evaluation bar. */
  tradePlanHardGateFailures?: TradePlanHardGate[];
}
