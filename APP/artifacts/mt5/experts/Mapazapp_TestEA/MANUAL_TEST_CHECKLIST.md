# Mapazapp_TestEA — Manual Strategy Tester handoff (Checkpoint 14)

**Scope:** virtual export-only EA for **MetaTrader 5 Strategy Tester**. **Not** BridgeEA. **Not** live trading. **Not** command ingest.

**Repo source of truth:** `APP/artifacts/mt5/experts/Mapazapp_TestEA/Mapazapp_TestEA.mq5`

---

## 1. Files to copy

| Source (repo) | Destination on MT5 machine |
|---------------|----------------------------|
| `Mapazapp_TestEA.mq5` | `<Terminal Data>\MQL5\Experts\Mapazapp\Mapazapp_TestEA.mq5` |

Create **`MQL5\Experts\Mapazapp\`** if missing. Keep **`README.md`**, **`EXPORT_CONTRACT.md`**, this checklist, and **`samples/`** nearby for testers (optional).

---

## 2. Compile (MetaEditor)

1. Open **MetaEditor** (F4 from MT5).
2. Open **`Mapazapp_TestEA.mq5`** under **`MQL5\Experts\Mapazapp\`**.
3. **Compile** (F7).
4. Record **0 errors** (ideal) or exact messages.

**Repo audit expectation:** shipped source has **no** executable **`OrderSend`**, **`OrderClose`**, **`PositionClose`**, **`WebRequest`**, **`#import`**, **`#include <Trade/Trade.mqh>`**, **`trade.Buy`**, **`trade.Sell`**, **`PositionModify`**.

---

## 3. Live-chart guard (must fail attach)

1. Open a **live** or **demo** chart (not Strategy Tester).
2. Attach **Mapazapp_TestEA**.
3. **Expected:** init fails; Journal shows **`Mapazapp_TestEA is intended for Strategy Tester only.`**
4. **Expected:** **no** files written under **`Mapazapp\testea`** for that attach.

---

## 4. Strategy Tester setup

| Setting | Suggestion |
|---------|------------|
| **EA** | Mapazapp_TestEA |
| **Symbol** | Any symbol with history (e.g. major FX / XAUUSD variant available in tester) |
| **Period** | **H1** or **M15** (any supported period works; **`tester_period`** in JSON reflects chart period) |
| **Dates** | Range with enough bars (≥ **3** if testing placeholder row path) |
| **Model** | Any model acceptable for CP14 smoke (exact modelling is **not** validated here) |
| **Optimization** | For genetic runs, set explicit **`InpRunId`** per pass if you need distinct folders (auto ids include time/tick suffix). |

---

## 5. Inputs (first smoke)

| Input | First-test value |
|-------|------------------|
| `InpSchemaVersion` | `MZP_TESTEA_V1` |
| `InpStrategyId` | `MZP_IFVG_ZONE_REACTION_V1` |
| `InpParameterSetId` | `MZP_IFVG_XAUUSD_V1_SET_003` |
| `InpCanonicalSymbol` | Match registry intent (e.g. `XAUUSD`) |
| `InpAccountId` | `TESTER_ACCOUNT` |
| `InpExportRoot` | `Mapazapp\testea` |
| `InpRunId` | *(empty)* for auto id, or a short alphanumeric id |
| `InpDatasetSplit` | `validation` |
| `InpWriteTradesCsv` | `true` |
| `InpWriteSummaryJson` | `true` |
| `InpExportSignalsOnly` | `true` |
| `InpMaxBars` | `0` or `500` |

---

## 6. Expected output path

From **File → Open Data Folder**:

```text
MQL5\Files\Mapazapp\testea\<run_id>\
```

`<run_id>` = **`InpRunId`** (sanitized) or auto **`TESTEA_<symbol>_YYYYMMDD_HHMMSS_<suffix>`**.

---

## 7. Expected files

| File | Check |
|------|--------|
| `backtest_trades.csv` | Header row present; **0 or ≥1** data rows |
| `backtest_summary.json` | Parseable JSON; **`execution_mode`** = **`virtual_export_only`**, **`live_trading_enabled`** = **false** |

---

## 8. Smoke checks

- [ ] Compile **0 errors**.
- [ ] Strategy Tester run completes without EA-init failure.
- [ ] Export folder exists under **`MQL5\Files\Mapazapp\testea\<run_id>\`**.
- [ ] **`backtest_trades.csv`** headers match **`EXPORT_CONTRACT.md`** (snake_case).
- [ ] With **`InpExportSignalsOnly=true`** and ≥3 bars: **one** placeholder **BUY** row with **`PLACEHOLDER_VIRTUAL_SKELETON_NOT_IFVG`** (unless you disabled signals).
- [ ] **`trade_count`** in JSON matches CSV data row count.
- [ ] **Toolbox → Trade** unchanged (EA does not submit orders).

---

## 9. Optional TypeScript validation (local dev machine)

Do **not** commit raw tester CSVs. Copy **text** only and run **`importBacktestTradesFromCsv`** from **`@workspace/mapazapp-core`** with:

- `sourceType: "mapazapp_testea_csv"`
- `datasetSplit` aligned with **`InpDatasetSplit`**
- `runId` aligned with export folder when importing

Fictional fixture: **`samples/backtest_trades.csv`** in this folder.

---

## 10. What to send back (sanitized)

1. MetaEditor compile line count / errors.
2. Strategy Tester symbol + period + **model name** (no account login).
3. List of files under **`...\testea\<run_id>\`** with sizes.
4. **First 8 lines** of **`backtest_trades.csv`** only (header + few rows).
5. Full **`backtest_summary.json`** (small; should contain **no** live secrets if inputs stayed generic).

---

## 11. Safety scan checklist (source file)

Run **case-sensitive** search on **`Mapazapp_TestEA.mq5`**:

| Pattern | Expected |
|---------|----------|
| `OrderSend` | Not found as code |
| `OrderClose` | Not found |
| `PositionClose` | Not found |
| `trade.Buy` / `trade.Sell` | Not found |
| `PositionModify` | Not found |
| `WebRequest` | Not found |
| `#import` | Not found |
| `#include <Trade/Trade.mqh>` | Not found |
| `CTrade` | Not found |

---

## 12. Troubleshooting

| Symptom | Likely cause | Try |
|---------|----------------|-----|
| Init failed on tester | Wrong schema string | Set **`InpSchemaVersion=MZP_TESTEA_V1`** |
| No export folder | Run stopped before `OnDeinit` | Let test complete; check Journal path printed at init |
| CSV header only | **`InpExportSignalsOnly=false`** or `<3` bars | Toggle inputs / widen date range |
| Cannot find files | Wrong terminal data folder | **Open Data Folder** for the **same** terminal profile |

---

## Quick reference — core importer

`APP/lib/mapazapp-core/src/backtest-importer.ts` — **`importBacktestTradesFromCsv`**, **`assembleBacktestRunFromImportedTrades`**.
