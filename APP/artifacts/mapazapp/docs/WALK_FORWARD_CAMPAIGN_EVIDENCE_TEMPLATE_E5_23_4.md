# Walk-forward Campaign Evidence Template — E5.23.4

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.23.4 — plantilla reutilizable de evidencia walk-forward |
| **Tipo** | Template / contract — **sin implementación** |
| **Baseline Git** | `b700648` o posterior — `docs(mapazapp): E5.23.3 define multi-bundle OOS campaign folders` |
| **Contrato carpetas** | [`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md) |
| **Matriz** | [`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md) |
| **Perfil lab** | [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md) |
| **Decisión** | **Docs-only template** — obliga documentación por ventana antes de E5.24 |
| **E5.24** | [`XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md`](./XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md) — **cerrado (plan docs)** |
| **E5.24.1** | [`XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md`](./XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md) — **cerrado (docs)** — tabla rangos WF/OOS |
| **Siguiente** | E5.24.4+ — ejecución WF (tras PM confirma fechas; SET002 OOS en E5.24.2–24.3) |
| **Sin cambios** | MQL5, TypeScript, MT5, ST, optimizador, gates, live, entry/TP, edge/25/adaptive, Telegram/dashboard/email/push |

---

## 1. Por qué existe E5.23.4

**E5.23.3** definió **dónde** vive la evidencia multi-bundle, OOS y walk-forward ([`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md)).

**E5.23.4** define **cómo** documentar cada ventana walk-forward **antes** de que **E5.24** ejecute campañas de robustez:

| Riesgo sin plantilla | Mitigación E5.23.4 |
|----------------------|-------------------|
| Cherry-picking de ventanas ganadoras | Tabla obligatoria de **todas** las ventanas WF01…WFnn |
| Agregado que oculta fallos | `fail_count`, `collapsed_window_count`, regla anti-override |
| IS/forward mezclados | Métricas forward **por ventana**; IS solo como contexto |
| Promoción desde un pico | `stable_window_ratio` + clasificación pass/warning/fail |

La plantilla es **reutilizable** para `XAUUSD_M15_Profile_V1` y perfiles futuros con el mismo contrato de carpetas.

---

## 2. Alcance

| Incluido | Excluido |
|----------|----------|
| Campos campaña/ventana, métricas, flags, clasificación | Correr MT5 / ST / optimizador |
| Cuerpo markdown reutilizable (§13) | Implementar generador CLI/JSON |
| Reglas promoción y anti-cherry-pick | MQL5, gates, live, cambio entry/TP |
| Relación matriz E5.23.2 y carpetas E5.23.3 | Aprobación edge/25/adaptive |

---

## 3. Concepto walk-forward

Una **campaña walk-forward (WF)** es una **secuencia de ventanas** donde:

1. En el tramo **in-sample (IS)** de la ventana se **seleccionan o calibran** parámetros (desde corrida IS previa u optimización documentada en IS — **nunca** en el tramo forward).
2. En el tramo **forward** inmediatamente siguiente se **evalúan** esos parámetros fijos sin re-optimizar en forward.
3. Cada ventana produce **evidencia forward separada** (bundle crudo + métricas + flags).
4. El **resumen agregado** resume todas las ventanas pero **no** sustituye la revisión de ventanas `fail` o `invalid`.

```text
WF01: [IS segment] → select params → [Forward segment] → report WF01
WF02: [IS segment] → select params → [Forward segment] → report WF02
...
```

**Regla PM:** un forward negativo documentado vale más que un `aggregate_total_r` positivo que omita esa ventana.

---

## 4. Campos de identidad de campaña (obligatorios)

Todo documento de evidencia WF (markdown en repo o `_local_*` operador) debe incluir al inicio:

| Campo | Ejemplo / notas |
|-------|-----------------|
| `profile_id` | `XAUUSD_M15_Profile_V1` |
| `campaign_id` | `MZP_XAUUSD_M15_E5_24_WF_V1` |
| `symbol` | `XAUUSD` |
| `timeframe` | `M15` |
| `htf_bias_timeframe` | `D1` |
| `ea_build` | `MZP_TestEA_E5_18` |
| `strategy_id` | p. ej. `MZP_IFVG_XAUUSD_V1` |
| `parameter_set_id` | `SET001` (base) o SET derivado documentado |
| `entry_model` | `official_50_ce` (salvo ventana research explícita) |
| `tp_model` | `RR2` |
| `campaign_folder` | ruta lógica bajo `03_walk_forward/` |
| `operator` | identificador operador |
| `created_at_utc` | ISO-8601 UTC |
| `governance_status` | `research_only` \| `blocked` \| `pending_e5_24` |

---

## 5. Campos obligatorios por ventana WF

Por cada `window_id` (`WF01`, `WF02`, …):

| Campo | Descripción |
|-------|-------------|
| `window_id` | Etiqueta estable `WF01`…`WFnn` |
| `parent_in_sample_bundle_id` | Bundle IS usado para selección de parámetros |
| `forward_bundle_id` | Bundle export forward evaluado |
| `in_sample_date_start` | ISO date |
| `in_sample_date_end` | ISO date |
| `forward_date_start` | ISO date |
| `forward_date_end` | ISO date |
| `selected_parameters_source` | p. ej. `from_WF00_IS`, `from_SET001_IS`, `optimizer_run_id` |
| `run_role` | **`WALK_FORWARD_WINDOW`** |
| `validation_status` | `valid` \| `valid_warnings` \| `invalid` |
| `read_only` | `true` |
| `has_real_trading_orders` | **`false`** |

Colocación física: [`MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md`](./MULTI_BUNDLE_OOS_CAMPAIGN_FOLDER_CONTRACT_E5_23_3.md) §10 — `03_walk_forward/WFnn/forward/`.

---

## 6. Archivos crudos obligatorios por bundle forward

Cada `forward_bundle_id` debe contener (sin sustitución por informes):

| Archivo | Obligatorio |
|---------|-------------|
| `backtest_summary.json` | Sí |
| `backtest_trades.csv` | Sí |
| `backtest_events.csv` | Sí |

### Referencias opcionales

| Referencia | Ubicación sugerida |
|------------|-------------------|
| Compile log | `99_notes/` o puntero en ventana |
| EX5 archivado | `99_notes/` |
| Preset `.set` | `00_profile/` o `99_notes/` |
| Notas operador | `99_notes/WFnn.md` |

Flag `WF_WINDOW_MISSING_REQUIRED_FILES` si falta cualquier archivo crudo.

---

## 7. Métricas de rendimiento obligatorias por ventana (forward)

Reportar en el tramo **forward** de cada ventana (desde audit o summary validado):

| Métrica | Notas |
|---------|-------|
| `trade_count` | |
| `filled_count` | |
| `expired_unfilled_count` | |
| `ambiguous_count` | |
| `win_count` / `loss_count` | |
| `winrate` | |
| `total_r` | |
| `avg_r` | |
| `expectancy_r` | |
| `max_drawdown_r` | |
| `worst_daily_r` | |
| `best_daily_r` | |
| `trades_per_day` | |
| `days_positive` | |
| `days_negative` | |
| `overtrading_count` | discipline flag true |
| `revenge_count` | si disponible en export |

**No** fusionar estas métricas con el tramo IS de la misma ventana en una sola fila de la tabla resumen.

---

## 8. Métricas de calidad de setup por ventana

| Métrica | Uso |
|---------|-----|
| `candidate_count` / `wait_count` / `reject_count` | Readiness forward |
| `candidate_total_r` / `wait_total_r` / `reject_total_r` | Coherencia con E5.22.2.1 |
| `top_blockers` | Top N por count o \|R\| |
| IFVG conflict performance | total_r, winrate segmento |
| PD conflict performance | no asumir hard reject |
| Target grade distribution | diagnóstico |
| Environment grade distribution | diagnóstico |
| Discipline grade distribution | diagnóstico |
| Volatility / session summary | buckets agregados |
| Entry variant research summary | solo si `run_role` research en sub-bundle; conjunto D separado |

Fuente metodológica: [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md).

---

## 9. Flags de robustez obligatorios (por ventana)

Cada ventana debe evaluar y listar flags activos:

| Flag | Condición típica |
|------|------------------|
| `WF_WINDOW_NEGATIVE_R` | `total_r` forward < 0 |
| `WF_WINDOW_DRAWDOWN_HIGH` | `max_drawdown_r` > umbral campaña |
| `WF_WINDOW_TRADE_COUNT_TOO_LOW` | `trade_count` < mínimo documentado |
| `WF_WINDOW_AMBIGUITY_HIGH` | `ambiguous_count / trade_count` > umbral |
| `WF_WINDOW_OOS_COLLAPSE` | Forward << IS esperado sin explicación |
| `WF_WINDOW_EDGE_ONLY_IMPROVEMENT` | Mejora solo en sim entry edge |
| `WF_WINDOW_READINESS_INVERSION` | reject outperform candidate en forward |
| `WF_WINDOW_IFVG_CONTRADICTION` | IFVG vs trade cards / baseline |
| `WF_WINDOW_PD_CONTRADICTION` | PD reject con wins fuertes sin explicación |
| `WF_WINDOW_MISSING_REQUIRED_FILES` | Falta raw bundle §6 |

Flags activos → influir en clasificación §10 (mínimo `warning`, a menudo `fail` o `invalid`).

---

## 10. Clasificación de ventana

| Label | Criterio |
|-------|----------|
| **`pass`** | `total_r` forward > 0; drawdown aceptable; sin flags críticos; archivos completos; validación OK |
| **`warning`** | Positivo o near-flat con alta ambigüedad, DD elevado, trade_count bajo, o flags no críticos |
| **`fail`** | `total_r` negativo, colapso forward, o flags graves (OOS collapse, edge-only, etc.) |
| **`invalid`** | Archivos faltantes, validación fallida, metadata `run_role` incorrecta, `has_real_trading_orders` ≠ false |

**Reglas:**

- Una ventana `fail` **permanece visible** en tabla resumen y agregado.
- `invalid` excluye la ventana del `stable_window_ratio` pero **cuenta** en `invalid_count`.
- No reclasificar `fail` → `warning` post-hoc sin nueva evidencia y nota en `99_notes/`.

---

## 11. Resumen agregado WF (obligatorio)

Al cierre del documento de campaña:

| Campo | Descripción |
|-------|-------------|
| `total_windows` | N ventanas planificadas |
| `pass_count` | |
| `warning_count` | |
| `fail_count` | |
| `invalid_count` | |
| `aggregate_total_r` | Suma R forward ventanas **válidas** (documentar si excluye invalid) |
| `aggregate_avg_r` | Media por ventana |
| `median_window_r` | |
| `worst_window_r` | Mínimo `total_r` forward |
| `best_window_r` | Máximo `total_r` forward |
| `max_window_drawdown` | Max de `max_drawdown_r` por ventana |
| `stable_window_ratio` | `pass_count / (total_windows - invalid_count)` |
| `collapsed_window_count` | Ventanas con `WF_WINDOW_OOS_COLLAPSE` o `fail` por colapso |

**Regla crítica:** `aggregate_total_r` **no** anula revisión de ventanas `fail` ni justifica promoción por sí solo ([`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md) §9).

