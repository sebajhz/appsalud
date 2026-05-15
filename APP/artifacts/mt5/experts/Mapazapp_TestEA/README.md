# Mapazapp_TestEA — Official Strategy Tester EA (E3.6–E5.10)

**`Mapazapp_TestEA`** is the **official MetaTrader 5 Strategy Tester** Expert Advisor for Mapazapp. It also fulfills the **BacktestEA role** (setup proof, Daily Bias, IFVG candidate detection, evidence export) in a **single** EA — see [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](../../../mapazapp/docs/MAPAZAPP_PROJECT_EXECUTION_GUIDE.md).

| Topic | Detail |
|-------|--------|
| **Live chart** | **Do not** use on live charts — `OnInit` returns **`INIT_FAILED`** unless `MQLInfoInteger(MQL_TESTER) != 0`. |
| **Trading** | **No** `OrderSend`, **no** `CTrade`, **no** broker orders. **E5.3–E5.4.1:** optional **virtual trade simulation** writes **CSV rows** and `virtual_trade_*` events; `has_real_trading_orders` remains **false**; `trade_count` matches exported rows; **`virtual_trade_count`** matches counted candidates (parity with `trade_count` after E5.4.1). |
| **Liquidity sweep (E5.10)** | **Observation-only** PDH/PDL + local M15 swing sweep **context** before setup; exported columns + `liquidity_event_score`; **`has_liquidity_sweep_v1_logic: true`**; **no** hard gate, **no** session EQH/EQL in V1 — see [`LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md`](../../../mapazapp/docs/LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md). |
| **Daily Bias** | **V1** — last closed bar on `InpDailyBiasTimeframe`; events in `backtest_events.csv`; see [`BACKTESTEA_DAILY_BIAS_V1_E3_4.md`](../../../mapazapp/docs/BACKTESTEA_DAILY_BIAS_V1_E3_4.md). |
| **IFVG / Setup V1** | **E3.5–E3.6** — **FVG candidate detection** on `InpExecutionTimeframe` (three closed bars, same geometry as core `fvg-detector.ts`); **Daily Bias gate** on long/short; events `setup_detected`, `setup_allowed`, `setup_rejected`, `setup_skipped`; **`has_real_ifvg_logic: true`** means **candidate detection present**; **`has_full_ifvg_pipeline: false`** (E3.6). **E5.3–E5.4.1** — virtual outcome on closed execution candles with **geometry / minimum FVG / deinit cleanup** — see [`TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md`](../../../mapazapp/docs/TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md) and [`TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md`](../../../mapazapp/docs/TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md). No FVG→IFVG conversion pipeline in the EA yet. Spec: [`BACKTESTEA_IFVG_SETUP_V1_E3_5.md`](../../../mapazapp/docs/BACKTESTEA_IFVG_SETUP_V1_E3_5.md), export schema: [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](../../../mapazapp/docs/BACKTESTEA_EXPORT_SCHEMA_E3_6.md). |
| **Exports** | `backtest_trades.csv` (header + optional **virtual** data rows), `backtest_events.csv`, `backtest_summary.json` under `MQL5\Files\<InpExportRoot>\<run_id>\` (default `Mapazapp\TestEA`) when **`InpOptimizationSafeExports=false`** (legacy). When **`InpOptimizationSafeExports=true` (E5.5.0.5):** `MQL5\Files\<InpExportRoot>\<InpExportCampaignFolder>\<InpExportParameterFolder>_FVG{n}_RR{x}_…\` — short **physical** folders; full **`campaign_id`**, **`parameter_set_id`**, **`strategy_id`** remain in JSON — see [`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](../../../mapazapp/docs/TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md). |
| **Schema** | Default `InpSchemaVersion = backtest_ea_v1` (summary JSON). |
| **Other official EA** | **`Mapazapp_BridgeEA`** — separate, **read-only** live bridge; not for Strategy Tester setup proof. |
| **Legacy artifact** | **`Mapazapp_BacktestEA`** (E3.3–E3.4) was **temporary**; merged in **E3.4.2** and removed from the tree (Git history preserved). |

