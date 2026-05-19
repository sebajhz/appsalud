# Mapazapp — Project Execution Guide

## 1. Purpose

- Este archivo es la **guía principal** para Cursor y para futuros chats que continúen el trabajo.
- Si hay dudas sobre prioridad, roles de EA, qué es oficial y qué no, o el orden de checkpoints, **consultar primero este documento**.
- Si Cursor se pierde en el repo o en decisiones ya tomadas, **volver aquí** y alinear el trabajo con lo documentado.
- Si cambia el **rol** de un componente o la **arquitectura** de producto, **actualizar este archivo** en el mismo checkpoint (o inmediatamente después), no solo el código.
- Este documento debe **mantenerse vivo**: en **cada checkpoint** cerrado, actualizar al menos la tabla **Next-step checklist** (§8) y una línea en el **Implementation Ledger** (§9).

**Relacionado:** [`MT5_EA_ROLES_RECONCILIATION_E3_4_1.md`](./MT5_EA_ROLES_RECONCILIATION_E3_4_1.md), [`ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md`](./ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md), [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md). **Gobernanza estratégica (canónica):** [`MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md`](./MAPAZAPP_TRADE_DETECTION_NORTH_STAR.md), [`MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md`](./MAPAZAPP_PARAMETER_AND_OPTIMIZATION_GOVERNANCE.md). **TestEA build / versioning (E5.4.3):** [`TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md`](./TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md). **E5.5.0.2–E5.5.0.5:** TestEA export seguro — E5.5.0.2–E5.5.0.3 escritura/diagnósticos; **E5.5.0.4** defaults de campaña + presets `.set`; **E5.5.0.5** etiquetas de carpeta física cortas (tester MT5) manteniendo `campaign_id` / `parameter_set_id` completos en JSON (ver README TestEA y [`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](./TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md)). **E5.5.2 (auditoría setup/entrada):** [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md). **E5.6 (ambigüedad):** [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md). **E5.6.1 (analizador TS + CLI):** [`AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md`](./AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md). **E5.6.2 (evidencia operador):** [`AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md`](./AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md). **E5.7 (contrato Entry Quality Score V1):** [`ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md`](./ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md). **E5.8 (export score TestEA):** [`ENTRY_QUALITY_SCORE_EXPORT_E5_8.md`](./ENTRY_QUALITY_SCORE_EXPORT_E5_8.md). **E5.8.1 (smoke operador + calibración A/B=0):** [`ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md`](./ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md). **E5.9 (analizador calibración/distribución):** [`ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md). **Roadmap humanización trader profesional (E5.11–E5.19, docs):** [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md).

---

## 2. Original product objective

Mapazapp es un **asistente del trader** (inteligencia de decisión y lectura de contexto), no un bot de ejecución ciega.

**Debe:**

- Leer el **mercado actual** (vía integración acordada, p. ej. exportes BridgeEA).
- Interpretar **Daily / HTF Bias** como compuerta de contexto.
- Detectar **posibles setups** según el contrato de setup acordado.
- **Explicar razones** en lenguaje comprensible (humanización, §12).
- **Backtestear el setup** en **MetaTrader 5 Strategy Tester** con el EA oficial de tester (**Mapazapp_TestEA**; el rol conceptual “BacktestEA” vive ahí — ver §4 y §5).
- **Exportar evidencia** reproducible (CSV/JSON u otro contrato versionado).
- **Mostrar** resultados y contexto en **dashboard** cuando corresponda, como lectura para el trader.
- **Ayudar al trader a decidir**, no decidir por él sin transparencia.

**No debe:**

- **Operar automáticamente** ni sustituir el juicio humano final.
- **Enviar órdenes live** ni ejecutar trading real desde Mapazapp en la fase actual.
- **Priorizar** expansión de **runtime / launcher / packaging** por encima de la **prueba del setup** y la evidencia del motor.

**Mapazapp-core / TypeScript** puede seguir existiendo como **referencia, validación, análisis, dashboard, mocks o procesamiento de evidencia importada**; **no** es el **motor oficial del backtest del setup**. El backtest oficial del setup es **MT5 Strategy Tester + Mapazapp_TestEA** (rol BacktestEA integrado en ese EA oficial tras la reconciliación E3.4.2).

### 2.1 Strategic governance (North Star + parameters)

- **North Star:** Mapazapp **no** es un bot de entry fija solo para XAUUSD; es un **marco de descubrimiento de setup** con XAUUSD como laboratorio primario. Objetivo: descubrir el setup, luego medir en qué símbolos se expresa mejor (perfiles futuros por evidencia).
- **Optimization governance:** parámetros y campañas gobernados; anti-overfit; **un bundle no aprueba** modelos de entry; variantes experimentales (edge, 25 %, adaptive) **sin aprobación**; entry oficial **50 % / CE**; sin live trading, funding, gates ni ejecución real aprobados hasta escalera de evidencia explícita.
- **Cursor:** implementa instrucciones explícitas; **no** infiere decisiones de trading ni aprueba entry por métricas de un solo backtest.

---

## 3. Work priority allocation

| Fracción | Enfoque |
|----------|---------|
| **80%** | **Setup**; **daily bias**; **Strategy Tester backtest**; **evidencia**; **humanización** del análisis para el trader. |
| **10%** | **Dashboard / visualización** (lectura de evidencia, UX clara, sin invertir el orden respecto al motor). |
| **10%** | **Extras**: launcher, runtime, packaging, ayudas secundarias — solo cuando no compitan con el 80%. |

Si el trabajo se desvía de este reparto de forma sostenida, **avisar** y realinear con el usuario / dueño de producto.

---

## 4. The three internal systems

### System 1 — Mapazapp App / Core / Dashboard

**Rol:**

- **Cerebro visual** y capa de presentación para el trader.
- **Dashboard** y lectura de estado / evidencia.
- **Import/export de evidencia** (texto en memoria, validadores, fixtures).
- **Análisis de resultados** y métricas sobre evidencia ya generada en MT5.
- **Humanización** del setup (explicaciones, §12).

**No es:**

- **Backtester oficial** del setup (ese es MT5 Strategy Tester + EA oficial de tester).
- **Ejecutor live** de órdenes.
- **Sustituto** del Strategy Tester para la prueba canónica del setup.

### System 2 — Mapazapp_BridgeEA

**Rol:**

- **Lectura del mercado actual** desde MT5 (export **read-only**).
- **Puente de datos** hacia Mapazapp: snapshots de mercado, velas, cuenta, etc., según contrato `MZP_BRIDGE_V1`.
- Ejecución pensada para **terminal live** en gráfico, **no** para el motor de Strategy Tester del setup proof.

**No es:**

- **Backtester** ni EA de Strategy Tester del setup.
- **EA de estrategia** con detección IFVG / setup proof como responsabilidad oficial actual.
- **Ejecutor de órdenes** (sin `OrderSend` / `CTrade` / canal de comandos hacia el bróker desde este diseño).
- **Lector de comandos** ingest desde Mapazapp (sin command files / control inverso en el contrato actual).

### System 3 — Mapazapp_TestEA / Backtest role

**Rol:**

- **EA oficial** para **MetaTrader 5 Strategy Tester** en la fase Engine Setup Proof.
- **Backtest del setup** (virtual o tester_orders según contrato E3.2), **Daily Bias**, detección **Setup V1 / IFVG** cuando esté implementado, **export de evidencia**.
- **Tester-only**: falla fuera del tester (`MQL_TESTER`).

**Aclaración obligatoria (reconciliación E3.4.1):**

- **“BacktestEA”** es un **rol conceptual** (contrato E3.2): motor de setup en el tester + exports.
- **`Mapazapp_TestEA`** es el **único EA oficial físico** para ese rol en Strategy Tester tras la decisión de arquitectura (dos EAs oficiales: Bridge + Test).
- **`Mapazapp_BacktestEA`** se creó en **E3.3 / E3.4** como **artefacto adelantado**; **E3.4.2** migró su lógica a **`Mapazapp_TestEA`** y **eliminó** la carpeta del árbol activo.

---

## 5. Official MT5 EA architecture

**EAs oficiales (decisión de producto):**

1. **Mapazapp_BridgeEA** — puente read-only mercado/cuenta hacia Mapazapp.
2. **Mapazapp_TestEA** — EA oficial de Strategy Tester; engloba el rol **BacktestEA** (setup proof, bias, evidencia).

**No oficial:**

- *(ningún tercer EA en el árbol activo; la carpeta temporal `Mapazapp_BacktestEA` se eliminó en **E3.4.2** — ver historial Git.)*

| EA | Current path | Current role | Official? | Decision | Notes |
|----|--------------|--------------|-----------|----------|-------|
| **Mapazapp_BridgeEA** | `APP/artifacts/mt5/experts/Mapazapp_BridgeEA/` | Export-only bridge: mercado, velas, cuenta, deals, `bridge_status.json`; timer; **sin** backtest de setup; **sin** órdenes; **sin** comandos. | **Yes** | Mantener como único puente live read-only. | CP13; parsers core alineados a `MZP_BRIDGE_V1`. |
| **Mapazapp_TestEA** | `APP/artifacts/mt5/experts/Mapazapp_TestEA/` | Strategy Tester oficial: **Daily Bias V1**, **FVG / Setup V1 candidato** (no pipeline IFVG completo), eventos, summary `backtest_ea_v1` + **`has_full_ifvg_pipeline: false`**, trades CSV **solo cabecera** (sin filas sintéticas). | **Yes** | Único EA físico del rol BacktestEA / setup proof en tester. | Fail-closed fuera de tester; default `InpExportRoot` = `Mapazapp\TestEA`. |
| **Mapazapp_BacktestEA** | *(eliminado del repo en E3.4.2)* | Histórico E3.3–E3.4 — lógica migrada a **TestEA**. | **No** | **No** usar como destino de implementación. | Ver commits anteriores a E3.4.2 para el `.mq5` original. |

---

## 6. Current approved state

- **Runtime / launcher D14.x** avanzó hasta **wrapper real mínimo (D14.7)**; la **expansión** de runtime, packaging, `.exe`, POST de acciones y MT5 live queda **pausada** estratégicamente hasta evidencia de setup creíble.
- Existe **wrapper** y supervisores en repo; **no** son el foco actual de inversión.
- **Engine proof E1–E3.4** en curso sobre la línea temporal de documentos y artefactos MT5.
- **E3.1** reorientó el backtest principal hacia **MT5 Strategy Tester + EA dedicado** (en docs históricos citado como `Mapazapp_BacktestEA`); **E3.4.1** alinea el nombre físico oficial del EA de tester con **`Mapazapp_TestEA`** (rol BacktestEA = función de ese EA).
- **E3.2** congeló contrato Setup V1 / bias / export para el rol BacktestEA.
- **E3.3–E3.4** añadieron esqueleto + Daily Bias V1 en carpeta temporal **`Mapazapp_BacktestEA`** (luego **fusionada y eliminada** en **E3.4.2**).
- **E3.4.2** consolidó **Daily Bias V1**, eventos y summary en **`Mapazapp_TestEA.mq5`** (único EA oficial de tester).
- **E3.5** añade **detección candidata FVG** (setup long/short), gate Daily Bias y eventos `setup_*` en **`Mapazapp_TestEA.mq5`** — ver [`BACKTESTEA_IFVG_SETUP_V1_E3_5.md`](./BACKTESTEA_IFVG_SETUP_V1_E3_5.md).
- **E3.6** congela el **esquema de export / evidencia** (CSV/JSON, samples, validadores TS) — ver [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](./BACKTESTEA_EXPORT_SCHEMA_E3_6.md).
- **E4.1** — **CLI + core** validación bundle TestEA en disco (`mapazapp:testea-export-validate`, `validateTestEaExportBundleTexts`) — ver [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md). **No** MT5.
- **E5** — **diseño (docs-only)** campaña XAUUSD Strategy Tester — [`XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md`](./XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md): Phase A (candidato/compuerta) vs Phase B (outcome); sin métricas de rentabilidad hasta implementación acordada.
- **E5.4** — **primer smoke outcome virtual (operador)** — evidencia acotada; estado documentado: **OK with warnings** (geometría CSV en FVG 1pt); ver [`TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md`](./TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md).
- **E5.4.1** — **fix repo** (sin MT5 en CI): endurecer geometría virtual + deinit + validadores — [`TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md`](./TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md).
- **E5.4.2** — **re-smoke outcome virtual (operador)** sobre **`47c440f` / `MZP_TestEA_E5_4_1`**: **OK** con solo **`BUNDLE_EVENTS_LARGE`**; sin warnings de geometría — [`TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md`](./TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md).
- **E5.4.3** — **evidencia formal + política build/versioning TestEA** (solo docs) — [`TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md`](./TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md).
- **E5.5** — **runbook campaña outcome XAUUSD** (solo docs): matriz, rangos, naming, validación, métricas, criterios — [`XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md); plantilla [`XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md).
- **E5.5.0** — **exports TestEA seguros para optimización** (repo): `Mapazapp_TestEA.mq5` **`MZP_TestEA_E5_5_0`**, carpetas por campaña + fingerprint de parámetros, summary extendido, validadores TS, docs [`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](./TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md); **sin** MT5 en CI.
- **E5.5.1 (operador) —** campaña XAUUSD M15/D1 barrido FVG con **`MZP_TestEA_E5_5_0_5`**: siete bundles validados (`ok=true`, `errors=0`; warning `BUNDLE_EVENTS_LARGE`); resultados **prometedores pero no aprobados** — ver tabla e interpretación en [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md).
- **E5.5.2 (docs) —** auditoría profesional de setup/entrada, decisiones de operador, dudas y roadmap E5.6+ — [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md).
- **E5.6 (docs) —** plan sensibilidad y diagnósticos `ambiguous` (modos contables, métricas, opciones A/B/C) — [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md).
- **E5.6.1 (repo) —** analizador TypeScript + CLI post-proceso bundles (`mapazapp:testea-ambiguity-sensitivity`) — [`AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md`](./AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md).
- **E5.6.2 (docs) —** evidencia sensibilidad ambigüedad (7 bundles E55; tablas y decisión) — [`AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md`](./AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md).
- **E5.7 (docs) —** contrato **Entry Quality Score V1** — [`ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md`](./ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md). **E5.8 (repo) —** export score en TestEA — [`ENTRY_QUALITY_SCORE_EXPORT_E5_8.md`](./ENTRY_QUALITY_SCORE_EXPORT_E5_8.md) (build actual ver README TestEA / `TESTEA_BUILD`). **E5.8.1 (docs) —** evidencia smoke operador + caveat calibración A/B=0 — [`ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md`](./ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md). **E5.9 (repo) —** analizador calibración + CLI `mapazapp:testea-score-calibration` — [`ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md). **E5.9.1 (docs) —** evidencia operador + decisión componentes — [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md). **E5.10 (repo) —** Liquidity Sweep V1 observación/export + columnas trades + flags summary — [`LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md`](./LIQUIDITY_SWEEP_DETECTION_EXPORT_E5_10.md). **E5.10.1 (docs) —** smoke operador + calibración post-liquidez + caveat V1 permisiva — [`LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md`](./LIQUIDITY_SWEEP_SMOKE_EVIDENCE_E5_10_1.md). **E5.10.2 (repo) —** Liquidity Sweep **Quality** V1 (subscores, `has_liquidity_sweep_quality_v1_logic`, `liquidity_event_score` = calidad cuando scoring activo) — [`LIQUIDITY_SWEEP_QUALITY_REFINEMENT_E5_10_2.md`](./LIQUIDITY_SWEEP_QUALITY_REFINEMENT_E5_10_2.md). **E5.10.2.1 (repo) —** ajuste razones (`quality_weak` solo en Weak; `quality_ok` en A/B y C≥12) + topes contexto A/B — mismo doc §E5.10.2.1. **E5.10.4 (repo) —** cadena causal observación `liquidity_chain_*` + flag `has_liquidity_chain_v1_logic` — [`LIQUIDITY_CHAIN_REFINEMENT_E5_10_4.md`](./LIQUIDITY_CHAIN_REFINEMENT_E5_10_4.md). **E5.10.6 (repo) —** auditoría/heurística de reacción en cadena + columnas `liquidity_chain_reaction_*` — [`LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md`](./LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md). **E5.10.7 (docs) —** evidencia smoke post–**E5.10.6** — [`LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md`](./LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md). **E5.11 (repo) —** HTF Structure V1 observación/export (`MZP_TestEA_E5_11`) — [`HTF_STRUCTURE_EXPORT_E5_11.md`](./HTF_STRUCTURE_EXPORT_E5_11.md). **E5.11.1 (docs) —** evidencia smoke HTF post–**E5.11** — [`HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md`](./HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md); PASS técnico; observación-only (sin compuerta/live/EQ threshold).
- **E5.12.1 (docs) —** evidencia smoke MSS/CHoCH post–**E5.12** — [`MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md`](./MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md); PASS técnico (`BUNDLE_EVENTS_LARGE`); MSS/CHoCH observación-only (sin compuerta/live/EQ threshold).
- **E5.12.2 (repo) —** relevancia temporal MSS/CHoCH (observación/export) — [`MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md); validador + analizador E5.9 opcional por columnas `mss_temporal_relevance_score` / `choch_temporal_relevance_score`.
- **E5.12.3 (docs) —** evidencia smoke temporal post–**E5.12.2** — [`MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md); build `MZP_TestEA_E5_12_2`; PASS técnico (`BUNDLE_EVENTS_LARGE`); sin compuerta.
- **E5.13 (repo) —** Premium/Discount V1 observación/export — [`PREMIUM_DISCOUNT_EXPORT_E5_13.md`](./PREMIUM_DISCOUNT_EXPORT_E5_13.md); build `MZP_TestEA_E5_13`; validador + importer + calibración opcional; sin compuerta.
- **E5.13.1 (docs) —** smoke Premium/Discount post–**E5.13** — [`PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md`](./PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md); bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`; **PASS** técnico (`BUNDLE_EVENTS_LARGE`); PD observación-only; sin gate / sin tune por un bundle.
- **E5.13.2 (repo) —** Entry Fill Feasibility V1 post-candidato — [`ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md`](./ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md); build `MZP_TestEA_E5_13_2`; **no** mezclar con `entry_quality_score`.
- **E5.13.3 (docs) —** smoke Entry Fill Feasibility — [`ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md`](./ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md); PASS técnico; observación-only.
- **E5.13.2.1 (repo) —** dedup reason codes fill feasibility (`MZP_TestEA_E5_13_2_1`); telemetría only.
- **E5.13.4 (repo):** Entry Variant Feasibility — [`ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md`](./ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md); build `MZP_TestEA_E5_13_4`; observación-only.
- **E5.13.5 (docs) —** smoke Entry Variant — [`ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md`](./ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md); PASS técnico; confirma E5.13.3; sin cambio de entry oficial.
- **E5.13.6 (repo) —** Entry Variant Outcome / Risk Simulation — [`ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md); build `MZP_TestEA_E5_13_6`.
- **E5.13.7 (docs) —** smoke outcome sim — [`ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md); PASS técnico; sim 50 % **no** reconcilia con oficial — bloqueado para decisiones de entry.
- **E5.13.6.1 (repo) —** reconciliación 50 %/CE — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md); CLI `mapazapp:testea-entry-variant-sim-reconcile`.
- **E5.13.6.2 (docs) —** smoke reconcile — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md); paridad 50 %/CE no demostrada.
- **E5.13.6.3 (repo) —** paridad control 50 %/CE — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md); build `MZP_TestEA_E5_13_6_3`.
- **E5.13.6.4 (docs) —** smoke reconcile post-fix — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md); `mismatch_rate = 0`.
- **E5.13.6.5 (docs) —** summary EVOS post-paridad — [`ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md`](./ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md); marco diagnóstico confiable; **no** aprobar edge/25 %.
- **E5.13.6.6 (repo) —** transition audit — [`ENTRY_VARIANT_TRANSITION_AUDIT_E5_13_6_6.md`](./ENTRY_VARIANT_TRANSITION_AUDIT_E5_13_6_6.md); CLI `mapazapp:testea-entry-variant-transition-audit`.
- **E5.13.6.7 (docs) —** transition audit evidence — [`ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md`](./ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md); PASS; **no** aprobar edge/25 %.
- **E5.13.6.8 (repo) —** edge robustness audit — [`EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md); CLI `mapazapp:testea-entry-edge-robustness-audit`.
- **E5.13.6.9 (docs) —** edge robustness evidence — [`EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md); PASS; **no** aprobar edge.
- **E5.13.6.10 (docs) —** Buffered EVOS decision — [`BUFFERED_EVOS_DECISION_E5_13_6_10.md`](./BUFFERED_EVOS_DECISION_E5_13_6_10.md); MQL5 required; manual-control guardrail.
- **E5.15.1 (smoke):** [`LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md`](./LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md) — PASS.
- **E5.15.2 (repo):** [`LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md) — CLI `mapazapp:testea-liquidity-target-realism-audit`; **siguiente:** **E5.15.3** evidence **o** **E5.16**.
- **E5.3** — **implementación simulación virtual** — [`TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md): MQL5 en `Mapazapp_TestEA`, `EXPORT_CONTRACT.md`, validadores TS, muestras ficticias; nota **E5.4.1** enlazada desde ese doc.
- **E5.2** — **contrato simulación virtual (docs-only)** — [`TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md): lifecycle, fill OHLC, SL/TP/RR, ambigüedad `ambiguous`, una operación activa, impacto CSV/summary/eventos.

