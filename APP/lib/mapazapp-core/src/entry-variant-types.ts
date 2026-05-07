import type { Candle } from "./candle";
import type { ConfirmationResult } from "./confirmation-detector";
import type { EntrySlTpPricePlan } from "./entry-sl-tp-types";
import type { RetestResult } from "./retest-detector";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { ToleranceCalibrationResult } from "./tolerance-calibration-types";
import type { ZoneCandidate, ZoneTradeDirection } from "./zone-candidate";
import type { EntryVariantSettings } from "./entry-variant-settings";
import type { ReplayEntryModel } from "./replay-trade-types";

/** Alias: suggested replay entry model for `ReplayTradeInput.entryModel`. */
export type EntryVariantReplayHint = ReplayEntryModel;

/** High-level outcome bucket for review / decision integration. */
export type EntryVariantClassification =
  | "ideal_entry"
  | "accepted_entry"
  | "weak_observe_entry"
  | "late_entry"
  | "missed_entry"
  | "invalid_entry";

/** Where price interacted with the zone (human-like, not exact tick). */
export type EntryVariantEntryStyle =
  | "zone_edge_touch"
  | "zone_midpoint_touch"
  | "deep_zone_retest"
  | "partial_zone_retest"
  | "confirmation_close"
  | "manual_reference"
  | "no_entry";

export type EntryVariantTimingStatus =
  | "early_wait"
  | "valid_now"
  | "late_chase"
  | "already_missed"
  | "expired"
  | "invalidated"
  | "unknown";

/** Subjective quality label derived from geometry + timing + confirmation. */
export type EntryVariantQuality = "ideal" | "acceptable" | "weak" | "poor" | "invalid";

export type EntryVariantReasonCode =
  | "OK"
  | "INSUFFICIENT_ZONE_INPUT"
  | "NO_TOUCH_REFERENCE"
  | "RETEST_MISSING_FOR_IDEAL"
  | "CONFIRMATION_MISSING_OR_WEAK"
  | "DEPTH_PARTIAL_RETEST"
  | "DEPTH_DEEP_RETEST"
  | "TIMING_LATE_CHASE"
  | "TIMING_MISSED_MOVE"
  | "TIMING_EXPIRED"
  | "GEOMETRY_INVALIDATED"
  | "GEOMETRY_WRONG_SIDE"
  | "HIGH_SPREAD_IMPERFECT_ACCEPTED"
  | "TOLERANCE_SUPPORTS_ACCEPTED";

export interface EntryVariantReason {
  code: EntryVariantReasonCode;
  message: string;
}

export interface EntryVariantScoreComponent {
  id: "retestDepth" | "confirmation" | "timing" | "geometry" | "spreadRegime";
  score: number;
  weight: number;
  note: string;
}

export interface ZoneBoundsInput {
  zoneLow: number;
  zoneHigh: number;
}

export interface EntryVariantInput {
  zoneCandidate?: ZoneCandidate | null;
  zoneBounds?: ZoneBoundsInput | null;
  direction: ZoneTradeDirection;
  currentPrice?: number | null;
  recentCandles?: Candle[] | undefined;
  retestResult?: RetestResult | null;
  confirmationResult?: ConfirmationResult | null;
  entrySlTpPlan?: EntrySlTpPricePlan | null;
  toleranceCalibrationResult?: ToleranceCalibrationResult | null;
  symbolProfile: SymbolMarketSpec;
  /** ATR in price units; if omitted, fixtures may use settings fallback only. */
  atrPrice?: number | null;
  /** Optional spread override; defaults to `symbolProfile.spreadPrice`. */
  spreadPrice?: number | null;
  settings: EntryVariantSettings;
  zoneInvalidated?: boolean;
  zoneExpired?: boolean;
}

export interface EntryVariantResult {
  classification: EntryVariantClassification;
  quality: EntryVariantQuality;
  /** 0–100 aggregate for decision / UI. */
  qualityScore: number;
  timingStatus: EntryVariantTimingStatus;
  preferredEntryStyle: EntryVariantEntryStyle;
  /** Suggested `ReplayTradeInput.entryModel` (V2-02 / V2-03 alignment). */
  replayEntryModel: EntryVariantReplayHint;
  reasonCodes: EntryVariantReasonCode[];
  reasons: EntryVariantReason[];
  components: EntryVariantScoreComponent[];
  explainability: string[];
  reviewOnly: true;
}