---

## 12. Reglas de promoción (research)

La evidencia WF puede **apoyar** subida de nivel research (0–4) **solo si**:

| Requisito | Detalle |
|-----------|---------|
| Sin ventanas `invalid` | O invalid_count = 0 en decisión |
| `fail_count` aceptable | Umbral documentado por PM (p. ej. 0 o ≤ 1 de N con justificación) |
| Sin colapso OOS sistémico | `collapsed_window_count` bajo |
| Drawdown agregado aceptable | `max_window_drawdown` dentro de límite |
| `trade_count` suficiente | Por ventana y agregado |
| Readiness coherente | Sin inversión fuerte sin explicación |
| Blockers interpretables | Coherentes con trade cards |
| Edge/variant | No depende solo de artefactos sim (conjunto D) |
| Trade cards | Sin contradicción sin nota en `99_notes/` |

**No autoriza:** live, gates MQL5, cambio entry/TP, aprobación edge/25/adaptive.

---

## 13. Cuerpo de plantilla reutilizable (markdown)

Copiar y rellenar por campaña. Guardar como evidencia docs (repo) o `_local_<campaign>_WF_EVIDENCE_DO_NOT_COMMIT.md` hasta aprobación PM.

---

# Walk-forward Campaign Evidence: `<campaign_id>`

