# Mapazapp_TestEA (Checkpoint 14)

**Mapazapp Checkpoint 14 — MT5 Strategy Tester export / virtual evidence only.**

Separate Expert Advisor from **`Mapazapp_BridgeEA` (CP13)**. This EA is intended to run **inside MetaTrader 5 Strategy Tester** and write **virtual** backtest evidence files compatible with **`@workspace/mapazapp-core`** **`importBacktestTradesFromCsv`** (Checkpoint 8).

| Topic | Detail |
|-------|--------|
| **Live chart** | **Do not** rely on this EA on live charts — `OnInit` fails unless `MQLInfoInteger(MQL_TESTER)` is true. |
| **Trading** | **No** `OrderSend`, **no** `CTrade`, **no** broker orders in CP14. |
| **Commands** | **No** inbound command files. |
| **Network / DLL** | **No** `WebRequest`, **no** `#import` DLLs. |
| **Registry** | **No** MT5-side registry mutation; Mapazapp approval remains **advisory** (`evaluateBacktestApproval`). |
| **Strategy logic** | **Placeholder skeleton only** — **not** the full IFVG engine; **not** a profitability claim. |

**Manual handoff:** **[MANUAL_TEST_CHECKLIST.md](./MANUAL_TEST_CHECKLIST.md)**  
**Wire format:** **[EXPORT_CONTRACT.md](./EXPORT_CONTRACT.md)**  
**Samples (fictional):** **[samples/](./samples/)**

---

## Outputs

Under **`MQL5\Files\<InpExportRoot>\<run_id>\`** (default root `Mapazapp\testea`):

| File | Purpose |
|------|---------|
| `backtest_trades.csv` | Trade rows for **`importBacktestTradesFromCsv`** |
| `backtest_summary.json` | Run metadata (not parsed by core importer yet) |

Writes use temp files + **`FileMove`** under the Files sandbox (same pattern as BridgeEA).

---

## Inputs (summary)

| Input | Default | Notes |
|-------|---------|--------|
| `InpSchemaVersion` | `MZP_TESTEA_V1` | Wire schema tag |
| `InpStrategyId` / `InpParameterSetId` | IFVG ids | Metadata / CSV columns — **not** auto-approval |
| `InpCanonicalSymbol` | `XAUUSD` | Canonical label for CSV |
| `InpAccountId` | `TESTER_ACCOUNT` | Tester label — **not** a live account assertion |
| `InpExportRoot` | `Mapazapp\testea` | Split on `\` / `/`, segments sanitized |
| `InpRunId` | *(empty)* | Auto-generated folder id if empty |
| `InpDatasetSplit` | `validation` | Echoed in JSON; align with CP8 `datasetSplit` when importing |
| `InpWriteTradesCsv` / `InpWriteSummaryJson` | `true` | Toggle outputs |
| `InpMagic` | `140013` | Reserved metadata — **no** orders in CP14 |
| `InpFixedRiskR` | `1.0` | Metadata echo — placeholder trade uses fixed **price** risk distance |
| `InpRrTarget` | `2.0` | Used to place virtual **TP** distance vs SL distance |
| `InpMaxBars` | `0` | `0` = min(`Bars()`, cap); else cap CopyRates depth |
| `InpExportSignalsOnly` | `true` | When `true` and enough bars, emit **one** deterministic placeholder row |

---

## Placeholder trade behaviour

When `InpExportSignalsOnly=true` and at least **3** bars are available from `CopyRates`, the EA emits **one** virtual **BUY** row:

- Entry: **open** of the **oldest** bar in the copied window.
- Exit: **close** of the **newest** bar in the window.
- SL / TP: synthetic distances from `SYMBOL_POINT` (see source comments).
- `exit_reason`: `PLACEHOLDER_VIRTUAL_SKELETON_NOT_IFVG`.

When `InpExportSignalsOnly=false`, only the CSV **header** is written (zero data rows). Summary `trade_count` remains **0**.

---

## TypeScript import (later path)

From repo roots, after copying CSV text into memory (no MT5 required):

```ts
import { importBacktestTradesFromCsv, assembleBacktestRunFromImportedTrades } from "@workspace/mapazapp-core";

const r = importBacktestTradesFromCsv(csvText, {
  strategyId: "MZP_IFVG_ZONE_REACTION_V1",
  parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
  canonicalSymbol: "XAUUSD",
  brokerSymbol: _SymbolFromTester,
  accountId: "TESTER_ACCOUNT",
  datasetSplit: "validation",
  sourceType: "mapazapp_testea_csv",
  runId: "...",
});
```

Use **`evaluateBacktestApproval`** only as **advisory** governance — it does **not** mutate the registry.

---

## Compile and run (outline)

1. Copy **`Mapazapp_TestEA.mq5`** to **`MQL5\Experts\Mapazapp\`** (or subfolder) on the tester machine.
2. Open MetaEditor → compile (F7).
3. MT5 → **View → Strategy Tester** → select **Mapazapp_TestEA**, symbol, period, date range, model.
4. Start test; when the run finishes, **`OnDeinit`** writes exports under **`MQL5\Files\...`**.

This repository does **not** compile MQL5 in CI — MetaEditor compile is **manual**.

---

## Related

- **BridgeEA:** `../Mapazapp_BridgeEA/` — live terminal bridge export (`MZP_BRIDGE_V1`).
