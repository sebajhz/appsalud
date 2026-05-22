# Proposed Robustness Date Splits — E5.24.1.3

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.24.1.3 — tabla propuesta de splits de fechas (re-corte) |
| **Tipo** | Proposed date splits — **sin ejecución** |
| **Baseline Git** | `f05d8fb` o posterior — `docs(mapazapp): E5.24.1.2 choose robustness recut split` |
| **Decisión PM** | Opción B — re-corte ([`ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md`](./ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md)) |
| **`campaign_id`** | `MZP_XAUUSD_M15_E5_24_ROBUSTNESS_001` |
| **`profile_id`** | `XAUUSD_M15_Profile_V1` |
| **Estado filas** | **`proposed_pending_pm_confirmation`** — no confirmadas |
| **Siguiente** | PM/operador confirma o ajusta → E5.24.1.4 o `DATE_RANGES_CONFIRMED` → E5.24.2 |
| **Sin cambios** | MQL5, TypeScript, MT5, ST, optimizador, gates, live, entry/TP, edge/25/adaptive, Telegram/dashboard/email/push |

---

## 1. Baseline Git

| Campo | Valor |
|-------|-------|
| **Checkpoint previo** | `f05d8fb` — `docs(mapazapp): E5.24.1.2 choose robustness recut split` |
| **Cadena** | E5.24.1 → E5.24.1.1 → E5.24.1.2 → **E5.24.1.3** |

---

## 2. Por qué existe E5.24.1.3

**E5.24.1.2** eligió **Opción B — re-corte** porque los trades observados de SET001 ya cubren **2025-01-02T03:00:00Z** hasta **2026-05-08T23:30:00Z**; un OOS estricto solo después de 2026-05-08 sería demasiado corto.

**E5.24.1.3** propone rangos **concretos candidatos** para:

- SET002 OOS (re-corte)
- WF01, WF02, WF03 (IS + forward)

**Todas las fechas son `proposed`** hasta confirmación PM/operador en MT5. **No** autoriza ejecución Strategy Tester.

---

## 3. Referencia histórica observada

| Campo | Valor |
|-------|-------|
| **Fuente** | [`SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md`](./SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md) — `entry_time` UTC en CSV |
| **Rango observado (trades)** | **2025-01-02T03:00:00Z** → **2026-05-08T23:30:00Z** |
| **Rango calendario (referencia splits)** | **2025-01-02** → **2026-05-08** (fechas propuestas alineadas a días de mercado) |

### Caveat

| Punto | Detalle |
|-------|---------|
| CSV vs ST | Rango observado = **actividad de trades**, no From/To exactos del Strategy Tester |
| `tester_from` / `tester_to` | Siguen **`needs_operator_confirmation`** en summary SET001 |
| Ajuste PM | Operador puede desplazar límites si MT5 history o sesiones lo exigen |

---

## 4. Filosofía del re-corte propuesto

