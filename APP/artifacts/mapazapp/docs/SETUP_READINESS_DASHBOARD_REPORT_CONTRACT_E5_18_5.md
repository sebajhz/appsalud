# Setup Readiness Dashboard / Report Contract — E5.18.5

## 1. Por qué existe este checkpoint

La cadena E5.18 quedó cerrada hasta política de interpretación:

| Hito | Rol |
|------|-----|
| E5.18 | Export CSV/summary |
| E5.18.1 | Smoke operador |
| E5.18.2 | Auditor calibration (repo) |
| E5.18.3 | Evidencia SET001 (466 high-score rejects, 100 % candidates con warnings) |
| E5.18.4 | Política score/grade/decision/blockers |

**E5.18.4** autoriza dashboard/reporting **solo** si score, grade, decisión, blockers, warnings y reasons se muestran **juntos**. Sin un **contrato de presentación**, futuros mockups, API o BridgeEA podrían:

- Mostrar solo el score como “aprobado”.
- Ocultar `primary_blocker` en high-score rejects.
- Etiquetar `candidate` como “trade perfecto”.
- Usar `outcome` en live como hint de entrada.

**E5.18.5** define ese contrato/spec **docs-only**. No implementa UI ni cambia MQL5.

**Referencias:** [`SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md`](./SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md), [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_EVIDENCE_E5_18_3.md).

---

## 2. Principio de dashboard

**Este contrato es capa de presentación (informe/dashboard), no la política de aceptación humanizada del setup.** La humanización discrecional (accept/wait/reject/observe/no-trade bajo condiciones imperfectas) está en **E5.20.5** — [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md). **E5.20.3** queda pausado hasta revisión de E5.20.5.

**La UI nunca debe mostrar el score solo.**

### Unidad mínima de display (obligatoria)

Todo panel, fila de tabla o tarjeta que exponga Setup Readiness debe incluir **en la misma vista** (sin scroll obligatorio para lo esencial):

| Campo export | Uso en UI |
|--------------|-----------|
| `setup_readiness_decision` | Badge primario |
| `setup_readiness_score` | Numérico secundario |
| `setup_readiness_grade` | Etiqueta de banda |
| `setup_readiness_primary_blocker` | Texto/icono si ≠ none o si reject |
| `setup_readiness_blocker_count` | Contador |
| `setup_readiness_warning_count` | Contador |
| `setup_readiness_reasons` | Lista expandible (pipe → tokens) |

**Prohibido:** widget “Score: 85” sin decisión y blocker. **Prohibido:** color verde solo por score ≥ 70.

---

## 3. Contrato de trade card (una fila / setup)

### Header (siempre visible)

| Campo | Fuente | Notas |
|-------|--------|-------|
| `trade_id` | CSV | Identificador |
| `symbol` / `canonical_symbol` | CSV / bundle | |
| `timeframe` | CSV / campaign | p. ej. M15 |
| `setup_time` / `entry_time` | CSV | Preferir `entry_time` si no hay setup_time |
| `direction` | CSV | BUY / SELL |
| `setup_readiness_decision` | CSV | Badge |
| `setup_readiness_score` | CSV | |
| `setup_readiness_grade` | CSV | |
| `setup_readiness_primary_blocker` | CSV | Destacar si reject |

### Core components (panel secundario)

| Área | Campos export típicos | Presentación |
|------|----------------------|--------------|
| Bias / structure | `checklist_bias_aligned`, `checklist_structure_ok` | ok / warning / blocker |
| Liquidity | `checklist_liquidity_event_ok` | |
| IFVG / BISI / SIBI | `checklist_ifvg_grade`, `checklist_ifvg_quality_ok` | Grade + estado |
| MSS / CHoCH | `checklist_mss_choch_ok`, `checklist_mss_choch_timing_ok` | |
| Premium / discount | `checklist_premium_discount_ok`, `checklist_pd_zone_valid` | |
| Entry | `checklist_entry_candidate_family`, `checklist_entry_feasible`, `checklist_entry_fragility_warning` | Familia + fragilidad |
| Target | `checklist_target_grade`, `checklist_target_type`, `checklist_target_ok` | Solo diagnóstico |
| Execution environment | `checklist_execution_environment_grade`, `checklist_execution_environment_ok` | |
| Discipline | `checklist_discipline_grade`, `checklist_discipline_ok`, `checklist_overtrading_warning` | Warning/support |

