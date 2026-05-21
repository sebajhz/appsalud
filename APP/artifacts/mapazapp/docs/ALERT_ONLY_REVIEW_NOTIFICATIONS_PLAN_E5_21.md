# Alert-only Review Notifications — Plan / Contrato E5.21

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.21 — plan y contrato docs-only |
| **Baseline Git** | `9014691` o posterior — `docs(mapazapp): E5.20.4.2 close read-only consumption block` |
| **Bloque upstream cerrado** | [`READONLY_CONSUMPTION_BLOCK_CLOSURE_E5_20_4_2.md`](./READONLY_CONSUMPTION_BLOCK_CLOSURE_E5_20_4_2.md) |
| **Tipo** | Gobernanza + contrato de datos — **sin** canales en E5.21 |
| **Implementación E5.21.1** | [`ALERT_ONLY_REVIEW_MODEL_FORMATTER_E5_21_1.md`](./ALERT_ONLY_REVIEW_MODEL_FORMATTER_E5_21_1.md) — modelo + formatter + CLI local |
| **Sin cambios en esta tarea** | MQL5, TypeScript, MT5, Strategy Tester, Telegram, email, push, gates, trading |

---

## 1. Por qué existe E5.21

E5.20 entregó un **flujo completo de consumo read-only**:

```text
TestEA root → bundles.index.json → latest valid bundle
  → setup_readiness_report.json → dashboard_readonly_view.json
  → dashboard_readonly_mock.html
```

Ese flujo permite **investigar** candidatos, esperas y rechazos con gobernanza fija (sin live, sin gates, entry 50 % / CE, TP RR2). El trader aún debe **abrir** informes o HTML para enterarse de cambios.

**E5.21** define cómo Mapazapp puede **notificar al trader para revisión** — recordatorios explicativos, no señales de mercado. Las alertas deben:

- Resumir **qué revisar** y **por qué** (decisión, blockers, warnings, casebook).
- Mantener **decisión manual** del trader.
- **No** convertirse en sistema de ejecución, señales, gates ni aprobación de entrada/edge/funding.

Implementación de canales (Telegram, email, cola local, panel) queda en tracks **E5.21.x** posteriores y requiere aprobación PM.

---

## 2. Alcance

### E5.21 **es**

| Propiedad | Descripción |
|-----------|-------------|
| **Alert-only** | Solo notificaciones de revisión |
| **Read-only** | Sin órdenes ni permisos de trade |
| **Review-oriented** | Orientadas a lectura y juicio humano |
| **Explanatory** | Explican decisión, blockers y contexto |
| **Manual decision support** | Apoyan discreción; no la sustituyen |

### E5.21 **no es**

| Excluido | Notas |
|----------|-------|
| Señal buy/sell | Sin dirección de mercado como mandato |
| Gate / compuerta | Sin “pase” que autorice ejecución |
| Live trading | Sin workflow operativo en cuenta real |
| Auto-ejecución | Sin `OrderSend`, broker APIs, MQL5 trade |
| Aprobación de entrada | Candidate ≠ “entrar” |
| Aprobación funding / prop firm | E5.22 — fuera de alcance |
| Aprobación de edge | Edge/25/adaptive siguen research-only |

---

## 3. Entradas (futuro)

Las notificaciones **futuras** podrán consumir artefactos ya producidos por E5.20 — **sin** leer MT5 directamente en este plan y **sin** ejecutar órdenes:

| Fuente | Uso previsto |
|--------|----------------|
| `dashboard_readonly_view.json` | Decisión, score, grade, tarjetas, resúmenes, gobernanza |
| `setup_readiness_report.json` | Readiness, blockers, campaña |
| `latest_valid_report_result.json` | Bundle seleccionado, rutas, estado generación |
| `bundles.index.json` | Descubrimiento bundle, validación, `report_missing` |
| Casebook HA (E5.20.6) | Referencia explicativa de política — no permiso |

**Prohibido en el pipeline de alertas:** conexión directa a MT5 para trading; consumo de ticks en vivo como trigger de entrada; mutación de informes o adaptador en el acto de alertar.

---

## 4. Tipos de alerta V1

Categorías **permitidas** en la primera versión del contrato:

| `alert_type` | Propósito |
|--------------|-----------|
| `candidate_review` | Contexto merece revisión manual; no implica entrada |
| `wait_context` | Contexto incompleto; observar sin urgencia |
| `reject_explanation` | Rechazo con bloqueador o readiness pobre — explicar |
| `high_score_reject_review` | Puntaje alto anulado por bloqueador crítico |
| `candidate_with_warnings` | Candidato con advertencias visibles |
| `report_ready` | Informe setup readiness generado / actualizado |
| `bundle_index_ready` | Índice local regenerado |
| `validation_failed` | Validación bundle o informe falló — revisar logs |
| `missing_measurement_notice` | Caso HA sin medición (p. ej. HA-007, HA-008) — no inferir señal |

Nuevos tipos requieren actualización de este contrato y revisión PM.

---

## 5. Campos obligatorios por alerta

