# XAUUSD M15 Robustness Campaign Plan — E5.24

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.24 — planificación campaña robustez `XAUUSD_M15_Profile_V1` |
| **Tipo** | Campaign plan — **sin ejecución** |
| **Baseline Git** | `14bf1e7` o posterior — `docs(mapazapp): E5.23.4 add walk-forward evidence template` |
| **Cadena E5.23** | Gobernanza · perfil · matriz · carpetas · plantilla WF — **cerrada (docs)** |
| **Decisión** | **Docs-only planning** — autoriza preparación operador; **no** corre ST/optimizador |
| **E5.24.1** | [`XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md`](./XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md) — **cerrado (docs)** |
| **E5.24.1.1** | [`SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md`](./SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md) — **cerrado (docs)** |
| **E5.24.1.2** | [`ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md`](./ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md) — PM **Opción B** re-corte |
| **E5.24.1.3** | [`PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md`](./PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md) — **cerrado (docs)** |
| **E5.24.1.4** | [`CONFIRMED_ROBUSTNESS_DATE_RANGES_E5_24_1_4.md`](./CONFIRMED_ROBUSTNESS_DATE_RANGES_E5_24_1_4.md) — **cerrado (docs)** — fechas `confirmed` |
| **Siguiente** | E5.24.2 SET002 OOS ST |
| **Sin cambios** | MQL5, TypeScript, MT5, ST, optimizador, gates, live, entry/TP, edge/25/adaptive, Telegram/dashboard/email/push |

---

## 1. Por qué existe E5.24

**SET001** en `XAUUSD_M15_Profile_V1` es **positivo pero insuficiente** para aprobación de estrategia, gates, live o cambio entry/TP (+315R, ~26 % ambiguous, un solo bundle — ver §2).

La cadena **E5.23** cerró la estructura de gobernanza y evidencia:

| Checkpoint | Entregable |
|------------|------------|
| E5.23 | [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md) |
| E5.23.1 | [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md) |
| E5.23.2 | [`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md) |
| E5.23.3 | [`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md) |
| E5.23.4 | [`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md) |

**E5.24** planifica la **primera campaña de robustez** antes de cualquier nueva corrida MT5/Strategy Tester: qué bundles, en qué orden, con qué evidencia y criterios pass/warning/fail.

**E5.24 no ejecuta** la campaña.

---

## 2. Baseline actual

| Campo | Valor |
|-------|-------|
| **Perfil** | `XAUUSD_M15_Profile_V1` |
| **Bundle baseline** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **Build** | `MZP_TestEA_E5_18` |
| **Oficial** | 50 % / CE entry, RR2 TP |

### Hechos conocidos (E5.22.2.1)

| Métrica | Valor |
|---------|------:|
| `trade_count` | 1697 |
| `total_r` | +315 |
| `winrate` | 44.77 % |
| `max_drawdown_r` | 13 |
| `ambiguous_count` | 436 |
| R `candidate` + `wait` | +429 |
| R `reject` | -114 |

### Decisión baseline

| Aspecto | Estado |
|---------|--------|
| Motor en lab | **Positivo pero ruidoso** |
| Live / gates / entry·TP | **No aprobado** |
| Nivel promoción research | **0–1** (single bundle) hasta OOS/WF |

Fuentes: [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md), [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md).

---

## 3. Propósito de la campaña

La campaña de robustez debe probar si el comportamiento observado en SET001 **sobrevive** bajo:

| Eje de prueba | Pregunta |
|---------------|----------|
| Rangos de fechas distintos | ¿R y WR se mantienen fuera del período SET001? |
| Segmento OOS | ¿Parámetros oficiales fijos colapsan en OOS? |
| Ventanas walk-forward | ¿Estabilidad entre WF01–WF03? |
| Cambios de régimen | ¿Un mes/sesión/vol domina el resultado? |
| Estrés de ambigüedad | ¿Tasa ambiguous aceptable en forward? |
| Readiness / blockers | ¿Separación candidate/wait vs reject persiste? |
| IFVG / PD | ¿Patrones SET001 (IFVG negativo, PD no hard reject) se repiten? |
| Sensibilidad entry sim | ¿Edge/25/adaptive solo positivos en sim? (research-only) |

**No** es campaña de optimización de parámetros ni aprobación de variantes entry.

---

## 4. Identidad de campaña planificada

| Campo | Valor planificado |
|-------|-------------------|
| **`campaign_id`** | `MZP_XAUUSD_M15_E5_24_ROBUSTNESS_001` |
| **`profile_id`** | `XAUUSD_M15_Profile_V1` |
| **`symbol`** | `XAUUSD` |
| **`execution_timeframe`** | `M15` |
| **`htf_bias_timeframe`** | `D1` |
| **`entry_model`** | `official_50_ce` |
| **`tp_model`** | `RR2` |
| **`ea_build`** (objetivo) | `MZP_TestEA_E5_18` (confirmar en ejecución) |
| **`mode`** | **research / backtest only** |
| **`governance_status`** | `planned` — pendiente E5.24.1 |

---

## 5. Estructura de carpetas planificada

Según [`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md) — **documentado aquí; no crear/migrar carpetas MT5 en E5.24**.

