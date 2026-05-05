/**
 * Converts dashboard `Zone` mock rows into `@workspace/mapazapp-core` trade plan inputs.
 * All geometry and lifecycle hints are adapter assumptions — see IMPLEMENTATION_ASSUMPTIONS §14.
 */
import type {
  AccountId,
  ConfirmationResult,
  ParameterSetCompatibilityResult,
  RetestResult,
  SymbolMarketSpec,
  TradePlanInput,
  TradePlanEvaluationSettings,
  ZoneCandidate,
} from "@workspace/mapazapp-core";
import { roundToTickSize } from "@workspace/mapazapp-core";
import type { Zone, ZoneState } from "@/mock/types";
import { getMockConfirmationAtr } from "./mockSymbolProfiles";

function zoneLifecycleFlags(state: ZoneState): Pick<
  TradePlanInput,
  "zoneMarkedUsed" | "zoneMarkedExpired" | "zoneMarkedInvalidated"
> {
  return {
    zoneMarkedUsed: state === "USED",
    zoneMarkedExpired: state === "EXPIRED",
    zoneMarkedInvalidated: state === "INVALIDATED",
  };
}

/** Derive synthetic IFVG band from mock entry / invalidation (no real FVG geometry in mock JSON). */
export function mockZoneBoundsFromDashboard(zone: Zone, tickSize: number): { zoneLow: number; zoneHigh: number } {
  const entry = zone.entryPrice;
  const inv = zone.invalidationPrice;
  const span = Math.abs(entry - inv);
  const t = Math.max(tickSize, span * 0.15);
  if (zone.direction === "BUY") {
    const rawLow = inv + t;
    const rawHigh = entry;
    const zoneLow = roundToTickSize(Math.min(rawLow, rawHigh - tickSize), tickSize, "down");
    const zoneHigh = roundToTickSize(Math.max(rawLow + tickSize, rawHigh), tickSize, "up");
    return { zoneLow, zoneHigh };
  }
  const rawLow = entry;
  const rawHigh = inv - t;
  const zoneLow = roundToTickSize(Math.min(rawLow, rawHigh - tickSize), tickSize, "down");
  const zoneHigh = roundToTickSize(Math.max(rawLow + tickSize, rawHigh), tickSize, "up");
  return { zoneLow, zoneHigh };
}

export function mockRetestAndConfirmationFromZoneState(state: ZoneState): {
  retestResult: RetestResult;
  confirmationResult: ConfirmationResult;
} {
  switch (state) {
    case "CREATED":
    case "WATCHING":
      return {
        retestResult: { retested: false, retestMode: "full_zone", touchPrice: null, event: "NONE" },
        confirmationResult: { confirmed: false, direction: "NONE", quality: "NONE", body: 0 },
      };
    case "RETESTING":
      return {
        retestResult: { retested: true, retestMode: "full_zone", touchPrice: null, event: "RETEST_HIT" },
        confirmationResult: { confirmed: false, direction: "NONE", quality: "NONE", body: 0 },
      };
    case "CONFIRMED":
    case "TRADE_READY":
      return {
        retestResult: { retested: true, retestMode: "full_zone", touchPrice: null, event: "RETEST_HIT" },
        confirmationResult: {
          confirmed: true,
          direction: "BULLISH",
          quality: "CLEAR",
          body: 1,
        },
      };
    default:
      return {
        retestResult: { retested: false, retestMode: "full_zone", touchPrice: null, event: "NONE" },
        confirmationResult: { confirmed: false, direction: "NONE", quality: "NONE", body: 0 },
      };
  }
}

function fixConfirmationDirection(zone: Zone, conf: ConfirmationResult): ConfirmationResult {
  if (!conf.confirmed) return conf;
  const dir = zone.direction === "BUY" ? "BULLISH" : "BEARISH";
  return { ...conf, direction: dir };
}

