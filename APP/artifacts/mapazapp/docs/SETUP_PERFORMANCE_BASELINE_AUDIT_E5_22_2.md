# Setup Performance Baseline Audit — E5.22.2

## Estado

| Campo | Valor |
|-------|-------|
| **Checkpoint** | E5.22.2 — Setup Performance Baseline Audit (research-only) |
| **Baseline Git** | `ec9e5c8` o posterior — `feat(mapazapp): E5.22.2 add setup performance baseline audit` |
| **Bundle de referencia** | SET001 — `MZP_TestEA_E5_18` — ver [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md) |
| **Implementación** | `@workspace/mapazapp-core` + CLI `@workspace/scripts` |
| **Evidencia operador** | [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md) — **PASS** |
| **Siguiente recomendado** | **E5.22.4** HA measurability **o** **E5.23** optimization governance (PM) |
| **Sin cambios** | MQL5, entry, TP, gates, live, aprobación edge/25/adaptive |

---

## 1. Propósito

Auditoría **research-only** sobre el export TestEA más reciente para responder:

- ¿Dónde gana/pierde el setup oficial (50 % / CE, TP RR2)?
- ¿Qué decisiones de readiness correlacionan con outcome/R?
- ¿Qué blockers son útiles vs ruidosos?
- ¿Qué grades (IFVG, target, environment, discipline) son significativos?
- Impacto de sesión, volatilidad, fill, near-miss, ambigüedad y overtrading.
- Comparación de variantes **research-only** (25 %, adaptive, edge) vs oficial.
- Hipótesis para investigación engine siguiente (sin cambiar estrategia).

**No** aprueba edge, 25 %, adaptive ni cambios de entry/TP.

---

## 2. CLI

```bash
pnpm --filter @workspace/scripts mapazapp:testea-setup-performance-baseline-audit -- \
  --bundle "<RunDir>" \
  --json \
  --csv-output "<path>_DO_NOT_COMMIT.csv" \
  --max-examples 10
```

### Opciones

| Opción | Descripción |
|--------|-------------|
| `--bundle` | Carpeta bundle (requiere `backtest_summary.json` + `backtest_trades.csv`) |
| `--search-root` | Buscar bundles recursivamente |
| `--campaign-folder` | Filtrar por token bajo `Mapazapp\TestEA\<token>\` |
| `--json` | JSON completo en stdout |
| `--csv-output` | CSV aplanado para docs/evidencia |
| `--max-examples` | Máximo ejemplos por categoría (default 10) |
| `--strict` | Exit 1 si algún bundle falla |

### Entradas

- `backtest_summary.json` — identidad, rollup oficial, variantes sim, disciplina.
- `backtest_trades.csv` — outcomes, readiness, grades, fill, variantes por fila.
- `backtest_events.csv` — **no** parseado (evitar archivo grande).

---

## 3. Modelo de salida

`schema_version`: `mapazapp_setup_performance_baseline_audit_v1`

Secciones principales:

| Sección | Contenido |
|---------|-----------|
| `official_performance` | win/loss/ambiguous, total_r, winrate, expectancy, drawdown |
| `readiness_performance` | por `setup_readiness_decision` y `setup_readiness_grade` |
| `blocker_performance` | por `setup_readiness_primary_blocker` + detecciones high-score reject |
| `grade_performance` | IFVG, target, environment, discipline, entry fill, PD |
| `target_performance` | supported, before-nearest, reached-by-TP, nearest type |
| `environment_performance` | session, spread, volatility, execution grade |
| `discipline_performance` | grade, overtrading, revenge, límites diarios |
| `ifvg_performance` | grade, conflict, valid, inversion, retest |
| `variant_research_comparison` | 50/25/75/adaptive/edge — **research-only** |
| `ambiguity_analysis` | impacto y cortes por readiness/blocker/session/vol |
| `overtrading_analysis` | summary + daily R por `discipline_trade_date` |
| `drawdown_daily_r_analysis` | max drawdown + serie diaria |
| `hypotheses` | texto plano en inglés para revisión PM |
| `flags` | etiquetas de interpretación (sin aprobación) |
| `examples` | trades muestra por categoría |

---

## 4. Flags esperados (SET001)

Tras correr sobre evidencia E5.22, se esperan flags como:

- `OFFICIAL_EDGE_POSITIVE_BUT_NOT_APPROVED`
- `HIGH_AMBIGUITY_COUNT`
- `OVERTRADING_PRESSURE_HIGH`
- `TARGET_BEFORE_LIQUIDITY_DOMINANT`
- `VOLATILITY_V1_STRESS_LABEL`
- `ENTRY_VARIANTS_REQUIRE_ROBUSTNESS_AUDIT`
- `EDGE_VARIANT_SIMULATION_RISK`
- `READINESS_REJECTS_DOMINATE`
- `BLOCKER_CALIBRATION_NEEDED`

---

## 5. Gobernanza

| Regla | Estado |
|-------|--------|
| Cambiar MQL5 / entry / TP | Prohibido |
| Aprobar edge / 25 % / adaptive | Prohibido |
| Gates / live / Telegram / dashboard panel | Prohibido en esta fase |
| Usar un solo bundle como veredicto final | Insuficiente — requiere multi-bundle/OOS/WF |

---

## 6. Relación con otros checkpoints

- **E5.22** — evidencia operador compile + ST.
- **E5.22.0.1** — alineación MT5/repo; winrate ~44,77 % esperado.
- **E5.22.1** — export compatibility (consumidores E5.18–E5.21).
- **E5.22.2.1** — evidencia operador SET001 — [`SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md`](./SETUP_PERFORMANCE_BASELINE_AUDIT_EVIDENCE_E5_22_2_1.md) — **PASS**.

---

## Referencias

- [`LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md`](./LATEST_TESTEA_MT5_ST_EVIDENCE_E5_22.md)
- [`ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md`](./ENGINE_FIRST_ROADMAP_REALIGNMENT_AND_NEXT_STEPS_E5_21_2_2.md)
- [`SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md`](./SETUP_READINESS_DECISION_CALIBRATION_AUDIT_E5_18_2.md)
