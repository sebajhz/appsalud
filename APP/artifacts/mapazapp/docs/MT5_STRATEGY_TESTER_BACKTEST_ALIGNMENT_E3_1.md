# Mapazapp — MT5 Strategy Tester Backtest Alignment E3.1

## 1. Purpose

- **E1**, **E2** y **E3** reorientaron el proyecto hacia la **prueba de setup** (Engine Setup Proof) con foco en evidencia y gobernanza.
- **Corrección de enfoque (este documento):** la **prueba principal del setup** — el backtest que debe validar edge y reglas de negocio — se ejecutará en **MetaTrader 5 Strategy Tester** mediante un **EA dedicado** (nombre conceptual: **`Mapazapp_BacktestEA`**). **No** en un pipeline TypeScript/CSV como motor principal de esta fase.
- **`@workspace/mapazapp-core`** (replay, campañas, import CSV en memoria) permanece como **referencia, tests, mock/evidencia y análisis auxiliar**; **no** sustituye al Strategy Tester para el baseline oficial del setup.
- **CSV / JSON** se reencuadran como formatos de **exportación de evidencia** desde MT5 (y opcionalmente de importación hacia Mapazapp para dashboard/análisis), **no** como la fuente principal del backtest del setup.
- **E3.1 es solo documentación:** no implementa EA, no ejecuta MT5 ni Strategy Tester.

**Relacionado:** [`ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md`](./ENGINE_SETUP_PROOF_MASTER_PLAN_E1.md), [`ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md`](./ENGINE_INVENTORY_AND_SETUP_CONTRACT_AUDIT_E2.md), [`XAUUSD_DATASET_IMPORT_DATA_HEALTH_PLAN_E3.md`](./XAUUSD_DATASET_IMPORT_DATA_HEALTH_PLAN_E3.md), [`BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md`](./BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md) (**E3.2** — contrato formal Setup V1 / export antes de MQL5), [`ROADMAP_V2_MASTER_EXECUTION_PLAN.md`](./ROADMAP_V2_MASTER_EXECUTION_PLAN.md), [`MT5_DATA_INTEGRATION.md`](./MT5_DATA_INTEGRATION.md), [`MT5_DETECTION_GATE_AUDIT_D10.md`](./MT5_DETECTION_GATE_AUDIT_D10.md), [`MT5_CONFIG_STORAGE_DECISION_D10.md`](./MT5_CONFIG_STORAGE_DECISION_D10.md), [`MT5_BRIDGE_FILE_DISCOVERY_AUDIT_D10.md`](./MT5_BRIDGE_FILE_DISCOVERY_AUDIT_D10.md).

---

## 2. Corrected backtest architecture

Flujo objetivo:

```text
MT5 Strategy Tester
  → Mapazapp_BacktestEA
  → Daily Bias + Setup V1 (lógica MQL5)
  → simulación / órdenes estrictamente tester-only
  → export de evidencia (CSV/JSON u otro contrato)
  → Mapazapp valida / ingiere evidencia
  → dashboard / métricas / análisis (sin ejecutar el backtest principal)
```

- **MT5** aporta **datos históricos del tester**, **motor de simulación** y **entorno controlado** del backtest.
- El **EA** implementa detección de **Setup V1**, **Daily Bias** y reglas de dirección; produce trazas y archivos de evidencia.
- **E3.3 (repo):** esqueleto inicial **`Mapazapp_BacktestEA`** en `APP/artifacts/mt5/experts/Mapazapp_BacktestEA/` — guard tester-only, exports mínimos (`backtest_trades.csv` solo cabecera, `backtest_events.csv`, `backtest_summary.json`); sin lógica IFVG/bias real todavía.
- **Mapazapp** (TypeScript) **analiza y visualiza** resultados importados; no reemplaza al Strategy Tester en esta fase.

---

## 3. Role of CSV / JSON

**CSV / JSON puede usarse para:**

- Exportar **trades** y resultados agregados desde el EA.
- Exportar **señales** / candidatos detectados.
- Exportar contadores y filas **`rejected_by_daily_bias`**, **`skipped_neutral_bias`**, etc.
- Exportar **métricas** y metadatos de corrida (símbolo, TF, rango de fechas, parámetros).
- **Importar** esa evidencia en Mapazapp (validación de esquema, dashboards de lectura).

**CSV / JSON no debe describirse como:**

- Fuente **principal** de datos externos sustitutos del histórico del Strategy Tester para el backtest oficial del setup.
- **Sustituto** del Strategy Tester para la prueba de validez del setup.
- Motor del **backtest principal** del setup en la fase Engine Setup Proof.

Los importadores actuales del core (V2-11) siguen siendo útiles para **validar forma de exportes**, **fixtures de tests** e **ingesta de evidencia**, no para redefinir el motor de prueba como “CSV-first”.

---

## 4. EA backtest scope

**Nombre conceptual:** `Mapazapp_BacktestEA`

**Debe:**

- Ejecutarse en **Strategy Tester** (modo backtest).
- Calcular **Daily Bias** según contrato acordado.
- Detectar **Setup V1** y validar dirección frente al bias.
- Simular o ejecutar operaciones **solo en contexto de tester**, con reglas §5.
- **Exportar evidencia** (archivos bajo `MQL5/Files` o ruta acordada, sin datos sensibles en repo).
- **Bloquear** cualquier uso pensado para **cuenta real** o live (comportamiento fail-closed fuera del tester).

**No debe:**

- Operar en **cuenta real** ni enviar órdenes live.
- Depender del **dashboard**, **API**, **wrapper** o **command files** para su lógica de backtest.
- Asumir que Mapazapp-core es obligatorio en runtime del EA.

---

