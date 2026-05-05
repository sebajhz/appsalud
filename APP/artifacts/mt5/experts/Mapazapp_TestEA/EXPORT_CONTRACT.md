# Mapazapp_TestEA — export contract (`MZP_TESTEA_V1`)

**Artifact:** `Mapazapp_TestEA.mq5` — **Strategy Tester only**, virtual export for Mapazapp **Checkpoint 8** (`importBacktestTradesFromCsv`).  
**Not** **Mapazapp_BridgeEA**. **Not** live trading. **Not** IFVG production logic.

---

## 1. Sandbox root

All paths are relative to the active terminal **`MQL5\Files\`** profile (same discipline as BridgeEA).

Suggested layout after export:

```text
MQL5\Files\<InpExportRoot>\<run_id>\
```

Default `InpExportRoot`: `Mapazapp\testea` → example:

```text
MQL5\Files\Mapazapp\testea\TESTEA_XAUUSD_20260105_123456_12345\
```

---

## 2. `backtest_trades.csv`

- **Encoding:** ANSI (`FILE_ANSI`), ASCII-safe content.
- **Header required.** Column names are **snake_case** (importer normalizes case / minor aliases).
- **Row count:** zero data rows is valid (header only) when no placeholder trade is emitted.
- **Direction:** `BUY` or `SELL` (also accepts `LONG` / `SHORT` in TypeScript importer).

### 2.1 Column order (recommended)

| Column | Required by TS importer | Notes |
|--------|-------------------------|--------|
| `run_id` | No (optional per row; falls back to import options) | Should match folder / summary when possible. |
| `trade_id` | **Yes** | Stable id within run. |
| `strategy_id` | Per-row optional | Defaults to import options. |
| `parameter_set_id` | Per-row optional | Defaults to import options. |
| `symbol` | Per-row optional | Canonical symbol; defaults to import options. |
| `broker_symbol` | No | Tester symbol string; defaults to import options. |
| `account_id` | No | Tester metadata (e.g. `TESTER_ACCOUNT`); **not** a live login claim. |
| `direction` | **Yes** | `BUY` / `SELL`. |
| `entry_time` | **Yes** | ISO UTC `…Z` recommended. |
| `exit_time` | **Yes** | ISO UTC `…Z` recommended. |
| `entry_price` | **Yes** | Numeric. |
| `exit_price` | **Yes** | Numeric. |
| `sl` | No | Stop loss (virtual). |
| `tp` | No | Take profit (virtual). |
| `result_money` | No | Warning if missing (defaults to `0` in importer). |
| `result_r` | **Yes** | R-multiple (virtual skeleton uses price vs fixed risk distance). |
| `commission` | No | Parsed into `BacktestTrade.commission` when present (CP14+ importer). |
| `swap` | No | Parsed into `BacktestTrade.swap`. |
| `spread_at_entry` | No | Parsed into `BacktestTrade.spreadAtEntry`. |
| `score_total` | No | Parsed into `BacktestTrade.scoreTotal`. |
| `zone_id` | No | Optional opaque id. |
| `exit_reason` | No | e.g. placeholder reason codes — **not** proof of live behaviour. |

Checkpoint 8 TypeScript entry point: **`importBacktestTradesFromCsv`** (`APP/lib/mapazapp-core/src/backtest-importer.ts`).

---

## 3. `backtest_summary.json`

Advisory metadata only. **Not** consumed by `importBacktestTradesFromCsv` today (CSV is the importer input). Keep fields stable for future ingest / dashboards.

| Field | Type | Notes |
|-------|------|--------|
| `schema_version` | string | e.g. `MZP_TESTEA_V1` |
| `ea_build` | string | EA build tag |
| `run_id` | string | Matches export folder segment when possible |
| `strategy_id` | string | Registry-oriented id (metadata) |
| `parameter_set_id` | string | Registry-oriented id (metadata) |
| `canonical_symbol` | string | From inputs |
| `broker_symbol` | string | Tester symbol |
| `account_id` | string | Tester label |
| `dataset_split` | string | e.g. `train`, `validation`, `forward`, `full` |
| `tester_symbol` | string | Redundant with broker symbol for human clarity |
| `tester_period` | string | Wire timeframe token (`H1`, `M15`, …) |
| `tester_from` | string or `null` | From `TesterStartTime()` when non-zero |
| `tester_to` | string or `null` | From `TesterStopTime()` when non-zero |
| `exported_at_utc` | string | ISO UTC |
| `trade_count` | number | Must align with CSV data rows |
| `notes` | string | Diagnostics / placeholder disclaimers |
| `execution_mode` | string | `virtual_export_only` |
| `live_trading_enabled` | boolean | Always `false` for this artifact |
| `magic_reserved` | number | Input echo; **no** orders placed in CP14 |
| `fixed_risk_r_meta` | number | Metadata echo only for CP14 placeholder |
| `rr_target_meta` | number | Metadata echo |

---

## 4. Explicit non-goals (Checkpoint 14)

- No claim of profitability or production readiness.
- No automatic registry mutation or parameter-set approval (see **`evaluateBacktestApproval`** — advisory only).
- No translation of the full IFVG blueprint into MQL5 (future checkpoint).
- No `OrderSend`, `CTrade`, `WebRequest`, DLL imports, or command files — see **`MANUAL_TEST_CHECKLIST.md`** § safety scan.

---

## 5. Related artifacts

- **BridgeEA (CP13):** `APP/artifacts/mt5/experts/Mapazapp_BridgeEA/` — live terminal **export-only** bridge files (`MZP_BRIDGE_V1`), separate contract.
- **Core importer:** `APP/lib/mapazapp-core/src/backtest-importer.ts`