## Campaign Identity

| Field | Value |
|-------|-------|
| profile_id | `<profile_id>` |
| campaign_id | `<campaign_id>` |
| symbol | `<symbol>` |
| timeframe | `<timeframe>` |
| htf_bias_timeframe | `<htf_bias_timeframe>` |
| ea_build | `<ea_build>` |
| strategy_id | `<strategy_id>` |
| parameter_set_id | `<parameter_set_id>` |
| entry_model | `<entry_model>` |
| tp_model | `<tp_model>` |
| campaign_folder | `<campaign_folder>` |
| operator | `<operator>` |
| created_at_utc | `<ISO-8601>` |
| governance_status | `<governance_status>` |

## Window Summary Table

| Window | IS Range | Forward Range | Forward Bundle | Trades | Total R | Avg R | WR | DD | Ambiguous | Status | Notes |
|--------|----------|---------------|----------------|-------:|--------:|------:|---:|---:|----------:|--------|-------|
| WF01 | `<IS start–end>` | `<FWD start–end>` | `<forward_bundle_id>` | | | | | | | pass/warning/fail/invalid | |
| WF02 | | | | | | | | | | | |
| WF03 | | | | | | | | | | | |

## Window Details

### WF01

| Field | Value |
|-------|-------|
| parent_in_sample_bundle_id | `<bundle_id>` |
| forward_bundle_id | `<bundle_id>` |
| selected_parameters_source | `<source>` |
| validation_status | `<valid \| valid_warnings \| invalid>` |

