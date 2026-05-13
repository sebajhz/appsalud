# Mapazapp_TestEA — Official Strategy Tester EA (E3.4.2+)

**`Mapazapp_TestEA`** is the **official MetaTrader 5 Strategy Tester** Expert Advisor for Mapazapp. It also fulfills the **BacktestEA role** (setup proof, Daily Bias, evidence export) in a **single** EA — see [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](../../../mapazapp/docs/MAPAZAPP_PROJECT_EXECUTION_GUIDE.md).

| Topic | Detail |
|-------|--------|
| **Live chart** | **Do not** use on live charts — `OnInit` returns **`INIT_FAILED`** unless `MQLInfoInteger(MQL_TESTER) != 0`. |
| **Trading** | **No** `OrderSend`, **no** `CTrade`, **no** broker orders (E3.4.2). |
| **Daily Bias** | **V1 implemented** — last closed bar on `InpDailyBiasTimeframe`; events in `backtest_events.csv`; see [`BACKTESTEA_DAILY_BIAS_V1_E3_4.md`](../../../mapazapp/docs/BACKTESTEA_DAILY_BIAS_V1_E3_4.md). |
| **IFVG / Setup V1** | **Pending E3.5** — no real IFVG detection yet. |
| **Exports** | `backtest_trades.csv` (**header only**, no synthetic trade rows), `backtest_events.csv`, `backtest_summary.json` under `MQL5\Files\<InpExportRoot>\<run_id>\` (default `Mapazapp\TestEA`). |
| **Schema** | Default `InpSchemaVersion = backtest_ea_v1` (summary JSON). |
| **Other official EA** | **`Mapazapp_BridgeEA`** — separate, **read-only** live bridge; not for Strategy Tester setup proof. |
| **Legacy artifact** | **`Mapazapp_BacktestEA`** (E3.3–E3.4) was a **temporary** duplicate; logic **merged here** in **E3.4.2** and the folder **removed** from the repo (history remains in Git). |

**Manual handoff:** [`MANUAL_TEST_CHECKLIST.md`](./MANUAL_TEST_CHECKLIST.md) (may still mention older CP14 schema in places — prefer this README + `EXPORT_CONTRACT.md` for E3.4.2).  
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
2. Compile in **MetaEditor** (F7).
3. Run only in **Strategy Tester** with a symbol/time range that provides closed bars for the bias timeframe.

Evidence CSV/JSON is written on **`OnDeinit`** (end of test pass) using atomic temp + `FileMove`, same pattern as BridgeEA.
