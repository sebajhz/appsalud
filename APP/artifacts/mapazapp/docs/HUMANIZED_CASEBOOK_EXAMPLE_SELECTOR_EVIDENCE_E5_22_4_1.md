# Humanized Casebook Example Selector — Evidencia operador E5.22.4.1

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.22.4.1 — evidencia operador selector de ejemplos HA sobre SET001 |
| **Tipo** | Evidencia operador + documentación — **sin implementación de código** |
| **Baseline Git** | `1652731` — `feat(mapazapp): E5.22.4.1 add humanized casebook example selector` |
| **Implementación previa** | [`HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_E5_22_4_1.md`](./HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_E5_22_4_1.md) |
| **Prerrequisito** | [`HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md`](./HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md) |
| **Bundle ST previo** | [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md) — SET001, `MZP_TestEA_E5_18` |
| **Decisión** | **PASS técnico** — con caveats de gobernanza (sin gate, sin live, sin aprobación edge/25/adaptive) |
| **E5.22.4.2** | [`HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md`](./HUMANIZED_TEXTUAL_TRADE_CARDS_E5_22_4_2.md) — trade cards textuales |
| **E5.22.5** | [`HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md`](./HUMANIZED_ACCEPTANCE_TRADE_SET_DELTA_DESIGN_E5_22_5.md) |
| **Siguiente recomendado** | E5.22.5.1 · E5.23 |
| **Sin cambios** | MQL5, TypeScript, MT5, Strategy Tester, gates, live, entry/TP, edge/25/adaptive, Telegram/dashboard |

---

## 1. Baseline Git

| Campo | Valor |
|-------|-------|
| **Checkpoint previo (repo)** | `1652731` — `feat(mapazapp): E5.22.4.1 add humanized casebook example selector` |
| **Medibilidad HA previa** | `8a980af` — `docs(mapazapp): E5.22.4 audit humanized casebook measurability` |

---

## 2. Comando operador

```bash
pnpm --filter @workspace/scripts mapazapp:testea-humanized-casebook-example-selector -- \
  --bundle "C:\Users\QuerlyPC\AppData\Roaming\MetaQuotes\Tester\A05F66FF4A995303E43EBDC7469BF577\Agent-127.0.0.1-3000\MQL5\Files\Mapazapp\TestEA\E55\SET001_FVG2_RR2_00_BIASBODY0_RALIGN1" \
  --json \
  --csv-output "E:\MAPAZAPP\APP\artifacts\mapazapp\docs\_local_E5_22_4_1_humanized_casebook_examples_DO_NOT_COMMIT\humanized_casebook_examples.csv" \
  --max-examples-per-case 5
```

| Campo | Valor |
|-------|-------|
| **Bundle** | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| **EA build** | `MZP_TestEA_E5_18` |
| **Symbol / TF** | XAUUSD / M15 |
| **Salida local** | `APP/artifacts/mapazapp/docs/_local_E5_22_4_1_humanized_casebook_examples_DO_NOT_COMMIT/` |

---

## 3. Artefactos locales generados

Directorio (operador, **no commitear**):

`APP/artifacts/mapazapp/docs/_local_E5_22_4_1_humanized_casebook_examples_DO_NOT_COMMIT/`

| Archivo | Descripción |
|---------|-------------|
| `humanized_casebook_examples.json` | JSON validado del selector |
| `humanized_casebook_examples.csv` | CSV aplanado |
| `humanized_casebook_examples_cli_output.log` | Salida completa del CLI (JSON + stderr) |

**Regla:** prefijo `_local_*_DO_NOT_COMMIT` — permanecen fuera de Git.

---

## 4. Resumen de resultado (JSON)

| Campo | Valor |
|-------|-------|
| `ok` | `true` |
| `schema_version` | `mapazapp_humanized_casebook_example_selector_v1` |
| `bundle` | `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1` |
| `ea_build` | `MZP_TestEA_E5_18` |
| `symbol` | `XAUUSD` |
| `timeframe` | `M15` |
| `trade_count` | 1697 |
| `missing_cases` | `["HA-008"]` |
| `errors` | `[]` |
| `warnings` | HA-008 unavailable (ver §5) |

---

## 5. Nota NativeCommandError / warning

PowerShell mostró `NativeCommandError` porque el CLI emitió un **warning en stderr** (no en stdout):

```text
warn: HA-008: unavailable — export has no economic calendar / news event fields (do not infer from session).
```

| Aspecto | Conclusión |
|---------|------------|
| ¿Es fallo? | **No** — comportamiento esperado |
| `ok` del selector | `true` |
| HA-008 | Debe permanecer **missing** — no hay feed news/event en el export |
| Regla | **No** inferir news desde `session` |

El JSON en el log confirma `ok: true` inmediatamente después del warning.

---

## 6. Cobertura de ejemplos HA

| Caso | Ejemplos | Notas |
|------|----------:|-------|
| **HA-001** | 5 | Near-miss / shallow retrace — candidatos aceptables |
| **HA-002** | 5 | Near-miss — proxies de reacción débil |
| **HA-003** | 5 | Edge/25/adaptive — research-only |
| **HA-004** | 10 | PD conflict winners (5) + losers (5) |
| **HA-005** | 10 | Discipline pressure winners (5) + losers (5) |
| **HA-006** | 10 | Target missing/weak winners (5) + losers (5) |
| **HA-007** | 5 | No-chase / late-entry proxy |
| **HA-008** | 0 | **Esperado** — sin campos news/event |
| **HA-009** | 7 | IFVG conflict losers + rare winners |
| **HA-010** | 10 | Wait winners (5) + wait losers (5) |