**Manual handoff:** [`MANUAL_TEST_CHECKLIST.md`](./MANUAL_TEST_CHECKLIST.md) (may still mention older CP14 schema in places — prefer this README + `EXPORT_CONTRACT.md` for current TestEA).  
**Wire format:** [`EXPORT_CONTRACT.md`](./EXPORT_CONTRACT.md)  
**Samples (fictional):** [`samples/`](./samples/)

---

## Security posture

- **Tester-only** — fail-closed outside Strategy Tester.
- **No live trading** — no orders, no profitability claims from exports.
- **No** inbound command files, **no** `WebRequest`, **no** execution hooks toward Mapazapp at runtime.

---

## Operator notes

1. Copy **`Mapazapp_TestEA.mq5`** into the terminal’s `MQL5\Experts\Mapazapp\` (or your layout).
2. Compile in **MetaEditor** (F7) as **`MZP_TestEA_E5_10_0`**.
3. Run only in **Strategy Tester** with a symbol/time range that provides closed bars for the bias and execution timeframes.
4. For **E5.5 / E5.5.1** inputs, prefer loading a **preset** from [`presets/`](./presets/) (see **E5.5 defaults and presets** below) instead of hand-editing every field.

---

## E5.5 defaults and presets

- **Compile** build **`MZP_TestEA_E5_10_0`** (see `TESTEA_BUILD` in `Mapazapp_TestEA.mq5`).
- **Single run (no optimization)** — validate export writing under optimization-safe paths: copy [`presets/Mapazapp_TestEA_E5_5_single_safe_export.set`](./presets/Mapazapp_TestEA_E5_5_single_safe_export.set) to your terminal `MQL5\Presets\` (or load from repo path in MetaEditor if you open it from disk), then in Strategy Tester → **Inputs** → **Load** → pick that file. It sets `InpOptimizationSafeExports=true`, `InpAutoBuildRunIdFromParams=true`, full campaign / strategy / parameter set ids, **`InpExportCampaignFolder=E55`**, **`InpExportParameterFolder=SET001`**, and `InpRunId=TEST_SAFE_EXPORT_SINGLE_C`.
- **Optimization (E5.5.1 FVG sweep)** — load [`presets/Mapazapp_TestEA_E5_5_optimization_fvg_sweep.set`](./presets/Mapazapp_TestEA_E5_5_optimization_fvg_sweep.set). **Only** enable the **Optimization** checkbox (and Start/Step/Stop) for **`InpVirtualMinTradeFvgPoints`**: Value **2**, Start **2**, Step **8**, Stop **50**. The preset also includes an `InpVirtualMinTradeFvgPoints||2|2|8|50|1` line for terminals that honor optimization metadata in `.set` files; if your build ignores it, set that range manually in the Inputs grid.
- **Keep fixed (do not optimize):** `InpOptimizationSafeExports=true`, `InpAutoBuildRunIdFromParams=true`, `InpCampaignId`, `InpStrategyId`, `InpParameterSetId`, `InpExportCampaignFolder`, `InpExportParameterFolder`, and the rest of the sweep defaults — **do not** add `InpOptimizationSafeExports` to the optimization matrix.
- **MQL5 Cloud:** not supported in this workflow yet; use **local agents** only.

**Expected safe-export leaf path (defaults):**  
`Mapazapp\TestEA\E55\SET001_FVG2_RR2_00_BIASBODY0_RALIGN1\`  
(with `backtest_summary.json`, `backtest_events.csv`, `backtest_trades.csv` inside the leaf folder).

Evidence CSV/JSON is written on **`OnDeinit`** (end of test pass) using atomic temp + `FileMove`, with a direct-write fallback (E5.5.0.3).
