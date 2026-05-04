/**
 * Pure helpers: TradeReviewPlan / TradePlanEvaluationResult → user-facing explanation.
 * No React — review-only product language (no execution).
 */

import type {
  TradePlanEvaluationResult,
  TradePlanHardGate,
  TradePlanStatus,
} from "@workspace/mapazapp-core";

export type ExplanationSeverity = "info" | "warning" | "danger" | "success";

export type ReasonCategory =
  | "zone"
  | "risk"
  | "account"
  | "score"
  | "spread"
  | "confirmation"
  | "system";

export interface MappedReason {
  code: string;
  simple: string;
  technical: string;
  severity: ExplanationSeverity;
  category: ReasonCategory;
}

export interface TradeReviewExplanation {
  status: TradePlanStatus;
  simpleTitle: string;
  simpleSummary: string;
  actionLabel: string;
  whatItMeans: string;
  whatToDoNow: string;
  missingRequirements: string[];
  blockingReasons: MappedReason[];
  positiveReasons: MappedReason[];
  technicalReasons: MappedReason[];
  riskSummary: string;
  /** Mapazapp is always a decision assistant; true for every evaluation (emphasized in UI when TRADE_READY). */
  manualReviewOnly: true;
}

type ReasonPresentation = Omit<MappedReason, "code">;

const PRESENTATION: Record<string, ReasonPresentation> = {
  ZONE_VALID: {
    simple: "Zone structure passes basic checks for this review step.",
    technical: "Zone geometry valid for review stage.",
    severity: "success",
    category: "zone",
  },
  NO_ZONE: {
    simple: "There is no zone to evaluate.",
    technical: "No zone candidate supplied.",
    severity: "info",
    category: "zone",
  },
  WAITING_FOR_RETEST: {
    simple: "Price has not returned to the zone yet.",
    technical: "Retest condition missing.",
    severity: "info",
    category: "zone",
  },
  WAITING_FOR_CONFIRMATION: {
    simple: "The zone was reached but confirmation is missing.",
    technical: "Confirmation condition missing.",
    severity: "info",
    category: "confirmation",
  },
  ZONE_INVALIDATED: {
    simple: "Price has breached the invalidation side of this idea.",
    technical: "Invalidation level breached.",
    severity: "danger",
    category: "zone",
  },
  ZONE_EXPIRED: {
    simple: "This zone is past its allowed age or expiry window.",
    technical: "Zone expired by time/bar rules.",
    severity: "warning",
    category: "zone",
  },
  ZONE_USED: {
    simple: "This idea was already used — avoid duplicating the same playbook here.",
    technical: "Zone marked used in lifecycle.",
    severity: "info",
    category: "zone",
  },
  MISSING_SYMBOL_PROFILE: {
    simple: "Symbol market data needed for sizing is missing.",
    technical: "Symbol profile missing for trade plan.",
    severity: "danger",
    category: "system",
  },
  MISSING_ATR_FOR_PLAN: {
    simple: "Volatility input (ATR) is missing so risk cannot be sized safely.",
    technical: "Confirmation ATR unavailable.",
    severity: "danger",
    category: "system",
  },
  RR_BELOW_MINIMUM: {
    simple: "The reward is not large enough compared with the risk.",
    technical: "R:R below minimum threshold.",
    severity: "warning",
    category: "risk",
  },
  SPREAD_TOO_HIGH: {
    simple: "Spread is too high for this symbol.",
    technical: "Spread hard gate failed.",
    severity: "warning",
    category: "spread",
  },
  SPREAD_NOT_ALLOWED: {
    simple: "Spread filter blocks review for this symbol right now.",
    technical: "Spread not allowed for review.",
    severity: "warning",
    category: "spread",
  },
  ACCOUNT_BLOCKED_DAILY_DRAWDOWN: {
    simple: "This account is blocked because daily drawdown is too close or exceeded.",
    technical: "Daily drawdown guard failed.",
    severity: "danger",
    category: "account",
  },
  ACCOUNT_BLOCKED_MAX_DRAWDOWN: {
    simple: "Maximum drawdown rules block new trade reviews.",
    technical: "Max drawdown guard failed.",
    severity: "danger",
    category: "account",
  },
  ACCOUNT_MAX_TRADES: {
    simple: "Daily trade count limit reached for this account.",
    technical: "Max trades per day reached.",
    severity: "warning",
    category: "account",
  },
  ACCOUNT_NEWS_BLACKOUT: {
    simple: "A news blackout window is active for this account.",
    technical: "News blackout active.",
    severity: "warning",
    category: "account",
  },
  ACCOUNT_PROP_BLOCKED: {
    simple: "Prop firm status blocks new reviews (e.g. breached program rules).",
    technical: "Prop firm guard blocked.",
    severity: "danger",
    category: "account",
  },
  ACCOUNT_PSYCHOLOGICAL_LOCK: {
    simple: "Psychological lock or checklist blocks trade review.",
    technical: "Psychological lock / checklist gate.",
    severity: "warning",
    category: "account",
  },
  ACCOUNT_REVIEW_DISABLED: {
    simple: "Trade review is disabled for this account.",
    technical: "Trade review not allowed flag.",
    severity: "danger",
    category: "account",
  },
  ACCOUNT_ID_REQUIRED: {
    simple: "An account id is required before risk checks can run.",
    technical: "Account id required for guard.",
    severity: "warning",
    category: "account",
  },
  OPERATIONAL_STATUS_BLOCKS: {
    simple: "Operational status (watch-only, bridge, or rules) blocks review.",
    technical: "Operational status blocks trade review.",
    severity: "danger",
    category: "account",
  },
  PARAMETER_SET_NOT_APPROVED: {
    simple: "No approved parameter set for this symbol and account.",
    technical: "Approved parameter set required.",
    severity: "warning",
    category: "account",
  },
  SL_DISTANCE_TOO_WIDE: {
    simple: "Stop distance is too wide versus the ATR limit for this review profile.",
    technical: "SL distance above max ATR multiple.",
    severity: "warning",
    category: "risk",
  },
  SCORE_BELOW_MINIMUM: {
    simple: "Setup score is below the minimum for trade-ready classification.",
    technical: "Score below minScoreTrade threshold.",
    severity: "warning",
    category: "score",
  },
  NEAR_SWEEP_NOT_TRADE_READY: {
    simple: "Only a near liquidity touch — confirmed sweep is required for trade-ready here.",
    technical: "Near sweep without allowNearSweepTradeReady.",
    severity: "info",
    category: "zone",
  },
  TRADE_READY_REVIEW_ONLY: {
    simple: "Setup can be reviewed manually.",
    technical: "Review-only trade-ready state.",
    severity: "success",
    category: "confirmation",
  },
  REFERENCE_ENTRY_FALLBACK_MIDPOINT: {
    simple: "Reference entry fell back to zone midpoint (no confirmation close).",
    technical: "Reference entry fallback to midpoint.",
    severity: "info",
    category: "system",
  },
};