**Categorías de calibración adicionales:** 12 buckets × 5 ejemplos (`candidate_winner`, `candidate_loser`, `reject_winner`, `reject_loser`, `high_score_reject_*`, `structure_conflict_*`, `execution_environment_weak_*`, `ifvg_weak_loser`, `ifvg_ab_winner`).

---

## 7. Ejemplos representativos clave

### HA-001 — `VTR_000002`

| Campo | Valor |
|-------|-------|
| Outcome | `expired_unfilled` |
| `entry_fill_status` | `missed_shallow_retrace` |
| `entry_variant_edge_status` | `win` (+2R sim) |
| Official | 0R |
| Readiness | reject, score 70, grade B, `entry_fragile` |

**Interpretación:** el CE oficial no se llenó; la revisión near-miss futura requiere `reaction_strength` y tolerancia — no gate hoy.

### HA-003 — `VTR_000014`

| Campo | Valor |
|-------|-------|
| Outcome | loss oficial -1R |
| `ifvg_conflict` | true |
| `entry_variant_edge_status` / `25` | win / win (+2R sim) |

**Interpretación:** existe uplift de variante edge/25, pero permanece **research-only** — no aprobación de entry alternativa.

### HA-004 winner — `VTR_000001`

| Campo | Valor |
|-------|-------|
| Readiness | reject, score 90, grade A |
| `primary_blocker` | `pd_conflict` |
| Official | win +2R |

**Interpretación:** PD conflict **no** puede tratarse como hard reject en SET001.

### HA-004 loser — `VTR_000021`

| Campo | Valor |
|-------|-------|
| Blockers | `pd_conflict` + `ifvg_conflict` |
| Official | loss -1R |

**Interpretación:** PD conflict puede importar solo combinado con blockers más fuertes — requiere calibración, no gate único.

### HA-005 — `VTR_000036`

| Campo | Valor |
|-------|-------|
| Readiness | candidate, win +2R |
| Flags | `overtrading_risk`, `revenge_trade_risk` |

**Interpretación:** la presión de disciplina **no** invalida automáticamente en SET001.

### HA-006 — `VTR_000192`

| Campo | Valor |
|-------|-------|
| `primary_blocker` | `target_missing` |
| Official | win +2R |

**Interpretación:** target missing **no** es hard reject hoy.

### HA-007 — `VTR_000021` / `VTR_000035`

| Trade | Late | Official |
|-------|------|----------|
| `VTR_000021` | `entry_filled_late` | loss -1R |
| `VTR_000035` | `entry_filled_late` | loss -1R |

**Interpretación:** no-chase necesita campos explícitos de distancia/timing antes de política.

### HA-009 — `VTR_000014` / `VTR_000341` / `VTR_001160`

| Trade | Rol | Official |
|-------|-----|----------|
| `VTR_000014` | IFVG conflict loser | -1R |
| `VTR_000341` | rare IFVG conflict winner | +2R |
| `VTR_001160` | rare IFVG conflict winner | +2R |

**Interpretación:** IFVG conflict es candidato fuerte a calibración negativa, pero los winners raros impiden gate inmediato.

### HA-010 — `VTR_000037` / `VTR_000125`

| Trade | Rol | Official |
|-------|-----|----------|
| `VTR_000037` | wait winner | +2R |
| `VTR_000125` | wait loser | -1R |

**Interpretación:** wait **no** es reject; requiere calibración wait→candidate.

### Calibración readiness

| Categoría | Trade ID |
|-----------|----------|
| `candidate_winner` | `VTR_000003` |
| `candidate_loser` | `VTR_000061` |
| `reject_winner` | `VTR_000001` |
| `reject_loser` | `VTR_000010` |
| `high_score_reject_winner` | `VTR_000001` |
| `high_score_reject_loser` | `VTR_000010` |

---

## 8. Conclusiones principales de evidencia

1. El selector ancla con éxito los casos HA del casebook a **trade IDs reales** del bundle SET001.
2. La humanización deja de ser solo abstracta: hay ejemplos concretos con interpretación y nota de gobernanza por fila.
3. **HA-008** permanece intencionalmente vacío — sin inventar news desde sesión.
4. Ejemplos PD conflict confirman que PD **no** debe ser hard reject.
5. Ejemplos IFVG conflict confirman comportamiento negativo fuerte pero con excepciones raras.
6. Ejemplos wait confirman que wait puede contener trades fuertes.
7. Ejemplos near-miss confirman ausencia de `reaction_strength` / tolerancia en export.
8. Ejemplos de variantes confirman que edge/25/adaptive requieren auditoría de robustez — **no** aprobación.

---

## 9. Decisión y caveats

### Decisión

**E5.22.4.1 = PASS** (evidencia técnica operador).

### Caveats

- Solo **SET001**
- Solo **XAUUSD M15**
- Ejemplos seleccionados para **análisis**, no prueba de cambio de estrategia
- **No** gates aprobados
- **No** política humanizada activa en MQL5
- **No** aprobación edge/25/adaptive
- **HA-008** unavailable hasta existir campos news/event en export

---

## 10. Gobernanza

| Acción | Estado |
|--------|--------|
| Cambios MQL5 | **No** |
| MT5 / Strategy Tester rerun | **No** (tarea docs) |
| Cambios de estrategia / gates / live | **No** |
| Cambio entry / TP | **No** |
| Aprobación edge/25/adaptive | **No** |
| Dashboard / Telegram / email / push | **No** |
| Commitear `_local_*` | **No** |

---

## Referencias

- [`HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_E5_22_4_1.md`](./HUMANIZED_CASEBOOK_EXAMPLE_SELECTOR_E5_22_4_1.md)
- [`HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md`](./HUMANIZED_CASEBOOK_MEASURABILITY_AUDIT_E5_22_4.md)
- [`HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md`](./HUMANIZED_ACCEPTANCE_CASEBOOK_E5_20_6.md)
- [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md)