```text
Mapazapp/TestEA/XAUUSD_M15_Profile_V1/campaigns/MZP_XAUUSD_M15_E5_24_ROBUSTNESS_001/
  00_profile/       # manifest campaña, preset ref, umbrales PM
  01_in_sample/     # SET001 referencia + futuros IS si aplica
  02_out_of_sample/ # SET002 OOS
  03_walk_forward/  # WF01, WF02, WF03
  04_reports/       # readiness reports derivados
  05_audits/        # performance baseline audits
  06_matrix/        # optimization_comparison_matrix.*
  99_notes/         # operador, rangos fechas confirmados, decisiones
```

**SET001 existente** puede permanecer en ruta histórica (`TestEA/E55/...`) hasta migración operador; el plan exige **metadata** que lo vincule a `01_in_sample/` como `IS_BASELINE`.

---

## 6. Bundles planificados

| ID planificado | `run_role` | `comparison_set` | Estado |
|--------------|------------|------------------|--------|
| **SET001** | `IS_BASELINE` / **benchmark global** | A (`official_baseline_set`) | **Existente** — referencia E5.22; no único ancla IS (E5.24.1.2) |
| **SET002** | `OOS_VALIDATION` (re-corte) | E (`robustness_validation_set`) | **Planificado** — OOS dentro histórico; fechas E5.24.1.3 |
| **SET003_WF01** | `WALK_FORWARD_WINDOW` | E | **Planificado** — forward leg WF01 |
| **SET004_WF02** | `WALK_FORWARD_WINDOW` | E | **Planificado** — forward leg WF02 |
| **SET005_WF03** | `WALK_FORWARD_WINDOW` | E | **Planificado** — forward leg WF03 |
| **SET006** (opcional) | `ENTRY_VARIANT_RESEARCH` | D | **Diferido** — tras OOS/WF core |
| **SET007** (opcional) | `HUMANIZED_DELTA_RESEARCH` | C | **Diferido** — tras simulador E5.22.5.2+ |

### Naming sugerido (carpeta export)

| Bundle | Nombre carpeta ejemplo |
|--------|------------------------|
| SET002 | `SET002_FVG2_RR2_00_BIASBODY0_RALIGN1_OOS` |
| SET003_WF01 | `SET003_FVG2_RR2_00_BIASBODY0_RALIGN1_WF01` |
| SET004_WF02 | `SET004_FVG2_RR2_00_BIASBODY0_RALIGN1_WF02` |
| SET005_WF03 | `SET005_FVG2_RR2_00_BIASBODY0_RALIGN1_WF03` |

---

## 7. Política de rangos de fechas

**No se inventan fechas exactas** en este plan — el operador y PM deben confirmarlas antes de E5.24.1.