/** Hard-gate codes may appear as synthetic reason `code` from core edge paths. */
const HARD_GATE_PRESENTATION: Partial<Record<TradePlanHardGate, ReasonPresentation>> = {
  SYMBOL_PROFILE_MISSING: PRESENTATION.MISSING_SYMBOL_PROFILE!,
  RR_BELOW_MINIMUM: PRESENTATION.RR_BELOW_MINIMUM!,
  SPREAD_ABOVE_MAX: PRESENTATION.SPREAD_TOO_HIGH!,
  SPREAD_NOT_ALLOWED: PRESENTATION.SPREAD_NOT_ALLOWED!,
  DAILY_DRAWDOWN_BLOCKED: PRESENTATION.ACCOUNT_BLOCKED_DAILY_DRAWDOWN!,
  MAX_DRAWDOWN_BLOCKED: PRESENTATION.ACCOUNT_BLOCKED_MAX_DRAWDOWN!,
  MAX_TRADES_REACHED: PRESENTATION.ACCOUNT_MAX_TRADES!,
  NEWS_BLACKOUT: PRESENTATION.ACCOUNT_NEWS_BLACKOUT!,
  PROP_FIRM_BLOCKED: PRESENTATION.ACCOUNT_PROP_BLOCKED!,
  PSYCHOLOGICAL_LOCK: PRESENTATION.ACCOUNT_PSYCHOLOGICAL_LOCK!,
  TRADE_REVIEW_NOT_ALLOWED: PRESENTATION.ACCOUNT_REVIEW_DISABLED!,
  OPERATIONAL_STATUS_BLOCKS: PRESENTATION.OPERATIONAL_STATUS_BLOCKS!,
  ACCOUNT_ID_REQUIRED: PRESENTATION.ACCOUNT_ID_REQUIRED!,
  APPROVED_PARAMETER_SET_REQUIRED: PRESENTATION.PARAMETER_SET_NOT_APPROVED!,
  CONFIRMATION_ATR_MISSING: PRESENTATION.MISSING_ATR_FOR_PLAN!,
  SL_DISTANCE_ABOVE_MAX_ATR: PRESENTATION.SL_DISTANCE_TOO_WIDE!,
};

