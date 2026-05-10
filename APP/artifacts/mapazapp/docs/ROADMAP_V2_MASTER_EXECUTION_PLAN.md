# ROADMAP V2 — Master Execution Plan

## V2-16 checkpoint context

- Checkpoint: `V2-16 — Dashboard/API Connection Cleanup`.
- Purpose: alinear contratos GET mock para la pila de evidencia V2 (campaña, grid, walk-forward, pipeline manual), servicios de dashboard y copy conservador; sin cambiar lógica de motor, sin persistencia, sin POST, sin import UI.
- Rutas API: `GET /api/mapazapp/backtest-campaigns/mock-latest`, `GET /api/mapazapp/parameter-grid/mock-latest`, `GET /api/mapazapp/walk-forward/mock-latest`, `GET /api/mapazapp/manual-campaign/mock-latest` (sobre fixtures core, flags `reviewOnly`, `executionEnabled: false`, `registryMutationAllowed: false`, `autoApprovalEnabled: false`).

## V2-15 checkpoint context

- Checkpoint: `V2-15 — Walk-forward / Train-Validation-Forward Evaluator`.
- Purpose: gobernar evidencia por splits (train / validation / forward), señalar riesgo de sobreajuste e inestabilidad, y emitir recomendaciones conservadoras sin auto-aprobación.
- Reference: `APP/artifacts/mapazapp/docs/V2_15_WALK_FORWARD_TRAIN_VALIDATION_FORWARD_EVALUATOR.md`.
- Consumo V2-16: la salida puede exponerse vía `GET .../walk-forward/mock-latest` (mock) además del core.

## V2-14 checkpoint context

- Checkpoint: `V2-14 — Parameter Set Grid Runner v1`.
- Purpose: comparar parameter sets sobre los mismos datasets mediante campañas aisladas (`runParameterGrid` → `runBacktestCampaign`), ranking conservador y recomendaciones sin auto-aprobación.
- Reference: `APP/artifacts/mapazapp/docs/V2_14_PARAMETER_SET_GRID_RUNNER_V1.md`.

## V2-13 checkpoint context

- Checkpoint: `V2-13 — Campaign Runner over Manual Datasets`.
- Purpose: orquestar `runBacktestCampaign` sobre datasets procedentes de CSV manual y/o bundles BridgeEA/TestEA validados en memoria, con diagnósticos y flags de seguridad explícitos.
- Reference: `APP/artifacts/mapazapp/docs/V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md`.

## V2-12 checkpoint context

- Checkpoint: `V2-12 — Real Export Sample Validation from BridgeEA/TestEA`.
- Purpose: validar bundles de texto saneados (BridgeEA + TestEA) contra parsers/importers del core, privacidad heurística, sin `fs`, sin exportes crudos en repo.
- Reference: `APP/artifacts/mapazapp/docs/V2_12_REAL_EXPORT_SAMPLE_VALIDATION.md`.

## V2-11 checkpoint context

- Checkpoint: `V2-11 — Manual Candle Dataset Import / Replay Campaign Input`.
- Purpose: parse CSV de velas suministrado como texto en memoria hacia `Candle[]` y `BacktestCampaignDataset` (adaptador), sin watcher, sin DB, sin ejecución, sin ingest automático MT5.
- Reference: `APP/artifacts/mapazapp/docs/V2_11_MANUAL_CANDLE_DATASET_IMPORT.md`.

## V2-10.5 checkpoint context

- Checkpoint: `V2-10.5 — Roadmap V2 Master Execution Plan Refresh`.
- Purpose: keep a single authoritative execution sequence for Roadmap V2, avoid scope drift, and preserve safety boundaries.

---

## 1) Current status

### Completed foundations

- CP0 through CP18.5 completed (system foundation, review-only posture, safety invariants, architecture separation).
- V2-01 through V2-16 completed (engine-first sequence; V2-16 = capa dashboard/API read-only para evidencia V2 sin motor nuevo).

### Current repo reference

- Ultimo commit de capa evidencia dashboard/API (V2-16): **`0082e26`** — `feat(dashboard+api): V2-16 mock engine evidence GET routes and UI summaries`.
- **Fase A1 (documentacion):** estrategia de testing/validacion, manual MT5, runtime/launcher, integracion MT5 y auditoria `AUDIT_TESTING_MT5_LAUNCHER_A1.md`. La implementacion de launcher, ingesta MT5 runtime, watcher, DB, WebSocket live y ejecucion real **no** forma parte de A1 y requiere aprobacion aparte.

---

## 2) Product objective

Mapazapp is a **trading decision assistant**, not just a bot.

The engine must behave like a structured human analyst:

- zones, not exact points;
- dynamic tolerances, not fixed pips;
- variants, not rigid A+B+C only;
- context, timing, confidence, risk, and target quality;
- replay and backtest proof before trust;
- trader guidance, not blind execution.

---

## 3) Estimated progress (honest)

These percentages are directional and conservative:

- **System / plumbing:** ~78%
- **Engine technical maturity:** ~66%
- **Engine proof / profitability evidence:** ~28%
- **Demo-readiness (read-only, controlled):** ~42%
- **Execution-readiness:** ~8%

Interpretation:

- plumbing and contracts are advanced, but evidence quality is still developing;
- engine logic is materially stronger than early checkpoints, but not yet trust-complete;
- profitability remains unproven and must not be inferred.

---

## 4) Next execution plan (authoritative order)

1. V2-11 — Manual Candle Dataset Import / Replay Campaign Input (done)
2. V2-12 — Real Export Sample Validation from BridgeEA/TestEA (done)
3. V2-13 — Campaign Runner over Manual Datasets (done)
4. V2-14 — Parameter Set Grid Runner v1 (done)
5. V2-15 — Walk-forward / Train-Validation-Forward Evaluator (done)
6. V2-16 — Dashboard/API Connection Cleanup (done)
7. V2-17 — Local Import UI or CLI
8. V2-18 — Persistence Decision / Local SQLite Design
9. V2-19 — Forward Demo Read-only from Imported BridgeEA Files
10. V2-20 — Alert-only Review Notifications
11. V2-21 — Risk / Prop Firm Real Mapping
12. V2-22 — Psychology / Manual Lock Integration
13. V2-23 — Startup Scripts / Developer Launchers
14. V2-24 — Stabilization / Packaging Plan
15. V2-25 — Assisted Execution Re-evaluation Gate

**Nota D2 (previo a scripts/launcher en código):** diseño formal de config y runtime status en `APP/artifacts/mapazapp/docs/LAUNCHER_CONFIG_AND_STATUS_DESIGN.md` (documentación únicamente); alinear implementación futura de V2-23 / launcher con ese diseño antes de exponer estados que parezcan conectividad real.

**Nota D7.1 (puente de acciones, solo docs):** `APP/artifacts/mapazapp/docs/ACTION_BRIDGE_DESIGN.md` define cómo el dashboard podría disparar operaciones futuras vía API local / launcher sin ejecutar comandos desde el browser; no añade endpoints `POST`, botones ni launcher ejecutable.

**Nota D8.1 (launcher prototype, solo docs):** `APP/artifacts/mapazapp/docs/LAUNCHER_PROTOTYPE_DESIGN_D8.md` define el diseño del futuro launcher y del puente **launcher-side** (procesos/PIDs, Windows, puertos, logs, seguridad localhost, pruebas futuras); no implementa código, supervisor, `spawn`, MT5 runtime, watcher, DB ni WebSocket live.

---

## 5) Checkpoint definitions (V2-11 through V2-25)

### V2-11 — Manual Candle Dataset Import / Replay Campaign Input

- **Goal:** parse manually supplied CSV candle datasets into campaign-ready datasets.
- **Adds:** deterministic parser + mapper from manual CSV to core campaign input types.
- **Must not add:** watchers, DB, live folder scan, execution, command channels.
- **Validation required:** core tests for parsing, schema checks, deterministic dataset outputs.
- **Definition of done:** manual CSV can be transformed into valid `BacktestCampaignDataset[]` with documented diagnostics.

### V2-12 — Real Export Sample Validation from BridgeEA/TestEA

- **Goal:** validate sanitized local exports can be parsed and transformed into core datasets.
- **Adds:** validation harness for sanitized sample exports and contract consistency checks.
- **Must not add:** raw real exports in repo, execution, watchers, automation daemons.
- **Validation required:** parser and mapping tests over sanitized sample set.
- **Definition of done:** reproducible pass/fail validation report for sanitized exports.

### V2-13 — Campaign Runner over Manual Datasets

- **Goal:** run V2-10 campaign runner over imported/manual datasets and produce symbol/parameter evidence.
- **Adds:** orchestration wrapper for imported datasets + evidence summary artifacts.
- **Must not add:** auto-approval, registry writes, profitability claims.
- **Validation required:** deterministic campaign runs and evidence output tests.
- **Definition of done:** campaign results generated from manual datasets with conservative recommendations only.

### V2-14 — Parameter Set Grid Runner v1

- **Goal:** compare parameter sets over the same datasets.
- **Adds:** controlled grid execution over parameter sets and comparative metrics.
- **Must not add:** optimization daemon, live automation, unattended tuning loops.
- **Validation required:** repeatability tests and aggregation correctness across parameter sets.
- **Definition of done:** stable comparative report per parameter set with conservative ranking.

### V2-15 — Walk-forward / Train-Validation-Forward Evaluator

- **Goal:** split evidence correctly and avoid overfitting.
- **Adds:** explicit split governance and walk-forward evidence evaluator.
- **Must not add:** hidden split leakage, auto-promotion logic.
- **Validation required:** split-integrity tests, leakage prevention tests, consistency tests.
- **Definition of done:** walk-forward protocol enforced and reported per run.

### V2-16 — Dashboard/API Connection Cleanup

