# Mapazapp_TestEA — export contract

> **E3.5:** el EA oficial de Strategy Tester es **`Mapazapp_TestEA.mq5`**. El summary por defecto usa **`schema_version: backtest_ea_v1`** (`official_ea: Mapazapp_TestEA`, `backtest_role: true`, `has_real_ifvg_logic: true` para detección candidata FVG). Los fixtures y herramientas del core pueden seguir usando el esquema legacy **`MZP_TESTEA_V1`** para compatibilidad de importación.

## `MZP_TESTEA_V1` (Checkpoint 14 — legacy)

---

## 1. Sandbox root

All paths are relative to the active terminal **`MQL5\Files\`** profile (same discipline as BridgeEA).

Suggested layout after export:

```text
MQL5\Files\<InpExportRoot>\<run_id>\
```

Default `InpExportRoot` (**E3.4.2**): `Mapazapp\TestEA` → example:

```text
MQL5\Files\Mapazapp\TestEA\TESTEA_XAUUSD_20260105_123456_12345\
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

### 2.2 E3.4.2 — expanded trades header (`backtest_ea_v1`)

When using the default **E3.4.2** EA build, `backtest_trades.csv` uses this **header** (data rows intentionally empty until IFVG/trades exist):

`run_id,trade_id,timestamp,symbol,timeframe,direction,bias_direction,setup_direction,entry,sl,tp,result_r,exit_reason,setup_reason,bias_reason,rejection_reason`

`importBacktestTradesFromCsv` returns **zero trades** with warning **`CSV_HEADER_ONLY_NO_TRADE_ROWS`** for header-only files.

For **data rows** later, the TypeScript importer maps this compact header onto the canonical columns: `timestamp` → `entry_time`; `entry` → `entry_price`; and, only when the CSV has no literal `exit_time` / `exit_price` columns but does include `timestamp` / `entry`, it reuses the same cell index for `exit_time` / `exit_price` so required columns resolve (see `resolveHeaderIndex` in `backtest-importer.ts`).

---

## 3. `backtest_events.csv` (E3.4.2+)

- **Encoding:** ANSI (`FILE_ANSI`), ASCII-safe content.
- **Header required** (exact order from EA):

`run_id,event_id,timestamp,symbol,event_type,bias_direction,setup_direction,decision,reason,details`

- **E3.5+ event types** (audit trail): `setup_detected`, `setup_allowed`, `setup_rejected`, `setup_skipped` (plus lifecycle and `daily_bias_evaluated`). See [`BACKTESTEA_IFVG_SETUP_V1_E3_5.md`](../../../mapazapp/docs/BACKTESTEA_IFVG_SETUP_V1_E3_5.md).

---

## 4. `backtest_summary.json`

### 4.1 Legacy `MZP_TESTEA_V1` (fixtures / CP14-shaped samples)

| Field | Type | Notes |
|-------|------|-------|
| `schema_version` | string | `MZP_TESTEA_V1` |
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
| `tester_from` | string or `null` | **Optional.** CP14 always emits **`null`** — Strategy Tester model/date APIs are not called for MetaEditor portability across builds; enrich manually or in a future checkpoint if needed. |
| `tester_to` | string or `null` | **Optional.** Same as `tester_from` — CP14 always **`null`**. |
| `exported_at_utc` | string | ISO UTC |
| `trade_count` | number | Must align with CSV data rows |
| `notes` | string | Diagnostics / placeholder disclaimers |
| `execution_mode` | string | `virtual_export_only` |
| `live_trading_enabled` | boolean | Always `false` for this artifact |
| `magic_reserved` | number | Input echo; **no** orders placed in CP14 |
| `fixed_risk_r_meta` | number | Metadata echo only for CP14 placeholder |
| `rr_target_meta` | number | Metadata echo |

### 4.2 Default `backtest_ea_v1` (E3.4.2+ EA build, **E3.5** IFVG flags)

Key fields (see `WriteSummaryJson` in `Mapazapp_TestEA.mq5`): `schema_version`, `run_id`, `strategy_id`, `parameter_set_id`, `symbol`, `execution_timeframe`, `daily_bias_timeframe`, `backtest_mode`, `tester_only`, `official_ea`, `backtest_role`, `has_real_daily_bias_logic`, **`has_real_ifvg_logic` (true from E3.5 — FVG candidate detection)**, `has_real_trading_orders`, `trade_count`, bias counters, **setup counters** (`total_setup_candidates`, `bullish_setup_candidates`, `bearish_setup_candidates`, `allowed_setups`, `ignored_small_fvg`, `rejected_by_daily_bias`, `skipped_neutral_bias`, `missing_bias_context`, `last_setup_*`, `last_fvg_points`), `notes`.

---

## 5. Explicit non-goals (Checkpoint 14)

- No claim of profitability or production readiness.
- No automatic registry mutation or parameter-set approval (see **`evaluateBacktestApproval`** — advisory only).
- No translation of the full IFVG blueprint into MQL5 (future checkpoint).
- No `OrderSend`, `CTrade`, `WebRequest`, DLL imports, or command files — see **`MANUAL_TEST_CHECKLIST.md`** § safety scan.
- **E3.5:** FVG detection only — no full IFVG inversion / sweep / displacement pipeline from TypeScript yet; no tester orders; no synthetic trade rows.

---

## 6. Related artifacts

- **BridgeEA (CP13):** `APP/artifacts/mt5/experts/Mapazapp_BridgeEA/` — live terminal **export-only** bridge files (`MZP_BRIDGE_V1`), separate contract.
- **Core importer:** `APP/lib/mapazapp-core/src/backtest-importer.ts`
- **IFVG Setup V1 (E3.5) spec:** `APP/artifacts/mapazapp/docs/BACKTESTEA_IFVG_SETUP_V1_E3_5.md`