---

## 7. Current strategic pause

**Pausado (no expandir salvo hotfix de seguridad o decisión explícita):**

- Expansión agresiva de **runtime / launcher**.
- **Packaging** producto, **`.exe`**, installer.
- **`POST` / action endpoints** operativos.
- **MT5 live** como foco principal.
- **Dashboard avanzado** antes de tener **evidencia** sólida del tester.

**Activo:**

- **Setup** y reglas canónicas.
- **Daily bias** y compuertas.
- **EA de Strategy Tester** y **backtest** del setup en MT5.
- **Evidencia** exportada y trazabilidad.
- **Humanización** del análisis para el trader.

---

## 8. Next-step checklist

**Regla:** cada checkpoint futuro debe **actualizar** esta tabla (estado, notas, commit cuando aplique).

| ID | Step | Status | Owner | Notes | Commit |
|----|------|--------|-------|-------|--------|
| E3.4.1 | EA roles reconciliation (docs + guía viva) | **completed** | Cursor + PM | Este documento + `MT5_EA_ROLES_RECONCILIATION_E3_4_1.md`; sin código MT5 nuevo. |  |
| E3.4.2 | Merge BacktestEA logic into **Mapazapp_TestEA** | **completed** | Cursor + PM | `Mapazapp_TestEA.mq5` + exports; carpeta `Mapazapp_BacktestEA` eliminada; core importer/validación dual schema. |  |
| E3.5 | Setup V1 **FVG candidato** in **Mapazapp_TestEA** | **completed** | Cursor + PM | `Mapazapp_TestEA.mq5`, `BACKTESTEA_IFVG_SETUP_V1_E3_5.md`, tests estáticos, samples, validación `backtest_ea_v1`. | **E3.6** |
| E3.6 | Evidence export schema finalization | **completed** | Cursor + PM | `EXPORT_CONTRACT.md`, `BACKTESTEA_EXPORT_SCHEMA_E3_6.md`, `backtest-events-csv.ts`, validators, samples, static tests. | **E4** (smoke) |
| E4 | First MT5 Strategy Tester smoke run (post-merge) | **completed** | Operator + Cursor | Smoke real OK — [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md); sin automatizar MT5 desde dashboard. | **E4.1** |
| E4.1 | TestEA export bundle validation (CLI + core) | **completed** | Cursor + PM | `mapazapp:testea-export-validate`, `validateTestEaExportBundleTexts`, [`TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`](./TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md); read-only; sin MT5. | **E5** |
| E5 | XAUUSD Strategy Tester **campaign design** | **completed (docs)** | PM + Cursor | Phase A vs B, parámetros, naming, evidencia, E4.1 por run — [`XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md`](./XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md). **No** ejecuta campaña en E5. | **E5.1** |
| E5.1 | TestEA trade **outcome mode** decision | **completed (docs)** | PM + Cursor | Opción C: virtual en TestEA+tester primero; `tester_orders` track **opcional separado** (no confundir con **E5.6** ambiguous — [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md); ver [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md) §15) — [`TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md`](./TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md). | **E5.2** |
| E5.2 | Virtual trade simulation **contract** | **completed (docs)** | PM + Cursor | V1 OHLC, RR 2, expiries 20/40, ambiguous, one-at-a-time — [`TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md). | **E5.3** |
| E5.3 | Virtual trade simulation **implementation** (TestEA) | **completed** | Cursor + PM | MQL5 + `EXPORT_CONTRACT.md` + validadores TS + samples; sin `OrderSend`/CTrade — [`TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md`](./TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md). | **E5.4** |
| E5.4 | Virtual outcome **first smoke** (Strategy Tester) | **completed (operator)** | Operador humano | Smoke XAUUSD M15/D1; CLI **OK with warnings** (geometría CSV en FVG mínimos); evidencia no versionada aquí — ver [`TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md`](./TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md). | **E5.4.1** |
| E5.4.1 | Virtual trade **geometry + deinit** hardening (repo) | **completed** | Cursor | `Mapazapp_TestEA.mq5` E5.4.1, TS validators/tests, docs — [`TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md`](./TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md); sin MT5 en CI. | **E5.4.2** |
| E5.4.2 | Virtual outcome **re-smoke** (Strategy Tester, post-E5.4.1) | **completed (operator)** | Operador humano | XAUUSD M15/D1; CLI ok; solo `BUNDLE_EVENTS_LARGE`; sin `CSV_GEOMETRY_*` — [`TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md`](./TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md). | **E5.4.3** |
| E5.4.3 | TestEA smoke **evidence** + **build/versioning policy** (docs) | **completed** | Cursor + PM | Evidencia E5.4.2 + [`TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md`](./TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md); sin código. | **E5.5** |
| E5.5 | XAUUSD outcome campaign **runbook** + report template (docs) | **completed** | Cursor + PM | [`XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md), [`XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md); sin MT5 en repo. | **E5.5.0** |
| E5.5.0 | TestEA **optimization-safe** export paths + summary + validators | **completed** | Cursor | `Mapazapp_TestEA.mq5`, `testea-export-bundle-validate.ts`, CLI, samples anidados, [`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](./TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md); sin MT5 en CI. | **E5.5.1** |
| E5.5.0.3 | TestEA export **FileOpen** MQL5-compatible + **direct-write fallback** | **completed** | Cursor | `Mapazapp_TestEA.mq5` **`MZP_TestEA_E5_5_0_3`**, `mapazapp-backtestea-static.test.ts`, docs E5.5.0 + handoff + roadmap; sin `FILE_REWRITE` en `FileOpen`; ver [`TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`](./TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md). | **E5.5.1** |
| E5.5.0.4 | TestEA **E5.5 campaign defaults** + **MT5 preset `.set` files** | **completed** | Cursor | `Mapazapp_TestEA.mq5` **`MZP_TestEA_E5_5_0_4`**, `presets/*.set`, README TestEA, `mapazapp-backtestea-static.test.ts`, refs guía/handoff/roadmap/E5.5.0 doc. | **E5.5.0.5** |
| E5.5.0.5 | TestEA **short physical export folders** (optimization-safe; JSON ids completos) | **completed** | Cursor | `Mapazapp_TestEA.mq5` **`MZP_TestEA_E5_5_0_5`**, `InpExportCampaignFolder` / `InpExportParameterFolder`, presets, README, `mapazapp-backtestea-static.test.ts`, docs E5.5.0 + handoff + roadmap + guía. | **E5.5.1** |
| E5.5.1 | Outcome campaign **Optimization / manual runs** (local agents, small matrix) | **completed (operator)** | Operador humano | XAUUSD M15/D1 FVG sweep; 7 bundles validados; `BUNDLE_EVENTS_LARGE`; métricas e interpretación — [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md). | **E5.5.2** |
| E5.5.2 | Professional setup **entry audit** (docs-only) | **completed** | Cursor + PM | Decisiones operador, caveat BridgeEA/live, roadmap E5.6–E5.13 — [`PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`](./PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md). | **E5.6** |
| E5.6 | Ambiguity **sensitivity + diagnostics** plan (docs-only) | **completed** | Cursor + PM | Modos contables, stress −1R/ambiguous, métricas, opciones A/B/C, BridgeEA flags — [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md). | **E5.6.1** |
| E5.6.1 | TestEA **ambiguity sensitivity analyzer** (core + CLI) | **completed** | Cursor | Post-proceso `neutral_zero` / `conservative_loss` / `skip_ambiguous` — [`AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md`](./AMBIGUITY_SENSITIVITY_ANALYZER_E5_6_1.md); sin cambio MQL5. | **E5.6.2** |
| E5.6.2 | Ambiguity sensitivity **evidence** (docs-only; operador) | **completed** | Operador + Cursor | 7 bundles E55; tablas y decisión — [`AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md`](./AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md); CSV local no versionado. | **E5.7** |
| E5.7 | **Entry Quality Score V1** contract (docs-only) | **completed** | Cursor + PM | [`ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md`](./ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md). | **E5.8** |
| E5.8 | **Entry Quality Score** export TestEA (observación) | **completed** | Cursor | `Mapazapp_TestEA.mq5` **`MZP_TestEA_E5_8_0`**, CSV/summary/events, validadores TS, muestras — [`ENTRY_QUALITY_SCORE_EXPORT_E5_8.md`](./ENTRY_QUALITY_SCORE_EXPORT_E5_8.md). | **E5.8.1** |
| E5.8.1 | Entry Quality Score **smoke evidence** + calibración (docs-only) | **completed** | Operador + Cursor | [`ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md`](./ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md); PASS técnico; gate deshabilitado; A/B=0 = calibración; CSV local no versionado. | **E5.9.1** |
| E5.9 | TestEA **score calibration analyzer** (core + CLI) | **completed** | Cursor | `testea-score-calibration.ts`, `mapazapp-testea-score-calibration.ts`, tests, doc E5.9; `mapazapp:testea-score-calibration`; sin MT5 — [`ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md). | **E5.9.1** |
| E5.9.1 | Score calibration **operator evidence** (docs; CLI runs) | **completed** | Operador + Cursor | Smoke E5.8.1; JSON post–E5.9.0.1; decisión sin gate — [`ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`](./ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md); sin commit CSV. | **E5.11** |
| E5.10.7 | Liquidity Chain Reaction **smoke evidence** (operator; post–E5.10.6) | **completed** | Operador + Cursor | Smoke `MZP_TestEA_E5_10_6`; PASS técnico; sin compuerta dura — [`LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md`](./LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md); audit E5.10.6 — [`LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md`](./LIQUIDITY_CHAIN_REACTION_AUDIT_E5_10_6.md). | **E5.11** |
| E5.11 | **HTF Structure V1** export (TestEA observation) | **completed** | Cursor | `Mapazapp_TestEA.mq5` **`MZP_TestEA_E5_11`**, columnas/summary/eventos, core TS, muestras, validador — [`HTF_STRUCTURE_EXPORT_E5_11.md`](./HTF_STRUCTURE_EXPORT_E5_11.md). | **E5.12** |
| E5.11.1 | HTF Structure **smoke evidence** (operator; post–E5.11) | **completed** | Operador + Cursor | Smoke `MZP_TestEA_E5_11`; PASS técnico; observación-only — [`HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md`](./HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md); export — [`HTF_STRUCTURE_EXPORT_E5_11.md`](./HTF_STRUCTURE_EXPORT_E5_11.md). | **E5.12** |
| E5.12 | **MSS / CHoCH V1** export (execution TF observation) | **completed** | Cursor | `Mapazapp_TestEA.mq5` **`MZP_TestEA_E5_12_2`**, columnas/summary/eventos (`msc_en`), core importer + validador + calibración opcional `mss_choch_score` + **E5.12.2** columnas temporales — [`MSS_CHOCH_EXPORT_E5_12.md`](./MSS_CHOCH_EXPORT_E5_12.md), [`MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md). | **E5.12.1** |
| E5.12.1 | MSS / CHoCH **smoke evidence** (operator; post–E5.12) | **completed** | Operador + Cursor | Smoke `MZP_TestEA_E5_12`; PASS técnico; score V1 no separa wins/losses; observación-only — [`MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md`](./MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md). | **E5.12.2** |
| E5.12.2 | MSS / CHoCH **temporal relevance** diagnostics (repo) | **completed** | Cursor | `Mapazapp_TestEA.mq5` **`MZP_TestEA_E5_12_2`**, columnas temporales + summary `has_mss_choch_temporal_relevance_v1_logic`, validador + calibración opcional — [`MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md). | **E5.12.3** |
| E5.12.3 | MSS / CHoCH **temporal relevance smoke evidence** (operator; post–E5.12.2) | **completed** | Operador + Cursor | Smoke `MZP_TestEA_E5_12_2`; PASS técnico (`BUNDLE_EVENTS_LARGE`); observación-only — [`MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md). | **E5.13** |
| E5.13 | **Premium/Discount V1** export (TestEA observation) | **completed** | Cursor | `Mapazapp_TestEA.mq5` **`MZP_TestEA_E5_13`**, columnas `premium_discount_*` / `pd_*`, summary `has_premium_discount_v1_logic`, eventos `pd_*` compactos, core + validador + calibración opcional — [`PREMIUM_DISCOUNT_EXPORT_E5_13.md`](./PREMIUM_DISCOUNT_EXPORT_E5_13.md). | **E5.13.1** |
| E5.13.1 | Premium/Discount **smoke evidence** (operator; post–E5.13) | **completed** | Operador + Cursor | Bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`; `MZP_TestEA_E5_13`; PASS técnico (`BUNDLE_EVENTS_LARGE`) — [`PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md`](./PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md). | **E5.13.2** |
| E5.13.2 | Entry Zone / **Fill Feasibility Audit** (repo + docs) | **completed** | Cursor | Post-candidato `entry_fill_*`; sin gate — [`ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md`](./ENTRY_ZONE_FILL_FEASIBILITY_AUDIT_E5_13_2.md). | **E5.13.3** |
| E5.13.3 | Entry Fill Feasibility **smoke evidence** (operator) | **completed** | Operador + Cursor | `MZP_TestEA_E5_13_2`; bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`; PASS — [`ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md`](./ENTRY_ZONE_FILL_FEASIBILITY_SMOKE_EVIDENCE_E5_13_3.md). | **E5.13.2.1** |
| E5.13.2.1 | Fill feasibility **reason-code dedup** (repo) | **completed** | Cursor | `MapzEffAppendReasonOnce`; build `MZP_TestEA_E5_13_2_1`. | **E5.13.4** |
| E5.13.4 | Entry Variant Feasibility Audit (repo + docs) | **completed** | Cursor | `entry_variant_*`; build `MZP_TestEA_E5_13_4` — [`ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md`](./ENTRY_VARIANT_FEASIBILITY_AUDIT_E5_13_4.md). | **E5.13.5** |
| E5.13.5 | Entry Variant Feasibility **smoke evidence** (operator) | **completed** | Operador + Cursor | `MZP_TestEA_E5_13_4`; bundle `SET001_FVG2_RR2_00_BIASBODY0_RALIGN1`; PASS — [`ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md`](./ENTRY_VARIANT_FEASIBILITY_SMOKE_EVIDENCE_E5_13_5.md). | **E5.13.6** |
| E5.13.6 | Entry Variant **Outcome / Risk Simulation** | **completed** | Cursor | `MZP_TestEA_E5_13_6`; hipotético SL/RR/outcome por variante — [`ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_6.md). | **E5.13.7** |
| E5.13.7 | Entry Variant Outcome Sim **smoke evidence** (operator) | **completed** | Operador + Cursor | `MZP_TestEA_E5_13_6`; PASS técnico; 50 % sim ≠ oficial — [`ENTRY_VARIANT_OUTCOME_SIMULATION_SMOKE_EVIDENCE_E5_13_7.md`](./ENTRY_VARIANT_OUTCOME_SIMULATION_E5_13_7.md). | **E5.13.6.1** |
| E5.13.6.1 | Variant Simulation **Reconciliation Audit** | **completed** | Cursor | CLI `mapazapp:testea-entry-variant-sim-reconcile` — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_1.md). | **E5.13.6.2** |
| E5.13.6.2 | Reconciliation **smoke evidence** (operator) | **completed** | Operador + Cursor | Reconcile PASS; mismatch_rate ≈ 41 % — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_2.md). | **E5.13.6.3** |
| E5.13.6.3 | Align EVOS **50 %/CE** parity (repo) | **completed** | Cursor | `MZP_TestEA_E5_13_6_3` — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_E5_13_6_3.md). | **E5.13.6.4** |
| E5.13.6.4 | Reconciliation **smoke post-parity** (operator) | **completed** | Operador + Cursor | `mismatch_rate = 0`; control 50 %/CE validado — [`ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md`](./ENTRY_VARIANT_OUTCOME_RECONCILIATION_SMOKE_EVIDENCE_E5_13_6_4.md). | **E5.13.6.5** |
| E5.13.6.5 | EVOS variant outcome **summary post-parity** (operator) | **completed** | Operador + Cursor | Summary OK; edge domina; no aprobar variantes — [`ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md`](./ENTRY_VARIANT_OUTCOME_SUMMARY_E5_13_6_5.md). | **E5.13.6.6** |
| E5.13.6.6 | Entry Variant **Edge/25 Sanity and Transition Audit** | **completed** | Cursor | Core + CLI transition audit — [`ENTRY_VARIANT_TRANSITION_AUDIT_E5_13_6_6.md`](./ENTRY_VARIANT_TRANSITION_AUDIT_E5_13_6_6.md). | **E5.13.6.7** |
| E5.13.6.7 | Transition audit **evidence** (operator) | **completed** | Operador + Cursor | Audit PASS; edge + riesgo ~2×; no aprobar — [`ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md`](./ENTRY_VARIANT_TRANSITION_AUDIT_EVIDENCE_E5_13_6_7.md). | **E5.13.6.8** |
| E5.13.6.8 | **Edge Entry Realism / Robustness Audit** | **completed** | Cursor | Core + CLI robustness audit — [`EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_E5_13_6_8.md). | **E5.13.6.9** |
| E5.13.6.9 | Edge robustness **evidence** (operator) | **completed** | Operador + Cursor | PASS post-8.1; edge frágil; **no** aprobar — [`EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md`](./EDGE_ENTRY_ROBUSTNESS_AUDIT_EVIDENCE_E5_13_6_9.md). | **E5.13.6.10** |
| E5.13.6.10 | **Buffered EVOS decision** + manual guardrail | **completed** | Cursor + PM | MQL5 buffered required; TS proxy not sufficient — [`BUFFERED_EVOS_DECISION_E5_13_6_10.md`](./BUFFERED_EVOS_DECISION_E5_13_6_10.md). | **E5.13.6.11** |
| E5.13.6.11 | **MQL5 Buffered EVOS diagnostics** | **completed** | Cursor | `MZP_TestEA_E5_13_6_11` — [`BUFFERED_EVOS_EXPORT_E5_13_6_11.md`](./BUFFERED_EVOS_EXPORT_E5_13_6_11.md). | **E5.13.6.12** |
| E5.13.6.12 | **Buffered EVOS smoke evidence** | **completed** | Operator + docs | ST PASS — [`BUFFERED_EVOS_SMOKE_EVIDENCE_E5_13_6_12.md`](./BUFFERED_EVOS_SMOKE_EVIDENCE_E5_13_6_12.md). | **E5.13.6.13** |
| E5.13.6.13 | **Entry candidate policy (research)** | **completed** | Docs | [`ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md`](./ENTRY_CANDIDATE_POLICY_RESEARCH_E5_13_6_13.md). | **E5.14** |
| E5.14 | **IFVG / BISI / SIBI export V1** | **completed** | MQL5 + TS | [`IFVG_BISI_SIBI_EXPORT_E5_14.md`](./IFVG_BISI_SIBI_EXPORT_E5_14.md). | **E5.14.1** |
| E5.14.1 | **IFVG / BISI / SIBI smoke evidence** | **completed** | Operator + docs | PASS — [`IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md`](./IFVG_BISI_SIBI_SMOKE_EVIDENCE_E5_14_1.md). | **E5.15** |
| E5.15 | **Liquidity Target Quality export V1** | **completed** | MQL5 + TS | [`LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md`](./LIQUIDITY_TARGET_QUALITY_EXPORT_E5_15.md). | **E5.15.1** |
| E5.15.1 | **Liquidity Target Quality smoke** | **completed** | Operator + docs | PASS — [`LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md`](./LIQUIDITY_TARGET_QUALITY_SMOKE_EVIDENCE_E5_15_1.md). | **E5.15.2** |
| E5.15.2 | **Target realism audit** | **completed** | TS research | [`LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md`](./LIQUIDITY_TARGET_REALISM_AUDIT_E5_15_2.md). | **E5.15.3** / **E5.16** |
| E6 | Import MT5 backtest evidence into Mapazapp | pending | Cursor | Ingesta controlada; sin watcher sin aprobación. | |
| E7 | Dashboard results design | pending | PM + Cursor | Después de evidencia real. | |
| E8 | Setup decision gate | pending | PM + trader | Compuerta humana explícita. | |

