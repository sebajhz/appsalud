# Mapazapp_BridgeEA — Manual MT5 / MetaEditor test handoff (Checkpoint 13)

**Scope:** export-only EA smoke test. No Mapazapp backend, no file watcher, no live scanner, no order execution.

**Repo source of truth:** `APP/artifacts/mt5/experts/Mapazapp_BridgeEA/Mapazapp_BridgeEA.mq5` (copy from git checkout).

---

## 1. Files to copy

| Source (repo) | Suggested destination on the MT5 machine |
|----------------|--------------------------------------------|
| `Mapazapp_BridgeEA.mq5` | `<Terminal Data>\MQL5\Experts\Mapazapp\Mapazapp_BridgeEA.mq5` |

**Steps:**

1. In MT5: **File → Open Data Folder** → you are in the active terminal’s data root.
2. Create folder `MQL5\Experts\Mapazapp\` if it does not exist.
3. Copy `Mapazapp_BridgeEA.mq5` from the repo into that folder (final path: `...\MQL5\Experts\Mapazapp\Mapazapp_BridgeEA.mq5`).

**Alternative:** `MQL5\Experts\Mapazapp_BridgeEA.mq5` (flat under Experts) is also valid; MetaEditor will compile either path. Use one location only to avoid duplicate experts.

**Optional:** keep `README.md`, `EXPORT_CONTRACT.md`, and this checklist on disk next to the EA for the tester (not required for compile).

---

## 2. Compile steps (MetaEditor)

1. Open **MetaEditor** (F4 from MT5, or from the Start menu).
2. **File → Open** → select `Mapazapp_BridgeEA.mq5` under `MQL5\Experts\Mapazapp\`.
3. Press **Compile** (F7) or click the Compile toolbar button.
4. In the **Errors** tab, record:
   - **0 errors, 0 warnings** (ideal), or  
   - exact **error codes / line numbers / messages**, and any **warnings**.

**Static reference (repo audit):** the shipped source does **not** contain executable calls to `OrderSend`, `OrderClose`, `PositionClose`, `WebRequest`, `#import` (DLL), or `#include <Trade/Trade.mqh>` — only comments mention “no WebRequest / no CTrade”. If your local file differs, re-copy from the repo.

---

## 3. Safe MT5 setup

| Rule | Detail |
|------|--------|
| **Account** | Use a **demo** account only for first validation. |
| **Chart** | Attach the EA to **one** chart (any symbol the terminal loads). |
| **AutoTrading** | This EA **does not** place orders. **AutoTrading** (large toolbar button) is **not** required for *reading* account/market/history; the EA uses **`EventSetTimer`**. If your build refuses to run the EA or the timer without “Algo Trading” enabled, enable it **only** after confirming the EA has **no** order logic (export-only). |
| **DLL / Web** | **No** DLL imports and **no** `WebRequest` — nothing to allow under “Allow DLL imports” / WebRequest for this test. |
| **Trade permissions** | No special permission to **send** orders is needed for export; the EA only reads terminal state. |

---

## 4. Suggested inputs (first smoke)

Open the EA **Inputs** tab after attaching (or set before attach via preset):

| Input | Suggested first-test value |
|-------|----------------------------|
| `InpSchemaVersion` | `MZP_BRIDGE_V1` |
| `InpTerminalId` | `TERMINAL_A` |
| `InpExportRoot` | `Mapazapp\bridge` |
| `InpSymbols` | Symbols that appear in **Market Watch** (e.g. `XAUUSD,EURUSD` or broker variants like `XAUUSDm`) |
| `InpTimeframes` | `M15,H1,H4` |
| `InpTimerSeconds` | `5` |
| `InpCandleBars` | **`100`** (lighter first run) |
| `InpDealsLookbackDays` | `14` (default is fine) |
| `InpExportMarketSnapshot` | `true` |
| `InpExportAccountSnapshot` | `true` |
| `InpExportCandles` | `true` |
| `InpExportPositions` | `true` |
| `InpExportOrders` | `true` |
| `InpExportDeals` | `true` |
| `InpExportErrors` | `true` |

If compile/init fails because a symbol cannot be selected, reduce `InpSymbols` to **one** symbol that is definitely in Market Watch.

---

## 5. Expected output path

From **File → Open Data Folder**:

```text
MQL5\Files\Mapazapp\bridge\TERMINAL_A\
```

