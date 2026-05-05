# Mapazapp_BridgeEA (Checkpoint 13)

**Mapazapp Checkpoint 13 — MT5 BridgeEA export-only.** This Expert Advisor runs inside MetaTrader 5 and writes **read-only** bridge export files that align with `MZP_BRIDGE_V1` / legacy `QTG_BRIDGE_V1` and the TypeScript parsers in `@workspace/mapazapp-core` (`parseBridgeStatusJson`, `parseBridge*Csv`).

**Manual MT5 / MetaEditor handoff:** step-by-step compile, demo setup, inputs, smoke checks, forbidden-API verification, and “what to send back” — **[MANUAL_TEST_CHECKLIST.md](./MANUAL_TEST_CHECKLIST.md)**.

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
   | `bridge_status.json` | Schema, terminal, login, `ea_status`, `connected`, `symbols_enabled`, `errors_count`, … |
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

Each file is written as `*.tmp` under the same relative path, flushed and closed, then **`FileMove`** into the final name. If `FileDelete`/`FileMove` fails (e.g. another process holds the file), an error row is recorded in `bridge_errors.csv` and status JSON `errors_count` reflects it.

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
