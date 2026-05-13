# E5.4.1 — Virtual outcome geometry / unresolved audit and fix

## Context

- **E5.4** (manual smoke, operator): Strategy Tester run **OK** with CLI `mapazapp:testea-export-validate` returning **`ok: true`**, **`status: warning`**, **`errors: []`** against bundle `TEST_RUN_A` / XAUUSD / M15 + D1 bias, virtual trades enabled, EA build **MZP_TestEA_E5_3**.
- **CLI warnings observed:** `BUNDLE_EVENTS_LARGE`, `BUNDLE_EXPORTROOT_LOWERCASE_TESTEA`, `CSV_GEOMETRY_LONG_SL`, `CSV_GEOMETRY_SHORT_SL`, `CSV_GEOMETRY_RISK_NONPOSITIVE`.
- **Root cause (9 bad rows):** FVG gaps of **1 point** produced midpoint / `NormalizeDouble` levels where **entry == SL** (or non-positive risk after rounding), so exported geometry was invalid despite mathematically non-zero risk before wire rounding.

## Repo fix (E5.4.1)

- **`Mapazapp_TestEA.mq5`** (`MZP_TestEA_E5_4_1`):
  - Normalize FVG bounds (`fvg_low` ≤ `fvg_high`); recompute `fvg_points` on the sorted zone.
  - **`InpVirtualMinTradeFvgPoints` (default 2):** setup detection may still see 1-point FVGs when `InpMinFvgPoints = 0`, but **virtual trade creation** rejects gaps below this threshold (`virtual_trade_skipped`, reason `fvg_below_virtual_trade_min`; `invalid_risk_count++`).
  - After computing entry/SL/TP, **`NormalizeDouble(..., _Digits)`** then validate long/short geometry and **`riskAbs >= _Point`**; on failure emit **`virtual_trade_skipped`** with wire reasons: `invalid_risk_nonpositive`, `invalid_geometry_entry_sl`, `invalid_geometry_tp`, etc. — **no** active trade, **no** win/loss/ambiguous row.
  - **`OnDeinit`:** if a virtual trade is still **active**, finalize: event **`virtual_trade_unresolved`**, CSV row — **filled** → `outcome=unresolved`, `exit_reason=deinit_with_active_virtual_trade`; **unfilled** → `outcome=expired_unfilled`, `exit_reason=deinit_pending_virtual_entry`; `result_r=0`. Aligns **`trade_count`** with **`virtual_trade_count`** when a candidate was counted but the test ended mid-lifecycle.
  - Summary adds **`unresolved_count`** (filled-but-not-closed-at-deinit path).

- **TypeScript:** `virtual_trade_unresolved` + decision `unresolved` in `backtest-events-csv.ts`; importer warns on bad **TP** vs entry (`CSV_GEOMETRY_LONG_TP` / `CSV_GEOMETRY_SHORT_TP`); `validateTestEaExportSample` warns if `virtual_trade_count !== trade_count` when `has_real_virtual_trade_logic` is true (`TESTEA_VIRTUAL_TRADE_COUNT_MISMATCH`).

## E5.4 smoke classification

**E5.4 = OK with warnings** — bundle contract satisfied; warnings flagged real geometry defects now blocked at source in **E5.4.1**.

## Next: E5.4.2

Repeat the same Strategy Tester smoke with **`MZP_TestEA_E5_4_1`**, same inputs, then re-run:

`pnpm --filter @workspace/scripts mapazapp:testea-export-validate -- --bundle "<run-folder>" --json`

Expect: **no** `CSV_GEOMETRY_*` warnings from tiny FVG rows; **`trade_count` == `virtual_trade_count`**; optional `--strict` behavior unchanged except new parity / TP warnings if regressions appear.

## Document history

| Version | Note |
|---------|------|
| E5.4.1 v1 | Post–E5.4 smoke hardening + TS/docs alignment; no MT5 execution from this checkpoint. |
