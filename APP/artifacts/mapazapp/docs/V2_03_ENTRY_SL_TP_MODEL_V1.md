# V2-03 — Entry / SL / TP Model v1

## Alcance y seguridad

- Modelo **puro** en `@workspace/mapazapp-core`: convierte zona o `TradeReviewPlan` en un plan de precios **listo para replay** (`simulateReplayTrade`).
- **Sin** ejecución, **sin** lectura de comandos MT5, **sin** cambios a BridgeEA/TestEA, **sin** DB, watcher, WebSocket, scanner en vivo o mutación de registry.
- **Sin** prueba de rentabilidad: solo reglas explícitas, códigos de razón y tests deterministas.

## API principal

- `buildEntrySlTpPlan(input: EntrySlTpModelInput): EntrySlTpModelResult`
- Ajustes por defecto para tests: `createDefaultEntrySlTpSettingsForTests()`
- Fixtures: `createEntrySlTpFixtures()` en `entry-sl-tp-fixtures.ts`

## Modos de entrada (`EntryModelMode`)

| Modo | Comportamiento v1 |
|------|-------------------|
| `zone_edge` | BUY: borde `low` u `high` según `zoneEdgePreference`. SELL: análogo. |
| `zone_midpoint` | Punto medio del rango de zona. |
| `full_zone_touch` | v1: mismo precio de referencia que `zone_midpoint`; el replay sigue usando área completa (`zone_touch`). |
| `confirmation_close` | Requiere `confirmationClose`. |
| `manual_reference` | Requiere `explicitEntry`. |

## Modos de stop (`StopLossModelMode`)

| Modo | Comportamiento v1 |
|------|-------------------|
| `beyond_zone` | BUY: por debajo de `zoneLow` menos buffer dinámico. SELL: por encima de `zoneHigh` más buffer. |
| `beyond_sweep` | BUY: por debajo de `sweepLow`. SELL: por encima de `sweepHigh`. Requiere el extremo correspondiente. |
| `beyond_structure` | BUY: por debajo de `structureLow`. SELL: por encima de `structureHigh`. |
| `atr_buffered` | BUY: `entry - buffer`. SELL: `entry + buffer` (stop a distancia del buffer respecto a la entrada). |
| `explicit` | `explicitSl` (normalizado a tick). |

## Modos de take profit (`TakeProfitModelMode`)

| Modo | Comportamiento v1 |
|------|-------------------|
| `fixed_r` | `entry ± risk * fixedRTarget` según dirección. |
| `previous_high_low` | BUY: `structureHigh`. SELL: `structureLow`. |
| `opposing_liquidity` | `opposingLiquidityPrice`. |
| `hybrid_fixed_r_or_liquidity` | Entre TP fijo en R y liquidez, conserva candidatos con `rr >= minRr` y reward ≥ `minMeaningfulRewardR * risk`; BUY elige el TP más alto, SELL el más bajo. |
| `explicit` | `explicitTp`. |

## Buffer dinámico

Se reutiliza `slBufferPrice` de `normalize.ts`:

`max(ATR * atrBufferMultiplier, spreadPrice * spreadMultiplier, tickSize * minTicks)`

Sin supuestos universales de “pip”; el spread y el tick vienen del `SymbolMarketSpec`.

## Reglas de R:R y geometría

- `riskDistance` y `rewardDistance` deben ser **> 0**.
- Si `rewardDistance < riskDistance` → `REWARD_SHORTER_THAN_RISK` (TP demasiado cerca respecto al SL).
- `rr` debe ser **>= `minRr`** para estado `ready`; con `preferObserveOverBlock` se puede degradar a `observe_only` manteniendo el código en `blockingReasons` para trazabilidad.

## Trade ya pasado / “too late” (v1)

Si `currentPrice` está presente:

- **BUY**: precio ≥ TP → `TRADE_ALREADY_PAST_TARGET`; TP demasiado cerca del precio (`remainingReward < minMeaningfulRewardR * risk`) → `TARGET_TOO_CLOSE_TO_PRICE`; precio > `entry + maxEntryChaseR * risk` → `ENTRY_CHASE_EXCEEDED`.
- **SELL**: simétrico (por debajo del TP, chase hacia abajo).

`lateTradePolicy`: `blocked` | `observe_only` controla si el fallo de timing va a `blockingReasons` o solo a `warningReasons`.

## Integración con replay

`replayInputPreview` expone un `ReplayTradeInput` parcial (incluye `candles: recentCandles ?? []`). Los modos de entrada del plan se mapean a `ReplayEntryModel`:

- `zone_edge` / `zone_midpoint` / `full_zone_touch` → `zone_touch`
- `confirmation_close` → `confirmation_close`
- `manual_reference` → `manual_reference_price`

Salida del replay: `explicit_tp_sl` con precios ya resueltos.

## V2-08 — Notas de variante de entrada (opcional)

- `EntrySlTpModelInput.entryVariantResult` opcional: `buildEntrySlTpPlan` puede añadir **warnings** si el hint de replay (`confirmation_close` / `manual_reference_price`) o el timing (`late_chase`) del variant discrepan del `entryMode` — **sin** cambiar entradas ni SL/TP.

## V2-09 — Objetivo de liquidez / TP (opcional)

- `EntrySlTpModelInput.targetObjectiveResult` opcional: salida de `evaluateTargetObjective` (V2-09). En `hybrid_fixed_r_or_liquidity` y `opposing_liquidity`, la pata de liquidez puede tomar `selectedTargetPrice` cuando la clasificación no es `invalid_target` / `insufficient_data` / `already_reached` / `too_close`. Se añaden **warnings** (`TARGET_OBJECTIVE_*`) si el objetivo es débil, lejano o con mala relación temporal vs precio actual — **sin** ejecución.

## Limitaciones (v1)

- Un solo conjunto de niveles por llamada; sin multi-TP parcial ni scaling.
- `full_zone_touch` no modela un rango de entradas distinto del midpoint para el precio de referencia.
- La lógica “tarde / chase” es deliberadamente simple y depende de un único `currentPrice`.
- Híbrido elige un único TP entre dos familias; no hay optimización de trayectoria.

## Estado del resultado (`EntrySlTpStatus`)

`ready` | `observe_only` | `blocked` | `invalid` | `insufficient_data`

`reviewOnly` es siempre `true` en el resultado.