| Regla | Detalle |
|-------|---------|
| IS vs OOS | **Sin solapamiento** entre tramos del re-corte (E5.24.1.2); SET001 = benchmark corrida completa |
| OOS | **Sin optimización**; mismos parámetros oficiales SET001; **re-corte** dentro histórico (~2025-01-02 → 2026-05-08 observado) |
| WF | Ventanas **cronológicas**; cada forward reportado por separado ([`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md)) |
| Metadata | `date_range_start`, `date_range_end`, `sample_segment` en `bundle_manifest` / `99_notes/` |
| Confirmación | Operador documenta rangos exactos MT5 ST en `99_notes/DATE_RANGES_CONFIRMED.md` — ver [`XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md`](./XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md) |
| SET001 | Benchmark global; trades **2025-01-02T03:00:00Z → 2026-05-08T23:30:00Z** (E5.24.1.1); ST From/To: **`needs_operator_confirmation`** |
| Política fechas | Re-corte PM Opción B; splits **confirmados** [`CONFIRMED_ROBUSTNESS_DATE_RANGES_E5_24_1_4.md`](./CONFIRMED_ROBUSTNESS_DATE_RANGES_E5_24_1_4.md) — SET002 OOS 2026-01-01→2026-05-08 |

---

## 8. Orden de ejecución (futuro — operador)

**Ningún paso se ejecuta en E5.24.**

| Step | Acción |
|------|--------|
| **1** | Confirmar último build TestEA (`MZP_TestEA_E5_18` o posterior documentado); compilar si PM lo exige |
| **2** | Correr **SET002** OOS — mismo preset/params oficiales SET001; rango OOS confirmado |
| **3** | `mapazapp:testea-export-validate` sobre export SET002 |
| **4** | `mapazapp:testea-setup-performance-baseline-audit` sobre SET002 |
| **5** | Fila matriz SET002 en conjunto E ([`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md)) |
| **6** | Solo si OOS plan aceptado: WF01 → WF02 → WF03 (ST forward por ventana) |
| **7** | Por cada WF: validar export, audit, rellenar plantilla E5.23.4, agregado WF, filas matriz E |
| **8** | Decisión campaña PASS/WARNING/FAIL/INVALID + actualizar `06_matrix/` y docs evidencia |

WF **no** precede a OOS en este plan (reduce riesgo de planificar WF sin ancla OOS).

---

## 9. Evidencia obligatoria por bundle (planificado)

Cada bundle ejecutado debe producir:

| Artefacto | Obligatorio |
|-----------|-------------|
| `backtest_summary.json` | Sí (raw) |
| `backtest_trades.csv` | Sí (raw) |
| `backtest_events.csv` | Sí (raw) |
| Resultado `testea-export-validate` | Sí |
| `setup_performance_baseline_audit` JSON/CSV | Sí |
| Readiness report | Si política campaña / PM lo pide |
| Fila(s) matriz comparación | Sí — conjunto correcto A/E/D |
| Notas operador | Sí — `99_notes/<bundle_id>.md` |

Almacenamiento: `_local_*_DO_NOT_COMMIT` bajo `APP/artifacts/mapazapp/docs/` **o** árbol campaña MT5 según gobernanza — **no** commitear raw masivo sin aprobación PM.

---

## 10. Comparaciones requeridas

Toda evidencia SET002 y WF se compara explícitamente contra **SET001** (baseline A).

### Core performance

`trade_count`, `total_r`, `avg_r`, `winrate`, `max_drawdown_r`, `ambiguous_count`, `expired_unfilled_count`

### Readiness

`candidate_count` / `wait_count` / `reject_count` y R por segmento

### Blockers (top)

`ifvg_conflict`, `pd_conflict`, `structure_conflict`, `execution_environment_weak` — performance agregada

### Research-only (opcional / diferido)

| Conjunto | Contenido |
|----------|-----------|
| D | Entry 25 / adaptive / edge — **no** mezclar con filas A/E |
| C | Humanized delta — **solo** si simulador E5.22.5.2+ existe |