export function mapReasonCode(code: string): MappedReason {
  const known = PRESENTATION[code] ?? HARD_GATE_PRESENTATION[code as TradePlanHardGate];
  if (!known) {
    return {
      code,
      simple: "Review required.",
      technical: code,
      severity: "warning",
      category: "system",
    };
  }
  return {
    code,
    simple: known.simple,
    technical: known.technical,
    severity: known.severity,
    category: known.category,
  };
}

const STATUS_NARRATIVE: Record<
  TradePlanStatus,
  { title: string; headline: string; whatItMeans: string; whatToDoNow: string; actionLabel: string }
> = {
  NO_TRADE: {
    title: "Do not trade",
    headline: "Do not trade.",
    whatItMeans:
      "The review pipeline does not support taking this setup as-is: a hard gate or account rule is failing.",
    whatToDoNow: "Stand down on this symbol until the blocking condition clears or the setup changes.",
    actionLabel: "No entry",
  },
  OBSERVE: {
    title: "Observe only",
    headline: "Interesting area, but not enough for trade review.",
    whatItMeans:
      "The zone exists but score, liquidity context, or other filters keep it below trade-ready classification.",
    whatToDoNow: "Watch price behaviour; wait for a stronger alignment of score and gates before manual review.",
    actionLabel: "Watch only",
  },
  WAIT_RETEST: {
    title: "Wait for retest",
    headline: "Zone exists. Waiting for price to return to the zone.",
    whatItMeans: "The idea is on the map, but price has not yet touched the defined retest condition.",
    whatToDoNow: "Do not enter early; wait until price actually retests the zone per your playbook.",
    actionLabel: "Wait for retest",
  },
  WAIT_CONFIRMATION: {
    title: "Wait for confirmation",
    headline: "Zone was reached. Waiting for confirmation.",
    whatItMeans:
      "A retest occurred, but the post-retest confirmation signal required by the review model is not present yet.",
    whatToDoNow: "Wait for your confirmation definition (e.g. close back inside the zone) before considering manual review.",
    actionLabel: "Wait for confirmation",
  },
  TRADE_READY: {
    title: "Manual review",
    headline: "Setup is ready for manual review.",
    whatItMeans:
      "Core hard gates and score thresholds pass for this mock evaluation — this is still not an order or automation signal.",
    whatToDoNow:
      "Open your own checklist: verify context, execution risk, and prop rules outside this dashboard before any manual action.",
    actionLabel: "Review manually",
  },
  INVALIDATED: {
    title: "Invalidated",
    headline: "This idea is invalidated.",
    whatItMeans: "Price has violated the invalidation side relative to this zone direction.",
    whatToDoNow: "Archive this idea and look for a fresh structure; do not treat this zone as active.",
    actionLabel: "Discard idea",
  },
  EXPIRED: {
    title: "Expired",
    headline: "This idea expired.",
    whatItMeans: "The zone passed its time-to-live or expiry rules used in the review model.",
    whatToDoNow: "Do not chase this level; wait for a newly detected zone if your process allows.",
    actionLabel: "Let it go",
  },
  USED: {
    title: "Already used",
    headline: "This idea was already used.",
    whatItMeans: "The lifecycle marks this zone as consumed — duplicate entries are discouraged.",
    whatToDoNow: "Do not re-use the same zone tag; track a new setup if price gives one.",
    actionLabel: "No repeat",
  },
};

/** Short UI title for a core review status (no I/O). */
export function tradeReviewStatusTitle(status: TradePlanStatus): string {
  return STATUS_NARRATIVE[status]?.title ?? status;
}

function dedupeMapped(list: MappedReason[]): MappedReason[] {
  const seen = new Set<string>();
  const out: MappedReason[] = [];
  for (const m of list) {
    if (seen.has(m.code)) continue;
    seen.add(m.code);
    out.push(m);
  }
  return out;
}

function isBlockingMapped(m: MappedReason): boolean {
  return m.severity === "danger" || m.severity === "warning";
}

function buildRiskSummary(
  status: TradePlanStatus,
  failedHardGates: TradePlanHardGate[],
  blocking: MappedReason[],
): string {
  if (status === "TRADE_READY") {
    return "Risk gates passed for this evaluation profile; still verify live account and firm rules yourself.";
  }
  if (blocking.length > 0) {
    const accountish = blocking.filter((b) => b.category === "account" || b.category === "risk");
    if (accountish.length > 0) {
      return accountish.map((b) => b.simple).join(" ");
    }
    return blocking.map((b) => b.simple).join(" ");
  }
  if (failedHardGates.length > 0) {
    return failedHardGates.map((g) => mapReasonCode(g).simple).join(" ");
  }
  if (status === "WAIT_RETEST" || status === "WAIT_CONFIRMATION") {
    return "No account hard-fail yet — main gap is lifecycle / confirmation, not risk math in this mock.";
  }
  return "No extra risk summary — see status and reasons above.";
}

