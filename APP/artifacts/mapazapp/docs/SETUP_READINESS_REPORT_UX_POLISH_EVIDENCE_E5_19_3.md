# Setup Readiness Report UX Polish — Evidencia operador E5.19.3

## Alcance

- **Checkpoint:** E5.19.3 — evidencia operador del informe Setup Readiness **post E5.19.2** (UX polish).
- **Build TestEA:** `MZP_TestEA_E5_18`.
- **Bundle:** `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`.
- **Prerequisitos repo:** E5.19.1 PASS — [`SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md`](./SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md); E5.19.2 — [`SETUP_READINESS_REPORT_UX_POLISH_E5_19_2.md`](./SETUP_READINESS_REPORT_UX_POLISH_E5_19_2.md) (`28d431a` o posterior).
- **Sin cambios en esta tarea:** MQL5, TypeScript, scoring, decisión, entry, TP, gates, live trading.

Este documento registra el **re-run** del CLI con el generador pulido. Los artefactos generados permanecen locales (`*_DO_NOT_COMMIT`).

---

## Comando

```bash
pnpm --filter @workspace/scripts mapazapp:testea-setup-readiness-report -- \
  --bundle "<RunDir>" \
  --markdown-output "<local>/setup_readiness_report_polished.md" \
  --json-output "<local>/setup_readiness_report_polished.json" \
  --html-output "<local>/setup_readiness_report_polished.html" \
  --max-examples 10 \
  --language es
```

| Campo | Valor |
|-------|-------|
| Salida CLI (stdout) | `Wrote report for SET001_FVG2_RR2_00_BIASBODY0_RALIGN1 (ok=true, trades=1697)` |
| `ok` | `true` |
| `warnings` (array JSON) | `[]` (`warnings_count = 0`) |
| CLI / core | post-commit **`28d431a`** (E5.19.2) o posterior |

---

## Artefactos locales (no commitear)

| Formato | Ruta |
|---------|------|
| Markdown | `APP/artifacts/mapazapp/docs/_local_E5_19_3_setup_readiness_report_polished_DO_NOT_COMMIT/setup_readiness_report_polished.md` |
| JSON | `APP/artifacts/mapazapp/docs/_local_E5_19_3_setup_readiness_report_polished_DO_NOT_COMMIT/setup_readiness_report_polished.json` |
| HTML | `APP/artifacts/mapazapp/docs/_local_E5_19_3_setup_readiness_report_polished_DO_NOT_COMMIT/setup_readiness_report_polished.html` |

---

## JSON — resumen

### Header y flags

| Campo | Valor |
|-------|-------|
| `header.bundle` | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `header.bundle_name` | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `header.ea_build` | `MZP_TestEA_E5_18` |
| `header.trade_count` | 1697 |
| `minimum_display_unit_enforced` | `true` |
| `read_only` / `execution_enabled` | `true` / `false` |

### Executive summary

| Métrica | Valor |
|---------|------:|
| `average_setup_readiness_score` | 65.060695 |
| `average_blocker_count` | 1.05 |
| `average_warning_count` | 3.62 |

| Decisión | Count | % |
|----------|------:|--:|
| `reject` | 1300 | 76.6 % |
| `candidate` | 247 | 14.6 % |
| `wait` | 150 | 8.8 % |

Coherente con E5.19.1 / E5.18.3 (mismo bundle, misma lógica de export).

---

## Verificación UX polish (E5.19.2)

| Criterio | Resultado |
|----------|-----------|
| Warning aliases normalizados | **PASS** — `top_warnings` / `warning_leaderboard` usan claves canónicas (`target_before_liquidity`, `overtrading_warning`, `environment_weak`, `entry_fragile`, `discipline_warning`); sin pares duplicados `checklist_*` + corto en leaderboard |
| Markdown sin `###` vacío | **PASS** — sección «Advertencias agregadas» presente; no hay heading vacío bajo Ranking de advertencias |
| Examples deduplicados + badges | **PASS** — 10 `example_cards`, 10 `trade_id` únicos; cada card incluye `categories[]` (p. ej. `reject` + `high_score_reject`); Markdown muestra línea **Categorías:** |
| `primary_blocker` vs `blocker_count=0` | **PASS** — card `VTR_000011` (wait): `primary_context_kind=main_reason`, etiqueta **Motivo principal**, nota «no contado como bloqueador duro» |
| Component summary aclarado | **PASS** — columna **Advertencia o incidencia**; sin columna Blocker=0 engañosa; nota de que blockers globales están en ranking separado |
| Wording ES | **PASS** — interpretación y gobernanza incluyen «No tomar el puntaje como permiso de entrada»; labels de decisión pulidos |
| HTML legible | **PASS** — CSS embebido con `ui-monospace`, espaciado y `pre` con borde/fondo |
| Governance footer | **PASS** — read-only, sin gates, 50 %/CE, RR2, research-only |

### Muestra — warnings normalizados (Markdown)

- **TP antes que liquidez**: 1249 (73.6 %)
- **Sobreoperación**: 1109 (65.4 %)
- **Entorno débil**: 1062 (62.6 %)

(No aparece `**checklist_target_before_liquidity**` en el leaderboard.)

### Muestra — example card con categorías múltiples

- Trade `VTR_000001`: categorías `rechazado`, `high_score_reject` — una sola tarjeta en el informe.

---

## Decisión del checkpoint

| Regla | Valor |
|-------|-------|
| E5.19.3 evidencia técnica | **PASS** |
| Informe regenerado limpio post UX polish | **Verificado** |
| Métricas de negocio sin regresión vs E5.19.1 | **Verificado** (mismos conteos decisión/score) |
| Cambio MQL5 / scoring / decisión | **No** |
| Gates / live / edge approval | **No** |

**Cierre de bloque Detection / Readiness / Report V1 (TypeScript):** prototipo CLI + UX polish + evidencia operador en SET001 completados. El informe estático es apto para revisión humana y planificación dashboard (E5.20).

---

## Siguiente recomendado

- ~~**E5.20** BridgeEA / dashboard consumption plan (read-only).~~ **Done** — [`BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md`](./BRIDGEEA_DASHBOARD_READONLY_CONSUMPTION_PLAN_E5_20.md)
- **E5.20.1** local bundle index CLI — [`LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md`](./LOCAL_BUNDLE_INDEX_CLI_E5_20_1.md); **siguiente:** **E5.20.2**, **o**
- **E5.18.6** severity calibration audit, **E5.18.7** per-symbol comparison.

---

## Referencias

- UX polish repo: [`SETUP_READINESS_REPORT_UX_POLISH_E5_19_2.md`](./SETUP_READINESS_REPORT_UX_POLISH_E5_19_2.md)
- Evidencia E5.19.1: [`SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md`](./SETUP_READINESS_REPORT_PROTOTYPE_EVIDENCE_E5_19_1.md)
- Prototype: [`SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md`](./SETUP_READINESS_REPORT_PROTOTYPE_E5_19.md)
- Contrato: [`SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md`](./SETUP_READINESS_DASHBOARD_REPORT_CONTRACT_E5_18_5.md)