---

## 9. Implementation Ledger

**Regla:** Cursor (o quien cierre el checkpoint) debe **agregar una línea nueva** por cada cierre de checkpoint relevante — qué cambió, archivos tocados, resultado, siguiente paso.

| Date/Checkpoint | Change | Files touched | Result | Next |
|-----------------|--------|---------------|--------|------|
| Post–D14.7 | Strategic pause: runtime expansion de-prioritized; refocus Engine Setup Proof | `ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md`, roadmap, handoff | D14 avanzado pero pausado; foco en motor/setup | E1–E3 |
| E1 | Engine setup proof master plan | `ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md` | Plan maestro E1 publicado | E2, E3 |
| E3.1 | MT5 Strategy Tester alignment for principal setup backtest | `MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md`, refs | Backtest principal = tester + EA dedicado (rol documentado) | E3.2 |
| E3.2 | BacktestEA Setup V1 contract | `BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md` | Contrato formal antes de más MQL5 | E3.3 |
| E3.3 | BacktestEA tester-only skeleton | `APP/artifacts/mt5/experts/Mapazapp_BacktestEA/*`, docs | Artefacto físico separado de TestEA | E3.4 |
| E3.4 | Daily Bias V1 in Mapazapp_BacktestEA | `Mapazapp_BacktestEA.mq5`, `BACKTESTEA_DAILY_BIAS_V1_E3_4.md` | Bias V1 + events + summary | E3.4.1 reconciliation |
| E3.4.2 | Merge BacktestEA → TestEA; remove temp EA folder | `Mapazapp_TestEA.mq5`, `mapazapp-backtestea-static.test.ts`, `backtest-importer.ts`, `export-sample-validation*.ts`, docs | Un solo EA tester oficial; `backtest_ea_v1` summary; sin filas trade sintéticas | **E3.5** IFVG |
| E3.5 | FVG candidato + gate Daily Bias + eventos `setup_*` | `Mapazapp_TestEA.mq5`, `BACKTESTEA_IFVG_SETUP_V1_E3_5.md`, static tests, samples, `export-sample-validation*.ts` | `has_real_ifvg_logic` true; `trade_count` 0; sin órdenes | **E3.6** export schema |
| E3.6 | Export schema freeze + `has_full_ifvg_pipeline` + events parser | `EXPORT_CONTRACT.md`, `BACKTESTEA_EXPORT_SCHEMA_E3_6.md`, `backtest-events-csv.ts`, `export-sample-validation*.ts`, samples, static tests | Contrato evidencia alineado TS/MQL5; sin MT5 run | **E4** smoke |
| E4 (plan) | First MT5 Strategy Tester smoke — operator checklist + validation notes | `FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md`, refs en guía / schema / handoff / roadmap | Plan E4 publicado; smoke ejecutado — ver evidencia | `FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md` |
| E4 (evidence) | First MT5 Strategy Tester smoke — real run archived | `FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md`, refs en plan E4 / guía / handoff / roadmap | Compilación 0/0; tester completó; 3 exports; summary `backtest_ea_v1`; `trade_count` 0; eventos bias + setup | **E4.1** bundle CLI |
| E4.1 | TestEA export bundle validation — CLI + core | `mapazapp-testea-export-validate.ts`, `testea-export-bundle-validate.ts`, tests, `TESTEA_EXPORT_BUNDLE_VALIDATION_E4_1.md`, `export-sample-validation.ts`, `backtest-events-csv.ts`, fixture E342 +1 fila `lifecycle_deinit` | Validación read-only carpetas run; `bundleContract` eventos; opciones `zeroTradeCountMismatchAsWarning`, `eventsParseOptions` | **E5** campaña |
| E5 | XAUUSD Strategy Tester campaign **design** (docs-only) | `XAUUSD_STRATEGY_TESTER_CAMPAIGN_DESIGN_E5.md`, refs guía / handoff / roadmap / E4 evidence / E4.1 | Phase A candidato+gate vs Phase B outcome; parámetros y naming; política evidencia; cadena E5.1–E5.5 | **E5.1** decisión outcome |
| E5.1 | TestEA trade outcome **mode decision** (docs-only) | `TESTEA_TRADE_OUTCOME_MODE_DECISION_E5_1.md`, refs E5 / guía / roadmap | Virtual primero en TestEA+tester; `tester_orders` track opcional separado (ver **E5.6** [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md) vs **E5.5.2** §15) | **E5.2** contrato virtual |
| E5.2 | Virtual trade simulation **contract** (docs-only) | `TESTEA_VIRTUAL_TRADE_SIMULATION_CONTRACT_E5_2.md`, refs E5.1 / schema / guía | V1 entry/SL/TP/fill/ambiguity/one-trade; CSV+summary+events | **E5.3** implementación |
| E5.3 | Virtual trade simulation **implementation** (TestEA) | `TESTEA_VIRTUAL_TRADE_SIMULATION_IMPLEMENTATION_E5_3.md`, `Mapazapp_TestEA.mq5`, `EXPORT_CONTRACT.md`, core validators/tests | Simulación virtual on-bar; CSV/summary/eventos; `has_real_virtual_trade_logic` | **E5.4** smoke |
| E5.4 | Virtual outcome smoke (operador) | Evidencia run acotado + CLI E4.1 | OK with warnings — geometría 9 filas FVG 1pt | **E5.4.1** |
| E5.4.1 | Geometry / deinit / TS alignment | `Mapazapp_TestEA.mq5`, `backtest-importer.ts`, `backtest-events-csv.ts`, `export-sample-validation.ts`, tests, `TESTEA_VIRTUAL_OUTCOME_GEOMETRY_FIX_E5_4_1.md` | Sin geometría inválida exportada desde EA; paridad contadores documentada | **E5.4.2** re-smoke |
| E5.4.2 | Virtual outcome re-smoke (operator) | Carpeta run `TEST_E5_4_2_A` (local MT5) + CLI E4.1 | OK — solo `BUNDLE_EVENTS_LARGE`; `trade_count`==`virtual_trade_count`; sin geometría CSV | **E5.4.3** docs |
| E5.4.3 | Smoke evidence E5.4.2 + TestEA build/versioning policy | `TESTEA_VIRTUAL_OUTCOME_SMOKE_EVIDENCE_E5_4_2.md`, `TESTEA_BUILD_VERSIONING_POLICY_E5_4_3.md`, refs guía/handoff/roadmap/E5.4.1/E5.3 | Trazabilidad runs/campaña documentada | **E5.5** runbook |
| E5.5 | XAUUSD outcome campaign runbook + template | `XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md`, `XAUUSD_OUTCOME_CAMPAIGN_REPORT_TEMPLATE_E5_5.md`, refs E5 / E5.4.2 / política versioning / guía / handoff / roadmap | Primera campaña virtual definida; criterios aceptación/rechazo | **E5.5.0** repo |
| E5.5.0 | Optimization-safe TestEA exports | `Mapazapp_TestEA.mq5`, `testea-export-bundle-validate.ts`, `mapazapp-testea-export-validate.ts`, samples anidados, `TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`, `EXPORT_CONTRACT.md` | Carpetas únicas por pase; summary `effective_run_id`; sin MT5 en CI | **E5.5.1** operador |
| E5.5.0.3 | TestEA `.tmp` export writes (err 5003): `FileOpen` flags MQL5 + fallback directo | `Mapazapp_TestEA.mq5`, `mapazapp-backtestea-static.test.ts`, `TESTEA_OPTIMIZATION_SAFE_EXPORTS_E5_5_0.md`, `CURSOR_HANDOFF.md`, `ROADMAP_V2_MASTER_EXECUTION_PLAN.md`, guía | `FILE_REWRITE` solo en `FileMove`; escritura directa si falla tmp+`FileMove` | **E5.5.1** operador |
| E5.5.0.4 | TestEA E5.5 campaign defaults + MT5 presets | `Mapazapp_TestEA.mq5`, `presets/*.set`, README TestEA, static tests, docs E5.5.0 + handoff + roadmap + guía | Defaults optimization-safe + `.set` single/sweep; menos error operador | **E5.5.0.5** |
| E5.5.0.5 | TestEA short-path exports under optimization-safe mode | `Mapazapp_TestEA.mq5`, `presets/*.set`, README TestEA, static tests, docs E5.5.0 + handoff + roadmap + guía | Rutas físicas cortas (`E55` / `SET001_…`); `campaign_id` y `parameter_set_id` largos solo en JSON | **E5.5.1** operador |
| E5.5.2 | Professional setup entry audit (post–E5.5.1 campaign) | `PROFESSIONAL_SETUP_ENTRY_AUDIT_E5_5_2.md`, refs en guía / handoff / roadmap / plantilla E5.5 | Setup **no aprobado**; foco calidad/frecuencia/ambiguous; BridgeEA E2E no probado; siguiente E5.6+ documentado | **E5.6** |
| E5.6 | Ambiguity sensitivity + diagnostics plan (docs-only) | `AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`, refs guía / handoff / roadmap / audit E5.5.2 §10 | Stress −1R/ambiguous; modos A/B/C; sin cambio MQL5 en E5.6 | **E5.6.1** |
| E5.6.1 | Ambiguity sensitivity analyzer (core + CLI) | `testea-ambiguity-sensitivity.ts`, `mapazapp-testea-ambiguity-sensitivity.ts`, doc E5.6.1, refs guía/handoff/roadmap | Opción **A** (post-proceso TS) implementada; sin MT5 | **E5.6.2** |
| E5.6.2 | Ambiguity sensitivity evidence (operator CLI on E55 bundles) | `AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md`, refs guía/handoff/roadmap/audit | Setup sigue no aprobado; `conservative_loss` negativo en todos los FVG | **E5.7** |
| E5.7 | Entry Quality Score V1 contract (docs-only) | `ENTRY_QUALITY_SCORE_CONTRACT_E5_7.md`, cross-refs | Contrato E5.7 cerrado | **E5.8** |
| E5.8 | Entry Quality Score export (TestEA observation) | `Mapazapp_TestEA.mq5`, `EXPORT_CONTRACT.md`, samples, `export-sample-validation.ts`, `backtest-importer.ts`, `ENTRY_QUALITY_SCORE_EXPORT_E5_8.md`, docs guía/handoff/roadmap | Score en CSV/summary; `score_gate_enabled` false; sin bloqueo trades | **E5.8.1** |
| E5.8.1 | Entry Quality Score smoke evidence + calibration caveat (operator) | `ENTRY_QUALITY_SCORE_SMOKE_EVIDENCE_E5_8_1.md`, refs E5.8 / contrato / audit / guía / handoff / roadmap | PASS técnico export; A/B=0 interpretación calibración; gate no aprobado | **E5.9.1** |
| E5.9 | Entry Quality Score calibration analyzer (core + CLI) | `testea-score-calibration.ts`, `mapazapp-testea-score-calibration.ts`, tests, `ENTRY_QUALITY_SCORE_CALIBRATION_ANALYZER_E5_9.md`, `scripts/package.json`, refs guía/handoff/roadmap/contrato | Post-proceso bundles; bandas relativas; flags diagnósticos; sin gate | **E5.9.1** |
| E5.9.1 | Score calibration evidence (operator CLI smoke E5.8.1) | `ENTRY_QUALITY_SCORE_CALIBRATION_EVIDENCE_E5_9_1.md`, refs guía/handoff/roadmap/contrato/export/smoke | PASS evidencia; sin gate; cadena liquidez E5.10.x; humanización E5.11–E5.20 en doc dedicado | **E5.11** |
| E5.10.7 | Liquidity chain reaction smoke evidence (docs-only; operador) | `LIQUIDITY_CHAIN_REACTION_SMOKE_EVIDENCE_E5_10_7.md`, refs audit E5.10.6 / roadmap E5.11 | PASS técnico; cadena solo diagnóstico; siguiente HTF Structure | **E5.11** |
| E5.11 | HTF Structure V1 export (repo + docs) | `HTF_STRUCTURE_EXPORT_E5_11.md`, `Mapazapp_TestEA.mq5`, core/scripts/tests/samples | Observación-only; sin gate; importador opcional HTF | **E5.11.1** smoke |
| E5.11.1 | HTF Structure smoke evidence (docs-only; operador) | `HTF_STRUCTURE_SMOKE_EVIDENCE_E5_11_1.md`, refs export E5.11 / roadmap E5.11 | PASS técnico; contexto HTF útil; sin compuerta; `protected_level_missing` dominante | **E5.12** MSS/CHoCH |
| E5.12 | MSS/CHoCH V1 export (repo + docs) | `MSS_CHOCH_EXPORT_E5_12.md`, `Mapazapp_TestEA.mq5`, core/scripts/tests/samples | Observación-only TF ejecución; sin gate | **E5.12.1** smoke |
| E5.12.1 | MSS/CHoCH smoke evidence (docs-only; operador) | `MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md`, refs export E5.12 / roadmap E5.11 §C | PASS técnico; MSS/CHoCH útil como diagnóstico; sin compuerta; sin tune por un bundle | **E5.12.2** |
| E5.12.2 | MSS/CHoCH temporal relevance (repo) | `MSS_CHOCH_TEMPORAL_RELEVANCE_AUDIT_E5_12_2.md`, `Mapazapp_TestEA.mq5`, core validador/calibración | Observación-only; sin gate; sin cambiar outcomes | **E5.12.3** |
| E5.12.3 | MSS/CHoCH temporal relevance smoke evidence (docs-only; operador) | `MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md`, refs audit E5.12.2 / export E5.12 | PASS técnico (`BUNDLE_EVENTS_LARGE`); temporal observación-only; sin compuerta | **E5.13** |
| E5.13 | Premium/Discount V1 export (repo + docs) | `PREMIUM_DISCOUNT_EXPORT_E5_13.md`, `Mapazapp_TestEA.mq5`, core validador/calibración/importer | Observación-only; sin gate; sin cambiar outcomes | **E5.13.1** |
| E5.13.1 | Premium/Discount smoke evidence (docs-only; operador) | `PREMIUM_DISCOUNT_SMOKE_EVIDENCE_E5_13_1.md`, `PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`, refs export E5.13 | PASS técnico CLI (`BUNDLE_EVENTS_LARGE`); PD no separa wins/losses por media; `expired_unfilled` media PD más baja; sin compuerta; sin tune solo por bundle | **E5.13.2** |
| Humanización roadmap | Roadmap intermedio trader profesional E5.11–E5.20 (docs-only) | `PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`, refs `ROADMAP_V2_MASTER_EXECUTION_PLAN.md`, `CURSOR_HANDOFF.md`, evidencias E5.10.7 / **E5.11.1** / **E5.12.1** / **E5.12.3** / **E5.13.1** | Cadena **E5.13.2–E5.20** explícita en doc; observación-first | **E5.13.2** |

