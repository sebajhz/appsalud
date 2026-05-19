import { describe, expect, it } from "vitest";
import { analyzeTestEaScoreCalibrationFromTexts } from "../src/testea-score-calibration";

const BASE_HDR =
  "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,score_total,entry_quality_grade,htf_narrative_score,liquidity_event_score,displacement_fvg_quality_score,entry_confirmation_score,target_quality_score,session_news_spread_score,risk_overtrading_score,ambiguous_risk_score,missing_quality_components";

describe("discipline_score calibration E5.17", () => {
  it("exposes discipline_component_stats when column present", () => {
    const csv = `${BASE_HDR},discipline_score\n` +
      "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2100,2100,2,0,win,2,5,50,C,10,10,10,10,10,0,5,10,,12\n" +
      "t2,BUY,2026-01-10T15:00:00Z,2026-01-10T17:00:00Z,2000,1990,2100,2090,-1,0,loss,2,5,40,C,10,10,10,10,10,0,5,10,,6\n";
    const r = analyzeTestEaScoreCalibrationFromTexts({
      bundleName: "disc",
      summaryJsonText: JSON.stringify({
        trade_count: 2,
        has_entry_quality_score_logic: true,
      }),
      tradesCsvText: csv,
    });
    expect(r.discipline_component_stats?.discipline_score?.average).toBe(9);
  });
});