- **Goal:** presentar la pila de evidencia V2 (campaña, grid, walk-forward, manual) de forma coherente entre API mock GET y dashboard in-process.
- **Adds:** rutas `GET .../mock-latest`, adaptadores `api-server`, interfaces `*DataSource` + mocks en dashboard, helpers de copy conservador (`engineEvidenceUi`), tarjetas resumen en Backtests.
- **Must not add:** motor nuevo, persistencia DB, POST, import/upload UI, ejecución, aprobación automática.
- **Validation required:** tests API (200, flags, sin POST), tests frontend (helpers + mocks).
- **Definition of done:** contratos read-only alineados; copy “evidence only / no approval / no execution”; sin `approved: true` en payloads mock de esta capa.

### V2-17 — Local Import UI or CLI

- **Goal:** user can manually import CSV/export files for analysis.
- **Adds:** operator-facing manual import flow (UI or CLI) for controlled ingestion.
- **Must not add:** watcher daemon, auto-import, hidden background scans.
- **Validation required:** import UX/CLI flow tests + parser integration tests.
- **Definition of done:** operator can manually import data and launch analysis reproducibly.

### V2-18 — Persistence Decision / Local SQLite Design

- **Goal:** decide if/where to persist datasets, runs, evidence and audit.
- **Adds:** architecture decision record and local SQLite design proposal.
- **Must not add:** premature DB implementation before design approval.
- **Validation required:** design review with migration and rollback strategy.
- **Definition of done:** approved persistence design scope, constraints, and phased rollout plan.

### V2-19 — Forward Demo Read-only from Imported BridgeEA Files

- **Goal:** read exported files manually/imported and show forward monitor.
- **Adds:** read-only forward monitor path from imported artifacts.
- **Must not add:** live watcher unless separately approved, execution, command reader.
- **Validation required:** forward monitor consistency tests vs imported snapshots.
- **Definition of done:** stable read-only forward demo view from imported files.

### V2-20 — Alert-only Review Notifications

- **Goal:** notify review candidates only.
- **Adds:** review-only alert generation and notification discipline.
- **Must not add:** execution triggers, auto-routing to broker.
- **Validation required:** alert precision/recall review on controlled datasets.
- **Definition of done:** alert-only output with documented suppression and quality rules.

### V2-21 — Risk / Prop Firm Real Mapping

- **Goal:** map real prop firm rules into account guard.
- **Adds:** richer account guard mapping model from concrete prop constraints.
- **Must not add:** execution, auto-trade unlock path.
- **Validation required:** rule-mapping tests for drawdown/limits/violations per account mode.
- **Definition of done:** account guard reflects mapped prop rules deterministically.

### V2-22 — Psychology / Manual Lock Integration

- **Goal:** trader discipline guard.
- **Adds:** psychology/manual lock signals integrated into review gating.
- **Must not add:** automation bypass, hidden override paths.
- **Validation required:** lock/unlock and gating behavior tests.
- **Definition of done:** manual lock is enforced and auditable in review flows.

### V2-23 — Startup Scripts / Developer Launchers

- **Goal:** one-command dev startup for API/dashboard.
- **Adds:** standardized scripts for local developer startup.
- **Must not add:** packaging/distribution claims beyond dev convenience.
- **Validation required:** scripts smoke-tested on local dev environment.
- **Definition of done:** reproducible one-command startup documented.

### V2-24 — Stabilization / Packaging Plan

- **Goal:** prepare the system to be used repeatedly.
- **Adds:** stabilization checklist, release-quality criteria, packaging strategy plan.
- **Must not add:** implied production approval or execution rollout.
- **Validation required:** stability matrix and regression suite pass thresholds.
- **Definition of done:** documented stabilization gate and packaging readiness plan.

### V2-25 — Assisted Execution Re-evaluation Gate

- **Goal:** only re-evaluate execution if evidence, risk, audit, demo and user approval exist.
- **Adds:** governance gate for explicit go/no-go decision.
- **Must not add:** execution implementation unless explicitly approved after gate.
- **Validation required:** evidence dossier review (engine, risk, audit, demo, user authorization).
- **Definition of done:** signed go/no-go decision document; default remains no execution.

---

## 6) Immediate next checkpoint recommendation

**Recommendation:** `V2-15 — Walk-forward / Train-Validation-Forward Evaluator`

**Reason:** con V2-14 el core puede comparar parameter sets de forma controlada; el siguiente paso es gobernanza explícita de splits y walk-forward para reducir sobreajuste y documentar evidencia temporal.

---

## 7) Safety invariants (non-negotiable)

- no execution;
- no MT5 command reader;
- no auto-approval;
- no registry mutation;
- no watcher until explicitly approved;
- no DB until explicitly designed;
- no profitability claims.

---

## 8) Reference alignment

This master plan is the authoritative roadmap execution reference for V2 and must be kept aligned from:

- `APP/artifacts/mapazapp/docs/CURSOR_HANDOFF.md`
- `APP/artifacts/mapazapp/docs/IMPLEMENTATION_ASSUMPTIONS.md`
- `Mapazapp_Replit_Handoff_V1/04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_Implementation_Checkpoint_Roadmap_V1.md`