### Context (leyenda fija en card o footer)

| Tema | Texto / regla |
|------|----------------|
| Entry oficial | Permanece **50 % / CE** (`official_50_ce` cuando aplique) |
| Edge / p25 / adaptive | Solo **research candidates** — no etiquetar como entry live |
| Target | Política **diagnóstica** — no sustituye TP oficial RR2 |
| Discipline | **Warning/support** — no gate de ejecución |
| Outcome | **Solo** modo backtest/research — **nunca** hint live |

---

## 4. Contrato de wording por decisión

Etiquetas UI (inglés base; ver §10 español).

### `candidate`

| ID | Texto |
|----|-------|
| `candidate_default` | Candidate — review warnings |
| `candidate_discretionary` | Candidate, discretionary confirmation required |

Mostrar si `warning_count > 0` (SET001: siempre).

### `wait`

| ID | Texto |
|----|-------|
| `wait_default` | Wait — context incomplete or caution required |
| `wait_review` | Wait, review blockers/warnings |

### `reject`

| ID | Texto |
|----|-------|
| `reject_blocker` | Reject — critical blocker |
| `reject_high_score` | High score, rejected by critical blocker *(si score ≥ 70)* |

Sustituir “critical blocker” por nombre legible del `primary_blocker` cuando exista (p. ej. “PD conflict”).

### `unknown`

| ID | Texto |
|----|-------|
| `unknown_default` | Unknown — insufficient diagnostic data |

---

## 5. Display high-score reject

**Condición:** `setup_readiness_score >= 70` **y** `setup_readiness_decision = reject`.

La UI **debe** mostrar:

1. Badge **Reject** (no “Low readiness” genérico).
2. Etiqueta **High score** (valor numérico + grade si aplica).
3. **Critical blocker** — `primary_blocker` humanizado.
4. **Tooltip obligatorio:** “Score is not permission to trade; critical blockers can override readiness.”

### Ejemplos de línea principal

| `primary_blocker` | Ejemplo |
|-------------------|---------|
| `pd_conflict` | High score — rejected by PD conflict |
| `ifvg_conflict` | Strong components, but IFVG conflict blocks readiness |
| `structure_conflict` | High checklist score — structure conflict prevents candidate |
| (genérico) | A grade, but reject due to critical blocker |

**No** usar: “Error”, “Failed score”, “Not approved” sin mencionar blocker.

---

## 6. Display candidate-with-warnings

**Hecho E5.18.3:** 247/247 candidates con `warning_count > 0`.

La UI **debe**:

- Mostrar `warning_count` y **top 3** tokens de `setup_readiness_reasons` (warnings).
- Usar sub-badge: **Candidate with warnings**.
- Mostrar: **Manual review required** (o equivalente ES §10).

**Prohibido:** “Perfect trade”, “Ready”, “Go”, “A+ setup”, “Approved”.

---

## 7. Contrato de report summary (campaña)

### Campaign summary (obligatorio en informe)

| Métrica | Fuente |
|---------|--------|
| `trade_count` | summary / audit |
| candidate / wait / reject / unknown counts | summary o agregado CSV |
| `average_setup_readiness_score` | summary |
| grade distribution (A/B/C/Weak/None) | summary |
| `setup_readiness_average_blocker_count` | summary |
| `setup_readiness_average_warning_count` | summary |

### Blocker leaderboard

