# XAUUSD M15 Profile V1 — E5.23.1

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.23.1 — definición formal del perfil lab `XAUUSD_M15_Profile_V1` |
| **Tipo** | Documentación — **sin implementación** |
| **Baseline Git** | `ef306eb` o posterior — `docs(mapazapp): E5.23 define optimization governance symbol profiles` |
| **Gobernanza padre** | [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md) |
| **Decisión** | **Docs-only profile definition** — autoriza planificación de campañas lab XAUUSD M15; **no** aprueba live, gates, edge/25/adaptive ni cambio entry/TP |
| **E5.23.2** | [`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md) — **cerrado (docs)** |
| **Siguiente** | E5.23.3 — contrato carpetas multi-bundle / OOS |
| **Sin cambios** | MQL5, TypeScript, MT5, ST, optimizador, gates, live, entry/TP, edge/25/adaptive, Telegram/dashboard/email/push |

---

## 1. Por qué existe este perfil

**XAUUSD M15** es el **perfil de laboratorio actual** del proyecto Mapazapp. Se usa para **calibrar el motor de setup** (readiness, blockers, humanización, variantes de entrada, robustez) **antes** de extender evidencia a otros símbolos.

| Punto | Significado |
|-------|-------------|
| Lab profile | Todas las campañas engine-first de optimización/robustez/delta humanizado parten de este perfil hasta nueva evidencia |
| No exclusividad futura | XAUUSD **no** es el único símbolo previsto — EURUSD, NAS100 y BTCUSD tendrán perfiles propios |
| No aprobación | +315R en SET001 demuestra viabilidad **research** del motor en oro M15 — **no** autoriza trading real ni gates |

Relación: [`ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md`](./ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md), [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md).

---

## 2. Identidad del perfil

| Campo | Valor |
|-------|-------|
| **`profile_id`** | `XAUUSD_M15_Profile_V1` |
| **`symbol`** | `XAUUSD` |
| **`execution_timeframe`** | `M15` |
| **`htf_bias_timeframe`** | `D1` |
| **Baseline bundle actual** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **Build actual** | `MZP_TestEA_E5_18` |
| **Entrada oficial** | **50 % / CE** |
| **TP oficial** | **RR2** |
| **`mode`** | **research / backtest only** |

Fuentes de alineación: [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md), [`MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md`](./MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md).

---

## 3. Hechos del baseline actual (SET001)

Evidencia: [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md).

| Métrica | Valor |
|---------|------:|
| `trade_count` | **1697** |
| `total_r` | **+315** |
| `avg_r` | **0.185622** |
| `winrate` | **44.77 %** (0.447712) |
| `max_drawdown_r` | **13** |
| `ambiguous_count` | **436** |
| `expired_unfilled_count` | **342** |
| Readiness `candidate` / `wait` / `reject` | **247** / **150** / **1300** |
| R readiness `candidate` + `wait` | **+429** |
| R readiness `reject` | **-114** |

**Caveat:** un solo bundle SET001 — nivel promoción research máximo **0–1** hasta multi-bundle + OOS/WF ([`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md) §8).

---

## 4. Comportamiento observado específico del perfil

Hallazgos del audit E5.22.2.1 sobre SET001 XAUUSD M15:

| Área | Observación | Implicación gobernanza |
|------|-------------|------------------------|
| **Readiness** | Separa calidad con fuerza: candidate+wait +429R vs reject -114R | Diagnóstico fuerte — **no** gate desde un bundle |
| **IFVG conflict** | ~400 trades, total_r -248, winrate ~0.8 % | Fuertemente negativo — candidato calibración; **no** gate duro sin multi-bundle |
| **PD conflict** | 206 trades, total_r +157, winrate ~82 % bajo reject | **No** hard reject fiable — muchas wins en reject |
| **Environment weak** | 137 trades, total_r +136, winrate ~81 % | **No** hard reject fiable |
| **Volatility V1** | 1213/1697 en “extreme”; aún positivo en R agregado | Comporta como **etiqueta de estrés**, no gate útil |
| **Target quality** | Grades no rankean claramente outcome | Diagnóstico — no promover como filtro |
| **Overtrading / revenge** | Labels no degradan R en SET001 | Etiquetas de riesgo/discreción — no gate |
| **Edge / 25 / adaptive** | Métricas sim más altas que oficial | **Research-only** — sensibles a simulación |

Trade cards cualitativas: [`HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md`](./HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md).

---

## 5. Supuestos específicos XAUUSD

