import type { TradePlanStatus } from "@workspace/mapazapp-core";
import type { TradeReviewPlanRow } from "./tradeReviewDataSource";
import { buildTradeReviewExplanation, tradeReviewStatusTitle } from "./tradeReviewExplanation";

/** One-line reason for Simple view (prefer explicit no-trade / blocking copy). */
export function primaryReviewMessage(row: TradeReviewPlanRow): string {
  const ex = buildTradeReviewExplanation(row.evaluation);
  return ex.blockingReasons[0]?.simple ?? ex.missingRequirements[0] ?? ex.simpleSummary;
}

/** Short status label — same titles as the explanation layer. */
export function simpleLanguageForReviewStatus(status: TradePlanStatus): string {
  return tradeReviewStatusTitle(status);
}
