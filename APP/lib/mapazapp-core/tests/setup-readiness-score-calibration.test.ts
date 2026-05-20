import { describe, expect, it } from "vitest";
import { analyzeTestEaScoreCalibrationFromTexts } from "../src/testea-score-calibration";

const BASE_HDR =
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,score_total,entry_quality_grade,htf_narrative_score,liquidity_event_score,displacement_fvg_quality_score,entry_confirmation_score,target_quality_score,session_news_spread_score,risk_overtrading_score,ambiguous_risk_score,missing_quality_components";

describe("setup_readiness_score calibration E5.18", () => {
  it("exposes setup_readiness_component_stats when CSV includes setup_readiness_score", () => {
    const csv = `${BASE_HDR},setup_readiness_score\n` +
      "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2100,2100,2,0,win,2,5,50,C,10,10,10,10,10,0,5,10,,75\n" +
      "t2,BUY,2026-01-10T15:00:00Z,2026-01-10T17:00:00Z,2000,1990,2100,2090,-1,0,loss,2,5,40,C,10,10,10,10,10,0,5,10,,55";
    const summary = JSON.stringify({
      trade_count: 2,
      has_entry_quality_score_logic: true,
    });
    const r = analyzeTestEaScoreCalibrationFromTexts({
      bundleName: "ready-cal",
      summaryJsonText: summary,
      tradesCsvText: csv,
    });
    expect(r.setup_readiness_component_stats?.setup_readiness_score?.average).toBe(65);
  });
});