function buildMissingRequirements(status: TradePlanStatus, reasons: MappedReason[]): string[] {
  const out: string[] = [];
  if (status === "WAIT_RETEST") {
    out.push(PRESENTATION.WAITING_FOR_RETEST!.simple);
  }
  if (status === "WAIT_CONFIRMATION") {
    out.push(PRESENTATION.WAITING_FOR_CONFIRMATION!.simple);
  }
  if (status === "OBSERVE") {
    const score = reasons.find((r) => r.code === "SCORE_BELOW_MINIMUM");
    if (score) out.push("Below score threshold for trade-ready.");
    const near = reasons.find((r) => r.code === "NEAR_SWEEP_NOT_TRADE_READY");
    if (near) out.push("Needs confirmed sweep (near sweep only).");
    if (!score && !near) out.push("Conditions for promotion to trade-ready are not met.");
  }
  if (status === "NO_TRADE") {
    const riskBlock = reasons.filter(
      (r) =>
        r.category === "account" ||
        r.category === "risk" ||
        r.category === "spread" ||
        r.code === "PARAMETER_SET_NOT_APPROVED",
    );
    for (const r of riskBlock) {
      if (!out.includes(r.simple)) out.push(r.simple);
    }
  }
  return out;
}

function buildSimpleSummary(
  status: TradePlanStatus,
  planSummary: string,
  primaryBlock: string | undefined,
): string {
  const head = STATUS_NARRATIVE[status]?.headline ?? planSummary;
  if ((status === "NO_TRADE" || status === "OBSERVE") && primaryBlock) {
    return `${head} ${primaryBlock}`;
  }
  if (status === "TRADE_READY") {
    return `${head} This app does not execute orders — manual review only.`;
  }
  return head;
}

/**
 * Derive a full `TradeReviewExplanation` from a core evaluation result (pure).
 */
export function buildTradeReviewExplanation(evaluation: TradePlanEvaluationResult): TradeReviewExplanation {
  const { plan, failedHardGates } = evaluation;
  const status = plan.status;
  const narrative = STATUS_NARRATIVE[status];

  const fromNoTrade = plan.noTradeReasons.map((r) => mapReasonCode(r.code));
  const fromReasons = plan.reasons.map((r) => mapReasonCode(r.code));
  const fromGates = failedHardGates.map((g) => mapReasonCode(g));

  const technicalReasons = dedupeMapped([...fromReasons, ...fromNoTrade, ...fromGates]);

  const blockingReasons = dedupeMapped([
    ...fromNoTrade.filter(isBlockingMapped),
    ...fromReasons.filter((m) => isBlockingMapped(m) && m.code !== "ZONE_VALID"),
  ]);

  const positiveReasons = dedupeMapped(
    fromReasons.filter((m) => m.severity === "success" || m.code === "ZONE_VALID"),
  );

  const primaryBlock = fromNoTrade[0]?.simple ?? blockingReasons[0]?.simple;

  const missingRequirements = buildMissingRequirements(status, fromReasons);

  const riskSummary = buildRiskSummary(status, failedHardGates, blockingReasons);

  return {
    status,
    simpleTitle: narrative.title,
    simpleSummary: buildSimpleSummary(status, plan.simpleSummary, primaryBlock),
    actionLabel: narrative.actionLabel,
    whatItMeans: narrative.whatItMeans,
    whatToDoNow: narrative.whatToDoNow,
    missingRequirements,
    blockingReasons,
    positiveReasons,
    technicalReasons,
    riskSummary,
    manualReviewOnly: true,
  };
}

/** Short lines for compact lists (Home strip): at most `max` human lines. */
export function explanationMainReasonLines(explanation: TradeReviewExplanation, max = 2): string[] {
  if (explanation.status === "TRADE_READY") {
    const lines = explanation.positiveReasons
      .filter((p) => p.code === "TRADE_READY_REVIEW_ONLY" || p.code === "ZONE_VALID")
      .map((p) => p.simple);
    return lines.slice(0, max);
  }
  if (explanation.blockingReasons.length > 0) {
    return explanation.blockingReasons.slice(0, max).map((b) => b.simple);
  }
  if (explanation.missingRequirements.length > 0) {
    return explanation.missingRequirements.slice(0, max);
  }
  const parts = explanation.simpleSummary
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return [explanation.simpleSummary].slice(0, max);
  }
  return parts.slice(0, max).map((p) => (p.endsWith(".") ? p : `${p}.`));
}
