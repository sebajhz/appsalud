# Mapazapp — First MT5 Strategy Tester Smoke Run Evidence E4

## 1. Purpose

- Este documento **archiva la evidencia** del **primer smoke real** de **`Mapazapp_TestEA`** en **MetaTrader 5 Strategy Tester**.
- **No** constituye prueba de **rentabilidad**, **campaña** de backtest diseñada, ni **validación de edge** estadístico.
- **No** aprueba la estrategia para trading ni sustituye revisión humana de parámetros.
- **Sí** confirma, con trazabilidad: **compilación limpia**, **ejecución solo en tester** (`tester_only`), **exports válidos** (tres archivos, summary alineado a **E3.6**), **eventos de Daily Bias y setup**, **gate de bias** coherente con la dirección, **`trade_count = 0`**, **sin órdenes** (`OrderSend` / `CTrade` ausentes en el diseño del EA y sin trading real).

---

## 2. Run summary

| Field | Value |
|-------|--------|
| checkpoint | **E4** |
| run type | manual MT5 Strategy Tester smoke |
| operator | human operator |
| base repo commit (plan E4) | `2825174` — `docs(mapazapp): E4 MT5 strategy tester smoke run plan` |
| EA | **Mapazapp_TestEA** |
| EA build | `MZP_TestEA_E3_6` |
| schema | `backtest_ea_v1` |
| run_id | `TEST_RUN_A` |
| symbol | XAUUSD |
| execution timeframe | M15 |
| daily bias timeframe | D1 |
| backtest mode | virtual |
| tester_only | true |
| export root observed (redactado) | `MetaQuotes\Tester\<terminal-id>\Agent-127.0.0.1-3000\MQL5\Files\Mapazapp\testea\TEST_RUN_A` |
| approximate date range | ~2025-01-01 → ~2026-05-11 (más amplio que el smoke corto sugerido en el plan) |
| result | **OK with observations** |

---

## 3. Compile result

- **MetaEditor:** compilación **OK**.
- **Errores:** 0.
- **Advertencias:** 0.
- **Salida:** se generó el **`.ex5`** correspondiente.
- **Repo:** sin cambios de código ni del árbol de fuentes durante la corrida manual (solo ejecución local MT5).

---

## 4. Strategy Tester execution

- **Strategy Tester** iniciado con **Expert:** `Mapazapp_TestEA`.
- **Símbolo / período gráfico de prueba:** XAUUSD **M15**.
- **Estado:** la corrida **completó** sin forzar uso de gráfico live.
- **Informe MT5:** **0 operaciones** / **0 trades** — **esperado** (no hay simulación de órdenes ni filas en `backtest_trades.csv`).
- **Trading real:** **no** hubo.
- **`OrderSend` / `CTrade`:** **no** aplicables al diseño actual del EA; **no** hubo envío de órdenes.
- **Dashboard / wrapper Mapazapp:** **no** participaron en la corrida.

---

## 5. Exported files

Se confirmó la aparición de los tres artefactos:

| Archivo | Rol |
|---------|-----|
| `backtest_summary.json` | Resumen de corrida, flags y contadores |
| `backtest_events.csv` | Traza de eventos (lifecycle, bias, setup) |
| `backtest_trades.csv` | Cabecera de trades (sin filas de datos en esta fase) |

**Ubicación observada (plantilla redactada, sin ruta de usuario completa):**

`MetaQuotes\Tester\<terminal-id>\Agent-127.0.0.1-3000\MQL5\Files\Mapazapp\testea\TEST_RUN_A`

**Tamaños aproximados observados:**

| Archivo | Tamaño aprox. |
|---------|----------------|
| `backtest_summary.json` | ~1.592 bytes |
| `backtest_events.csv` | ~3,8 MB |
| `backtest_trades.csv` | ~160 bytes (solo cabecera) |

**Nota:** no se incluyen rutas absolutas ni identificadores privados; `<terminal-id>` es placeholder.

---

## 6. Summary excerpt

Campos principales del `backtest_summary.json` real (sanitizado, sin rutas):

```text
schema_version: backtest_ea_v1
ea_build: MZP_TestEA_E3_6
run_id: TEST_RUN_A
strategy_id: MZP_IFVG_ZONE_REACTION_V1
parameter_set_id: MZP_IFVG_XAUUSD_V1_SET_003
symbol: XAUUSD
execution_timeframe: M15
daily_bias_timeframe: D1
backtest_mode: virtual
tester_only: true
official_ea: Mapazapp_TestEA
backtest_role: true
has_real_ifvg_logic: true
has_full_ifvg_pipeline: false
has_real_daily_bias_logic: true
has_real_trading_orders: false
trade_count: 0
total_bias_evaluated: 349
bullish_bias_count: 200
bearish_bias_count: 149
neutral_bias_count: 0
unknown_bias_count: 0
total_setup_candidates: 6698
bullish_setup_candidates: 3746
bearish_setup_candidates: 2952
allowed_setups: 3421
rejected_by_daily_bias: 3277
skipped_neutral_bias: 0
missing_bias_context: 0
ignored_small_fvg: 0
last_setup_direction: short
last_setup_decision: setup_candidate_allowed
last_setup_reason: daily_bias_aligned
last_fvg_points: 377
notes: Daily Bias V1 on D1, Setup V1 = FVG candidate detection on M15, not full IFVG pipeline, trade_count=0.
```

