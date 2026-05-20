# Setup Readiness Decision Policy Refinement — E5.18.4

## 1. Por qué existe este checkpoint

**E5.18** exportó score, grade, decisión, blockers y reasons por trade. **E5.18.1** smoke validó el export técnico. **E5.18.2** añadió el auditor research-only. **E5.18.3** ejecutó ese auditor sobre el bundle benchmark `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` (`MZP_TestEA_E5_18`, `trade_count` 1697) y confirmó:

- El checklist es **útil** para diagnóstico y reporting.
- Las decisiones **no** son puramente score-based (`decision_override_count` 1196; `high_score_reject_count` 466).
- **Todos** los `candidate` (247/247) tienen warnings.
- Blockers críticos (`pd_conflict`, `ifvg_conflict`, `structure_conflict`, etc.) pueden forzar `reject` con score alto.

Antes de usar Setup Readiness en **dashboard** o informes operativos, hace falta una **política de interpretación y wording** clara. **E5.18.4** define esa política en documentación. **No** cambia scoring MQL5 ni lógica de decisión.

**Evidencia base:** [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md).

---

## 2. Principio clave

**La decisión de Setup Readiness no es score-only.**

El score resume cuántos componentes del checklist parecen favorables. La **decisión final** (`candidate` / `wait` / `reject`) puede **divergir** del score cuando existen **blockers críticos** o baja readiness global. Un score alto **no** es permiso para operar; un grade A/B **no** garantiza `candidate` si hay blocker crítico.

---

## 3. Significado del score

| Aspecto | Política |
|---------|----------|
| **Qué mide** | Cuántos componentes del checklist (bias, liquidez, IFVG, MSS/CHoCH, PD, entry, target, entorno, disciplina) aparecen favorables en el agregado exportado. |
| **Rango** | 0–100 (clamp en export MQL5). Benchmark SET001: avg 65.06, min 34, max 94. |
| **Cómo mostrarlo** | **Confianza/calidad diagnóstica** — “qué tan alineado está el setup con los checks”, no “probabilidad de ganar” ni “aprobado para trade”. |
| **Qué no implica** | No implica `candidate`, no invalida un `reject` por blocker, no sustituye revisión humana. |
| **Wording recomendado** | “Setup readiness score (diagnostic)”, “Checklist score — informational only”. |

**Regla de UI:** nunca mostrar solo el número sin grade, decisión y blockers adyacentes.

---

## 4. Significado del grade

El **grade** es una **etiqueta de banda de score**, no una segunda decisión.

| Grade | Banda típica (export E5.18) | Significado diagnóstico |
|-------|----------------------------|-------------------------|
| A | ≥ 85 | Componentes muy favorables en agregado |
| B | ≥ 70 | Favorable |
| C | ≥ 55 | Mixto |
| Weak | ≥ 40 | Débil |
| None | &lt; 40 | Muy bajo / casi sin señal positiva |

**Política:** Grade A o B **no** implica automáticamente `candidate`. En SET001: 19 trades grade A con `reject`; 447 grade B con `reject`. El grade **complementa** el score; la decisión manda cuando hay blocker crítico.

**Wording:** “Grade (score band)” — evitar “Grade A = ready to trade”.

---

## 5. Significado de la decisión

La **decisión** es la etiqueta diagnóstica **final de solo lectura** del checklist V1. No ejecuta órdenes ni gates.

| Decisión | Significado (política E5.18.4) | Benchmark SET001 (1697) |
|----------|--------------------------------|-------------------------|
| **candidate** | Sin blocker crítico según lógica actual; puede tener **warnings** (en SET001: 100 % de candidates). No es setup perfecto. | 247 (14.5 %) |
| **wait** | Readiness media, varios warnings, o contexto que pide discreción antes de tratar el setup como candidato fuerte. | 150 (8.8 %) |
| **reject** | Blocker crítico y/o readiness baja según reglas actuales. Puede coexistir con **score alto** (466 high-score rejects). | 1300 (76.6 %) |
| **unknown** | Checklist deshabilitado, scoring deshabilitado, o contexto insuficiente / inválido. | 0 |