#### Forward Performance

| Metric | Value |
|--------|------:|
| trade_count | |
| filled_count | |
| expired_unfilled_count | |
| ambiguous_count | |
| win_count / loss_count | |
| winrate | |
| total_r | |
| avg_r / expectancy_r | |
| max_drawdown_r | |
| worst_daily_r / best_daily_r | |
| trades_per_day | |
| days_positive / days_negative | |
| overtrading_count / revenge_count | |

#### Setup Quality (forward)

| Segment | Count | Total R | Notes |
|---------|------:|--------:|-------|
| candidate | | | |
| wait | | | |
| reject | | | |
| top_blockers | | | |
| IFVG conflict | | | |
| PD conflict | | | |

#### Robustness Flags (WF01)

- [ ] WF_WINDOW_NEGATIVE_R
- [ ] WF_WINDOW_DRAWDOWN_HIGH
- [ ] WF_WINDOW_TRADE_COUNT_TOO_LOW
- [ ] WF_WINDOW_AMBIGUITY_HIGH
- [ ] WF_WINDOW_OOS_COLLAPSE
- [ ] WF_WINDOW_EDGE_ONLY_IMPROVEMENT
- [ ] WF_WINDOW_READINESS_INVERSION
- [ ] WF_WINDOW_IFVG_CONTRADICTION
- [ ] WF_WINDOW_PD_CONTRADICTION
- [ ] WF_WINDOW_MISSING_REQUIRED_FILES

**Window classification:** `<pass | warning | fail | invalid>`

---

### WF02

*(Repetir estructura WF01.)*

### WF03

*(Repetir según ventanas planificadas.)*

## Setup Quality Review

Resumen cross-window: readiness estable vs SET001 baseline, IFVG/PD patrones, vol/session.

## Robustness Flags (campaign-level)

Lista consolidada de flags activos por ventana.

## Aggregate Summary

