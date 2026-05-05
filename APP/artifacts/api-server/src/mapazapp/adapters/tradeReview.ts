import type { AccountId } from "@workspace/mapazapp-core";
import { getAccountGuardEvaluation, getTradeReviewPlanByZoneId, listTradeReviewPlansForAccount } from "../lib/tradeReviewLogic";

export function tradeReviewsForAccount(accountId: AccountId) {
  return listTradeReviewPlansForAccount(accountId);
}

export function tradeReviewForZone(accountId: AccountId, zoneId: string) {
  return getTradeReviewPlanByZoneId(accountId, zoneId);
}

export function guardForAccount(accountId: AccountId) {
  return getAccountGuardEvaluation(accountId);
}
