# Mapazapp_BacktestEA (E3.3)

**Propósito:** EA dedicado al **motor de backtest principal del Setup V1** en **MetaTrader 5 Strategy Tester**, con exportación de evidencia (CSV/JSON) bajo `MQL5\Files`. Es la base oficial que evolucionará hacia Daily Bias (**E3.4**), detección IFVG (**E3.5**) y esquema de evidencia (**E3.6**).

**Relación con `Mapazapp_TestEA`:** `Mapazapp_TestEA` permanece como **placeholder histórico CP14** (fila virtual sintética). **`Mapazapp_BacktestEA`** es el artefacto separado para Strategy Tester sin confundir ambos roles.

---

## Instalación en MT5

1. Copiar la carpeta `Mapazapp_BacktestEA` (este directorio) bajo el árbol de datos del terminal, por ejemplo:
   - `MQL5\Experts\Mapazapp_BacktestEA\`
2. Abrir `Mapazapp_BacktestEA.mq5` en **MetaEditor** y compilar (**F7**).
3. En el **Strategy Tester**, adjuntar el EA al gráfico del símbolo/periodo deseado.

---

## Uso: solo Strategy Tester

| Regla | Detalle |
|--------|---------|
| **Strategy Tester** | `OnInit` exige `MQLInfoInteger(MQL_TESTER) != 0`. Fuera del tester → **`INIT_FAILED`**. |
| **Gráfico live** | **No usar** en cuenta real ni gráfico live: el EA está bloqueado por diseño. |
| **Ejecución** | Modo **virtual** (`InpBacktestMode` por defecto `virtual`): **sin** envío de órdenes al bróker, **sin** clase de trading del terminal, **sin** apertura de posiciones desde este módulo en E3.3. |
| **Red / comandos** | Sin `WebRequest`, sin ingest de archivos de comando, sin DLLs de red. |

---

## Qué exporta (E3.3)

Bajo **`MQL5\Files\<InpExportRoot>\<run_id>\`** (ruta relativa al sandbox de archivos del terminal o del agente del tester):

| Archivo | Contenido (E3.3) |
|---------|-------------------|
| `backtest_trades.csv` | **Solo cabecera** — no se emiten filas de trade (sin métricas falsas). |
| `backtest_events.csv` | Cabecera + eventos de ciclo de vida (`lifecycle_init`, `skeleton_ready`, `lifecycle_deinit`). |
| `backtest_summary.json` | Metadatos de corrida, flags `has_real_*` en `false`, contadores en cero, `tester_only: true`. |

Escritura atómica: `*.tmp` + `FileMove`, mismo patrón que TestEA/BridgeEA.

---

## Qué **no** hace todavía (E3.3)

- IFVG real, displacement, zonas.
- Daily Bias V1 real.
- Detección de setup real ni órdenes reales.
- `CTrade`, `OrderSend`, métricas de profit simuladas como si fueran resultados validados.

---

## Próximos pasos

| Fase | Entrega |
|------|---------|
| **E3.4** | Daily Bias V1 en BacktestEA. |
| **E3.5** | Setup V1 IFVG en BacktestEA. |
| **E3.6** | Esquema de evidencia versionado y alineación con importadores TS. |
| **E4** | Primer smoke en Strategy Tester con evidencia coherente (post–E3.5/E3.6 según plan). |

---

## Advertencias

- **No** usar en **cuenta real** ni para **trading live**.
- **No** interpretar los exportes E3.3 como backtest validado del setup: es **esqueleto** y trazabilidad de pipeline únicamente.
- Los contadores y `trade_count` permanecen en **cero** hasta implementar lógica posterior.

---

## Referencias de documentación

- Contrato Setup V1: `APP/artifacts/mapazapp/docs/BACKTESTEA_SETUP_V1_CONTRACT_E3_2.md`
- Alineación tester: `APP/artifacts/mapazapp/docs/MT5_STRATEGY_TESTER_BACKTEST_ALIGNMENT_E3_1.md`
- Integración MT5: `APP/artifacts/mapazapp/docs/MT5_DATA_INTEGRATION.md`
