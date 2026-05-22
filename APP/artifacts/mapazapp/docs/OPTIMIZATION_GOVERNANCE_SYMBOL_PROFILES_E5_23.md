# Optimization Governance / Symbol Profiles — E5.23

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.23 — gobernanza de optimización y perfiles por símbolo |
| **Tipo** | Documentación — **sin implementación** |
| **Baseline Git** | `a2c0735` o posterior — `docs(mapazapp): E5.22.5 design humanized trade-set delta` |
| **Prerrequisitos** | E5.22.2.1 baseline · E5.22.5 delta design · [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md) |
| **Decisión** | **Docs-only governance** — autoriza planificación futura de campañas, **no** ejecución de optimizador |
| **E5.23.1** | [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md) — **cerrado (docs)** |
| **E5.23.2** | [`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md) — **cerrado (docs)** |
| **Siguiente** | E5.23.3 multi-bundle / OOS campaign folder contract |
| **Sin cambios** | MQL5, MT5, ST, optimizador, gates, live, entry/TP, edge/25/adaptive, canales |

---

## 1. Por qué existe E5.23

La fase **E5.22** demostró que el motor actual en laboratorio XAUUSD es **positivo pero ruidoso**:

| Hallazgo E5.22 | Implicación |
|----------------|-------------|
| SET001 +315R, winrate ~44.8 %, 1697 trades | Setup oficial viable en lab — **no** aprobación de estrategia |
| Readiness separa fuerte (candidate/wait vs reject) | Diagnóstico útil — **no** gate hoy |
| Humanización medible (HA-001…010) | Casebook + selector + trade cards |
| Trade-set delta diseñado (E5.22.5) | Contrato de comparación — **no** implementado |

Antes de implementar simuladores delta, gates o cambios de estrategia, hace falta **gobernanza de optimización** para que las campañas futuras no se conviertan en **curve-fitting** de un solo bundle `SET001`.

**E5.23** define cómo planificar, comparar y **promover niveles de investigación** sin confundir optimización con aprobación.

Relación con gobernanza general: [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md), [`ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md`](./ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md).

---

## 2. Baseline actual (laboratorio)

| Campo | Valor |
|-------|-------|
| **Símbolo lab** | XAUUSD |
| **Timeframe** | M15 |
| **Bundle baseline** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **EA build** | `MZP_TestEA_E5_18` |
| **Entry oficial** | **50 % / CE** |
| **TP oficial** | **RR2** |
| `trade_count` | **1697** |
| `total_r` | **+315** |
| `winrate` | **44.77 %** |
| `ambiguous_count` | **436** |
| **Caveat** | **Un solo bundle** — no es aprobación de estrategia, live, gates ni variantes edge/25/adaptive |

Fuentes: [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md), [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md), [`MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md`](./MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md).

---

## 3. Principio de optimización

| Regla | Significado |
|-------|-------------|
| **Optimization discovers candidates** | La optimización genera hipótesis y rangos — no veredictos |
| **Optimization does not approve strategy** | Ningún run ST/optimizador aprueba el setup para producción |
| **No promotion from one run** | Un parameter set no sube de nivel con un solo bundle |
| **No edge/25/adaptive from one bundle** | Variantes entry permanecen research |
| **No gates from one bundle** | Readiness/humanized no se activan como filtro oficial |
| **No live from optimizer** | Resultado del optimizador ≠ permiso de trading real |

Objetivo correcto (citando gobernanza general):

```text
Discover which parameter ranges express the setup best under a given symbol,
period, regime, and execution condition — not maximize R on one CSV.
```

---

## 4. Modelo de perfiles por símbolo

Cada símbolo tiene **perfil propio**. **Prohibido** mezclar símbolos en un único objetivo de optimización.

### 4.1 `XAUUSD_M15_Profile_V1`

| Atributo | Valor |
|----------|-------|
| Rol | **Primer perfil lab** — foco actual |
| Uso | SET001, calibración engine inicial, readiness, humanización |
| Supuestos | Vol/oro, sesiones Londres/NY, spread típico XAUUSD |
| Estado | **Activo (lab)** — definición formal E5.23.1 |
| Spec | [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md) |

### 4.2 `EURUSD_M15_Profile_V1`

| Atributo | Valor |
|----------|-------|
| Rol | Validación forex posterior |
| Supuestos | Spread/vol/sesión distintos a XAUUSD |
| Estado | **Planificado** — tras evidencia XAUUSD multi-bundle |

### 4.3 `NAS100_M15_Profile_V1`

| Atributo | Valor |
|----------|-------|
| Rol | Perfil índice posterior |
| Supuestos | Sesión US, gaps, vol index |
| Estado | **Planificado** |

### 4.4 `BTCUSD_M15_Profile_V1`

| Atributo | Valor |
|----------|-------|
| Rol | Crypto **opcional** — solo si PM aprueba |
| Supuestos | Weekend, vol extrema, liquidez distinta |
| Estado | **Opcional / gated por PM** |

**Regla:** comparar símbolos solo **después** de evidencia por perfil (baseline + OOS/WF propios).

---

## 5. Modelo de objeto campaña (metadata futura)

Cada campaña futura debe registrarse con metadata explícita:

| Campo | Descripción |
|-------|-------------|
| `campaign_id` | Identificador único de campaña |
| `profile_id` | p. ej. `XAUUSD_M15_Profile_V1` |
| `symbol` | XAUUSD, EURUSD, … |
| `timeframe` | M15, … |
| `htf_bias_timeframe` | TF bias HTF usado |
| `date_range` | Rango total de datos |
| `in_sample_range` | IS para optimización |
| `out_of_sample_range` | OOS obligatorio |
| `walk_forward_ranges` | Ventanas WF si aplica |
| `parameter_set_id` | SET001, SET002, … |
| `bundle_id` | Carpeta export validada |
| `ea_build` | `MZP_TestEA_E5_xx` |
| `entry_model` | `official_50_ce` \| research variant tag |
| `tp_model` | `RR2` \| research |
| `risk_model` | R fijo / sizing documentado |
| `optimization_objective` | Métrica primaria **documentada** (no solo total R) |
| `constraints` | Límites (min trades, max DD, etc.) |
| `notes` | Hipótesis, PM decisions |

Sin metadata completa → campaña **inválida** para promoción de nivel.

---

## 6. Conjuntos de comparación (separados)

Toda campaña debe etiquetar resultados en **uno o más** conjuntos — **nunca** mezclar en una métrica opaca:

| ID | Conjunto | Uso |
|----|----------|-----|
| **A** | `official_baseline_set` | 50 % / CE + RR2 — referencia canónica |
| **B** | `readiness_research_set` | Análisis candidate/wait/reject — **no** gate por defecto |
| **C** | `humanized_delta_research_set` | Buckets [`HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md`](./HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md) — tras simulador |
| **D** | `entry_variant_research_set` | 25 % / 75 % / adaptive / edge — **research-only** |
| **E** | `robustness_validation_set` | OOS / WF / multi-bundle confirmación |

**Prohibido:** reportar “mejor resultado de campaña” sin indicar conjunto A/B/C/D/E.

---

## 7. Métricas obligatorias por perfil/campaña

Cada informe de campaña **debe** incluir (como mínimo):

### 7.1 Core performance

| Métrica | Notas |
|---------|-------|
| `trade_count` | |
| `filled_count` | |
| `expired_unfilled_count` | |
| `ambiguous_count` | Crítico en SET001 (~26 %) |
| `win_count` / `loss_count` | |
| `winrate` | |
| `total_r` | |
| `avg_r` / `expectancy_r` | |
| `max_drawdown_r` | |

### 7.2 Temporal / frecuencia

| Métrica | Notas |
|---------|-------|
| Daily R stats | Distribución por día |
| Worst day / best day | |
| Trades per day | |
| Overtrading stats | discipline flags |

### 7.3 Readiness / blockers

| Métrica | Notas |
|---------|-------|
| Readiness decision distribution | candidate / wait / reject |
| Blocker distribution | ifvg_conflict, pd_conflict, … |
| IFVG conflict performance | Segmento agregado |
| PD conflict performance | No tratar como hard reject sin evidencia |
| Target quality performance | target_missing, grades |

### 7.4 Contexto mercado

| Métrica | Notas |
|---------|-------|
| Volatility bucket performance | |
| Session performance | asian, london, overlap, … |
| Spread bucket performance | |

### 7.5 Research overlays

| Métrica | Notas |
|---------|-------|
| Entry variant comparison | Conjunto D separado |
| Humanized delta comparison | Conjunto C — si simulador disponible |

Fuente métricas baseline: [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md).

---

## 8. Niveles de promoción (solo investigación)

La promoción describe **nivel de interés research** — **ningún nivel aprueba live trading**.

| Nivel | Nombre | Criterio mínimo |
|-------|--------|-----------------|
| **0** | Experimental | Un bundle / un símbolo |
| **1** | Internally interesting | SET001 positivo + comportamiento explicable (trade cards) |
| **2** | Robust candidate | Multi-bundle + OOS + WF estable |
| **3** | Forward-demo candidate | BridgeEA observación read-only coherente |
| **4** | Governance review | Tras riesgo / prop / psicología / PM |

| Nivel | **No** implica |
|-------|----------------|
| 0–4 | Live trading, gates MQL5, cambio entry/TP oficial, edge approval |

---

## 9. Reglas anti-overfit

| # | Regla |
|---|--------|
| 1 | No optimizar **solo** a `total_r` |
| 2 | No aceptar menor drawdown si se eliminan trades sin explicación (trade-set delta) |
| 3 | No aceptar variante edge sin auditoría fill/ambiguous/near-miss |
| 4 | No aceptar parameter set con **trade_count** demasiado bajo |
| 5 | No aceptar si el resultado depende de **un mes / sesión / régimen** |
| 6 | No aceptar si la lógica de blockers **contradice** trade cards E5.22.4.2 |
| 7 | No aceptar delta humanizado sin **reason codes** por trade |
| 8 | No aceptar si **OOS colapsa** vs in-sample |
| 9 | No promover desde **un bundle** (SET001 solo = nivel 0–1 máximo) |
| 10 | No mezclar conjuntos A–E en un único ranking |

---

## 10. Política multi-símbolo

**XAUUSD es el laboratorio, no el sistema final.**

Cada símbolo requiere **antes** de comparación cross-symbol:

| Requisito por símbolo |
|----------------------|
| Perfil propio (`*_Profile_V1`) |
| Calibración spread/volatilidad propia |
| Comportamiento de sesión documentado |
| Bundle baseline propio |
| OOS / WF propios |
| Informe de campaña propio |
| Estado de promoción propio (nivel 0–4) |

Solo con evidencia **por perfil** se permite comparación entre símbolos (ranking research, no live).

---

## 11. Relación con humanized delta (E5.22.5)

La optimización debe poder comparar, **por separado**:

1. Official baseline (A)  
2. Readiness research (B)  
3. Humanized delta (C) — [`HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md`](./HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md)  
4. Entry variants (D)

**Humanized delta permanece research-only** hasta cumplir **todos**:

| Prerrequisito | Checkpoint |
|---------------|------------|
| Simulador delta | E5.22.5.2 |
| Evidencia SET001 | E5.22.5.3 |
| Robustez multi-bundle | E5.22.5.4 / E5.24 |
| OOS/WF confirma | E5.23.4+ |
| Campos faltantes | reaction_strength, no_chase, news, … si la política los exige |

Referencia cualitativa: [`HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md`](./HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md).

---

## 12. Relación con entry variants

25 % / adaptive / **edge** son prometedores en simulación — **no aprobados**.

| Variante | Gobernanza |
|----------|------------|
| Official 50 % / CE | Única familia canónica |
| 25 / 75 / adaptive / edge | Conjunto D — research-only |

Toda optimización de variante entry debe rastrear **por separado**:

- Supuestos de fill  
- Casos ambiguous  
- Comportamiento near-miss  
- Consistencia SL/TP  
- `trade_count` delta  
- `max_drawdown_r` delta  
- Comportamiento OOS/WF  

**Edge** especialmente: sensible a simulación — exige fill/ambiguity audit antes de nivel ≥ 1.

---

## 13. BridgeEA y dashboard

### BridgeEA (futuro)

| Rol | Estado |
|-----|--------|
| Observación forward **read-only** | Nivel 3 promoción research |
| Ejecución / comandos | **Prohibido** |
| Fuente de verdad optimización | **No** |

### Dashboard

| Rol | Estado |
|-----|--------|
| Consumidor downstream de bundles/reportes | Útil para comparación visual |
| Fuente de verdad optimización | **No** — ST export + validadores CLI son canónicos |

E5.21.3+ dashboard/alertas permanece **pausado** (engine-first).

---

## 14. Decisión de salida E5.23

| Aspecto | Estado |
|---------|--------|
| **E5.23** | **Docs-only governance — cerrado** |
| Autoriza | Planificación de campañas, perfiles, métricas, niveles promoción |
| No autoriza | Ejecutar optimizador MT5, cambiar MQL5, live, gates |

---

## 15. Roadmap recomendado

| Checkpoint | Entregable |
|------------|------------|
| **E5.23** | Este documento — **cerrado (docs)** |
| **E5.23.1** | [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md) — **cerrado (docs)** |
| **E5.23.2** | [`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md) — **cerrado (docs)** |
| **E5.23.3** | Contrato carpetas campaña multi-bundle/OOS |
| **E5.23.4** | Plantilla evidencia campaña walk-forward |
| **E5.24** | Ejecución campaña robustez (operador + evidencia) |
| **E5.25** | Decisión PM: ¿alguna política research merece export MQL5? |
| **E5.22.5.1–5.5** | Delta audit (paralelo engine-first) |

---

## 16. Gobernanza

| Acción | Estado |
|--------|--------|
| MQL5 / TypeScript (simulador, gates) | **No** |
| MT5 / Strategy Tester / optimizador | **No** en esta tarea |
| Cambio entry / TP / edge approval | **No** |
| Live / Telegram / dashboard / email / push | **No** |
| Commitear `_local_*` | **No** |

---

## Referencias

- [`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md)
- [`XAUUSD_M15_PROFILE_V1_E5_23_1.md`](./XAUUSD_M15_PROFILE_V1_E5_23_1.md)
- [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md)
- [`HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md`](./HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md)
- [`HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md`](./HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