| Tabla | Contenido |
|-------|-----------|
| Primary blocker counts | Frecuencia × decisión |
| High-score rejects by blocker | Subset score ≥ 70, decision reject |
| Blocker × decision matrix | Crosstab (como E5.18.3) |

### Warning leaderboard

Conteos de reasons recurrentes (no solo primary):

- `target_before_liquidity`
- `overtrading_warning`
- `environment_weak`
- `entry_fragile` (como warning)
- Otros tokens `checklist_*` en reasons

### Outcome research section

**Solo** si `report_mode = backtest | research`:

- decision × outcome
- grade × outcome
- score band × outcome (0–44, 45–69, 70–84, 85–100)
- primary_blocker × outcome

**Disclaimer en informe:** “Observational — not for strategy approval or live hints.”

---

## 8. Reporting per-symbol / profile

Preparar informes comparativos para perfiles documentados (vocabulario E5.16.4):

| Profile ID (ejemplo) | Símbolo / TF |
|----------------------|--------------|
| `XAUUSD_M15_Profile_V1` | XAUUSD M15 |
| `EURUSD_M15_Profile_V1` | EURUSD M15 |
| `BTCUSD_M15_Profile_V1` | BTCUSD M15 |
| `NAS100_M15_Profile_V1` | NAS100 M15 |

**No** comparar perfiles **solo por profit**.

Comparar (mínimo):

| Dimensión | Métricas |
|-----------|----------|
| Readiness | decision mix, avg score, grade distribution |
| Blockers | primary blocker leaderboard |
| Execution | environment grade / weak share |
| Target | target grade, target_before_liquidity warnings |
| Discipline | overtrading warnings, discipline grade |
| Performance (si exportado) | expectancy R, drawdown, trade frequency |

---

## 9. Propuesta de contrato export/API (docs only)

Objetos normalizados para futura capa API/dashboard. **No implementar tipos TS en E5.18.5.**

### `SetupReadinessTradeView`

```json
{
  "trade_id": "string",
  "setup_time": "ISO-8601 | null",
  "symbol": "string",
  "timeframe": "string",
  "direction": "BUY | SELL",
  "decision": "candidate | wait | reject | unknown",
  "score": 0,
  "grade": "A | B | C | Weak | None",
  "primary_blocker": "string | none",
  "blocker_count": 0,
  "warning_count": 0,
  "reasons": ["string"],
  "components": ["SetupReadinessComponent"],
  "entry_family": "string",
  "target": { "grade": "string", "type": "string", "ok": true },
  "environment": { "grade": "string", "ok": true },
  "discipline": { "grade": "string", "ok": true },
  "outcome": "string | null",
  "display_mode": "live | backtest_research"
}
```

- `outcome`: **null** en `display_mode = live`.
- `reasons[]`: parse de `setup_readiness_reasons` (split `|`).

### `SetupReadinessComponent`

```json
{
  "key": "bias | liquidity | ifvg | mss_choch | pd | entry | target | environment | discipline",
  "label": "human readable",
  "status": "ok | warning | blocker | unknown",
  "grade": "string | null",
  "score": "number | null",
  "reasons": ["string"]
}
```

Mapeo `status` desde CSV booleans/grades según política E5.18.4 (blocker si primary coincide; warning si reason token sin blocker).

### `SetupReadinessCampaignSummary`

```json
{
  "trade_count": 0,
  "decision_counts": { "candidate": 0, "wait": 0, "reject": 0, "unknown": 0 },
  "average_score": 0,
  "grade_counts": {},
  "average_blocker_count": 0,
  "average_warning_count": 0,
  "blocker_leaderboard": [],
  "warning_leaderboard": [],
  "high_score_reject_by_blocker": []
}
```

---

## 10. i18n / wording en español

Claves sugeridas (`es`) alineadas con §4–§6:

| Key | Español (UI) |
|-----|----------------|
| `decision.candidate` | Candidato — revisar advertencias |
| `decision.candidate.discretionary` | Candidato — confirmación discrecional requerida |
| `decision.wait` | Esperar — contexto incompleto o precaución |
| `decision.wait.review` | Esperar — revisar bloqueos/advertencias |
| `decision.reject` | Rechazado — bloqueo crítico |
| `decision.reject.high_score` | Puntaje alto, pero rechazado por bloqueo crítico |
| `decision.unknown` | Desconocido — datos diagnósticos insuficientes |
| `candidate.with_warnings` | Candidato con advertencias |
| `manual.review_required` | Revisión manual requerida |
| `tooltip.score_not_permission` | No tomar el puntaje como permiso de entrada; los bloqueos críticos pueden anular la readiness |
| `high_score.pd_conflict` | Puntaje alto — rechazado por conflicto PD |
| `high_score.ifvg_conflict` | Componentes fuertes, pero conflicto IFVG bloquea la readiness |

**Regla:** mantener paridad ES/EN en severity (reject ≠ “error” coloquial).

---

## 11. Relación con Visual Trace Mode (E5.17.2)

Según [`OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md`](./OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md):

- Futuro **MT5 Visual Trace Mode** puede pintar en gráfico los mismos campos del contrato (decisión, blocker, score **como texto secundario**, no como semáforo único).
- **Optimizaciones masivas / grid:** Visual Trace **desactivado** — solo CSV/summary + este contrato en reports.
- Visual Trace **no** ejecuta trades ni sustituye el panel de control manual.

---

## 12. Decisión de gobernanza (E5.18.5)

| Regla | Estado |
|-------|--------|
| Alcance | **Docs-only contract** |
| Implementación dashboard | **No** en este hito |
| Cambios MQL5 scoring/decision | **No** |
| Cambios TypeScript | **No** (salvo índice docs si se añade enlace) |
| Gates / live / OrderSend | **No** |
| Entry / TP / edge approval | **No** |
| Rol checklist | Read-only decision support |

Cualquier UI que no cumpla §2–§6 se considera **no conforme** con gobernanza E5.18 hasta corrección.

---

## 13. Tracks futuros

| Hito | Propósito |
|------|-----------|
| **E5.18.6** | Readiness severity calibration audit (research-only) |
| **E5.18.7** | Per-symbol readiness profile comparison |
| ~~**E5.19** report prototype (CLI).~~ **Done** — [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md); `mapazapp:testea-setup-readiness-report` |
| ~~**E5.19.1** operator report evidence.~~ **Done** — [`SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md`](./SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md); PASS |
| ~~**E5.19.2** report UX polish.~~ **Done** — [`SETUP_READINESS_REPORT_UX_POLISH_E5_19_2.md`](./SETUP_READINESS_REPORT_UX_POLISH_E5_19_2.md) |
| ~~**E5.19.3** operator UX polish evidence.~~ **Done** — [`SETUP_READINESS_REPORT_UX_POLISH_EVIDENCE_E5_19_3.md`](./SETUP_READINESS_REPORT_UX_POLISH_EVIDENCE_E5_19_3.md); PASS |
| ~~**E5.20** BridgeEA / dashboard consumption plan (read-only).~~ **Done** — [`BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md`](./BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md) (docs-only) |
| ~~**E5.20.1** / **E5.20.2**~~ | Bundle index + latest valid report CLI | **Done** |
| ~~**E5.20.5**~~ | Humanized setup acceptance policy V1 | **Done** — [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md) |
| **E5.20.3** | Dashboard data adapter | **Pausado** — E5.20 §12 |

Cambios MQL5 score/decision: solo tras gobernanza explícita post E5.18.6+.

---

## Referencias

- Policy: [`SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md`](./SETUP_READINESS_DECISION_POLICY_REFINEMENT_E5_18_4.md)
- Export: [`SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md`](./SETUP_READINESS_CHECKLIST_EXPORT_E5_18.md)
- Visual governance: [`OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md`](./OPTIMIZATION_GOVERNANCE_AND_VISUAL_REVIEW_POLICY_E5_17_2.md)
