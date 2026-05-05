import type { IfvgStrategySettings, ParameterSetCompatibilityResult } from "@workspace/mapazapp-core";

export type ParameterSetUiBadgeKind =
  | "trade_review_ok"
  | "alerts_only"
  | "draft_not_approved"
  | "blocked_account"
  | "symbol_mismatch"
  | "retired_rejected"
  | "unknown";

export function classifyParameterSetBadge(compat: ParameterSetCompatibilityResult): ParameterSetUiBadgeKind {
  if (compat.status === "rejected" || compat.status === "retired") return "retired_rejected";
  const blocks = compat.blockingReasons;
  if (blocks.includes("PARAMETER_SET_SYMBOL_MISMATCH") || blocks.includes("PARAMETER_SET_BROKER_SYMBOL_MISMATCH")) {
    return "symbol_mismatch";
  }
  if (blocks.includes("PARAMETER_SET_ACCOUNT_NOT_ALLOWED") || blocks.includes("PARAMETER_SET_ACCOUNT_BLOCKED")) {
    return "blocked_account";
  }
  if (compat.allowTradeReview) return "trade_review_ok";
  if (blocks.includes("PARAMETER_SET_ALERTS_ONLY")) return "alerts_only";
  if (
    blocks.includes("PARAMETER_SET_DRAFT") ||
    blocks.includes("PARAMETER_SET_NOT_VALIDATED") ||
    compat.status === "draft" ||
    compat.status === "tested_train" ||
    compat.status === "validated" ||
    compat.status === "approved_for_demo"
  ) {
    return "draft_not_approved";
  }
  return "unknown";
}

export function parameterSetBadgeLabel(kind: ParameterSetUiBadgeKind): string {
  switch (kind) {
    case "trade_review_ok":
      return "Approved for trade review";
    case "alerts_only":
      return "Alerts only";
    case "draft_not_approved":
      return "Draft / not approved";
    case "blocked_account":
      return "Blocked for this account";
    case "symbol_mismatch":
      return "Symbol mismatch";
    case "retired_rejected":
      return "Retired / rejected";
    default:
      return "Unknown / review";
  }
}

/** Simple-mode copy for the active account + symbol context. */
export function simpleParameterSetStory(compat: ParameterSetCompatibilityResult): string {
  if (compat.allowTradeReview) {
    return "This set can be used for manual trade review on this account when other core gates pass. TRADE_READY still requires lifecycle, score, spread, and account guard — never automatic execution.";
  }
  if (compat.blockingReasons.includes("PARAMETER_SET_ALERTS_ONLY")) {
    return "This set is alerts-only. It can help you observe, but it cannot generate TRADE_READY for trade review.";
  }
  if (
    compat.blockingReasons.includes("PARAMETER_SET_ACCOUNT_NOT_ALLOWED") ||
    compat.blockingReasons.includes("PARAMETER_SET_ACCOUNT_BLOCKED")
  ) {
    return "This set is not approved for this account (allow-list or block-list).";
  }
  if (
    compat.blockingReasons.includes("PARAMETER_SET_SYMBOL_MISMATCH") ||
    compat.blockingReasons.includes("PARAMETER_SET_BROKER_SYMBOL_MISMATCH")
  ) {
    return "Symbol or broker symbol does not match this parameter set.";
  }
  if (compat.status === "rejected" || compat.status === "retired") {
    return "This set is rejected or retired in the mock registry.";
  }
  return "This set is draft or not validated for trade review. It cannot produce TRADE_READY until promoted in governance (future checkpoints).";
}

export function tradeReadyPlainExplanation(compat: ParameterSetCompatibilityResult): string {
  if (compat.allowTradeReview) {
    return "Registry: trade review allowed — core may reach TRADE_READY only if zone lifecycle, score, spread, and account guard all pass.";
  }
  return `Registry: trade review blocked — ${compat.simpleSummary}`;
}

/** 5–8 high-signal settings for Simple view. */
export function summarizeIfvgSettingsSimple(settings: IfvgStrategySettings): Array<{ label: string; value: string }> {
  const tf = settings.context.timeframes;
  return [
    { label: "ATR period", value: String(settings.atrPeriod) },
    { label: "Direction TF", value: tf.directionTf },
    { label: "Swing bars (L/R)", value: `${settings.swing.swingLeftBars} / ${settings.swing.swingRightBars}` },
    { label: "Sweep tol × ATR", value: String(settings.sweep.sweepToleranceAtr) },
    { label: "Min displacement × ATR", value: String(settings.displacement.minDisplacementAtr) },
    { label: "FVG min size × ATR", value: String(settings.fvg.fvgMinSizeAtr) },
    { label: "IFVG break buffer × ATR", value: String(settings.ifvg.ifvgBreakBufferAtr) },
    { label: "Confirmation bars", value: String(settings.confirmation.confirmationBars) },
  ];
}

export function summarizeIfvgSettingsTechnical(settings: IfvgStrategySettings): Record<string, Record<string, string | number | boolean>> {
  return {
    context: {
      directionTf: settings.context.timeframes.directionTf,
      higherContextTf: settings.context.timeframes.higherContextTf,
      zoneTf: settings.context.timeframes.zoneTf,
      confirmationTf: settings.context.timeframes.confirmationTf,
      sweepTf: settings.context.timeframes.sweepTf,
      displacementTf: settings.context.timeframes.displacementTf,
      contextSwingLookback: settings.context.contextSwingLookback,
      middleZoneLowPct: settings.context.middleZoneLowPct,
      middleZoneHighPct: settings.context.middleZoneHighPct,
    },
    swing: { ...settings.swing },
    sweep: { ...settings.sweep },
    displacement: { ...settings.displacement },
    fvg: { ...settings.fvg },
    ifvg: { ...settings.ifvg },
    zone: { ...settings.zone },
    retest: { ...settings.retest },
    confirmation: { ...settings.confirmation },
    scoreRisk: { ...settings.scoreRisk },
  };
}