**Regla:** La decisión es la columna que el operador debe leer **primero** en dashboard; score y grade son contexto.

---

## 6. Política de blockers críticos

### Blockers tratados como duros / críticos (interpretación actual del export)

| `setup_readiness_primary_blocker` | Comportamiento observado (SET001) | Política de display |
|-----------------------------------|-----------------------------------|---------------------|
| `structure_conflict` | Mayor volumen de reject primary (490) | “Estructura / alineación en conflicto — readiness rechazada” |
| `ifvg_conflict` | 400 reject primary; 168 high-score reject; sin wait/candidate como primary | “IFVG en conflicto — invalida readiness aunque el score sea alto” |
| `pd_conflict` | 206 reject primary; 156 high-score reject | “Premium/discount en conflicto — override de score alto” |
| `liquidity_missing` | 85 reject primary | “Evento de liquidez ausente o inválido” |
| `target_missing` | 7 reject primary; 6 high-score reject | “Target de liquidez ausente” |
| `entry_fragile` | 105 reject primary cuando elevado a blocker; también puede aparecer como warning o en candidate (27) | Distinguir **blocker** vs **warning** en UI (ver §7) |

### Blockers que **no** actúan como hard reject primary en SET001

| Blocker / tema | Observación SET001 | Política |
|----------------|-------------------|----------|
| `execution_environment_weak` | Más wait/candidate que reject como primary | Mostrar como contexto de entorno, no como “trade prohibido” por sí solo |
| `overtrading_warning` | No aparece como primary hard reject | Warning de disciplina/frecuencia — ver §7 |

### Principios

1. **`pd_conflict` e `ifvg_conflict` pueden rechazar setups con score alto** — comportamiento **esperado** bajo el modelo actual de override por blocker, no bug de export (validado E5.18.1 primera fila y E5.18.3 a escala).
2. **Future calibration** (E5.18.6 o posterior con gobernanza) puede ajustar severidad o umbrales — **fuera de alcance E5.18.4**.
3. En dashboard, **siempre** mostrar `primary_blocker` junto a decisión cuando `decision = reject` o cuando `decision_override` sería true en auditoría.

---

## 7. Política de warnings

Los **warnings** incrementan `setup_readiness_warning_count` y aparecen en `setup_readiness_reasons`. **Por sí solos no deben rechazar** salvo que la lógica MQL5 actual los combine con blockers (política de display: warnings ≠ reject automático).

### Ejemplos de warnings (no exhaustivo)

| Warning / reason típico | Rol diagnóstico |
|-------------------------|-----------------|
| `target_before_liquidity` / checklist_target_before_liquidity | TP oficial antes del target de liquidez — calidad de objetivo |
| `overtrading_warning` / checklist_overtrading_warning | Disciplina / frecuencia |
| `environment_weak` / checklist_environment_weak | Entorno de ejecución débil (a menudo warning, no primary reject) |
| `entry_fragile` (como warning) | Entrada frágil — revisar familia de entry |
| Perfil de ejecución / spread / volatilidad | Contexto E5.16 — informativo |
| Disciplina / límites diarios | Contexto E5.17 — informativo |

**Política UI:** listar warnings en panel expandible; usar icono/severidad “warning”, no “error”, salvo que coincida con `reject` + blocker.

---

## 8. Política candidate-with-warnings

**Hecho E5.18.3:** `candidate_with_warnings_count` = 247 = **100 %** de candidates.

Por tanto el dashboard **no** debe usar:

- “Perfect trade”, “Ready”, “A+ setup”, “Go”, “Approved”.

**Wording aprobado (ejemplos):**

- “Candidate — review warnings”
- “Candidate, with warnings”
- “Candidate — discretionary confirmation required”
- “No critical blocker; see warnings below”

**Badge sugerido:** decisión `candidate` + subtexto “warnings present” si `warning_count > 0`.

---

## 9. Wording para high-score reject

Cuando `setup_readiness_score >= 70` y `setup_readiness_decision = reject` (466 en SET001):

