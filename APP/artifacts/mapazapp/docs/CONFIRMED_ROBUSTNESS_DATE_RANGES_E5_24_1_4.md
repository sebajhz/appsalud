# Confirmed Robustness Date Ranges — E5.24.1.4

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.24.1.4 — confirmación PM de splits de fechas campaña robustez |
| **Tipo** | PM confirmation — **sin ejecución** |
| **Baseline Git** | `d6ab917` o posterior — `docs(mapazapp): E5.24.1.3 propose robustness date splits` |
| **Propuesta aprobada** | [`PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md`](./PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md) |
| **`campaign_id`** | `MZP_XAUUSD_M15_E5_24_ROBUSTNESS_001` |
| **`profile_id`** | `XAUUSD_M15_Profile_V1` |
| **`governance_status`** | `dates_confirmed` — listo para E5.24.2 (ST SET002) |
| **Siguiente** | E5.24.2 — SET002 OOS Strategy Tester execution evidence |
| **Sin cambios** | MQL5, TypeScript, MT5, ST (esta tarea), optimizador, gates, live, entry/TP, edge/25/adaptive, Telegram/dashboard/email/push |

---

## 1. Baseline Git

| Campo | Valor |
|-------|-------|
| **Checkpoint previo** | `d6ab917` — `docs(mapazapp): E5.24.1.3 propose robustness date splits` |
| **Cadena** | E5.24.1 → E5.24.1.1 → E5.24.1.2 → E5.24.1.3 → **E5.24.1.4** |

---

## 2. Confirmación PM

El **PM/operador** confirma los splits de fechas propuestos en **E5.24.1.3** como rangos **oficiales de campaña** para la primera campaña de robustez `XAUUSD_M15_Profile_V1`.

| Campo | Valor |
|-------|-------|
| **Decisión** | Aprobar propuesta E5.24.1.3 **sin modificación de fechas** |
| **Estado filas** | `confirmed` (todas las filas §4) |
| **SET002 ST** | **No** ejecutado en E5.24.1.4 — solo confirmación docs |

Registrar copia operativa opcional en `99_notes/DATE_RANGES_CONFIRMED.md` bajo carpeta campaña MT5 al ejecutar E5.24.2.

---

## 3. Referencia histórica confirmada

| Campo | Valor |
|-------|-------|
| **SET001 trades observados (UTC)** | **2025-01-02T03:00:00Z** → **2026-05-08T23:30:00Z** |
| **Fuente** | [`SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md`](./SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md) |

### Caveat (permanece)

| Punto | Detalle |
|-------|---------|
| CSV vs ST | Rango observado = actividad de trades; **no** garantiza From/To exactos del Strategy Tester en la corrida SET001 histórica |
| ST From/To | Operador debe **verificar** en MT5 que cada segmento §4 puede configurarse con From/To equivalentes antes de E5.24.2 |

---

## 4. Tabla de splits confirmados

**Convención:** fechas inclusive por día calendario (Strategy Tester From/To). **`status`:** `confirmed`.

### SET001 — `BENCHMARK_REFERENCE`

| Campo | Valor |
|-------|-------|
| **bundle_id** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **role** | `full_benchmark_reference` |
| **range_start** | `2025-01-02` |
| **range_end** | `2026-05-08` |
| **status** | `confirmed` |
| **notes** | Benchmark/referencia existente E5.22; **no** rerun en E5.24.1.4 |

### SET002 — `OOS_VALIDATION_RECUT`

| Campo | Valor |
|-------|-------|
| **bundle_id** | `SET002_FVG2_RR2_00_BIASBODY0_RALIGN1_OOS` |
| **run_role** | `OOS_VALIDATION` |
| **is_reference_start** | `2025-01-02` |
| **is_reference_end** | `2025-12-31` |
| **oos_start** | `2026-01-01` |
| **oos_end** | `2026-05-08` |
| **status** | `confirmed` |
| **notes** | Parámetros oficiales 50 %/CE + RR2; **sin** optimización en OOS |

### SET003_WF01 — `WALK_FORWARD_WINDOW`

| Campo | Valor |
|-------|-------|
| **bundle_id** | `SET003_FVG2_RR2_00_BIASBODY0_RALIGN1_WF01` |
| **is_start** | `2025-01-02` |
| **is_end** | `2025-04-30` |
| **forward_start** | `2025-05-01` |
| **forward_end** | `2025-08-31` |
| **status** | `confirmed` |

### SET004_WF02 — `WALK_FORWARD_WINDOW`

| Campo | Valor |
|-------|-------|
| **bundle_id** | `SET004_FVG2_RR2_00_BIASBODY0_RALIGN1_WF02` |
| **is_start** | `2025-05-01` |
| **is_end** | `2025-08-31` |
| **forward_start** | `2025-09-01` |
| **forward_end** | `2025-12-31` |
| **status** | `confirmed` |

