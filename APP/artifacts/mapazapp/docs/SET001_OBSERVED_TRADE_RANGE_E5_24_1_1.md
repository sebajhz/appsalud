# SET001 Observed Trade Range — E5.24.1.1

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.24.1.1 — rango observado de trades SET001 + decisión OOS pendiente |
| **Tipo** | Operator inspection evidence — **sin ejecución** |
| **Baseline Git** | `7406a41` o posterior — `docs(mapazapp): E5.24.1 confirm robustness date ranges` |
| **Padre** | [`XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md`](./XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md) — **cerrado (docs)** |
| **Decisión** | **Docs-only** — documenta inspección CSV; **no** elige opción OOS A/B |
| **E5.24.1.2** | [`ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md`](./ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md) — PM **Opción B** (re-corte) |
| **Siguiente** | E5.24.1.3 — tabla splits propuestos → confirmación operador → E5.24.2 |
| **Sin cambios** | MQL5, TypeScript, MT5, ST, optimizador, gates, live, entry/TP, edge/25/adaptive, Telegram/dashboard/email/push |

---

## 1. Por qué existe E5.24.1.1

Tras **E5.24.1**, el operador inspeccionó el export SET001 en disco para recuperar información temporal antes de confirmar rangos SET002 (OOS) y WF.

**E5.24.1.1** registra:

- Qué expone `backtest_summary.json` (y qué **no** expone).
- Qué columnas temporales existen en `backtest_trades.csv`.
- El **rango observado de trades** (min/max por columna).
- Por qué ese rango **no sustituye** el From/To exacto del Strategy Tester MT5.
- Una **nota de viabilidad OOS** y dos opciones PM — **sin elegir automáticamente**.

---

## 2. Identidad del bundle inspeccionado