## 5. Tester-only safety rule

**Regla obligatoria:** si la ejecución **no** está en **Strategy Tester** (`MQL_TESTER` / equivalente documentado en el contrato del EA):

- **No** trading; **no** `OrderSend`; **no** `CTrade` hacia mercado real.
- **No** señales operativas reales hacia bróker.
- Mostrar **error o alerta segura** y **abortar** cualquier ruta que parezca live.

**Si está en Strategy Tester:**

- Se permite la lógica de backtest y, si aplica, órdenes **solo** en el entorno del tester.
- Cualquier uso de `CTrade` / `OrderSend` debe estar **acotado** a `MQL_TESTER == true` (o alternativa virtual sin órdenes; ver abajo).

**Dos opciones de implementación (elección en E3.2/E3.3):**

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A — Virtual backtest inside EA** | Sin `OrderSend`; el EA calcula entradas/salidas y exporta resultados. | Máxima seguridad; superficie mínima de órdenes. | No aprovecha métricas nativas completas del informe del Strategy Tester. |
| **B — Strategy Tester orders** | `CTrade` / `OrderSend` **solo** cuando `MQL_TESTER` es verdadero, con guardas adicionales. | Informes y métricas nativas del tester. | Requiere disciplina extrema en guardas; revisión de código obligatoria. |

**Recomendación:** para validar el setup con informes estándar de MT5, tender a la **opción B** con **guardas fuertes** (tester-only, sin ramas live). La opción A sigue siendo válida si se prioriza seguridad sobre informes nativos.

---

## 6. Daily Bias in EA

Reglas centrales (alineadas a E1):

- Bias **bullish** → solo setups **long**.
- Bias **bearish** → solo setups **short**.
- Bias **neutral** / **unclear** → **no trade** (skipped).
- Desalineación setup vs bias → **`rejected_by_daily_bias`** (u código equivalente en el export).

El EA debe poder exportar, como mínimo conceptual: **timestamp**, **`biasDirection`**, **`setupDirection`**, **allowed / rejected / skipped**, **`rejectionReason`**, **`biasReasons`**, **`setupReasons`**.

---

## 7. Setup V1 in EA

**Setup V1 debe codificarse en MQL5** dentro del `Mapazapp_BacktestEA` (o módulos incluidos), tomando como referencia conceptual los documentos V2 y E1/E2.

Debe cubrir, en el contrato final (E3.2+):

- **Symbol:** XAUUSD (y reglas de sufijo broker si aplica).
- **Timeframe de ejecución** y **timeframes de contexto** (H1/H4/D1 según acuerdo).
- **Daily bias** (§6).
- **IFVG / imbalance / displacement** según especificación congelada.
- **Entrada, SL, TP**, **target liquidity**, **invalidación**, **filtros de sesión** si aplican.
- **Risk model** acotado al tester.
- **Export de evidencia** acorde a **E3.6**.

---

## 8. Mapazapp role after MT5 backtest

**Mapazapp debe:**

- Leer y **validar esquema** del export del EA.
- Mostrar **métricas**, comparar campañas, **`rejected_by_daily_bias`**, equity/trades agregados.
- Ofrecer **dashboard de evidencia** en modo lectura / mock hasta que se apruebe wiring real.

**Mapazapp no debe (en esta fase):**

- Sustituir al **Strategy Tester** como motor principal del backtest del setup.
- Ejecutar trades, conectar live ni enviar órdenes.

---

## 9. Corrected checkpoint sequence

Secuencia **Engine Setup Proof** actualizada (reemplaza la numeración E3→E4 previa centrada en TypeScript como motor principal):

| ID | Nombre |
|----|--------|
| **E3.1** | MT5 Strategy Tester Backtest Alignment (**este documento**) |
| **E3.2** | BacktestEA Setup V1 contract |
| **E3.3** | BacktestEA skeleton with tester-only guard |
| **E3.4** | Daily Bias V1 in BacktestEA |
| **E3.5** | Setup V1 detection in BacktestEA |
| **E3.6** | BacktestEA evidence export schema |
| **E4** | First MT5 Strategy Tester smoke backtest |
| **E5** | XAUUSD Strategy Tester campaign |
| **E6** | Import MT5 backtest evidence into Mapazapp |
| **E7** | Dashboard results design |
| **E8** | Setup decision gate |

**Nota sobre la antigua “E3.5” TypeScript:** el trabajo de **Daily Bias hard gate** en **`runBacktestCampaign` / TypeScript** queda **pospuesto o relegado a auxiliar**; el **gate principal de bias** para la prueba de setup pasa al **EA (E3.4)**. El documento histórico **E3** sobre CSV/data health se reinterpreta como **salud de exportes / evidencia** y validación de formatos, no como motor del backtest principal.

---

## 10. Docs that must be corrected

| Documento | Corrección mínima |
|-----------|-------------------|
| **E1** | Aclarar que el **backtest principal del setup proof = MT5 Strategy Tester + EA**. |
| **E2** | Aclarar que el inventario **TypeScript** es **referencia/auxiliar**; la prueba canónica del setup será **MQL5 EA**. |
| **E3** | Reencuadrar CSV/JSON como **export/evidencia** y **MT5 Strategy Tester** como entorno principal de backtest. |
| **Roadmap / Handoff** | Apuntar siguientes pasos hacia **BacktestEA** y secuencia **E3.1–E8**. |

---

## 11. Non-goals

Fuera de **E3.1**:

- Ejecutar MT5, Strategy Tester o campañas reales ahora.
- Crear o modificar código del EA ahora.
- Trading live, dashboard productivo, expansión de wrapper/runtime.
- Endpoints **`POST`**, action transport, **`.exe`**, packaging.