---

## 10. Cursor working rules

- **No asumir** cambios de arquitectura no reflejados en esta guía o en decisión explícita del usuario.
- Si un **nombre / rol / ruta** no está claro, **frenar y preguntar** antes de duplicar EAs o mover contratos.
- **No crear nuevos “sistemas”** o EAs sin **documentar** aquí (o en un doc enlazado) y sin aprobación.
- **No duplicar EAs** con responsabilidades solapadas sin decisión explícita (regla vigente: **2 EAs oficiales**).
- **Mantener este MD** y el ledger **actualizados** al cerrar checkpoints.
- **Documentar** cada cambio significativo en el **Implementation Ledger** (§9).
- **No avanzar** al siguiente checkpoint sin dejar **recomendación explícita** en el resumen de cierre (qué sigue, riesgos).
- Si hay **conflicto entre código y esta guía** (p. ej. README de BacktestEA dice “oficial” pero la guía dice temporal), **reportarlo** y proponer corrección en el siguiente PR/commit de docs o código acoplado.
- Si el proyecto se **desvía del foco 80/10/10**, **avisar** al usuario.

---

## 11. Manager / brain role

**El usuario + ChatGPT** actúan como:

- Product managers y dueños de prioridad.
- Traders y validadores del setup.
- Analistas del setup y del edge pretendido.
- Arquitectos de decisión (qué es oficial, qué se pausa).
- Control de riesgo (qué no se ejecuta en live).