Tabla resumen en `06_matrix/` + narrativa en evidencia WF ([`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md)).

---

## 11. Criterios pass / warning / fail / invalid (planificación)

Umbrales **cualitativos** de gobernanza — no código MQL5. PM puede acotar números en `00_profile/THRESHOLDS.md` en ejecución.

### PASS candidate (bundle o ventana)

- `total_r` forward/OOS **positivo**
- `max_drawdown_r` **aceptable** vs baseline (orden ~13R SET001 como referencia, no techo duro aquí)
- `trade_count` **suficiente** para lectura estadística
- Validación export **sin errors**
- Readiness **sigue separando** (candidate+wait vs reject no invertidos sin explicación)
- Sin colapso OOS severo vs SET001

### WARNING

- Positivo o **near-flat** con alta `ambiguous`, DD elevado, trade_count bajo, o inconsistencia blocker leve

### FAIL

- `total_r` **negativo**, colapso OOS, DD severo, inversión readiness, contradicciones IFVG/PD vs trade cards sin nota

### INVALID

- Archivos crudos faltantes, validación fallida, metadata `run_role` mezclada, `has_real_trading_orders=true`

Alineado con clasificación ventana E5.23.4 §10.

---

## 12. Condiciones bloqueantes (promoción)

La campaña **no** puede subir nivel research (≥2) ni implicar gates/live si:

| Bloqueo | Condición |
|---------|-----------|
| Colapso OOS | SET002 << SET001 sin explicación |
| WF mayormente fail | `fail_count` > umbral PM en agregado WF |
| Drawdown inaceptable | `max_window_drawdown` o SET002 DD fuera de límite |
| Ambiguity domina | Tasa >> baseline ~25.7 % sin mitigación documentada |
| Solo edge positivo | Única mejora en conjunto D sim |
| Readiness deja de separar | reject outperform candidate en forward |
| IFVG/PD vs trade cards | Contradicción sin `99_notes/` |
| Evidencia incompleta | Metadata/archivos faltantes |
| Trading real | Cualquier bundle con `has_real_trading_orders=true` |

---

## 13. Relación con humanized delta

| Aspecto | Plan E5.24 |
|---------|------------|
| Estado | [`HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md`](./HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md) — **no implementado** |
| SET007 | Opcional futuro; **no** requisito para cerrar E5.24.1 core |
| Paralelo | E5.22.5.x puede avanzar sin bloquear OOS/WF |

---

## 14. Relación con optimización

| Regla | Detalle |
|-------|---------|
| Tipo campaña | **Robustez** — validar params oficiales existentes |
| Optimizador MT5 | **No** en alcance E5.24 plan |
| Inicio optimización | **Después** de workflow OOS/WF + carpetas claros |
| Promoción parameter set | **Ninguna** desde este documento de planificación |

Principio: [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md) — optimization discovers candidates; no aprueba estrategia.

---

## 15. Checklist de ejecución futura (operador)

Usar en **E5.24.1** (evidencia ejecución), no en E5.24.

- [ ] Git limpio; commit docs E5.24 plan leído
- [ ] Confirmar `MZP_TestEA_E5_18` (o build PM) — compile log 0 errors
- [ ] Confirmar preset `.set` = parámetros SET001 oficiales
- [ ] PM + operador confirman **rangos exactos** OOS y WF → `99_notes/DATE_RANGES_CONFIRMED.md`
- [ ] Scaffold carpetas campaña (manual o futuro CLI) sin sobrescribir SET001 histórico
- [ ] **SET002:** carpeta nueva; ST; no optimizar en OOS
- [ ] Validar bundle SET002 (`testea-export-validate`)
- [ ] Audit SET002 (`testea-setup-performance-baseline-audit`)
- [ ] Fila matriz E para SET002
- [ ] **WF01–03:** solo tras revisión OOS; plantilla E5.23.4 por ventana
- [ ] Artefactos grandes → `_local_E5_24_*_DO_NOT_COMMIT` salvo evidencia docs aprobada
- [ ] **No** sobrescribir corridas previas
- [ ] Documentar decisión campaña PASS/WARNING/FAIL/INVALID
- [ ] **No** cambiar entry/TP; **no** activar gates; **no** live

---

## 16. Gobernanza

| Acción | Estado en E5.24 |
|--------|-----------------|
| MQL5 / TypeScript | **No** |
| MT5 / Strategy Tester / optimizador | **No** |
| Crear/migrar carpetas MT5 | **No** (solo plan) |
| Live / gates | **No** |
| Cambio entry / TP | **No** |
| Aprobación edge / 25 / adaptive | **No** |
| Telegram / dashboard / email / push | **No** |
| Commitear `_local_*` | **No** en plan |

---

## Referencias

- [`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md)
- [`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md)
- [`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md)
- [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md)
- [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md)
- [`HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md`](./HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md)
- [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md)
- [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md)
- [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md)
- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
- [`XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md`](./XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md)
- [`SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md`](./SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md)
- [`ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md`](./ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md)
- [`PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md`](./PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md)
- [`CONFIRMED_ROBUSTNESS_DATE_RANGES_E5_24_1_4.md`](./CONFIRMED_ROBUSTNESS_DATE_RANGES_E5_24_1_4.md)
