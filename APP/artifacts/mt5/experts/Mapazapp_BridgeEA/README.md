# Mapazapp_BridgeEA (Checkpoint 13)

**Mapazapp Checkpoint 13 — MT5 BridgeEA export-only.** This Expert Advisor runs inside MetaTrader 5 and writes **read-only** bridge export files that align with `MZP_BRIDGE_V1` / legacy `QTG_BRIDGE_V1` and the TypeScript parsers in `@workspace/mapazapp-core` (`parseBridgeStatusJson`, `parseBridge*Csv`).

**Manual MT5 / MetaEditor handoff:** step-by-step compile, demo setup, inputs, smoke checks, forbidden-API verification, and “what to send back” — **[MANUAL_TEST_CHECKLIST.md](./MANUAL_TEST_CHECKLIST.md)**.

**Verified manually in MT5:** MetaEditor compile **OK** (0 errors, 0 warnings) and an **export-only** smoke run **OK** — correct nested folder `MQL5/Files/Mapazapp/bridge/TERMINAL_A/`, expected contract files present, market and candles exported for configured symbols, no trading side effects. Details (without sensitive fields) are in the checklist section **“First real smoke test result.”**

**`bridge_status.json` counters (Checkpoint 13.1):** **`bridge_errors.csv`** is the diagnostic export (all severities). Status JSON adds **`diagnostics_count`** (all rows including **INFO**) and **`warnings_count`** (**WARNING** only). **`errors_count`** counts **ERROR** and **FATAL** only — a lone startup **INFO** does **not** increment it. **`last_error`** is the last **WARNING** / **ERROR** / **FATAL** message, or empty when none apply.

**CP13.1 real smoke (live MT5, sanitized):** **CP13.1 real smoke confirmed severity-aware counters: INFO diagnostics no longer inflate errors_count.** On one validation run, export path `MQL5/Files/Mapazapp/bridge/TERMINAL_A/` was correct; **`bridge_status.json`** showed `diagnostics_count` = 1, `warnings_count` = 0, `errors_count` = 0, `last_error` empty; **`bridge_errors.csv`** contained only **`BRIDGE_EA_START`** at **INFO**; no trading or command ingestion observed — still export-only.

**Repository / privacy:** do **not** commit raw exports from a real account (they can embed account id, server name, balances, and live quotes). Prefer **[`samples/`](./samples/)** or **sanitized** excerpts for issues, docs, and tests.

## What this EA does

- Exports **account**, **market**, **candles**, **open positions**, **pending orders**, **deal history**, **bridge errors**, and **`bridge_status.json`** on a timer.
- Writes only under the terminal **`MQL5/Files/`** sandbox (see path below).
- Uses **OnInit → EventSetTimer → OnTimer** (no heavy work on every tick).

## What this EA does **not** do

- No **OrderSend**, **PositionClose**, **OrderClose**, **CTrade**, or any trade execution API.
- No **inbound command files**, no **WebRequest**, no **DLL imports**, no **socket** usage.
- Mapazapp does **not** send anything **to** MT5 through this artifact; there is **no** control channel.

**Checkpoint 14 (TestEA / Strategy Tester export)** is a separate future deliverable.

## Install and compile (manual)

Prefer the folder layout and checklist in **[MANUAL_TEST_CHECKLIST.md](./MANUAL_TEST_CHECKLIST.md)** (e.g. `MQL5\Experts\Mapazapp\Mapazapp_BridgeEA.mq5`).

1. Copy `Mapazapp_BridgeEA.mq5` to your terminal’s  
   `MetaTrader 5/MQL5/Experts/` (or a subfolder you prefer).
2. Open **MetaEditor**, open the `.mq5` file, click **Compile** (F7).
3. Fix any **symbol** or **build** warnings (broker suffixes, e.g. `XAUUSDm`).
4. In MT5, **Tools → Options → Expert Advisors**: allow automated trading only if your policy requires it; this EA **does not** submit orders. The timer still runs for an attached EA when permitted by the terminal.

## Attach and verify