| Contexto | Ejemplo de texto |
|----------|------------------|
| Genérico | “High score — rejected by critical blocker” |
| `pd_conflict` | “Strong components, but invalidated by PD conflict” |
| `ifvg_conflict` | “Good aggregate score, but IFVG conflict blocks readiness” |
| `structure_conflict` | “High checklist score — structure conflict prevents candidate” |
| Educación | “Do not treat score as approval” / “Score is diagnostic; decision reflects blockers” |

**Tooltip recomendado:** “Score measures favorable components. Critical blockers can override score and force Reject.”

---

## 10. Recomendación de display en dashboard (futuro)

Cada fila o tarjeta de setup debería mostrar **juntos** (misma vista, sin scroll obligatorio para lo esencial):

| Campo | Prioridad |
|-------|-----------|
| `setup_readiness_decision` | Primaria (badge de color) |
| `setup_readiness_primary_blocker` | Primaria si reject o override |
| `setup_readiness_score` + `setup_readiness_grade` | Secundaria |
| `setup_readiness_blocker_count` + `setup_readiness_warning_count` | Secundaria |
| Top 3 tokens de `setup_readiness_reasons` | Detalle |
| `checklist_ifvg_grade`, `checklist_target_grade`, `checklist_execution_environment_grade`, `checklist_discipline_grade` | Componentes |
| `checklist_entry_candidate_family` | Contexto entry (oficial sigue 50/CE cuando aplica) |
| `outcome` | **Solo** en modo backtest / research — **nunca** como hint live |

**Modos:**

- **Live / manual control:** decisión + blockers + warnings; **sin** outcome; sin lenguaje de aprobación.
- **Backtest / campaña:** puede añadir outcome y enlaces a auditorías E5.18.2/E5.18.3.

---

## 11. Recomendación de reportes y analytics (futuro)

Agregaciones útiles (research / gobernanza, no optimización automática de edge):

| Reporte | Métrica |
|---------|---------|
| Blocker leaderboard | Frecuencia de `primary_blocker` × decisión |
| High-score reject drill-down | Count y % por blocker (`pd_conflict`, `ifvg_conflict`, …) |
| Candidate quality | % candidates con warnings; distribución `warning_count` |
| Blocker vs outcome | Crosstab observacional (no usar para aprobar estrategia) |
| Decision vs outcome | Idem |
| Score band vs outcome | Bandas 0–44, 45–69, 70–84, 85–100 |
| Perfil / símbolo | Readiness distribution por `canonical_symbol`, timeframe, campaign |

**Fuente de verdad para agregados:** CLI `mapazapp:testea-setup-readiness-decision-calibration-audit` + CSV local `*_DO_NOT_COMMIT.csv` (no commitear).

---

## 12. Decisión de gobernanza (E5.18.4)

| Regla | Estado |
|-------|--------|
| Alcance E5.18.4 | **Docs / research only** |
| Cambiar scoring MQL5 | **No** |
| Cambiar lógica de decisión | **No** |
| Gates / live / OrderSend / WebRequest | **No** |
| Aprobar edge / cambiar entry / TP | **No** |
| Rol del checklist | **Read-only decision support** — explicación humana, no ejecución |

El checklist queda **autorizado para dashboard/reporting** si se cumple la política (§8–§10) y el contrato E5.18.5. Hasta implementación UI, tratar exports como **observación de campaña**.

---

## 13. Tracks de código futuros (no implementar en E5.18.4)

| Hito | Propósito | Notas |
|------|-----------|-------|
| ~~**E5.18.5** dashboard/report contract.~~ **Done** — [`SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md`](./SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md) |
| ~~**E5.19** report prototype (CLI).~~ **Done** — [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md) |
| **E5.18.6** | Readiness severity calibration audit | Comparar severidad de blockers entre bundles; research-only |
| **E5.18.7** | Per-symbol readiness profile comparison | XAUUSD M15 vs otros perfiles |
| **Posterior (gobernanza)** | Cambios opcionales MQL5 score/decision | Solo tras aprobación explícita en [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md) |

---

## Referencias

- Export: [`SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md`](./SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md)
- Smoke: [`SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md`](./SETUP_READINESS_CHECKLIST_SMOKE_EVIDENCE_E5_18_1.md)
- Auditor: [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md)
- Evidencia: [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md)
- Gobernanza visual: [`OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md`](./OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md)
