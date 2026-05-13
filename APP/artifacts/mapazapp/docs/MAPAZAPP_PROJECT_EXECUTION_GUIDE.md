# Mapazapp — Project Execution Guide

## 1. Purpose

- Este archivo es la **guía principal** para Cursor y para futuros chats que continúen el trabajo.
- Si hay dudas sobre prioridad, roles de EA, qué es oficial y qué no, o el orden de checkpoints, **consultar primero este documento**.
- Si Cursor se pierde en el repo o en decisiones ya tomadas, **volver aquí** y alinear el trabajo con lo documentado.
- Si cambia el **rol** de un componente o la **arquitectura** de producto, **actualizar este archivo** en el mismo checkpoint (o inmediatamente después), no solo el código.
- Este documento debe **mantenerse vivo**: en **cada checkpoint** cerrado, actualizar al menos la tabla **Next-step checklist** (§8) y una línea en el **Implementation Ledger** (§9).

**Relacionado:** [`MT5_EA_ROLES_RECONCILIATION_E3_4_1.md`](./MT5_EA_ROLES_RECONCILIATION_E3_4_1.md), [`ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md`](./ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md), [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md).

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
- **E4** — plan del **primer smoke manual** en Strategy Tester publicado en [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md); la **ejecución** del smoke queda a cargo del operador (sin automatización desde repo).

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
| E4 | First MT5 Strategy Tester smoke run (post-merge) | pending | Operator + Cursor | Checklist y criterios: [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md); sin automatizar MT5 desde dashboard. | Tras smoke OK: evidencia en `FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md` |
| E5 | XAUUSD Strategy Tester campaign | pending | PM + Cursor | Acotar parámetros y evidencia. | |
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
| E4 (plan) | First MT5 Strategy Tester smoke — operator checklist + validation notes | `FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4.md`, refs en guía / schema / handoff / roadmap | Plan E4 publicado; ejecución manual MT5 pendiente | Operador ejecuta smoke; si OK → `FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md`; si falla → **E4.1** |

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
