# XAUUSD M15 Robustness Date Ranges — E5.24.1

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.24.1 — confirmación rangos de fechas OOS / walk-forward |
| **Tipo** | Date range confirmation checkpoint — **sin ejecución** |
| **Baseline Git** | `0a9b46d` o posterior — `docs(mapazapp): E5.24 plan XAUUSD robustness campaign` |
| **Plan padre** | [`XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md`](./XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md) — **cerrado (plan docs)** |
| **`campaign_id`** | `MZP_XAUUSD_M15_E5_24_ROBUSTNESS_001` |
| **E5.24.1.1** | [`SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md`](./SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md) — **cerrado (docs)** |
| **E5.24.1.2** | [`ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md`](./ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md) — PM **Opción B** re-corte |
| **E5.24.1.3** | [`PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md`](./PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md) — **cerrado (docs)** |
| **E5.24.1.4** | [`CONFIRMED_ROBUSTNESS_DATE_RANGES_E5_24_1_4.md`](./CONFIRMED_ROBUSTNESS_DATE_RANGES_E5_24_1_4.md) — **cerrado (docs)** — `confirmed` |
| **Decisión** | Fechas campaña **confirmadas** — listo E5.24.2 |
| **Siguiente** | E5.24.2 SET002 OOS ST |
| **Sin cambios** | MQL5, TypeScript, MT5, ST, optimizador, gates, live, entry/TP, edge/25/adaptive, Telegram/dashboard/email/push |

---

## 1. Por qué existe E5.24.1

**E5.24** planificó la campaña de robustez `MZP_XAUUSD_M15_E5_24_ROBUSTNESS_001` (bundles SET002 OOS y WF01–WF03, evidencia, criterios pass/warning/fail).

**Ninguna ejecución OOS ni walk-forward en Strategy Tester debe comenzar** hasta que el PM/operador confirme los rangos exactos de fechas del tester MT5 para cada bundle.

| Sin E5.24.1 | Con E5.24.1 |
|-------------|-------------|
| Riesgo de solapamiento IS/OOS | Tabla explícita con `overlap_allowed` |
| Fechas inventadas por tooling | Placeholders + `needs_operator_confirmation` |
| WF fuera de orden cronológico | Reglas WF documentadas antes de ST |
| Curva invisible por re-optimización en OOS/forward | `selected_parameters_source` fijado a SET001 oficial |

**E5.24.1 no ejecuta** MT5, Strategy Tester, optimizador ni la campaña E5.24.

---

## 2. Baseline actual

| Campo | Valor |
|-------|-------|
| **Perfil** | `XAUUSD_M15_Profile_V1` |
| **Bundle baseline** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **Build** | `MZP_TestEA_E5_18` |
| **Oficial** | 50 % / CE entry, RR2 TP |
| **`run_role`** | `IS_BASELINE` (corrida completa; **benchmark global** tras E5.24.1.2) |
| **`comparison_set`** | `official_baseline_set` (A) |

### Hechos conocidos (E5.22)

| Métrica | Valor |
|---------|------:|
| `trade_count` | 1697 |
| `total_r` | +315 |
| `winrate` | 44.77 % |
| `max_drawdown_r` | 13 |
| `ambiguous_count` | 436 |

Fuentes: [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md), [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md).

### Rango de fechas SET001 (IS)

| Fuente | `is_start` / `is_end` |
|--------|------------------------|
| `backtest_summary.json` (export SET001 E5.22) | **`tester_from` / `tester_to` no expuestos** en inspección operador — solo `execution_timeframe=M15`, `daily_bias_timeframe=D1` + métricas ([`SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md`](./SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md) §3) |
| `backtest_trades.csv` (`entry_time` UTC) | **Observado (trades):** `2025-01-02T03:00:00Z` → `2026-05-08T23:30:00Z` — **no** equivale a From/To ST exacto (§7 E5.24.1.1) |
| Docs evidencia E5.22 | Métricas y bundle path — **sin** fechas ST explícitas |
| MT5 Strategy Tester From/To | **`needs_operator_confirmation`** |

**Estado MT5 ST:** **`needs_operator_confirmation`**.

**Decisión PM (E5.24.1.2):** **Opción B — re-corte**. Fechas **confirmadas** → [`CONFIRMED_ROBUSTNESS_DATE_RANGES_E5_24_1_4.md`](./CONFIRMED_ROBUSTNESS_DATE_RANGES_E5_24_1_4.md).

---

## 3. Decisiones de rango requeridas

Cada fila de la tabla §4 debe quedar en `confirmed` antes de E5.24.2+.

### SET001 — `IS_BASELINE`

