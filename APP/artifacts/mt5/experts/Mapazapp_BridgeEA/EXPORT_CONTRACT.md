# Mapazapp_BridgeEA — export contract (CP13)

## Schema

- **Primary:** `MZP_BRIDGE_V1`
- **Legacy alias (docs / parsers only):** `QTG_BRIDGE_V1`

Wire names are **snake_case** in CSV headers and JSON keys, matching `APP/lib/mapazapp-core/src/bridge-types.ts` and parsers in `bridge-parse-csv.ts` / `bridge-parse-json.ts`.

## Output directory

Relative to terminal **`MQL5/Files/`**:

```text
<InpExportRoot>\<InpTerminalId>\
```

Default: `Mapazapp\bridge\TERMINAL_A\`

**Path handling:** `InpExportRoot` is trimmed, `/` is treated like `\`, then split on `\`. Each non-empty folder name is sanitized (reserved Windows / path characters removed **within** that name only); empty pieces are skipped. Nested folders are created under `MQL5\Files\` so e.g. `Mapazapp\bridge` and `Mapazapp/bridge` both resolve to `Mapazapp\bridge\` (not `Mapazappbridge`).

## Files

| File | Format | Parser (core) |
|------|--------|----------------|
| `bridge_status.json` | JSON | `parseBridgeStatusJson` |
| `latest_market_snapshot.csv` | CSV | `parseBridgeMarketSnapshotCsv` |
| `account_snapshot.csv` | CSV | `parseBridgeAccountSnapshotCsv` |
| `candles.csv` | CSV | `parseBridgeCandlesCsv` |
| `positions_open.csv` | CSV | `parseBridgePositionsOpenCsv` |
| `orders_pending.csv` | CSV | `parseBridgeOrdersPendingCsv` |
| `deals_history.csv` | CSV | `parseBridgeDealsHistoryCsv` |
| `bridge_errors.csv` | CSV | `parseBridgeErrorsCsv` |

## Market snapshot (required columns)

The Checkpoint 10 parser **requires** all of the following headers (including **`last`** and **`session_status`**), not only the subset sometimes listed in prose specs:

`schema_version`, `exported_at_utc`, `terminal_id`, `account_login`, `symbol`, `bid`, `ask`, `last`, `spread_points`, `spread_price`, `point`, `digits`, `tick_size`, `tick_value`, `contract_size`, `volume_min`, `volume_max`, `volume_step`, `trade_mode`, `session_status`, `last_tick_time_utc`

## Strategy / source placeholders

Rows that require `strategy_id` and `source_tag` (positions, orders, deals) use:

- `strategy_id`: `MZP_BRIDGE_EXPORT_V1`
- `source_tag`: `MAPZAPP_BRIDGEEA`

These are **export metadata**, not live strategy signals.

## Pending order expiration

If MT5 reports no expiration (`ORDER_TIME_EXPIRATION == 0`), the EA writes **`2099-12-31T00:00:00Z`** as a sentinel “no expiry” value so the cell stays non-empty for strict parsers.

## Safety scope

Export-only: **no** command ingest folder, **no** `WebRequest`, **no** DLLs, **no** `CTrade` / `Trade.mqh`.