1. Open **one** chart (any symbol).
2. Drag **Mapazapp_BridgeEA** onto the chart.
3. Set **InpSymbols** to names that exist in **Market Watch** (comma-separated).
4. Confirm **`InpTimerSeconds`** (default 5) is acceptable for load.
5. After a few seconds, open the terminal data folder: **File → Open Data Folder**.
6. Navigate to **`MQL5/Files/<InpExportRoot>/<InpTerminalId>/`**  
   Default: `MQL5/Files/Mapazapp/bridge/TERMINAL_A/`
7. Confirm files exist:

   | File | Role |
   |------|------|
   | `bridge_status.json` | Schema, terminal, login, `ea_status`, `connected`, `symbols_enabled`, `diagnostics_count`, `warnings_count`, `errors_count`, `last_error`, … |
   | `latest_market_snapshot.csv` | Bid/ask/**last**/spread/point/digits/tick/volume/trade_mode/**session_status**/last_tick |
   | `account_snapshot.csv` | Balance, equity, margin, flags |
   | `candles.csv` | OHLC bars per symbol × timeframe |
   | `positions_open.csv` | Open positions (header-only if none) |
   | `orders_pending.csv` | Pending orders (header-only if none) |
   | `deals_history.csv` | Deals in lookback window |
   | `bridge_errors.csv` | Non-fatal export diagnostics |

## Contract layout vs handoff tree

`Mapazapp_MT5_Bridge_Connectivity_Contract_V1.md` describes a deeper folder tree (`market/`, `account/`, `events/`, …). **This EA (CP13)** uses a **single flat folder per terminal id** under `MQL5/Files/` for simpler operator workflows. Column names match **Checkpoint 10** parsers in `APP/lib/mapazapp-core/src/bridge-parse-csv.ts` / `bridge-parse-json.ts`. See **`EXPORT_CONTRACT.md`**.

## Atomic writes

Each file is written as `*.tmp` under the same relative path, flushed and closed, then **`FileMove`** (`source`, `source_flags`, `destination`, `destination_flags`, all under the terminal **`MQL5/Files`** sandbox with `common_flags` = `0`) into the final name. If `FileDelete`/`FileMove` fails (e.g. another process holds the file), a row is recorded in `bridge_errors.csv` (typically **ERROR** / **WARNING**); status JSON **`errors_count`** counts **ERROR**/**FATAL** only (see **`EXPORT_CONTRACT.md`**).

## Implementation notes

- **`InpExportRoot`:** may use `\` or `/` between folders (e.g. `Mapazapp\bridge` or `Mapazapp/bridge`). The EA splits on separators, sanitizes each folder segment, joins with `\`, and creates each level under `MQL5\Files\` so nested paths are preserved.
- **`positions_open.csv` → `commission`:** written as **`0.0`**. `POSITION_COMMISSION` is deprecated in current MetaEditor builds; deal-level commission remains in **`deals_history.csv`** (`DEAL_COMMISSION`).

## Time / UTC

Timestamps use **GMT** (`TimeGMT()`) formatted as `YYYY-MM-DDTHH:MM:SSZ`. This matches common “UTC wall clock” usage in the mock contract; leap-second purity is **not** guaranteed—document any broker skew you observe.

## Encoding

CSV/JSON are written as **ANSI** text with ASCII-safe sanitization for control characters in a few fields. If you need full Unicode company names in JSON, plan a future build with explicit UTF-8 encoding and update the dashboard ingest path accordingly.

## Smoke checklist (manual)

- [ ] Compile succeeds in MetaEditor for your build.
- [ ] EA attaches without `INIT_FAILED` (symbols must resolve via `SymbolSelect`).
- [ ] `bridge_status.json` parses in Mapazapp core (`parseBridgeStatusJson`).
- [ ] `latest_market_snapshot.csv` includes **`last`** and **`session_status`** columns (required by CP10 parser).
- [ ] `account_snapshot.csv` has one data row.
- [ ] `candles.csv` has at least one row when history exists (parser requires ≥1 candle row).
- [ ] No trading keys pressed; order count unchanged after export cycles.

## Samples

Static **`samples/`** files mirror the **column order** expected by `@workspace/mapazapp-core` (same as fictional `bridge-fixtures.ts`). They are for human diffing and importer smoke tests, not live broker data.
