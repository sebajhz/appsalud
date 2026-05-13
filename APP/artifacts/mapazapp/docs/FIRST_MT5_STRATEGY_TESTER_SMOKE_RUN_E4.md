# Mapazapp — First MT5 Strategy Tester Smoke Run E4

## 1. Purpose

- **E4** es el **primer smoke run manual** de **`Mapazapp_TestEA`** en **MetaTrader 5 Strategy Tester**.
- **No** es una prueba de **rentabilidad**, **edge** ni calidad predictiva del mercado.
- **No** mide winrate, profit factor ni drawdown como objetivo.
- **Sí** valida de forma controlada: **compilación** (o preparación para compilar), **ejecución solo en tester** (guard `MQL_TESTER`), **generación de los tres artefactos de export**, **coherencia del `backtest_summary.json`** con el esquema congelado en **E3.6**, presencia razonable de **eventos de ciclo de vida / Daily Bias / setup** cuando los datos lo permiten, **`trade_count: 0`**, **ausencia de órdenes reales** (`OrderSend` / `CTrade` no forman parte del EA), y que los archivos puedan revisarse o validarse desde el ecosistema Mapazapp (TypeScript / tests) según lo documentado en §6.

**Límites explícitos:** sin automatizar MT5 desde dashboard, sin launcher, sin `.exe`, sin trading live, sin convertir esta corrida en campaña larga de optimización o medición de rentabilidad.

### Estado de ejecución (E4)

- **Smoke real en MT5 Strategy Tester:** **ejecutado** por operador humano — evidencia formal en [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md).

---

## 2. Preconditions