| Campo | Valor |
|-------|-------|
| **`bundle_id`** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **`run_role`** | `IS_BASELINE` |
| **`build`** | `MZP_TestEA_E5_18` (corrida E5.22) |
| **`RunDir`** | `C:\Users\QuerlyPC\AppData\Roaming\MetaQuotes\Tester\A05F66FF4A995303E43EBDC7469BF577\Agent-127.0.0.1-3000\MQL5\Files\Mapazapp\TestEA\E55\SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **`trade_count`** | 1697 |

Fuente métricas: [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md).

---

## 3. Inspección de `backtest_summary.json`

El operador revisó el summary del bundle SET001.

| Hallazgo | Detalle |
|----------|---------|
| **Sin rango ST claro** | No expuso campos utilizables `tester_from` / `tester_to` / `date_range_*` para fijar From/To MT5 |
| **Timeframes confirmados** | `execution_timeframe` = `M15`; `daily_bias_timeframe` = `D1` |
| **Métricas** | Conteos, R, readiness, variantes, etc. — alineado con E5.22 |
| **Estado fechas ST** | **`needs_operator_confirmation`** — From/To MT5 siguen pendientes de notas operador / pestaña Fechas ST |

Coherente con contrato TestEA: `tester_from` / `tester_to` pueden ser `null` en export ([`BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md`](./BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md)).

---

## 4. Columnas temporales en `backtest_trades.csv`

Headers tipo tiempo confirmados por operador (PowerShell):

| Columna | Presente |
|---------|----------|
| `entry_time` | Sí |
| `exit_time` | Sí |
| `timestamp` | Sí |
| `discipline_trade_date` | Sí |

Todas las columnas con **count = 1697** (una fila por trade virtual).

---

## 5. Rangos parseados (operador PowerShell)

### Display local PowerShell (no UTC crudo)

| Columna | count | min (display local) | max (display local) |
|---------|------:|---------------------|---------------------|
| `entry_time` | 1697 | 2025-01-02 00:00:00 | 2026-05-08 20:30:00 |
| `exit_time` | 1697 | 2025-01-02 00:15:00 | 2026-05-08 20:30:00 |
| `timestamp` | 1697 | 2025-01-02 00:15:00 | 2026-05-08 20:30:00 |
| `discipline_trade_date` | 1697 | 2025-01-02 | 2026-05-08 |

**Nota:** el display local de PowerShell puede **desplazar** timestamps al parsear valores con sufijo `Z` (UTC) en zona horaria del operador. Los extremos **canónicos en UTC** para `entry_time` están en §6.

---

## 6. Rango observado de trades (UTC — `entry_time`)

| Métrica | Valor |
|---------|-------|
| **Primer trade (por `entry_time`)** | `2025-01-02T03:00:00Z` |
| **Último trade (por `entry_time`)** | `2026-05-08T23:30:00Z` |
| **Rango observado** | **2025-01-02T03:00:00Z** → **2026-05-08T23:30:00Z** |

### Primeras filas por `entry_time`

| trade_id | entry_time (UTC) | outcome |
|----------|------------------|---------|
| VTR_000001 | 2025-01-02T03:00:00Z | win |
| VTR_000002 | 2025-01-02T08:15:00Z | expired_unfilled |
| VTR_000003 | 2025-01-02T12:00:00Z | win |

### Últimas filas por `entry_time`

| trade_id | entry_time (UTC) | outcome |
|----------|------------------|---------|
| VTR_001695 | 2026-05-08T15:30:00Z | loss |
| VTR_001696 | 2026-05-08T22:15:00Z | expired_unfilled |
| VTR_001697 | 2026-05-08T23:30:00Z | expired_unfilled |

---

## 7. Caveat — rango observado ≠ From/To exacto del Strategy Tester

| Punto | Implicación |
|-------|-------------|
| Trades solo donde hubo setups | El CSV refleja **actividad del motor**, no necesariamente el calendario completo del tester |
| Inicio/fin del período ST | Puede haber barras sin trades al inicio o al final del rango MT5 |
| Summary sin `tester_from`/`tester_to` | No se puede reconstruir From/To ST **solo** desde summary |
| **Conclusión** | Usar §6 como **rango observado de trades**; mantener **`needs_operator_confirmation`** para From/To MT5 exactos |

**No inventar** fechas From/To en repo hasta confirmación operador.

---

## 8. Nota de viabilidad OOS (decisión pendiente)

Los trades observados de SET001 **ya llegan hasta 2026-05-08** (último `entry_time` UTC).

Si la política de campaña exige OOS **estrictamente posterior** al tramo cubierto por SET001 (sin solapamiento):

| Riesgo | Detalle |
|--------|---------|
| OOS corto | SET002 solo podría usar historia **después de 2026-05-08** |
| Pocos trades | Período post-SET001 puede ser **demasiado corto** para OOS fiable |
| Historia MT5 | Requiere que el terminal tenga **suficiente** data posterior a 2026-05-08 |

**Estado:** decisión PM/operador **requerida** antes de E5.24.2 — ver §9.

---

## 9. Opciones PM (no elegidas automáticamente)

### Opción A — OOS estricto post-SET001

| Aspecto | Detalle |
|---------|---------|
| **SET002 OOS** | Comienza **después de 2026-05-08** (fin del rango observado de trades SET001) |
| **Requisito** | Historia MT5 suficiente post-2026-05-08 |
| **Riesgo** | Pocos trades / OOS poco fiable si el tramo es corto |
| **SET001** | Permanece benchmark completo + ancla métrica conjunto A |

### Opción B — Re-corte de campaña de robustez

| Aspecto | Detalle |
|---------|---------|
| **SET001** | Sigue siendo **benchmark de referencia** (+315R, 1697 trades) pero **no** como único ancla IS para OOS |
| **Nueva política** | Definir splits IS/OOS/WF **dentro** del histórico disponible (p. ej. recortar fechas internas) |
| **Impacto plan** | Actualizar [`XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md`](./XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md) y tabla [`XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md`](./XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md) |
| **Riesgo** | Más trabajo de gobernanza; evita OOS artificialmente corto |

| Decisión | Estado |
|----------|--------|
| Opción A vs B | **Resuelto E5.24.1.2** — PM eligió **Opción B** (re-corte) |

Tras E5.24.1.3: proponer fechas candidatas; operador confirma en `99_notes/DATE_RANGES_CONFIRMED.md` antes de E5.24.2.

---

## 10. Actualización sugerida para E5.24.1 (tabla SET001)

| Campo | Valor sugerido (observado, no ST exacto) |
|-------|------------------------------------------|
| `observed_trade_start_utc` | `2025-01-02T03:00:00Z` |
| `observed_trade_end_utc` | `2026-05-08T23:30:00Z` |
| `is_start` / `is_end` (MT5 ST) | **`needs_operator_confirmation`** |
| `operator_note` | Ver E5.24.1.1; OOS post-SET001 puede ser corto — PM Opción A/B |

---

## 11. Gobernanza

| Acción | Estado |
|--------|--------|
| MQL5 / TypeScript | **No** |
| MT5 / ST / optimizador | **No** |
| Live / gates / entry·TP | **No** |
| Edge / 25 / adaptive approval | **No** |
| Canales (Telegram/dashboard/email/push) | **No** |
| Commitear `_local_*` | **No** |
| Elegir Opción A o B automáticamente | **Prohibido** |

---

## Referencias

- [`XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md`](./XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md)
- [`XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md`](./XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md)
- [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md)
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
- [`ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md`](./ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md)
