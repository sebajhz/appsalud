# Mapazapp — Implementation assumptions (V1 checkpoint)

This file records **implementation-only** decisions and **test fixtures** that are not broker truth. Product rules remain in `Mapazapp_Replit_Handoff_V1/` and `APP/artifacts/mapazapp/docs/MOCK_DATA_CONTRACT.md`.

---

## 1. Test symbol profiles (`@workspace/mapazapp-core` tests)

The file `APP/lib/mapazapp-core/tests/test-symbol-profiles.ts` defines `V1_TEST_SYMBOL_PROFILES` for:

| Key | Purpose |
|-----|---------|
| `XAUUSD` | Metals-style tick (0.01), 2 decimals |
| `EURUSD` | FX 5 decimals, tick 1e-5 |
| `USDJPY` | JPY quote 3 decimals, tick 0.001 |
| `NAS100` | Index-style 0.1 tick |
| `BTCUSD` | Large spread in test dollars, 0.1 tick |

**`accountId`:** fixed test value `TEST_ACC_V1` on every profile row.

These numbers are **for unit tests only** until real **MT5 BridgeEA** symbol snapshots exist.

---

## 2. `tickSize`, `digits`, and `point`

- **`tickSize`:** minimum price increment used for rounding (`roundToTickSize`).
- **`digits`:** used by `formatPriceDisplay` in core (display only); tests focus on tick rounding.
- **`point`:** used in tests to derive `spreadPrice` from `spreadPoints` via `spreadPointsToPrice = spreadPoints * point`, aligned with common MT5 semantics **as an assumption** — production must use broker-exported `spread_price` when available.

---

## 3. Rounding

- `roundToTickSize` uses `Math.round` / `floor` / `ceil` on `price / tickSize`. Half-integers follow **JavaScript** `Math.round` (half-to-even). Documented so backtest parity checks account for this.
- Small **epsilon** `DEFAULT_FLOAT_EPS` (`1e-10`) is added only inside `floor`/`ceil` paths to reduce binary float edge noise — **not** a trading tolerance.
- After choosing tick index `n`, the price is normalized with `toFixed(d)` where `d` is the number of decimal places implied by `tickSize` (derived by scaling `tickSize` until it is numerically integral), then `parseFloat`, so values like `98123.4` match exactly for test assertions.

---

## 4. Float comparison in tests

- `nearlyEqual(a, b, eps)` uses `eps` default `1e-10` scaled by operand magnitude for spread equality checks in tests.

---

## 5. What is still mock-only (checkpoint 1)

- All **UI** figures except the path through `AccountDataSource` for account snapshot on Home still come from existing `src/mock/` data.
- No **MT5**, no **order execution**, no **WebSocket**, no **database**, no **real IFVG candle detection**, no **real backtest**.

---

## 6. When BridgeEA data exists

Replace test profiles with **live** `SymbolMarketSpec` built from exported MT5 fields per `Mapazapp_Symbol_Precision_Tick_Pip_Normalization_Addendum_V1.md` and bridge contracts; keep this file updated if rounding or spread semantics change.