| Requisito | Detalle |
|-----------|---------|
| Rol | **Benchmark/referencia global** (no único ancla IS post E5.24.1.2) |
| Parámetros | Oficiales SET001 — sin re-optimizar |
| Fechas | Trades observados UTC (E5.24.1.1); ST From/To → **needs operator confirmation** |
| Solapamiento | SET002/WF re-cortados **dentro** histórico; segmentos IS/OOS/WF **no** se solapan entre sí |

### SET002 — `OOS_VALIDATION`

| Requisito | Detalle |
|-----------|---------|
| Parámetros | **Mismos** que SET001 oficial (`FVG2`, `RR2_00`, `BIASBODY0`, `RALIGN1`) |
| Optimización | **Prohibida** en tramo OOS |
| Solapamiento | **No** solapar tramos IS/OOS del re-corte (distintos de la corrida SET001 completa como benchmark) |
| `selected_parameters_source` | `from_SET001_official_params` (mismo preset; no optimizer en OOS) |
| Diseño | **Re-corte** E5.24.1.2 — fechas en E5.24.1.3 |
| Carpeta planificada | `02_out_of_sample/` — ver [`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md) |

### SET003_WF01 — `WALK_FORWARD_WINDOW`

| Requisito | Detalle |
|-----------|---------|
| Segmentos | Tramo **IS** + tramo **forward** documentados por separado |
| Orden | `forward` **después** de `is_end` |
| Optimización | **Prohibida** en tramo forward |
| `selected_parameters_source` | `from_SET001_IS_BASELINE` (robustez con params oficiales fijos — sin re-opt en forward salvo campaña futura explícita) |
| Evidencia | Plantilla [`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md) |

### SET004_WF02 — `WALK_FORWARD_WINDOW`

| Requisito | Detalle |
|-----------|---------|
| Cronología | Ventana **posterior** a WF01 (o excepción documentada en `operator_note`) |
| Misma política IS/forward | Que WF01 |

### SET005_WF03 — `WALK_FORWARD_WINDOW`

| Requisito | Detalle |
|-----------|---------|
| Cronología | Ventana **posterior** a WF02 (o excepción documentada) |
| Reporting | Cada ventana **por separado** — ventanas `fail` visibles |

---

## 4. Tabla de rangos de fechas

**Leyenda `status`:** `needs_operator_confirmation` | `proposed` | `proposed_pending_pm_confirmation` | `confirmed` | `blocked`

**Splits propuestos (E5.24.1.3):** ver [`PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md`](./PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md) — tabla canónica.

| bundle_id | run_role | profile_id | campaign_id | symbol | timeframe | is_start | is_end | forward_or_oos_start | forward_or_oos_end | overlap_allowed | selected_parameters_source | status | operator_note |
|-----------|----------|------------|-------------|--------|-----------|----------|--------|----------------------|--------------------|-----------------|---------------------------|--------|---------------|
| `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` | `IS_BASELINE` | `XAUUSD_M15_Profile_V1` | `MZP_XAUUSD_M15_E5_24_ROBUSTNESS_001` | `XAUUSD` | `M15` | `2025-01-02` | `2026-05-08` | — | — | n/a (benchmark) | `SET001_official_baseline` | `confirmed` | Benchmark ref; E5.24.1.4 |
| `SET002_FVG2_RR2_00_BIASBODY0_RALIGN1_OOS` | `OOS_VALIDATION` | `XAUUSD_M15_Profile_V1` | `MZP_XAUUSD_M15_E5_24_ROBUSTNESS_001` | `XAUUSD` | `M15` | `2025-01-02` | `2025-12-31` | `2026-01-01` | `2026-05-08` | `false` | `from_SET001_official_params` | `confirmed` | OOS ST 2026-01-01→2026-05-08; overlap WF03 forward intencional |
| `SET003_FVG2_RR2_00_BIASBODY0_RALIGN1_WF01` | `WALK_FORWARD_WINDOW` | `XAUUSD_M15_Profile_V1` | `MZP_XAUUSD_M15_E5_24_ROBUSTNESS_001` | `XAUUSD` | `M15` | `2025-01-02` | `2025-04-30` | `2025-05-01` | `2025-08-31` | `false` | `from_SET001_official_params` | `confirmed` | WF01 |
| `SET004_FVG2_RR2_00_BIASBODY0_RALIGN1_WF02` | `WALK_FORWARD_WINDOW` | `XAUUSD_M15_Profile_V1` | `MZP_XAUUSD_M15_E5_24_ROBUSTNESS_001` | `XAUUSD` | `M15` | `2025-05-01` | `2025-08-31` | `2025-09-01` | `2025-12-31` | `false` | `from_SET001_official_params` | `confirmed` | WF02 |
| `SET005_FVG2_RR2_00_BIASBODY0_RALIGN1_WF03` | `WALK_FORWARD_WINDOW` | `XAUUSD_M15_Profile_V1` | `MZP_XAUUSD_M15_E5_24_ROBUSTNESS_001` | `XAUUSD` | `M15` | `2025-09-01` | `2025-12-31` | `2026-01-01` | `2026-05-08` | `false` | `from_SET001_official_params` | `confirmed` | WF03; mismo calendario forward que SET002 OOS — roles separados |