| Supuesto | Detalle |
|----------|---------|
| Alta volatilidad | XAUUSD M15 puede moverse con rangos amplios — umbrales forex genéricos **no** aplican |
| Spread | En SET001 spread normal en 1694/1697 — **no** fue el issue principal |
| Volatilidad | Umbrales V1 requieren **calibración XAUUSD-específica** (stress label, no gate duro) |
| Sesiones | Comportamiento Londres/NY/overlap debe estudiarse **por segmento** en campañas futuras |
| News / eventos | Contexto de evento **ausente** hoy en export — no asumir cobertura |
| Oro ≠ forex | No aplicar ciegamente supuestos de pares FX (spread, sesión, gaps, correlación) |

---

## 6. Conjuntos de comparación permitidos

Toda campaña bajo `XAUUSD_M15_Profile_V1` debe etiquetar resultados en **uno o más** conjuntos — **nunca** mezclar en una métrica opaca:

| ID | Conjunto | Contenido |
|----|----------|-----------|
| **A** | `official_baseline_set` | 50 % / CE + RR2 — referencia canónica SET001+ |
| **B** | `readiness_research_set` | Análisis candidate / wait / reject — sin gate |
| **C** | `humanized_delta_research_set` | Buckets delta [`HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md`](./HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md) |
| **D** | `entry_variant_research_set` | 25 % / 75 % / adaptive / edge — research-only |
| **E** | `robustness_validation_set` | OOS / walk-forward / multi-bundle |

**Prohibido:** “mejor resultado de campaña” sin indicar A/B/C/D/E.

---

## 7. Métricas obligatorias por campaña XAUUSD

Cada campaña `XAUUSD_M15_Profile_V1` **debe** reportar (mínimo):

### Core performance

- `trade_count`, `filled_count`, `expired_unfilled_count`, `ambiguous_count`
- `win_count` / `loss_count`, `winrate`
- `total_r`, `avg_r`, `expectancy_r`, `max_drawdown_r`

### Temporal / frecuencia

- Daily R stats, trades per day
- Overtrading / revenge stats (discipline flags)

### Readiness / blockers

- Readiness distribution (candidate / wait / reject)
- Blocker distribution
- IFVG conflict performance
- PD conflict performance
- Target quality performance

### Contexto mercado

- Volatility bucket performance
- Session performance

### Research overlays

- Entry variant comparison (conjunto D, separado)
- Humanized delta comparison (conjunto C, si disponible)

Detalle ampliado: [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md) §7.

---

## 8. Requisitos mínimos de promoción research

Promoción = **nivel de interés investigación** — **ningún** criterio aprueba live trading.

| Requisito | Descripción |
|-----------|-------------|
| `total_r` positivo | En conjunto reportado (A o E según fase) |
| Drawdown aceptable | `max_drawdown_r` dentro de límites documentados por campaña |
| `trade_count` suficiente | Sin aceptar muestras triviales |
| Comportamiento explicable | Blockers/grades coherentes con trade cards |
| Sin dependencia de un régimen | No un solo mes/sesión/vol bucket |
| OOS pass | Out-of-sample no colapsa vs in-sample |
| Walk-forward estable | Ventanas WF consistentes |
| Multi-bundle estable | No solo SET001 |
| Ambiguity conservadora | Sin colapso si ambiguity se trata conservadoramente |
| Coherencia trade cards | Sin contradicción con [`HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md`](./HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md) |
| No promoción desde un run | SET001 solo = nivel 0–1 máximo |

Niveles 0–4: [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md) §8.

---

## 9. Restricciones de optimización XAUUSD

| Prohibido | Razón |
|-----------|--------|
| Optimizar **solo** `total_r` | Curve-fitting |
| Optimizar **solo** `winrate` | Ignora ambiguous/unfilled |
| Aceptar `trade_count` muy bajo | Sin significancia estadística |
| Aceptar variante edge sin audit fill/ambiguous | Sim-sensitive |
| Aceptar readiness gate desde un bundle | Separación observada ≠ gate aprobado |
| Aceptar IFVG gate desde un bundle | Requiere confirmación multi-bundle |
| Promover PD conflict como hard reject | Evidencia SET001 contradice |
| Promover volatility extreme como hard reject | Stress label, no filtro |
| Cambiar TP/entry desde un run | Official 50 %/CE + RR2 permanece |

Alineado con [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md).

---

## 10. Política de variantes de entrada (este perfil)

| Variante | Estado |
|----------|--------|
| **Official 50 % / CE** | Única familia canónica (conjunto A) |
| 25 % / 75 % / adaptive / **edge** | Conjunto D — **research-only** |