---

## 7. Events observed

**Tipos de `event_type` confirmados en el CSV (no se adjunta el archivo completo):**

- `lifecycle_init`
- `skeleton_ready`
- `daily_bias_evaluated`
- `setup_detected`
- `setup_allowed`
- `setup_rejected`

**Comportamiento del gate Daily Bias (resumen cualitativo, alineado con inspección del operador):**

| Contexto bias | Dirección setup | Resultado esperado / observado |
|----------------|------------------|--------------------------------|
| alcista (bullish) | long | permitido → alineación con bias (`setup_allowed` / decisión tipo `setup_candidate_allowed`) |
| alcista (bullish) | short | rechazado por bias → `rejected_by_daily_bias` / `setup_rejected` |
| bajista (bearish) | short | permitido |
| bajista (bearish) | long | rechazado por bias |

No se pegan aquí miles de filas del CSV; la evidencia cuantitativa queda en el summary (§6) y en los archivos locales del operador.

---

## 8. Trades file

- `backtest_trades.csv` contiene **únicamente la cabecera** — **correcto** para la fase actual.
- `trade_count: 0` en el summary — **coherente**.
- **No** hay `result_r` real de operaciones, **no** hay P&L de trades exportados, **no** hay filas de ejecución.

---

## 9. Success criteria

- [x] EA compila.
- [x] Corre en Strategy Tester.
- [x] Exporta `backtest_summary.json`.
- [x] Exporta `backtest_events.csv`.
- [x] Exporta `backtest_trades.csv` header-only.
- [x] Daily Bias V1 genera eventos (`daily_bias_evaluated`).
- [x] Setup / FVG candidatos generan eventos (`setup_*`).
- [x] Daily Bias gate permite / rechaza según dirección (coherente con ejemplos del operador).
- [x] No hay órdenes reales.
- [x] No hay trading live.
- [x] `has_full_ifvg_pipeline = false`.
- [x] `trade_count = 0`.

---

## 10. Observations

- El rango temporal fue **más largo** que el smoke corto sugerido en el plan E4; **no bloquea** el cierre de E4 y demuestra que el EA **aguantó** un backtest extenso en tester.
- `InpExportRoot` observado en ruta como **`Mapazapp\testea`** (segmento en **minúsculas**). En Windows suele ser case-insensitive; para documentación y consistencia futura conviene normalizar inputs a **`Mapazapp\TestEA`** (ver §11).
- `backtest_events.csv` **grande** (~3,8 MB) es **esperable** por volumen de barras M15 + rango amplio + un evento o más por evaluación relevante.
- Este resultado **no** es campaña de rentabilidad ni prueba de edge.

---

## 11. Issues / follow-ups

**Non-blocking**

- **E4.1 cerrado (CLI + core):** validación read-only de carpetas reales TestEA — [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md); script `mapazapp:testea-export-validate`; función `validateTestEaExportBundleTexts` en `@workspace/mapazapp-core`.
- Normalizar en operaciones futuras el **export root** canónico a `Mapazapp\TestEA` (documentación + inputs operador).
- Para smokes rápidos, usar **rango de fechas más corto** si se desea CSV de eventos pequeño.
- Decisión de producto previa a rentabilidad/edge: **simulación virtual de trades** vs modo **`tester_orders`** (cuando exista spec aprobada).

**Blocking**

- **Ninguno** para cerrar **E4 evidence** en el sentido de este checkpoint.

---

## 12. Decision

**E4 smoke result:** **OK with observations.**

**Next (recomendación):**

- **E4.1 (implementado):** CLI `mapazapp:testea-export-validate` + doc [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md).
- **E5 (diseño docs-only):** campaña XAUUSD Strategy Tester — [`XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md`](./XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md) (Phase A sin rentabilidad; Phase B tras **E5.1**).
- Antes de afirmar **rentabilidad** o **edge:** hace falta decisión y eventual implementación de **simulación de trades** u órdenes en tester según contrato, fuera del alcance de este smoke.

---

## 13. Non-goals

Esta corrida y este documento **no** fueron:

- prueba de rentabilidad ni de winrate;
- aprobación de estrategia o parameter set para live;
- campaña de optimización de parámetros;
- validación de dashboard, API o launcher;
- trading en cuenta real;
- automatización del Strategy Tester desde Mapazapp.