Cada alerta (objeto o mensaje renderizado) **debe** incluir:

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `alert_id` | Sí | UUID o id estable único |
| `created_at_utc` | Sí | ISO-8601 UTC |
| `source_bundle` | Sí | p. ej. `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `symbol` | Sí | p. ej. `XAUUSD` |
| `timeframe` | Sí | p. ej. `M15` |
| `mode` | Sí | Constante: `read_only_review` |
| `decision` | Sí* | `candidate` \| `wait` \| `reject` \| `unknown` \| `n/a` (tipos sistema) |
| `decision_label` | Sí | Etiqueta humanizada (es/en) |
| `score` | Si disponible | Numérico; no implica permiso |
| `grade` | Si disponible | A/B/C/etc. |
| `blocker` / `main_reason` | Si aplica | Bloqueador duro o motivo principal |
| `warning_count` | Sí | Entero ≥ 0 |
| `top_reasons` | Sí | Lista acotada (p. ej. máx. 5 códigos o textos) |
| `casebook_refs` | Si disponible | HA-xxx solo como referencia política |
| `governance_footer` | Sí | Bloque §6 embebido o enlace |

\* Tipos `report_ready`, `bundle_index_ready`, `validation_failed` pueden usar `decision=n/a`.

Campos opcionales futuros (no obligatorios V1): `trade_id`, `alert_type`, `channel`, `locale`.

---

## 6. Pie de gobernanza obligatorio (`governance_footer`)

Toda alerta **debe** incluir o enlazar texto equivalente a:

| Línea | Contenido |
|-------|-----------|
| Modo | **Read-only review** / Solo lectura — revisión |
| Score | **Score is not permission to trade** / El puntaje no es permiso para operar |
| Live | **No live trading** / Sin trading en vivo |
| Gates | **No gates** / Sin compuertas de ejecución |
| Entry | **Official entry remains 50% / CE** / Entrada oficial 50 % / CE sin cambio |
| TP | **TP remains RR2** / TP oficial RR2 sin cambio |
| Edge | **Edge / 25% / adaptive remain research-only** / Edge/25/adaptive solo investigación |
| Acción | **Manual review required** / Revisión manual requerida |

El pie no puede omitirse ni colapsarse en implementaciones futuras.

---

## 7. Wording permitido

Solo formulaciones de **revisión / explicación**:

| EN | ES |
|----|-----|
| Review candidate — warnings present | Candidato — revisar advertencias |
| Wait — context incomplete | Esperar — contexto incompleto |
| Rejected by critical blocker | Rechazado por bloqueo crítico |
| High score but rejected by blocker | Puntaje alto, pero rechazado por bloqueo crítico |
| Manual review required | Revisión manual requerida |
| Research/backtest only | Solo investigación/backtest |
| Report ready | Informe listo |

Plantillas deben validarse contra §8 antes de merge en tracks E5.21.x.

---

## 8. Wording prohibido

**Nunca** usar en título, cuerpo o acción de alerta:

| EN | ES |
|----|-----|
| Buy now | Comprar ahora |
| Sell now | Vender ahora |
| Execute | Ejecutar |
| Entry approved | Entrada aprobada |
| Signal confirmed | Señal confirmada |
| Guaranteed setup | Setup garantizado |
| Auto trade | Operación automática |
| Gate passed | Gate aprobado |
| Trade now | Entrar ahora |

Cualquier variante que implique ejecución, urgencia de entrada o garantía de resultado queda fuera de contrato.

---

## 9. Política de alerta — candidate

**Candidate no significa entrar.**

| Significado | Acción de la alerta |
|-------------|---------------------|
| Contexto digno de revisión | Invitar a leer informe/mock |
| Advertencias obligatorias | Mostrar `warning_count` y `top_reasons` |
| Discreción humana | Texto: revisión manual requerida |

**Si el candidato tiene warnings** (`warning_count > 0` o tipo `candidate_with_warnings`):

> **Texto obligatorio (ES):** «Candidato — revisar advertencias. Confirmación discrecional requerida.»

> **Equivalente EN:** «Review candidate — warnings present. Discretionary confirmation required.»

---

## 10. Política de alerta — wait

| Significado | Restricción |
|-------------|------------|
| Contexto incompleto | Sin instrucción de entrada |
| Observación | Esperar completitud de contexto, no operar por impulso |

**La alerta no debe implicar urgencia** (sin “ahora”, “inmediato”, “última oportunidad”).

Plantilla recomendada: «Esperar — contexto incompleto. Revisión manual requerida.»

---

## 11. Política de alerta — reject

| Significado | Contenido |
|-------------|-----------|
| Bloqueador crítico o readiness pobre | Nombrar `blocker` / `main_reason` |
| Sin trade | Sin verbo de ejecución |

**High-score reject** (`high_score_reject_review`):

> **Texto obligatorio (ES):** «Puntaje alto, pero rechazado por bloqueo crítico.»

> **Equivalente EN:** «High score but rejected by blocker.»

Debe mostrarse score/grade si existen, con disclaimer de que el bloqueador prevalece.

---

## 12. Relación con casebook humanizado (E5.20.6)

Las alertas **pueden** citar casos HA **solo** como explicación de política:

| Ref | Uso permitido en alerta |
|-----|-------------------------|
| HA-004 | Conflicto PD — contexto de rechazo |
| HA-005 | Disciplina / no-trade |
| HA-006 | Target / liquidez faltante |
| HA-009 | Conflicto IFVG |

**Prohibido:** tratar un caso HA como permiso de trade, señal de entrada o sustituto de `governance_footer`.

Casos `missing_measurement` (HA-007, HA-008): tipo `missing_measurement_notice` — dejar claro que la medición no está implementada.

---

## 13. Canales de notificación — futuro (no implementar en E5.21)

Posibles canales **documentados** para tracks posteriores:

| Canal | Rol |
|-------|-----|
| Notificación panel dashboard local | Vista read-only en UI |
| CLI / stdout | Operador / scripts |
| Cola local en archivo | JSONL o similar |
| Telegram — mensaje de revisión | Solo texto explicativo |
| Email — mensaje de revisión | Solo texto explicativo |

**E5.21 no implementa ningún canal.** No añadir bots, webhooks ni plantillas de push en este checkpoint.

---

## 14. Cola / persistencia — futuro

Opciones para implementación futura (requieren PM):

| Opción | Notas |
|--------|-------|
| Cola **JSONL** local | Append-only; fácil auditoría |
| Tabla **SQLite** local | V2-18+; estados y consultas |
| Estados | `new` \| `reviewed` \| `dismissed` \| `archived` |
| Cloud | **No** dependencia por defecto |

Las alertas persistidas conservan `governance_footer` y campos §5 íntegros.

---

## 15. Barreras de seguridad

Las alertas **no deben**:

| Prohibición |
|-------------|
| Disparar órdenes MT5 |
| Llamar `OrderSend`, `CTrade`, `PositionOpen` |
| Llamar APIs de broker |
| Enviar `WebRequest` operativo desde MQL5 |
| Crear workflow de trading en vivo |
| Ocultar warnings en candidatos |
| Omitir `governance_footer` |

Revisión de código en E5.21.x: grep de wording prohibido §8 y de APIs de trading en módulos de alerta.

---

## 16. Tracks de implementación futuros

| ID | Entregable | Tipo | Aprobación |
|----|------------|------|------------|
| **E5.21.1** | Modelo de alerta + formatter TS | **Done** — [`ALERT_ONLY_REVIEW_MODEL_FORMATTER_E5_21_1.md`](./ALERT_ONLY_REVIEW_MODEL_FORMATTER_E5_21_1.md) | E5.21.1.1 |
| **E5.21.1.1** | Formatter operator evidence | **PASS** — [`ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md`](./ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md) | E5.21.1 |
| **E5.21.2** | Cola local en archivo (JSONL) | **Done** — [`ALERT_REVIEW_QUEUE_MANAGER_E5_21_2.md`](./ALERT_REVIEW_QUEUE_MANAGER_E5_21_2.md) | E5.21.2.1 |
| **E5.21.2.1** | Queue manager operator evidence | **PASS** — [`ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md`](./ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md) | E5.21.3 / PM |
| **E5.21.3** | Panel notificaciones dashboard read-only | UI | PM |
| **E5.21.4** | Prototipo Telegram review-only | Integración | PM |
| **E5.21.5** | Evidencia operador SET001 | Docs | PM |

**E5.21 (este documento):** solo plan/contrato. **No** iniciar E5.21.1 sin tarea explícita.

---

## Referencias

- [`READONLY_CONSUMPTION_BLOCK_CLOSURE_E5_20_4_2.md`](./READONLY_CONSUMPTION_BLOCK_CLOSURE_E5_20_4_2.md)
- [`BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md`](./BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md)
- [`DASHBOARD_READONLY_DATA_ADAPTER_E5_20_3.md`](./DASHBOARD_READONLY_DATA_ADAPTER_E5_20_3.md)
- [`HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md`](./HUMANIZED_SETUP_ACCEPTANCE_POLICY_V1_E5_20_5.md)
- [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md)

**E5.21.1:** modelo + formatter — [`ALERT_ONLY_REVIEW_MODEL_FORMATTER_E5_21_1.md`](./ALERT_ONLY_REVIEW_MODEL_FORMATTER_E5_21_1.md).

**E5.21.1.1:** evidencia operador **PASS** — [`ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md`](./ALERT_ONLY_REVIEW_FORMATTER_EVIDENCE_E5_21_1_1.md).

**E5.21.2:** cola JSONL con estados — [`ALERT_REVIEW_QUEUE_MANAGER_E5_21_2.md`](./ALERT_REVIEW_QUEUE_MANAGER_E5_21_2.md).

**E5.21.2.1:** evidencia operador **PASS** — [`ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md`](./ALERT_REVIEW_QUEUE_MANAGER_EVIDENCE_E5_21_2_1.md).

**Siguiente recomendado:** **E5.21.3** panel read-only o **E5.21.4** Telegram (decisión PM).
