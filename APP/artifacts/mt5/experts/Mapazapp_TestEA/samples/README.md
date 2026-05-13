# Mapazapp_TestEA — static samples (fictional)

These files mirror the **E3.4.2** export shape from **`Mapazapp_TestEA.mq5`** (`schema_version: backtest_ea_v1`):

- **`backtest_trades.csv`** — **header only** (no data rows; no synthetic trades).
- **`backtest_summary.json`** — summary flags and bias counters for tooling checks.

They are **not** output from a real Strategy Tester run. **Do not** commit raw tester exports from live accounts.

**Related:** `@workspace/mapazapp-core` `validateTestEaExportSample` (supports `MZP_TESTEA_V1` fixtures in-memory and `backtest_ea_v1` bundles), `importBacktestTradesFromCsv` (header-only CSV → zero trades + `CSV_HEADER_ONLY_NO_TRADE_ROWS` warning).