/** Heuristic sweep class from mock state (no sweep geometry in mock zones). */
export function mockSweepStatusFromZoneState(state: ZoneState): NonNullable<import("@workspace/mapazapp-core").TradePlanInput["sweep"]>["sweepStatus"] {
  if (state === "TRADE_READY" || state === "CONFIRMED") return "CONFIRMED_SWEEP";
  if (state === "RETESTING") return "NEAR_SWEEP";
  return "NO_SWEEP";
}

/** Price used to evaluate invalidation vs `invalidationPrice` when mock does not supply a live quote. */
export function mockCurrentPriceForZone(zone: Zone): number | undefined {
  if (zone.state === "INVALIDATED") {
    return zone.direction === "BUY"
      ? zone.invalidationPrice - zone.entryPrice * 0.0005
      : zone.invalidationPrice + zone.entryPrice * 0.0005;
  }
  return zone.entryPrice;
}

export function buildZoneCandidateFromMockZone(
  zone: Zone,
  spec: SymbolMarketSpec,
  accountId: AccountId,
): ZoneCandidate {
  const { zoneLow, zoneHigh } = mockZoneBoundsFromDashboard(zone, spec.tickSize);
  const midpoint = (zoneLow + zoneHigh) / 2;
  const inv = roundToTickSize(
    zone.invalidationPrice,
    spec.tickSize,
    zone.direction === "BUY" ? "down" : "up",
  );
  return {
    zoneId: zone.id,
    strategyId: zone.strategy_id,
    parameterSetId: zone.parameter_set_id,
    canonicalSymbol: zone.symbol,
    brokerSymbol: spec.brokerSymbol,
    direction: zone.direction,
    zoneLow,
    zoneHigh,
    midpoint,
    invalidationPrice: inv,
    createdAt: zone.createdAt,
    expiresAt: zone.expiresAt,
    sourceIfvgId: `mock_ifvg_${zone.id}`,
    reasonSimple: zone.simpleDescription,
    reasonTechnical: `mock_zone_state=${zone.state};adapter=v1`,
    initialState: zone.state === "WATCHING" || zone.state === "CREATED" ? "OBSERVE" : "WAIT_RETEST",
  };
}

export function buildTradePlanInputFromMockZone(params: {
  zone: Zone;
  symbolProfile: SymbolMarketSpec;
  accountId: AccountId;
  tradePlanSettings: TradePlanEvaluationSettings;
  accountGuard: import("@workspace/mapazapp-core").TradePlanAccountGuardInput;
  /** Checkpoint 7 — registry evaluation for parameter-set gate reasons. */
  registryCompatibility?: ParameterSetCompatibilityResult;
}): TradePlanInput {
  const { zone, symbolProfile, accountId, tradePlanSettings, accountGuard, registryCompatibility } = params;
  const zc = buildZoneCandidateFromMockZone(zone, symbolProfile, accountId);
  const { retestResult, confirmationResult } = mockRetestAndConfirmationFromZoneState(zone.state);
  const conf = fixConfirmationDirection(zone, confirmationResult);
  const atr = getMockConfirmationAtr(zone.symbol);
  const st = mockSweepStatusFromZoneState(zone.state);
  const sweep =
    zone.direction === "BUY"
      ? {
          sweepStatus: st,
          sweepLow: Math.min(zone.invalidationPrice, zone.entryPrice) - symbolProfile.tickSize * 4,
        }
      : {
          sweepStatus: st,
          sweepHigh: Math.max(zone.invalidationPrice, zone.entryPrice) + symbolProfile.tickSize * 4,
        };

  return {
    zoneCandidate: zc,
    symbolProfile,
    tradePlanSettings,
    accountGuard,
    retestResult,
    confirmationResult: conf,
    score: { totalScore: zone.score },
    currentPrice: mockCurrentPriceForZone(zone),
    confirmationClose: conf.confirmed ? zone.entryPrice : null,
    confirmationAtr: atr,
    spreadPrice: symbolProfile.spreadPrice,
    sweep,
    evaluationTimeIso: new Date().toISOString(),
    accountId,
    strategyId: zone.strategy_id,
    parameterSetId: zone.parameter_set_id,
    registryCompatibility,
    ...zoneLifecycleFlags(zone.state),
  };
}
