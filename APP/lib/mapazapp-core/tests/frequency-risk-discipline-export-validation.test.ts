import { describe, expect, it } from "vitest";
import {
  FREQUENCY_RISK_DISCIPLINE_OPTIMIZATION_PARAMETER_KEYS,
  buildFrequencyRiskDisciplineSummaryPlaceholders,
} from "../src/frequency-risk-discipline-export-keys";
import { validateTestEaExportSample } from "../src/export-sample-validation";
import { importBacktestTradesFromCsv } from "../src/backtest-importer";

describe("Frequency / Risk / Discipline export validation E5.17", () => {
  it("bundle without has_frequency_risk_discipline_v1_logic stays valid", () => {
    const summary = {
      schema_version: "backtest_ea_v1",
      official_ea: "Mapazapp_TestEA",
      backtest_role: true,
      tester_only: true,
      has_real_ifvg_logic: true,
      has_full_ifvg_pipeline: false,
      has_real_daily_bias_logic: true,
      has_real_trading_orders: false,
      has_real_virtual_trade_logic: true,
      trade_count: 0,
      virtual_trade_count: 0,
    };
    const r = validateTestEaExportSample({
      bundleKind: "testea_export_bundle",
      files: [{ fileName: "backtest_summary.json", text: JSON.stringify(summary) }],
      privacyMode: "relaxed",
    });
    expect(r.status).not.toBe("invalid");
  });

  it("sample with full discipline placeholders validates", () => {
    const placeholders = buildFrequencyRiskDisciplineSummaryPlaceholders();
    const summary = {
      schema_version: "backtest_ea_v1",
      official_ea: "Mapazapp_TestEA",
      backtest_role: true,
      tester_only: true,
      has_real_ifvg_logic: true,
      has_full_ifvg_pipeline: false,
      has_real_daily_bias_logic: true,
      has_real_trading_orders: false,
      has_real_virtual_trade_logic: true,
      trade_count: 0,
      virtual_trade_count: 0,
      optimization_parameters: Object.fromEntries(
        FREQUENCY_RISK_DISCIPLINE_OPTIMIZATION_PARAMETER_KEYS.map((k) => [
          k,
          k.includes("enabled") ? true : k.includes("r") ? -2 : 0,
        ]),
      ),
      ...placeholders,
    };
    const r = validateTestEaExportSample({
      bundleKind: "testea_export_bundle",
      files: [{ fileName: "backtest_summary.json", text: JSON.stringify(summary) }],
      privacyMode: "relaxed",
    });
    const discErrors = r.diagnostics.filter((d) => d.code.startsWith("TESTEA_SUMMARY_DISC"));
    expect(discErrors).toEqual([]);
    expect(r.status).not.toBe("invalid");
  });

  it("importer parses optional discipline fields", () => {
    const hdr =
      "trade_id,direction,entry_time,exit_time,entry,sl,tp,exit_price,result_r,result_money,outcome,bars_to_fill,bars_held,frequency_risk_discipline_enabled,discipline_trade_date,discipline_session_bucket,discipline_trades_so_far_today,discipline_trades_so_far_session,discipline_closed_r_so_far_today,discipline_consecutive_losses_before_trade,discipline_consecutive_wins_before_trade,discipline_bars_since_last_trade,discipline_bars_since_last_loss,discipline_daily_trade_limit_reached,discipline_session_trade_limit_reached,discipline_max_consecutive_losses_reached,discipline_daily_loss_limit_reached,discipline_daily_profit_protect_reached,discipline_cooldown_after_loss_active,discipline_cooldown_after_trade_active,discipline_overtrading_risk,discipline_revenge_trade_risk,discipline_profit_giveback_risk,discipline_trade_result_r,discipline_closed_r_after_trade_today,discipline_consecutive_losses_after_trade,discipline_consecutive_wins_after_trade,discipline_daily_trade_sequence,discipline_session_trade_sequence,discipline_score,discipline_grade,discipline_reasons";
    const row =
      "t1,BUY,2026-01-10T12:00:00Z,2026-01-10T14:00:00Z,2000,1990,2100,2100,2,0,win,2,5,true,2026-01-10,london,1,1,0.5,0,1,3,2,false,false,false,false,false,false,false,false,false,false,2,0.5,0,1,2,1,10,B,discipline_trade_count_ok";
    const r = importBacktestTradesFromCsv(`${hdr}\n${row}`, {
      strategyId: "MZP_TESTEA",
      parameterSetId: "default",
      canonicalSymbol: "XAUUSD",
      brokerSymbol: "XAUUSD",
      accountId: "disc-import",
      sourceType: "mapazapp_testea_csv",
      datasetSplit: "train",
    });
    expect(r.ok).toBe(true);
    expect(r.trades[0]?.disciplineScore).toBe(10);
    expect(r.trades[0]?.disciplineOvertradingRisk).toBe(false);
  });
});