### SET005_WF03 — `WALK_FORWARD_WINDOW`

| Campo | Valor |
|-------|-------|
| **bundle_id** | `SET005_FVG2_RR2_00_BIASBODY0_RALIGN1_WF03` |
| **is_start** | `2025-09-01` |
| **is_end** | `2025-12-31` |
| **forward_start** | `2026-01-01` |
| **forward_end** | `2026-05-08` |
| **status** | `confirmed` |

### Tabla resumen MT5 (confirmada)

| bundle_id | segment | start | end | status |
|-----------|---------|-------|-----|--------|
| SET001 | benchmark | 2025-01-02 | 2026-05-08 | confirmed |
| SET002 | IS ref (doc) | 2025-01-02 | 2025-12-31 | confirmed |
| SET002 | OOS (ST) | 2026-01-01 | 2026-05-08 | confirmed |
| SET003_WF01 | IS | 2025-01-02 | 2025-04-30 | confirmed |
| SET003_WF01 | forward | 2025-05-01 | 2025-08-31 | confirmed |
| SET004_WF02 | IS | 2025-05-01 | 2025-08-31 | confirmed |
| SET004_WF02 | forward | 2025-09-01 | 2025-12-31 | confirmed |
| SET005_WF03 | IS | 2025-09-01 | 2025-12-31 | confirmed |
| SET005_WF03 | forward | 2026-01-01 | 2026-05-08 | confirmed |

**Símbolo / TF / HTF:** `XAUUSD` / `M15` / `D1`.

---

## 5. Nota — solapamiento SET002 OOS y WF03 forward

| Segmento | Rango calendario |
|----------|------------------|
| SET002 OOS (ST) | **2026-01-01** → **2026-05-08** |
| SET005_WF03 forward | **2026-01-01** → **2026-05-08** |

**Intencional** en la primera campaña de robustez:

| Rol | Propósito |
|-----|-----------|
| **SET002** | Mide el tramo final 2026 como **validación OOS standalone** (conjunto E, `OOS_VALIDATION`) |
| **WF03 forward** | Mide el **mismo** tramo 2026 como periodo forward tras IS **2025-09-01 → 2025-12-31** (`WALK_FORWARD_WINDOW`) |

**Reglas de reporting:**

- **No fusionar** métricas SET002 y WF03 en una sola fila de matriz o narrativa agregada.
- **Roles separados** en `bundle_id`, `run_role`, carpetas [`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md) y plantilla [`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md).
- Comparación contra SET001 benchmark sigue siendo obligatoria en cada bundle.

---

## 6. Restricciones de ejecución (antes / durante E5.24.2+)

| # | Restricción |
|---|-------------|
| 1 | Verificar que MT5 Strategy Tester puede fijar **From/To** exactos por segmento §4 |
| 2 | `XAUUSD` **M15**; sesgo **D1** |
| 3 | Mismo **preset / parameter set** oficial que SET001 |
| 4 | **Sin** optimización en SET002 OOS ni tramos forward WF |
| 5 | **Sin** live trading; exports TestEA `has_real_trading_orders=false` |
| 6 | **Sin** cambio entry / TP |
| 7 | **Sin** aprobación edge / 25 % / adaptive |
| 8 | **Sin** gates MQL5 desde evidencia de campaña |

---

## 7. Mapeo de ejecución futura

| Checkpoint | Acción |
|------------|--------|
| **E5.24.2** | SET002 OOS — evidencia ejecución Strategy Tester (`2026-01-01` → `2026-05-08`) |
| **E5.24.3** | SET002 — validación export + setup performance audit |
| **E5.24.4** | WF01 forward — evidencia ST |
| **E5.24.5** | WF02 forward — evidencia ST |
| **E5.24.6** | WF03 forward — evidencia ST |
| **E5.24.7** | Resumen robustez / actualización matriz conjunto E |

Orden: **SET002 OOS antes de WF01–03** (plan E5.24 §8).

---

## 8. Gobernanza

| Acción | Estado en E5.24.1.4 |
|--------|----------------------|
| MQL5 / TypeScript | **No** |
| MT5 / ST en esta tarea | **No** |
| Ejecutar SET002 | **No** (solo E5.24.2+) |
| Optimizador / live / gates | **No** |
| Entry / TP / edge approval | **No** |
| Canales (Telegram/dashboard/email/push) | **No** |
| Commitear `_local_*` | **No** |

---

## Referencias

- [`PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md`](./PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md)
- [`ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md`](./ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md)
- [`SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md`](./SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md)
- [`XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md`](./XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md)
- [`XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md`](./XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md)
- [`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md)
- [`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md)
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