| Principio | Aplicación |
|-----------|------------|
| SET001 benchmark | Corrida completa existente — **no** re-ejecutar en E5.24.1.3 |
| Segmentos dentro del histórico | Todos los splits propuestos ⊆ ~2025-01-02 … 2026-05-08 |
| OOS / forward sin optimizar | Mismo preset oficial 50 % / CE + RR2 que SET001 |
| Reporting separado | Cada OOS y cada forward WF = bundle/evidencia propia ([`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md)) |
| Ventanas fail visibles | Sin ocultar en agregado |
| Sin promoción desde un segmento | Un tramo positivo **no** aprueba estrategia ni entry/TP |
| Confirmación antes de ST | **No** E5.24.2 hasta PM marca rangos `confirmed` |

---

## 5. Tabla de splits de fechas propuestos

**Convención fechas:** inclusive por día calendario (MT5 Strategy Tester From/To a confirmar en zona/sesión del terminal). **`status`:** `proposed` → mapeo global `proposed_pending_pm_confirmation`.

### SET001 — `BENCHMARK_REFERENCE`

| Campo | Valor |
|-------|-------|
| **bundle_id** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **role** | `full_benchmark_reference` |
| **range_start** | `2025-01-02` |
| **range_end** | `2026-05-08` |
| **status** | `proposed` (referencia; corrida ya existe) |
| **notes** | Benchmark existente E5.22; **no** rerun en esta tarea; no único ancla IS |

### SET002 — `OOS_VALIDATION_RECUT`

| Campo | Valor |
|-------|-------|
| **bundle_id** | `SET002_FVG2_RR2_00_BIASBODY0_RALIGN1_OOS` |
| **run_role** | `OOS_VALIDATION` |
| **is_reference_start** | `2025-01-02` |
| **is_reference_end** | `2025-12-31` |
| **oos_start** | `2026-01-01` |
| **oos_end** | `2026-05-08` |
| **status** | `proposed` |
| **notes** | Mismos parámetros oficiales 50 %/CE + RR2; **sin** optimización en OOS; IS de referencia documenta contexto re-corte (no corrida ST separada obligatoria salvo PM lo exija) |

### SET003_WF01 — `WALK_FORWARD_WINDOW`

| Campo | Valor |
|-------|-------|
| **bundle_id** | `SET003_FVG2_RR2_00_BIASBODY0_RALIGN1_WF01` |
| **is_start** | `2025-01-02` |
| **is_end** | `2025-04-30` |
| **forward_start** | `2025-05-01` |
| **forward_end** | `2025-08-31` |
| **status** | `proposed` |

### SET004_WF02 — `WALK_FORWARD_WINDOW`

| Campo | Valor |
|-------|-------|
| **bundle_id** | `SET004_FVG2_RR2_00_BIASBODY0_RALIGN1_WF02` |
| **is_start** | `2025-05-01` |
| **is_end** | `2025-08-31` |
| **forward_start** | `2025-09-01` |
| **forward_end** | `2025-12-31` |
| **status** | `proposed` |

### SET005_WF03 — `WALK_FORWARD_WINDOW`

| Campo | Valor |
|-------|-------|
| **bundle_id** | `SET005_FVG2_RR2_00_BIASBODY0_RALIGN1_WF03` |
| **is_start** | `2025-09-01` |
| **is_end** | `2025-12-31` |
| **forward_start** | `2026-01-01` |
| **forward_end** | `2026-05-08` |
| **status** | `proposed` |

### Tabla resumen (MT5-oriented)

| bundle_id | segment | start | end | status |
|-----------|---------|-------|-----|--------|
| SET001 | benchmark | 2025-01-02 | 2026-05-08 | proposed (reference) |
| SET002 | IS ref (doc) | 2025-01-02 | 2025-12-31 | proposed |
| SET002 | OOS | 2026-01-01 | 2026-05-08 | proposed |
| SET003_WF01 | IS | 2025-01-02 | 2025-04-30 | proposed |
| SET003_WF01 | forward | 2025-05-01 | 2025-08-31 | proposed |
| SET004_WF02 | IS | 2025-05-01 | 2025-08-31 | proposed |
| SET004_WF02 | forward | 2025-09-01 | 2025-12-31 | proposed |
| SET005_WF03 | IS | 2025-09-01 | 2025-12-31 | proposed |
| SET005_WF03 | forward | 2026-01-01 | 2026-05-08 | proposed |

**HTF bias:** `D1` en todos los bundles. **Símbolo / TF:** `XAUUSD` / `M15`.

---

## 6. Por qué estas fechas son razonables (propuesta)

| Criterio | Cómo se cumple |
|----------|----------------|
| Dentro del histórico observado | Todos los extremos ⊆ 2025-01-02 … 2026-05-08 |
| OOS en 2026 | SET002 OOS **2026-01-01 → 2026-05-08** (~5 meses) — evita OOS post-2026-05-08 demasiado corto |
| WF cronológico | WF01 forward termina 2025-08-31; WF02 IS empieza 2025-05-01 (solapamiento IS con forward WF01 **no** — IS WF02 = mismo tramo que forward WF01 por diseño rolling); WF03 cierra en 2026-05-08 |
| Duración por ventana | Cada forward ≈ **4 meses**; IS WF ≈ **4 meses** |
| Sin optimización OOS/forward | Política campaña E5.24 + E5.24.1.2 |
| Confirmación MT5 pendiente | History download, festivos, y From/To exactos pueden requerir **ajuste ± días** |

**Nota diseño WF:** WF02 `is_start` = 2025-05-01 alinea el IS de WF02 con el tramo inmediatamente anterior al forward WF02 (patrón walk-forward rolling). PM puede ajustar si prefiere IS/forward sin solapamiento de calendario entre ventanas.

---

## 7. Checklist PM/operador (antes de E5.24.2)

- [ ] MT5 tiene **historia** para todos los rangos propuestos (XAUUSD M15 + D1 bias)
- [ ] Strategy Tester permite fijar **From/To** exactos por segmento
- [ ] Confirmar o ajustar fechas **SET002 OOS** (2026-01-01 → 2026-05-08 propuesto)
- [ ] Confirmar **WF01** IS (2025-01-02 → 2025-04-30) y forward (2025-05-01 → 2025-08-31)
- [ ] Confirmar **WF02** IS y forward
- [ ] Confirmar **WF03** IS y forward (forward hasta 2026-05-08)
- [ ] **Sin** optimización accidental en OOS ni tramos forward
- [ ] Mismo **preset / parameter set** oficial que SET001
- [ ] `XAUUSD`, `M15`, sesgo `D1`
- [ ] **Sin** live trading; `has_real_trading_orders=false` en exports TestEA
- [ ] Registrar decisión en `99_notes/DATE_RANGES_CONFIRMED.md` (carpeta campaña MT5)

---

## 8. Mapeo de estados

| Estado | Significado |
|--------|-------------|
| **`proposed`** (por fila) | Candidato E5.24.1.3 — no ejecutar ST |
| **`proposed_pending_pm_confirmation`** (global) | Todas las filas SET002/WF pendientes de PM |
| **`confirmed`** (futuro) | Tras E5.24.1.4 o doc `DATE_RANGES_CONFIRMED` aprobado por PM |
| **`blocked`** (futuro) | PM rechaza propuesta — requiere nueva E5.24.1.x |

**Regla:** **No** iniciar **E5.24.2** mientras el estado global sea `proposed_pending_pm_confirmation`.

---

## 9. Mapeo de ejecución futura (tras confirmación)

| Checkpoint | Acción |
|------------|--------|
| **E5.24.2** | SET002 OOS — evidencia Strategy Tester |
| **E5.24.3** | SET002 — `testea-export-validate` + setup performance audit |
| **E5.24.4** | WF01 forward — evidencia ST |
| **E5.24.5** | WF02 forward — evidencia ST |
| **E5.24.6** | WF03 forward — evidencia ST |
| **E5.24.7** | Resumen robustez / matriz conjunto E |

Orden: **SET002 OOS antes de WF01–03** (plan E5.24 §8).

---

## 10. Gobernanza

| Acción | Estado en E5.24.1.3 |
|--------|------------------------|
| MQL5 / TypeScript | **No** |
| MT5 / ST / optimizador | **No** |
| Live / gates | **No** |
| Cambio entry / TP | **No** |
| Edge / 25 / adaptive approval | **No** |
| Telegram / dashboard / email / push | **No** |
| Ejecutar campaña / rerun SET001 | **No** |
| Commitear `_local_*` | **No** |
| Tratar `proposed` como `confirmed` | **Prohibido** |

---

## Referencias

- [`ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md`](./ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md)
- [`SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md`](./SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md)
- [`XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md`](./XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md)
- [`XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md`](./XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md)
- [`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md)
- [`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md)
- [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md)
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