| Requisito | Nota |
|-----------|------|
| **EA oficial de Strategy Tester** | Solo **`Mapazapp_TestEA`** cumple el rol de tester + evidencia de setup en esta fase. **`Mapazapp_BridgeEA`** es otro contrato (live read-only). **`Mapazapp_BacktestEA`** no está activo en el árbol (fusionado en E3.4.2). |
| **Fuente MQL5** | `APP/artifacts/mt5/experts/Mapazapp_TestEA/Mapazapp_TestEA.mq5` disponible en repo; el operador lo copia o abre en la carpeta `Experts` del terminal MT5. |
| **MT5 instalado** | Terminal y **MetaEditor** accesibles. |
| **Strategy Tester** | Disponible desde MT5 (Vista → Strategy Tester o atajo). |
| **Símbolo inicial** | **XAUUSD** (o el nombre que use el broker en el tester; alinear con datos del tester). |
| **Timeframe de ejecución** | **M15** (`PERIOD_M15`). |
| **Timeframe Daily Bias** | **D1** (`PERIOD_D1`). |
| **Raíz de export** | Por defecto **`MQL5\Files\Mapazapp\TestEA\<run_id>\`** según input `InpExportRoot` (valor por defecto `Mapazapp\TestEA`). Ajustar solo si hay política local distinta. |
| **Entorno** | **No** usar cuenta real ni gráfico live para este smoke; solo Strategy Tester. |

**Referencias de contrato:** [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](./BACKTESTEA_EXPORT_SCHEMA_E3_6.md), [`EXPORT_CONTRACT.md`](../../mt5/experts/Mapazapp_TestEA/EXPORT_CONTRACT.md), [`MAPAZAPP_PROJECT_EXECUTION_GUIDE.md`](./MAPAZAPP_PROJECT_EXECUTION_GUIDE.md).

---

## 3. Manual operator checklist

1. Abrir **MT5**.
2. Abrir **MetaEditor**.
3. Copiar **`Mapazapp_TestEA.mq5`** (y dependencias si las hubiera; hoy el EA es monolítico en un archivo) a la carpeta **`MQL5\Experts\`** del terminal (p. ej. `MQL5\Experts\Mapazapp\`).
4. Abrir el `.mq5` y **compilar** (F7).
5. Revisar **errores / advertencias** en la pestaña del compilador; anotar resultado.
6. En MT5, abrir **Strategy Tester**.
7. **Expert:** `Mapazapp_TestEA`.
8. **Símbolo:** XAUUSD (o variante del broker disponible en el tester).
9. **Período / timeframe del gráfico de prueba:** **M15**.
10. **Rango de fechas:** corto inicial (p. ej. **1–5 días** o **1 semana**) para un smoke rápido.
11. **Modelado:** usar el modo que ofrezca el broker / datos disponibles (sin prescripción única en E4).
12. **Inputs principales** (alinear con el código actual del EA):

    | Input | Valor sugerido (smoke) |
    |-------|-------------------------|
    | `InpCanonicalSymbol` | `XAUUSD` |
    | `InpExecutionTimeframe` | `PERIOD_M15` |
    | `InpDailyBiasTimeframe` | `PERIOD_D1` |
    | `InpBacktestMode` | `virtual` |
    | `InpWriteTradesCsv` | `true` |
    | `InpWriteEventsCsv` | `true` |
    | `InpWriteSummaryJson` | `true` |
    | `InpSchemaVersion` | `backtest_ea_v1` (default) |

13. **Ejecutar** la prueba y esperar a que finalice (los CSV/JSON se escriben típicamente al **fin** del pase, vía `OnDeinit`).
14. Confirmar que **no** hubo intención de operar en cuenta real (solo tester).
15. Localizar la carpeta de export bajo **`MQL5\Files\`** (ruta exacta depende del agente de tester vs terminal; no commitear archivos crudos al repo).
16. Verificar que existen **`backtest_events.csv`**, **`backtest_trades.csv`**, **`backtest_summary.json`**.

---

## 4. Expected outputs

Deben generarse (misma corrida, mismo `run_id`):

- `backtest_events.csv`
- `backtest_trades.csv`
- `backtest_summary.json`

**Contenido esperado (orientativo):**

| Artefacto | Expectativa |
|-----------|-------------|
| **events** | Al menos **`lifecycle_init`** (y filas de ciclo de cierre si aplica). Con datos suficientes de **D1**, al menos una fila **`daily_bias_evaluated`**. Pueden aparecer eventos **`setup_*`** si en el rango hay candidato FVG y el gate de bias no lo excluye. |
| **trades** | **Solo cabecera** (sin filas de operaciones) es el estado **válido** y esperado en esta fase (`trade_count = 0`). |
| **summary** | `schema_version` coherente con **E3.6** (`backtest_ea_v1` por defecto). `trade_count: **0**`. `has_real_daily_bias_logic: **true**`. `has_real_ifvg_logic: **true**`. `has_full_ifvg_pipeline: **false**`. `has_real_trading_orders: **false**`. `tester_only: **true**`. `official_ea: **Mapazapp_TestEA**` (o equivalente en el JSON según `EXPORT_CONTRACT.md`). |

---

## 5. Failure cases

| Fallo | Qué implica |
|-------|----------------|
| **No compila** | Bloqueante — revisar versión MT5, `#property`, includes, permisos de carpeta. Siguiente: **E4.1** (arreglo compile). |
| **No aparece en Strategy Tester** | EA no en `Experts`, nombre distinto, o compilación sin `.ex5` en la ruta que lee el tester. |
| **`INIT_FAILED`** | Típico si se adjunta a **gráfico live** (guard tester-only) o inputs inválidos; revisar journal. |
| **Sin exports** | Flags de escritura en `false`, fallo antes de `OnDeinit`, o path no escribible. |
| **Exports vacíos o truncados** | Error de I/O, permisos, o corrida abortada antes del flush. |
| **Summary inválido o distinto al esquema E3.6** | Bug o versión de EA desalineada con repo — **E4.1** + revisión cruzada con [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](./BACKTESTEA_EXPORT_SCHEMA_E3_6.md). |
| **Falta data D1** | Símbolo/rango sin velas D1 en el modelo — puede faltar `daily_bias_evaluated`; no siempre es bug del EA. |
| **No hay evento daily bias** | Puede deberse a datos HTF insuficientes o rango muy corto. |
| **Path de export incorrecto** | Operador buscando en terminal equivocado (p. ej. carpeta del tester agent vs terminal interactivo). |
| **Símbolo no coincide** | `InpCanonicalSymbol` vs nombre del instrumento en broker/tester — revisar consistencia en eventos y summary. |
| **No hay eventos `setup_*` en rango corto** | **No** se considera necesariamente bug: la detección FVG candidata depende de velas cerradas y del rango. |

---

## 6. Validation with Mapazapp

**Importante — alcance del CLI `mapazapp:import-validate`:**

- El script **`pnpm --filter @workspace/scripts mapazapp:import-validate`** valida CSV de **datasets de velas manuales** vía `importManualCandleDataset` (formatos `mt5` / `bridge` / `ohlc`).
- **No** está diseñado para validar en una sola invocación el **bundle triple** TestEA (`backtest_events.csv` + `backtest_trades.csv` + `backtest_summary.json`).

**Opciones post-smoke (hoy):**