| Metric | Value |
|--------|------:|
| total_windows | |
| pass_count | |
| warning_count | |
| fail_count | |
| invalid_count | |
| aggregate_total_r | |
| aggregate_avg_r | |
| median_window_r | |
| worst_window_r | |
| best_window_r | |
| max_window_drawdown | |
| stable_window_ratio | |
| collapsed_window_count | |

## Decision

**`<PASS | WARNING | FAIL | INVALID>`** — research evidence only; no live/gate/entry approval.

## Caveats

- Single profile / symbol
- Parameter lineage documented
- Large files in `_local_*` not canonical unless PM commits evidence doc

## Governance

| Item | Status |
|------|--------|
| MQL5 / gates / live | No |
| Entry/TP / edge approval | No |
| Optimizer on forward segment | Prohibited |

---

*(Fin plantilla §13)*

---

## 14. Relación con matriz E5.23.2

| Regla | Detalle |
|-------|---------|
| `comparison_set` | **`robustness_validation_set` (E)** |
| Una fila por ventana forward | `bundle_id` = `forward_bundle_id`; `window_id` en `notes` |
| No fusionar con A | Baseline official SET001 permanece en `01_in_sample` |
| No fusionar con B/C/D | Readiness / delta / entry variant en filas separadas |
| `promotion_level` | `needs_walk_forward` hasta evidencia completa; tras WF doc → evaluar nivel 2 tentativo |
| Red flags | Propagar flags §9 a columna `governance_status` de matriz |

---

## 15. Relación con carpetas E5.23.3

| Ruta | Contenido |
|------|-----------|
| `03_walk_forward/WF01/` | `is/` + `forward/` bundles |
| `03_walk_forward/WF02/` | … |
| `06_matrix/` | `optimization_comparison_matrix.*` incluye filas E por ventana |
| `99_notes/` | Hipótesis, umbrales PM, excepciones |
| `00_profile/` | Manifest campaña, umbrales `fail_count` |

Este documento (rellenado) puede vivir en repo bajo `APP/artifacts/mapazapp/docs/` como evidencia nombrada o como copia operador en `_local_*`.

---

## 16. Relación con E5.24

**E5.24** [`XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md`](./XAUUSD_M15_ROBUSTNESS_CAMPAIGN_PLAN_E5_24.md) planifica WF01–03. **E5.24.1** [`XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md`](./XAUUSD_M15_ROBUSTNESS_DATE_RANGES_E5_24_1.md) confirma rangos antes de ST. **E5.24.4+** debe usar esta plantilla al ejecutar:

1. Crear ventanas WF según contrato E5.23.3  
2. Rellenar §13 por ventana tras cada forward ST  
3. Completar agregado §11 y decisión  
4. Alimentar matriz E5.23.2 conjunto E  

**E5.23.4** no ejecuta ninguna campaña ni ST.

---

## 17. Reglas anti-cherry-pick

| Prohibido | Razón |
|-----------|--------|
| Reportar solo ventanas ganadoras | Sesgo de selección |
| Ocultar ventanas `fail` en agregado | Viola §11 |
| Mezclar stats IS y forward | Data leakage / confusión |
| Optimizar en tramo forward | Invalida WF |
| Renombrar ventanas fallidas | Rompe trazabilidad |
| Borrar raw bundles | Evidencia perdida |
| Promover desde una ventana fuerte | Requiere `stable_window_ratio` |
| Ignorar ambiguity / drawdown | Flags §9 |
| Comparar perfiles distintos en un doc WF | Un doc = un `profile_id` |

---

## 18. Gobernanza

| Acción | Estado |
|--------|--------|
| Cambios MQL5 | **No** |
| TypeScript / generador plantilla | **No** en E5.23.4 |
| MT5 / ST / optimizador | **No** |
| Live / gates | **No** |
| Cambio entry / TP | **No** |
| Edge / 25 / adaptive approval | **No** |
| Telegram / dashboard / email / push | **No** |
| Commitear `_local_*` sin aprobación | **No** por defecto |

---

## Referencias

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