Toda campaña de variante **debe** reportar por separado:

- `trade_count` delta, fill count delta, `ambiguous` delta
- `max_drawdown_r` delta, `total_r` delta
- Comportamiento OOS/WF
- Si el rendimiento depende de supuestos de simulación (especialmente edge)

Baseline sim SET001 (research, no aprobado): 25/adaptive ~566–568R sim; edge ~2733R sim — ver E5.22.2.1 §14.

---

## 11. Política humanized delta (este perfil)

Según [`HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md`](./HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md):

- Humanized delta = **solo research** — no cambio oficial del trade set.
- Comparaciones obligatorias (conjunto C):

| Comparación | Bucket / acción |
|-------------|-----------------|
| Baseline official | Set oficial 50 %/CE + RR2 |
| Kept trades | `baseline_kept` |
| Removed trades | `baseline_removed` |
| Rescued rejects | `rescued_reject` |
| Wait promoted | `wait_promoted` |
| Candidate downgraded | `candidate_downgraded` |
| Near-miss added | `near_miss_added` |
| No-chase skipped | `no_chase_skipped` |
| IFVG skipped | `ifvg_conflict_skipped` |
| PD recalibrated | `pd_conflict_rescued` |

**Prohibido:** promover política humanizada a gate MQL5 o cambio de trade set oficial sin E5.22.5.2+ evidencia + OOS/WF + PM.

---

## 12. Mediciones faltantes para el perfil XAUUSD

Campos **no** disponibles o insuficientes hoy — requeridos antes de gates o promoción fuerte:

| Campo | Uso futuro |
|-------|------------|
| `reaction_strength` | Calibración near-miss / retest |
| `near_miss_tolerance_profile` | Política near-miss por perfil |
| `displacement_after_near_miss` | Validar rescates |
| `no_chase_distance` | `no_chase_skipped` bucket |
| `late_entry_reason` | Chase / late fill audit |
| `news_event_context` | Sesión/evento oro |
| `event_minutes_since` | Ventana post-noticia |
| `account/prop/manual lock state` | Discipline forward |
| `humanized_acceptance_reason_codes` | Trazabilidad delta |
| `trade_set_delta_reason_codes` | Auditoría por trade |

---

## 13. Relación con otros perfiles futuros

| Perfil | Estado | Regla |
|--------|--------|-------|
| `EURUSD_M15_Profile_V1` | Planificado | **No** heredar umbrales XAUUSD |
| `NAS100_M15_Profile_V1` | Planificado | Calibración spread/vol/sesión propia |
| `BTCUSD_M15_Profile_V1` | Opcional (PM) | Weekend/vol/liquidez distintos |

Cada perfil requiere: baseline propio, OOS/WF propios, informe de campaña propio, nivel promoción propio. Comparación cross-symbol solo **después** de evidencia por perfil.

---

## 14. Tareas futuras recomendadas (post E5.23.1)

| Checkpoint | Entregable |
|------------|------------|
| **E5.23.2** | [`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md) — **cerrado (docs)** |
| **E5.23.3** | Contrato carpetas campaña multi-bundle / OOS |
| **E5.23.4** | Plantilla evidencia campaña walk-forward |
| **E5.24** | Ejecución campaña robustez (operador + evidencia) |
| **E5.22.5.1** | Spec CLI trade-set delta (paralelo engine-first) |

---

## 15. Gobernanza

| Acción | Estado |
|--------|--------|
| Cambios MQL5 | **No** |
| Cambios TypeScript | **No** |
| MT5 / Strategy Tester / optimizador | **No** en E5.23.1 |
| Gates / live trading | **No** |
| Cambio entry / TP oficial | **No** |
| Aprobación edge / 25 / adaptive | **No** |
| Telegram / dashboard / email / push | **No** |
| Commitear `_local_*_DO_NOT_COMMIT` | **No** |

---

## Referencias

- [`SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md`](./SET001_OPTIMIZATION_COMPARISON_MATRIX_DESIGN_E5_23_2.md)
- [`OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md`](./OPTIMIZATION_GOVERNANCE_SYMBOL_PROFILES_E5_23.md)
- [`HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md`](./HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md)
- [`HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md`](./HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md)
- [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md)
- [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md)
- [`MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md`](./MT5_REPO_STRATEGY_ALIGNMENT_CHECK_E5_22_0_1.md)
- [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md)
- [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md)
- [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md)
- [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md)
