/**
 * Bar-index timing for IFVG zone candidates (V2-04.1) — offline / synthetic only.
 * Reduces replay lookahead vs parsing `sourceIfvgId`; detection still scans full series in v1.
 */

import type { InversionFairValueGap } from "./ifvg-converter";

export type CandidateTimingSourceKind = "exact" | "inferred" | "missing";

export interface CandidateTimingMetadata {
  sourceKind: CandidateTimingSourceKind;
  /** First candle (A) of the three-bar FVG pattern. */
  fvgStartIndex?: number;
  /** Middle candle (B) of the three-bar FVG pattern. */
  fvgMiddleIndex?: number;
  /** Third candle (C) of the three-bar FVG pattern. */
  fvgEndIndex?: number;
  /** Bar where FVG invalidation / IFVG confirmation was detected (same series as detection). */
  ifvgBreakIndex?: number;
  /** Bar when the zone is knowable in this model (IFVG break bar). */
  candidateCreatedIndex?: number;
  /** ISO time aligned to `candidateCreatedIndex` when bar time is Unix ms; else may match `createdAt` fallback. */
  candidateCreatedTime?: string;
  /** First bar index (inclusive) where retest search may begin — not before zone exists. */
  firstRetestSearchIndex?: number;
  /** Optional floor for replay slice start in full-series coordinates (anti-lookahead). */
  firstReplayIndex?: number;
  /** Why `sourceKind` is not `exact` or other audit hints. */
  sourceReasonCodes?: string[];
}

const MS_THRESHOLD = 1_000_000_000_000;

function isoFromBarTimeOrFallback(barTimeMs: number, fallbackIso: string): string {
  if (Number.isFinite(barTimeMs) && barTimeMs >= MS_THRESHOLD) {
    return new Date(barTimeMs).toISOString();
  }
  return fallbackIso;
}

/**
 * Builds timing metadata for replay / audit. Prefer `sourceKind: "exact"` when FVG bar indices
 * and break index are all known from the detector path.
 */
export function buildCandidateTimingMetadataFromIfvg(
  ifvg: InversionFairValueGap,
  createdAtIsoFallback: string,
): CandidateTimingMetadata {
  const reasonCodes: string[] = [];
  const breakIdx = ifvg.ifvgBreakIndex ?? ifvg.invalidationIndex;
  const fs = ifvg.fvgStartIndex;
  const fm = ifvg.fvgMiddleIndex;
  const fe = ifvg.fvgEndIndex;
  const hasTriple = fs != null && fm != null && fe != null;

  if (!Number.isFinite(breakIdx)) {
    return {
      sourceKind: "missing",
      sourceReasonCodes: ["CANDIDATE_TIMING_BREAK_INDEX_MISSING"],
    };
  }

  let sourceKind: CandidateTimingSourceKind = "exact";
  if (!hasTriple) {
    sourceKind = "inferred";
    reasonCodes.push("CANDIDATE_TIMING_FVG_BAR_INDEXES_OMITTED");
  }

  return {
    sourceKind,
    fvgStartIndex: fs ?? undefined,
    fvgMiddleIndex: fm ?? undefined,
    fvgEndIndex: fe ?? undefined,
    ifvgBreakIndex: breakIdx,
    candidateCreatedIndex: breakIdx,
    candidateCreatedTime: isoFromBarTimeOrFallback(ifvg.time, createdAtIsoFallback),
    firstRetestSearchIndex: breakIdx + 1,
    sourceReasonCodes: reasonCodes.length ? reasonCodes : undefined,
  };
}