**HTF bias (todas las filas):** `D1` — coherente con perfil y plan E5.24.

**Placeholder `TBD`:** sustituir por fechas ISO (o datetime MT5) **solo** tras confirmación operador — **no** inventar fechas en repo.

---

## 5. Reglas para selección de fechas

| # | Regla |
|---|-------|
| 1 | **OOS no se optimiza** — SET002 usa parámetros oficiales fijos de SET001 |
| 2 | **OOS no solapa IS** — tramo OOS distinto del tramo IS baseline documentado |
| 3 | **WF forward no se optimiza** — evaluación con params ya seleccionados |
| 4 | **Ventanas WF cronológicas** — WF02 ≥ WF01, WF03 ≥ WF02 (en tiempo de mercado) |
| 5 | **Cada ventana documentada por separado** — no fusionar métricas IS+forward en una fila de matriz E |
| 6 | **Ventanas fallidas visibles** — `fail`/`invalid` permanecen en tabla y agregado WF ([`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md) §10–11) |
| 7 | **No inventar fechas** — Cursor/repo solo placeholders hasta confirmación PM |
| 8 | **Confirmación escrita** — operador actualiza `99_notes/DATE_RANGES_CONFIRMED.md` (ruta campaña MT5 o copia en docs tras aprobación PM) |
| 9 | **Engine-first** — confirmar fechas **antes** de abrir MT5 Strategy Tester para SET002/WF |

---

## 6. Requisito de confirmación del operador

> **El PM/operador debe confirmar los rangos exactos de fechas del MetaTrader 5 Strategy Tester para SET001 (referencia IS), SET002 (OOS) y SET003_WF01–SET005_WF03 (IS + forward por ventana) antes de iniciar la ejecución E5.24.2.**

Checklist operador (mínimo):

- [ ] Registrar `is_start` / `is_end` de SET001 (corrida histórica E5.22 o re-documentación ST)
- [ ] Proponer `forward_or_oos_start` / `forward_or_oos_end` de SET002 sin solapar SET001
- [ ] Definir pares IS/forward para WF01, WF02, WF03 en orden cronológico
- [ ] Verificar preset `.set` = parámetros oficiales SET001 para todos los bundles de robustez
- [ ] Marcar filas de §4 como `confirmed` en `DATE_RANGES_CONFIRMED.md`
- [ ] **No** ejecutar optimizador en OOS ni en tramos forward WF

**`governance_status`:** `dates_confirmed` (E5.24.1.4). Opcional: copiar §4 a `99_notes/DATE_RANGES_CONFIRMED.md` en ejecución E5.24.2.

---

## 7. Mapeo de ejecución futura (tras confirmar fechas)

| Checkpoint | Acción |
|------------|--------|
| **E5.24.2** | SET002 OOS — evidencia ejecución Strategy Tester |
| **E5.24.3** | SET002 — validación export + setup performance audit |
| **E5.24.4** | WF01 — evidencia ejecución (forward leg) |
| **E5.24.5** | WF02 — evidencia ejecución |
| **E5.24.6** | WF03 — evidencia ejecución |
| **E5.24.7** | Resumen robustez / actualización matriz conjunto E |

Orden de campaña (plan E5.24 §8): **SET002 OOS antes de WF01–03**.

---

## 8. Gobernanza

| Acción | Estado en E5.24.1 |
|--------|-------------------|
| Cambios MQL5 | **No** |
| Cambios TypeScript / tooling | **No** |
| MT5 / Strategy Tester / optimizador | **No** |
| Live / gates | **No** |
| Cambio entry / TP | **No** |
| Aprobación edge / 25 % / adaptive | **No** |
| Telegram / dashboard / email / push | **No** |
| Ejecutar campaña robustez | **No** |
| Commitear `_local_*_DO_NOT_COMMIT` | **No** |

---

## Referencias

- [`XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md`](./XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md)
- [`WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md`](./WALK_FORWARD_CAMPAIGN_EVIDENCE_TEMPLATE_E5_23_4.md)
- [`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md)
- [`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md)
- [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md)
- [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md)
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
- [`SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md`](./SET001_OBSERVED_TRADE_RANGE_E5_24_1_1.md)
- [`ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md`](./ROBUSTNESS_RECUT_DATE_SPLIT_DECISION_E5_24_1_2.md)
- [`PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md`](./PROPOSED_ROBUSTNESS_DATE_SPLITS_E5_24_1_3.md)
- [`CONFIRMED_ROBUSTNESS_DATE_RANGES_E5_24_1_4.md`](./CONFIRMED_ROBUSTNESS_DATE_RANGES_E5_24_1_4.md)
