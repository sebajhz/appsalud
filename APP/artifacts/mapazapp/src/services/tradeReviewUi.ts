import type { TradePlanStatus } from "@workspace/mapazapp-core";
import type { TradeReviewPlanRow } from "./tradeReviewDataSource";

/** One-line reason for Simple view (prefer explicit no-trade reasons). */
export function primaryReviewMessage(row: TradeReviewPlanRow): string {
  const p = row.evaluation.plan;
  const src = p.noTradeReasons.length > 0 ? p.noTradeReasons : p.reasons;
  return src[0]?.messageSimple ?? p.simpleSummary;
}

/** Plain-language line for Simple mode (no execution wording). */
export function simpleLanguageForReviewStatus(status: TradePlanStatus): string {
  switch (status) {
    case "TRADE_READY":
      return "Trade-ready for manual review only — no execution in this version.";
    case "WAIT_RETEST":
      return "Waiting for retest.";
    case "WAIT_CONFIRMATION":
      return "Waiting for confirmation.";
    case "OBSERVE":
      return "Observe — setup not sufficient for review-ready classification.";
    case "NO_TRADE":
      return "No trade review — blocked or not applicable.";
    case "INVALIDATED":
      return "Zone invalidated.";
    case "EXPIRED":
      return "Zone expired.";
    case "USED":
      return "Zone already used.";
    default:
      return status;
  }
}