**Cursor** actúa como:

- Implementador técnico en el repo.
- Auditor de coherencia código ↔ docs.
- Mantenedor de documentación operativa cuando se le encarga.
- Ejecutor de **pasos aprobados** y checklists explícitas.

**Cursor no decide** estrategia de trading, riesgo de cuenta, ni arquitectura de producto **sin aprobación** del usuario / PM humano.

---

## 12. Humanization goal

Mapazapp debe explicar como un ayudante humano:

- **Por qué** el bias es alcista, bajista o neutro / desconocido.
- **Por qué** un setup es válido o no frente a ese bias.
- **Por qué** se rechaza una entrada o se marca como no operable.
- **Qué espera** el trader ver para confirmar.
- **Qué falta** para confirmar (datos, contexto HTF, sesión, etc.).
- **Qué invalidaría** el setup antes o después de la entrada.

**Flujo discrecional de referencia (no automatizar como señal única):** contexto HTF → liquidez tomada → reacción tras sweep → desplazamiento → FVG/IFVG → retest/confirmación → candidato → invalidación → objetivo de liquidez lógico → controles de sesión/riesgo/frecuencia. El FVG es **zona**, no entrada obligada; el sweep **solo** no valida el trade. Ver roadmap cerrado en [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md).

**No basta** con métricas técnicas crudas: el trader necesita narrativa **auditables** y honestas.

---

## 13. Non-goals now

Fuera de alcance **ahora** (salvo re-apertura explícita):

- **Live trading** y ejecución real en cuenta.
- **Auto execution** y bots desatendidos.
- **Account trading** desde Mapazapp.
- **`POST` / action endpoints** operativos hacia MT5 o bróker.
- **Launcher `.exe`**, installer, packaging comercial.
- **Dashboard avanzado** antes de evidencia creíble del tester.
- **Base de datos** persistente de producto.
- **WebSocket live** masivo.
- **Expansión de runtime** como prioridad principal.

---

*Última intención de checkpoint al crear este documento: **E3.4.1** — Project Execution Guide and MT5 EA Roles Reconciliation (docs-only).*