(That is `InpExportRoot` + `\` + `InpTerminalId` + `\`, relative to the terminal’s `MQL5\Files\` sandbox. You may type `Mapazapp/bridge` or `Mapazapp\bridge` in inputs; both must produce this folder tree, not a single collapsed folder name like `Mapazappbridge`.)

---

## First real smoke test result

Sanitized record of one successful **live MT5** export-only run (no account numbers, servers, balances, or prices).

- **MetaEditor:** compile completed with **0 errors, 0 warnings**.
- **Chart:** EA attached on **XAUUSD, H4** (any chart is fine; this was the configuration used).
- **Inputs:** `InpExportRoot` = `Mapazapp\bridge`; symbols list included **XAUUSD** and **EURUSD** (exact broker suffixes omitted here).
- **Output path:** folder present as expected: `MQL5\Files\Mapazapp\bridge\TERMINAL_A\`.
- **Files created:** `bridge_status.json`, `latest_market_snapshot.csv`, `account_snapshot.csv`, `candles.csv`, `positions_open.csv`, `orders_pending.csv`, `deals_history.csv`, `bridge_errors.csv`.
- **`latest_market_snapshot.csv`:** at least one data row each for **XAUUSD** and **EURUSD** (row counts and numeric fields not recorded here).
- **`candles.csv`:** non-empty **XAUUSD** rows on **M15** (other timeframes may also appear depending on inputs).
- **`positions_open.csv` / `orders_pending.csv` / `deals_history.csv`:** headers present and structurally valid (data row counts depend on the account).
- **`bridge_errors.csv`:** only a startup **INFO** line (`BRIDGE_EA_START` / EA initialized message); no repeating **ERROR** spam observed.
- **Trading:** no new orders or positions attributable to the EA; no command reader, **WebRequest**, DLL imports, **Trade.mqh**, or **CTrade** in the shipped source (unchanged design).

**Checkpoint 13.1 (diagnostics counters):** `bridge_errors.csv` remains the full diagnostic log (all severities). In `bridge_status.json`, **`diagnostics_count`** = all buffered rows; **`warnings_count`** = **WARNING** only; **`errors_count`** = **ERROR** + **FATAL** only; **`last_error`** = message from the chronologically last **WARNING** / **ERROR** / **FATAL** (empty when only **INFO**, e.g. startup alone). **INFO** lines such as `BRIDGE_EA_START` no longer inflate **`errors_count`**.

**Repository hygiene:** do **not** commit raw files from a real terminal into git (they can contain logins, servers, balances, and prices). Use **[`samples/`](./samples/)** or hand-redacted snippets for tickets and CI fixtures.

### Safe follow-up validation path

1. **Repeat smoke on a demo terminal** using sections **2–7** of this checklist (compile, attach, confirm folder + file names, confirm Toolbox order count unchanged).
2. **Optional parser check:** copy file **text** locally (not into the repo) and run **`@workspace/mapazapp-core`** parsers (`parseBridgeStatusJson`, `parseBridgeMarketSnapshotCsv`, …) from a scratch script or REPL — same contract as **`EXPORT_CONTRACT.md`** and **`checkpoint10-bridge-contract.test.ts`**.
3. **Regressions:** after EA source edits, re-run **§8** forbidden-symbol search on `Mapazapp_BridgeEA.mq5` and MetaEditor compile.
4. **Optional:** confirm `bridge_status.json` after attach shows **`errors_count`: 0** when `bridge_errors.csv` contains only **INFO** (e.g. startup), with **`diagnostics_count`** ≥ 1 reflecting total rows.

---

## 6. Expected files (after one or two timer cycles)

| File |
|------|
| `bridge_status.json` |
| `latest_market_snapshot.csv` |
| `account_snapshot.csv` |
| `candles.csv` |
| `positions_open.csv` |
| `orders_pending.csv` |
| `deals_history.csv` |
| `bridge_errors.csv` |

---

## 7. Smoke checks

- [ ] **`bridge_status.json`** exists; root object has `"schema_version": "MZP_BRIDGE_V1"` (unless you intentionally set legacy `QTG_BRIDGE_V1`). With CP13.1+ EA, expect **`diagnostics_count`** ≥ 1 when **`bridge_errors.csv`** has rows, **`errors_count`: 0** when only **INFO** rows exist, and optional **`warnings_count`** consistent with **WARNING** rows.
- [ ] **`latest_market_snapshot.csv`**: header row present; **≥ 1 data row** per symbol that successfully exported (same count as working symbols).
- [ ] **`account_snapshot.csv`**: **exactly one** data row (one account snapshot).
- [ ] **`candles.csv`**: **≥ 1 data row** when history is available (parser in Mapazapp core expects at least one valid candle row for a non-empty import).
- [ ] **`positions_open.csv`**: header present; zero data rows is OK if the account has no open positions.
- [ ] **`orders_pending.csv`**: header present; zero data rows OK if no pending orders.
- [ ] **`deals_history.csv`**: header present; zero data rows OK if no deals in lookback window.
- [ ] **`bridge_errors.csv`**: may contain `INFO` / `WARNING` rows (e.g. startup message); **no endless stream** of the same `ERROR` every tick (would indicate file I/O or symbol failure).
- [ ] **Order count** unchanged: open **Toolbox → Trade** before/after a few minutes — no new positions/orders from the EA.

---

## 8. Safety checks (forbidden symbols in `Mapazapp_BridgeEA.mq5`)

Ask the tester (or run locally on the **source file**) to search the EA for **case-sensitive** trading / network / DLL patterns:

| Pattern | Expected |
|---------|----------|
| `OrderSend` | **Not found** (except possibly in comments — repo ships comments only) |
| `OrderClose` | **Not found** |
| `PositionClose` | **Not found** |
| `trade.Buy` / `trade.Sell` | **Not found** |
| `PositionModify` | **Not found** |
| `WebRequest` | **Not found** |
| `#import` | **Not found** |
| `#include <Trade/Trade.mqh>` | **Not found** |

**Repo baseline:** as of Checkpoint 13 commit, only the **header comments** mention “NO WebRequest / NO CTrade”; no such API appears in code.

---

## 9. What to send back after manual test

Paste or attach the following to the engineering channel / ticket:

1. **MetaEditor compile result:** “0 errors, N warnings” + full log text if non-zero.
2. **Screenshot or copy-paste** of Errors/Warnings tab.
3. **List of generated files** in `MQL5\Files\Mapazapp\bridge\TERMINAL_A\` (names + approximate sizes + timestamps).
4. **First 5 lines** of each CSV (header + up to 4 data lines; fewer if shorter).
5. **Full content** of `bridge_status.json` (small file).
6. **Full content** of `bridge_errors.csv` (or first ~50 lines if huge).
7. **Symbol notes:** e.g. “had to use `XAUUSDm` instead of `XAUUSD`”, or “EURUSD worked as-is”.

---

## 10. Troubleshooting

| Symptom | Likely cause | What to try |
|---------|----------------|------------|
| **Init failed / “no symbols could be selected”** | `InpSymbols` not in **Market Watch** or wrong suffix | Add symbols to Market Watch; set `InpSymbols` to exact terminal names (`XAUUSDm`, etc.). |
| **`candles.csv` only header or import fails in Mapazapp** | `CopyRates` returned 0 for all TF/symbol pairs | Confirm history exists for that symbol; try a major FX pair; lower `InpCandleBars`; check connection. |
| **Cannot find output folder** | Looking under wrong terminal or wrong profile | **File → Open Data Folder** for the **same** terminal where the EA is attached; path is always under that tree’s `MQL5\Files\`. |
| **Permission / sandbox** | EA writing outside allowed relative paths | Keep paths **relative** under `MQL5\Files\`; do not use absolute `C:\...` in inputs. |
| **`FileMove` / `FileDelete` errors** in `bridge_errors.csv` | Antivirus or another process locking `.csv` | Pause conflicting scanner; close editors holding the CSV open; retry. |
| **Garbled text in CSV** | ANSI vs UTF-8 | EA writes **ANSI**-oriented text; avoid non-ASCII in comments if parsing elsewhere with UTF-8-only tools. See `README.md` encoding note. |
| **Timer never fires** | EA removed, chart closed, or terminal restrictions | Confirm EA smiley is active; check Journal for timer errors. |

---

## Quick reference — Mapazapp core parsers

After export, optional validation: feed file **text** into `@workspace/mapazapp-core` parsers (`parseBridgeStatusJson`, `parseBridgeMarketSnapshotCsv`, …) — see `EXPORT_CONTRACT.md` and `APP/lib/mapazapp-core/tests/checkpoint10-bridge-contract.test.ts`.
