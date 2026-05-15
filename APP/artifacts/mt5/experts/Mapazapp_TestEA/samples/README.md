# Mapazapp_TestEA — static samples (fictional)

These files mirror the **E5.3 + E5.8 + E5.10 + E5.10.2** export shape from **`Mapazapp_TestEA.mq5`** (`schema_version: backtest_ea_v1`) — **fictional** bundle for CLI validation:

- **`backtest_trades.csv`** — header + **three** illustrative virtual rows (win / loss / expired_unfilled); **E5.8** Entry Quality Score columns; **E5.10** liquidity event columns; **E5.10.2** `liquidity_sweep_quality_*` columns; `result_money` column is **0** (no MT5 money model).
- **`backtest_events.csv`** — lifecycle + bias + setup + **virtual_trade_*** sample rows; `setup_allowed` / virtual events include **`eq_score=`** … and compact **`liq_q=`** liquidity quality suffix (observation metadata).
- **`backtest_summary.json`** — includes **`has_real_virtual_trade_logic: true`**, **`has_entry_quality_score_logic: true`**, **`has_liquidity_sweep_v1_logic: true`**, **`has_liquidity_sweep_quality_v1_logic: true`**, **`score_observation_only: true`**, **`score_gate_enabled: false`**, **`trade_count: 3`**, E5.3 counters/metrics, score aggregates, liquidity aggregates (E5.10 + E5.10.2), and **E5.5.0** optional fields (`campaign_id`, `optimization_safe_exports`, `effective_run_id`, `effective_export_folder_label`, `optimization_parameters`).
- **`MZP_E5_5_DOC_SAMPLE/default_FVG2_RR2_00_BIASBODY0_RALIGN1/`** — small **nested-folder** bundle (fictional) mirroring optimization-safe layout for CLI tests.

They are **not** output from a real Strategy Tester run. **Do not** commit raw tester exports from live accounts.

**Related:** [`EXPORT_CONTRACT.md`](../EXPORT_CONTRACT.md), [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](../../../mapazapp/docs/BACKTESTEA_EXPORT_SCHEMA_E3_6.md); `@workspace/mapazapp-core` `validateTestEaExportSample`, `parseBacktestEventsCsv`, `importBacktestTradesFromCsv` (header-only trades CSV → zero trades + `CSV_HEADER_ONLY_NO_TRADE_ROWS` warning).
