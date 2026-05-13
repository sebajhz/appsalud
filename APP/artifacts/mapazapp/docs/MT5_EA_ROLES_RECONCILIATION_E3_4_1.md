# Mapazapp — MT5 EA Roles Reconciliation E3.4.1

## 1. Purpose

- Se detectó un **posible desvío arquitectónico**: la documentación y el código de **E3.1–E3.4** nombraban el motor de tester como **`Mapazapp_BacktestEA`** y crearon un **tercer archivo físico** bajo `APP/artifacts/mt5/experts/Mapazapp_BacktestEA/`, mientras **`Mapazapp_TestEA`** ya existía como EA oficial CP14 para Strategy Tester.
- La intención **original** del producto en MT5 era **dos EAs oficiales**: **puente read-only** + **EA de Strategy Tester** para evidencia de backtest del setup.
- **Antes de implementar IFVG (E3.5)** hay que **decidir y documentar** el rol oficial: el rol “BacktestEA” debe vivir en el **EA físico oficial de tester** acordado, evitando **tres EAs oficiales** sin decisión explícita.
- **E3.4.1 es solo documentación**: no migra código MQL5 en este checkpoint, no ejecuta MT5 ni Strategy Tester.

**Relacionado:** [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md), [`BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md`](./BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md), [`BACKTESTEA_DAILY_BIAS_V1_E3_4.md`](./BACKTESTEA_DAILY_BIAS_V1_E3_4.md).

---

## 2. Original 3 internal systems

1. **Mapazapp app / core / dashboard** — lectura, evidencia, análisis, humanización; **no** motor oficial del backtest del setup.
2. **Mapazapp_BridgeEA** — lectura de mercado actual en MT5, export read-only hacia Mapazapp.
3. **Mapazapp_TestEA** — EA de **MetaTrader 5 Strategy Tester**; backtest del setup, bias, IFVG futuro, export de evidencia; **tester-only**, sin live trading.

---

## 3. Existing MT5 EA artifacts

| Carpeta / artefacto | Origen resumido |
|---------------------|-----------------|
| `Mapazapp_BridgeEA/` | CP13 — export-only, live chart, contrato bridge. |
| `Mapazapp_TestEA/` | CP14 — Strategy Tester, `MZP_TESTEA_V1`, placeholder virtual. |
| `Mapazapp_BacktestEA/` | E3.3–E3.4 — tester-only, skeleton + Daily Bias V1 + events + summary. |

---

## 4. BridgeEA role

- **Read-only market bridge** hacia Mapazapp (`MZP_BRIDGE_V1`).
- **No** backtest de setup proof en Strategy Tester.
- **No** trading: sin `OrderSend`, sin `CTrade`, sin comandos inversos desde Mapazapp.

---

## 5. TestEA role

**Rol oficial (post–E3.4.1):**

- Ejecución **solo en Strategy Tester** (`MQL_TESTER` guard).
- **Backtest del setup** (modo virtual u órdenes tester según contrato E3.2, cuando se implemente).
- **Daily Bias** (tras **E3.4.2**, migrando la lógica desde el artefacto BacktestEA).
- **IFVG / Setup V1** en **E3.5**, solo tras reconciliación.
- **Export de evidencia** bajo `MQL5/Files` con contrato versionado.
- **No live trading** en gráfico real como uso soportado.

---

## 6. BacktestEA role / conflict

- **“BacktestEA”** es el **nombre del rol** en contratos E3.1–E3.2: motor de setup en el tester.
- **`Mapazapp_BacktestEA.mq5`** es un **artefacto físico** añadido en **E3.3 / E3.4** con **lógica útil** (skeleton, eventos, Daily Bias V1).
- **Conflicto:** dos módulos físicos (`TestEA` y `BacktestEA`) compiten por el mismo rol mental “EA del tester del setup”, lo que **rompe la regla de dos EAs oficiales** si ambos se consideran producto final sin más.
- **Decisión:** el rol BacktestEA **pertenece** al **`Mapazapp_TestEA` oficial**; el archivo `Mapazapp_BacktestEA` queda como **implementación provisional** hasta **E3.4.2**.

---

## 7. Options

### A. Two official EAs (recommended)

- **BridgeEA + TestEA** únicamente.
- La lógica desarrollada en **`Mapazapp_BacktestEA`** **migra** a **`Mapazapp_TestEA`** (o se reexporta desde un include compartido si algún día se aprueba, sin crear un tercer `.ex5` “oficial”).
- **Ventaja:** una sola verdad para el operador en Strategy Tester; menos confusión en docs y checklists.

### B. Three EAs

- BridgeEA + TestEA + BacktestEA como **tres** productos nominales.
- **Desventaja:** confusión operativa, doble mantenimiento de guards y exports.
- **Solo** si hay razón fuerte documentada (p. ej. TestEA inmutable para regresión CP14 y BacktestEA como fork permanente) — **no recomendado** por defecto.

### C. BacktestEA replaces TestEA

- **`Mapazapp_BacktestEA`** pasa a ser el único EA de tester “oficial”; **`Mapazapp_TestEA`** deprecado o congelado.
- **Posible**, pero exige **renombrar** mentalmente todo lo que hoy dice “TestEA” en roadmap, core (`MZP_TESTEA_V1`), y manuales — alto costo de coherencia.
- **No** es la opción adoptada en **E3.4.1** (se mantiene el nombre **TestEA** como EA físico oficial de tester).

---

## 8. Recommendation

**Recomendación oficial: Opción A.**

- **Oficiales:** `Mapazapp_BridgeEA`, `Mapazapp_TestEA`.
- **BacktestEA:** **rol**, implementado en el cuerpo del **`Mapazapp_TestEA`** tras **E3.4.2**.
- **`Mapazapp_BacktestEA`:** fusionar lógica útil en TestEA **o** deprecar carpeta tras migración y actualizar README/contratos.

---

## 9. Required decision before E3.5

**No implementar IFVG** hasta que:

1. Se complete la **fusión / plan de migración** TestEA ← BacktestEA (checkpoint **E3.4.2** o equivalente aprobado).
2. Se **actualicen** documentos que aún citen “BacktestEA” como único archivo físico del motor (E3.1, READMEs, handoff) en la medida acordada por checkpoint.
3. Se evite **duplicación** de lógica IFVG en dos `.mq5` distintos sin justificación.

---

## 10. Proposed next checkpoint

**E3.4.2 — Merge BacktestEA** (skeleton, Daily Bias V1, events, summary JSON, tests estáticos alineados) **into `Mapazapp_TestEA`**, actualizar contratos y README, y decidir si se **elimina** o **congela** la carpeta `Mapazapp_BacktestEA` con un banner de deprecación en README.

---

*Checkpoint: **E3.4.1** — docs-only, sin ejecución MT5, sin Strategy Tester, sin cambios de código MQL5 en este entregable.*
