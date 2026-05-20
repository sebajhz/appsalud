# Setup Readiness Report UX Polish — E5.19.2

## Alcance

- **Checkpoint:** E5.19.2 — pulido de **presentación** del informe Setup Readiness (TypeScript).
- **Prerequisito:** E5.19.1 PASS — [`SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md`](./SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md).
- **Sin cambios:** MQL5, scoring checklist, lógica de decisión, entry, TP, EVOS, gates, live trading.

Solo capa de **generación / render** del informe (`testea-setup-readiness-report.ts`).

---

## Problemas corregidos (E5.19.1 → E5.19.2)

| # | Problema | Fix |
|---|----------|-----|
| 1 | Warning leaderboard con alias duplicados (`checklist_*` + token corto) | Normalización a clave canónica; conteo **una vez por trade** por warning |
| 2 | Markdown con `###` vacío bajo ranking de advertencias | Título **Advertencias agregadas** |
| 3 | Example cards repetidas entre categorías | Trades **únicos** con insignias `categories[]` |
| 4 | `primary_blocker` con `blocker_count=0` confunde | Etiqueta **Motivo principal** + nota contextual |
| 5 | Component summary `Blocker=0` engañoso | Columna **Advertencia o incidencia**; nota de que blockers van en ranking global |
| 6 | Wording ES | Labels de decisión y gobernanza alineados a E5.18.4 / contrato |
| 7 | HTML | CSS embebido: espaciado, `pre` legible (sin dependencias externas) |

---

## Claves de warning canónicas

| Canónica | Alias absorbidos |
|----------|------------------|
| `target_before_liquidity` | `checklist_target_before_liquidity` |
| `overtrading_warning` | `checklist_overtrading_warning` |
| `environment_weak` | `checklist_environment_weak` |
| `entry_fragile` | `checklist_entry_fragile` |
| `discipline_warning` | `checklist_discipline`, `daily_loss_limit_warning` |

En Markdown ES se muestran etiquetas legibles (p. ej. «TP antes que liquidez»).

---

## API de presentación (exportadas para tests)

- `normalizeSetupReadinessWarningToken(token)`
- `countNormalizedSetupReadinessWarnings(trades)`
- `buildDedupedExampleCards(trades, maxExamples, language)`

---

## E5.19.3 — Evidencia operador

- **PASS** — [`SETUP_READINESS_REPORT_UX_POLISH_EVIDENCE_E5_19_3.md`](./SETUP_READINESS_REPORT_UX_POLISH_EVIDENCE_E5_19_3.md).
- Artefactos: `_local_E5_19_3_setup_readiness_report_polished_DO_NOT_COMMIT/` (no commit).

---

## Siguiente recomendado

**E5.20** BridgeEA / dashboard consumption plan, **o** E5.18.6+ research audits.

---

## Referencias

- Prototype: [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md)
- Evidencia E5.19.1: [`SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md`](./SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md)
- Contrato: [`SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md`](./SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md)
