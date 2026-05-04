import type { AccountId, TradePlanEvaluationResult } from "@workspace/mapazapp-core";
import type { AccountDataSource } from "./accountDataSource";
import type { Alert, Zone } from "@/mock/types";

/** One mock zone plus its core evaluation (review-only). */
export interface TradeReviewPlanRow {
  zone: Zone;
  evaluation: TradePlanEvaluationResult;
}

/**
 * In-process mock dashboard API — no HTTP, no persistence.
 * Checkpoint 4: wires mock zones through `evaluateTradeReviewPlan`.
 */
export interface DashboardMockDataSource extends AccountDataSource {
  getZonesForAccount(accountId: AccountId): Zone[];
  getTradeReviewPlansForAccount(accountId: AccountId): TradeReviewPlanRow[];
  getTradeReviewPlanByZoneId(accountId: AccountId, zoneId: string): TradeReviewPlanRow | undefined;
  getAlertsForAccount(accountId: AccountId): Alert[];
}