1. **Revisión manual** del JSON frente a [`BACKTESTEA_EXPORT_SCHEMA_E3_6.md`](./BACKTESTEA_EXPORT_SCHEMA_E3_6.md) y [`EXPORT_CONTRACT.md`](../../mt5/experts/Mapazapp_TestEA/EXPORT_CONTRACT.md).
2. **Validación en memoria** con el core: `validateTestEaExportSample`, `parseBacktestEventsCsv`, `importBacktestTradesFromCsv` (ver paquete `@workspace/mapazapp-core` y tests V2-12 / estáticos del EA).
3. **Tests de repo** (regresión sobre samples oficiales, no sustituyen el smoke real):  
   `pnpm --filter @workspace/mapazapp-core test`  
   `pnpm --filter @workspace/scripts test` (incluye `mapazapp-backtestea-static.test.ts`).

**Gap documental / producto (E4.1 si hace falta):** CLI o script único “`mapazapp:testea-export-validate --bundle <dir>`” que lea los tres archivos y emita informe — **fuera de alcance** de este commit de plan E4; abrir tarea si el operador lo necesita de forma recurrente.

---

## 7. Evidence to capture

El operador debe registrar (para un doc de evidencia separado, ver Parte 7 del plan de trabajo):

- Build / versión de **MT5** (si es fácil de obtener).
- **Broker / servidor** como etiqueta (sin credenciales).
- **Símbolo** y **timeframe** de ejecución.
- **Fecha desde / hasta** del test.
- **Modelado** usado.
- **Inputs** principales (tabla resumida).
- **Resultado de compilación** (errores / warnings).
- **Resultado de la corrida** (OK / fallo / INIT).
- **Ruta de export** en forma **redactada** (sin `C:\Users\...` completo en docs públicos si se comparte el informe).
- **Nombres de archivos** generados.
- **Extracto** del `backtest_summary.json` (campos clave de §4).
- **Warnings / errores** relevantes del journal.

**No guardar:** contraseñas, claves API, números de cuenta sin redactar, ni rutas privadas completas en documentación pública.

---

## 8. E4 success criteria

**E4 se considera OK** si:

- El EA **compila** (o el operador documenta bloqueo real del entorno de forma trazable).
- La corrida **corre en Strategy Tester** sin violar el guard tester-only.
- **No** hay operaciones reales ni uso de gráfico live para el smoke.
- Los **tres exports existen** y son legibles.
- El **summary** es **JSON válido** y respeta el **esquema E3.6** en campos críticos (§4).
- **`backtest_events.csv`** tiene cabecera correcta y al menos eventos de lifecycle / bias cuando los datos lo permiten.
- **`backtest_trades.csv`** puede quedarse en **solo cabecera** (aceptado).
- **`trade_count`** permanece **0** en summary.
- Confirmación de diseño: **sin** `OrderSend` / **sin** `CTrade` en el EA (ya cubierto por tests estáticos en repo; el smoke refuerza comportamiento en runtime tester).
- Validadores TypeScript sobre **samples oficiales** siguen pasando en CI/local; la validación del bundle **real** del smoke sigue el enfoque de §6 (manual / core / gap E4.1).
- El **repo** permanece **limpio** (sin commitear exports crudos del smoke salvo decisión explícita de samples sanitizados).

---

## 9. E4 non-goals

E4 **no** incluye:

- Medir **rentabilidad** ni edge estadístico.
- **Optimizar** parámetros ni grid search.
- **Campaña larga** de backtest masivo (dejarlo para **E5**).
- **Dashboard**, **API**, **DB**, **WebSocket**.
- **BridgeEA** como sujeto de prueba.
- **Live trading** o cualquier envío de órdenes.
- **Automatización** del Strategy Tester desde Mapazapp o agentes remotos.
- **Launcher** ejecutable, **`.exe`**, o **POST** / action endpoints.

---

## 10. Next after E4

| Resultado | Siguiente paso |
|-----------|----------------|
| **E4 OK** (evidencia archivada) | **E5** — diseño / ejecución de **campaña XAUUSD** en Strategy Tester con parámetros y evidencia acotados; opcional previo **E4.1** — CLI / workflow de validación del bundle real TestEA. |
| **E4 falla** (compile, export, schema, path) | **E4.1** — correcciones MQL5 / docs / validadores hasta un smoke repetible. |

La evidencia del smoke exitoso está en [`FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md`](./FIRST_MT5_STRATEGY_TESTER_SMOKE_RUN_E4_EVIDENCE.md).
