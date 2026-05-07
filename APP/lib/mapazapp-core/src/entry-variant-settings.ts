/**
 * V2-08 — tunable bands for entry style / timing (review-only; not optimized for profit).
 */

export interface EntryVariantSettings {
  /** BUY: which horizontal edge is the “primary” touch anchor (discount vs premium). */
  buyEdgeAnchor: "low" | "high";
  sellEdgeAnchor: "high" | "low";
  edgeBandAtrMultiplier: number;
  edgeBandSpreadMultiplier: number;
  edgeBandMinTicks: number;
  /**
   * Caps the band used only for depth / edge / midpoint classification so spread-heavy
   * `slBufferPrice` does not collapse every touch into “edge”.
   */
  classificationBandMaxAtrMultiple: number;
  /** u = position in zone [0,1]; below this with retest ⇒ partial_zone_retest. */
  partialRetestMaxZoneFraction: number;
  /** u above this ⇒ deep_zone_retest when retested. */
  deepRetestMinZoneFraction: number;
  /** Toward TP in R multiples from planned entry ⇒ missed (needs entrySlTpPlan). */
  missedMoveTowardTpR: number;
  /** Beyond planned entry in R multiples ⇒ late_chase (needs entrySlTpPlan + currentPrice). */
  lateChaseBeyondEntryR: number;
  fallbackAtrPrice: number;
  /** Spread/ATR above this marks elevated spread path (acceptance note only). */
  elevatedSpreadToAtrRatio: number;
  /**
   * When true, CLEAR confirmation overwrites preferred style with `confirmation_close`
   * (replay hint). Default false so zone geometry remains primary in v1 tests.
   */
  treatClearConfirmationAsConfirmationCloseStyle: boolean;
}

export function createDefaultEntryVariantSettingsForTests(): EntryVariantSettings {
  return {
    buyEdgeAnchor: "low",
    sellEdgeAnchor: "high",
    edgeBandAtrMultiplier: 0.22,
    edgeBandSpreadMultiplier: 1.1,
    edgeBandMinTicks: 2,
    classificationBandMaxAtrMultiple: 0.42,
    partialRetestMaxZoneFraction: 0.36,
    deepRetestMinZoneFraction: 0.64,
    missedMoveTowardTpR: 0.82,
    lateChaseBeyondEntryR: 0.48,
    fallbackAtrPrice: 0.45,
    elevatedSpreadToAtrRatio: 0.14,
    treatClearConfirmationAsConfirmationCloseStyle: false,
  };
}
