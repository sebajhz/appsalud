/**
 * IFVG zone lifecycle — Mapazapp_IFVG_Strategy_Blueprint_Final_Draft_V1 §6.
 * Skeleton: explicit states + transition table; no candle/IFVG detection.
 */

export type IfvgZoneLifecycleState =
  | "NO_TRADE"
  | "OBSERVE"
  | "WAIT_RETEST"
  | "WAIT_CONFIRMATION"
  | "TRADE_READY"
  | "INVALIDATED"
  | "EXPIRED"
  | "USED";

export type IfvgZoneEvent =
  | "NO_ZONE"
  | "WEAK_CONTEXT"
  | "ZONE_CREATED"
  | "RETEST_HIT"
  | "CONFIRMATION_OK"
  | "HARD_GATES_FAIL"
  | "INVALIDATED"
  | "EXPIRED"
  | "CONSUMED";

const transitions: Partial<Record<IfvgZoneLifecycleState, Partial<Record<IfvgZoneEvent, IfvgZoneLifecycleState>>>> = {
  NO_TRADE: {
    NO_ZONE: "NO_TRADE",
    WEAK_CONTEXT: "OBSERVE",
    ZONE_CREATED: "WAIT_RETEST",
  },
  OBSERVE: {
    ZONE_CREATED: "WAIT_RETEST",
    WEAK_CONTEXT: "OBSERVE",
    NO_ZONE: "NO_TRADE",
  },
  WAIT_RETEST: {
    RETEST_HIT: "WAIT_CONFIRMATION",
    INVALIDATED: "INVALIDATED",
    EXPIRED: "EXPIRED",
    HARD_GATES_FAIL: "NO_TRADE",
  },
  WAIT_CONFIRMATION: {
    CONFIRMATION_OK: "TRADE_READY",
    HARD_GATES_FAIL: "NO_TRADE",
    INVALIDATED: "INVALIDATED",
    EXPIRED: "EXPIRED",
  },
  TRADE_READY: {
    CONSUMED: "USED",
    INVALIDATED: "INVALIDATED",
    EXPIRED: "EXPIRED",
    HARD_GATES_FAIL: "NO_TRADE",
  },
  INVALIDATED: {
    NO_ZONE: "NO_TRADE",
  },
  EXPIRED: {
    NO_ZONE: "NO_TRADE",
  },
  USED: {
    NO_ZONE: "NO_TRADE",
  },
};

/**
 * Pure transition step. Returns `null` if event is not defined for current state (caller handles).
 */
export function nextIfvgZoneState(
  current: IfvgZoneLifecycleState,
  event: IfvgZoneEvent,
): IfvgZoneLifecycleState | null {
  const row = transitions[current];
  if (!row) return null;
  const next = row[event];
  return next ?? null;
}
