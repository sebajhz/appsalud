# Mapazapp — BridgeEA Build Spec V1
Fecha: 2026-05-02

## Estado

Spec separado.
No integrar todavía al MD maestro.

## Objetivo

Definir cómo implementar el Expert Advisor puente de MetaTrader 5:

`MZP_BridgeEA_v1.mq5`

Este EA será el puente estable entre MT5 y la app externa Mapazapp.

No es la estrategia.
No decide entradas.
No optimiza.
No ejecuta en V1.

Su función es exportar datos reales de MT5 bajo un contrato fijo.

---

# 1. Relación con documentos anteriores

Este archivo implementa el contrato definido en:

`Mapazapp_MT5_Bridge_Connectivity_Contract_V1.md`

No puede agregar campos ni cambiar nombres sin actualizar ese contrato.

---

# 2. Responsabilidad del BridgeEA

El BridgeEA debe:

- Verificar estado de MT5.
- Exportar estado del bridge.
- Exportar información de mercado.
- Exportar velas cerradas.
- Exportar snapshot de cuenta.
- Exportar posiciones abiertas.
- Exportar órdenes pendientes.
- Exportar historial incremental de deals.
- Exportar errores.
- Preparar estructura para comandos futuros.
- No ejecutar trades en V1.

---

# 3. Lo que NO debe hacer

El BridgeEA no debe:

- Calcular estrategia.
- Detectar IFVG.
- Detectar setups.
- Calcular score.
- Decidir compra/venta.
- Optimizar parámetros.
- Ejecutar órdenes en V1.
- Modificar SL/TP en V1.
- Cambiar reglas de riesgo.
- Inventar datos no disponibles.
- Escribir archivos fuera del contrato.

---

# 4. Nombre del EA

```text
MZP_BridgeEA_v1.mq5
```

Nombre visible:

```text
Mapazapp Bridge EA v1
```

Magic number reservado para futuro:

```text
MZP_MAGIC_BASE = 260502
```

En V1 no opera, pero se reserva.

---

# 5. Inputs del BridgeEA

## Inputs básicos

```text
input string InpBridgeVersion = "MZP_BridgeEA_v1";
input string InpSchemaVersion = "MZP_BRIDGE_V1";
input string InpTerminalId = "MT5_TERMINAL_001";
input string InpSymbolsCsv = "XAUUSD";
input string InpTimeframesCsv = "M15,H1,H4,D1";
input bool   InpUseCommonFolder = true;
input int    InpAccountSnapshotSeconds = 10;
input int    InpMarketSnapshotSeconds = 5;
input int    InpPositionsSnapshotSeconds = 5;
input int    InpDealsLookbackDays = 30;
input bool   InpExportTicks = false;
input bool   InpEnableCommandRead = false;
input bool   InpEnableTradingCommands = false;
input bool   InpDebugMode = false;
```

## Reglas

- `InpEnableTradingCommands` debe quedar `false` en V1.
- Si está `true`, el EA debe rechazarlo salvo build futura explícita.
- `InpSymbolsCsv` permite múltiples símbolos después.
- V1 inicia con XAUUSD.

---

# 6. Carpetas

Si `InpUseCommonFolder=true`, usar carpeta común de archivos MT5.

Estructura:

```text
Mapazapp/
  market/
    candles/
    snapshots/
  account/
    snapshots/
    positions/
    orders/
    deals/
  events/
    bridge_status/
    errors/
  commands/
    inbound/
    outbound/
    archive/
```

El EA debe crear carpetas si no existen.

---

# 7. Escritura segura de archivos

El EA no debe escribir directamente el archivo final si la app puede estar leyéndolo.

Proceso:

```text
1. Escribir archivo .tmp
2. Flush/cerrar archivo
3. Reemplazar archivo final
```

Ejemplo:

```text
latest_market_snapshot.tmp
latest_market_snapshot.csv
```

La app externa solo lee `.csv` o `.json`, nunca `.tmp`.

---

# 8. Separador CSV

Usar coma `,`.

Reglas:

- Todos los timestamps en UTC.
- Decimales con punto.
- Strings sin saltos de línea.
- Si un string puede tener coma, escaparlo o reemplazar coma por espacio.
- Siempre incluir header.

---

# 9. Timestamps

Todo timestamp exportado debe estar en UTC.

Campos:

```text
exported_at_utc
candle_time_utc
time_open_utc
time_setup_utc
expiration_utc
last_tick_time_utc
```

Si MT5 entrega horario de servidor, convertir o etiquetar correctamente.

Regla:
No mezclar server time y UTC sin indicarlo.

---

# 10. OnInit

En `OnInit()`:

1. Validar inputs.
2. Parsear símbolos.
3. Parsear timeframes.
4. Crear carpetas.
5. Inicializar estado.
6. Crear/actualizar bridge_status.
7. Inicializar último deal importado si existe archivo previo.
8. Loguear arranque.
9. Devolver OK solo si puede escribir archivos mínimos.

Pseudo:

```text
OnInit():
  ValidateInputs()
  ParseSymbols()
  ParseTimeframes()
  EnsureFolders()
  InitTimers()
  ExportBridgeStatus()
  ExportAllInitialSnapshots()
  return INIT_SUCCEEDED
```

---

# 11. OnTick

En `OnTick()`:

1. Revisar si toca exportar market snapshot.
2. Revisar si toca exportar account snapshot.
3. Revisar si toca exportar positions.
4. Revisar si toca exportar orders.
5. Revisar si hay nuevas velas cerradas por símbolo/timeframe.
6. Revisar deals incrementales.
7. Actualizar bridge_status.
8. Leer comandos solo si está habilitado, pero no ejecutar en V1.

Pseudo:

```text
OnTick():
  now = TimeCurrent()

  if ShouldExportMarketSnapshot(now):
      ExportMarketSnapshot()

  if ShouldExportAccountSnapshot(now):
      ExportAccountSnapshot()

  if ShouldExportPositions(now):
      ExportPositionsOpen()

  if ShouldExportOrders(now):
      ExportOrdersPending()

  CheckAndExportClosedCandles()

  if ShouldExportDeals(now):
      ExportDealsIncremental()

  ExportBridgeStatus()

  if InpEnableCommandRead:
      ReadCommandsButDoNotExecuteInV1()
```

---

# 12. OnTimer opcional

Recomendación:
Usar `EventSetTimer(1)` o intervalo configurable para no depender solo de ticks.

En mercados quietos, sin ticks, OnTick puede no disparar.

`OnTimer()` puede hacer:

- bridge_status.
- account snapshot.
- positions.
- deals.
- comandos.

Pseudo:

```text
OnTimer():
  ExportScheduledSnapshots()
  CheckCommands()
```

---

# 13. OnDeinit

En `OnDeinit()`:

1. Exportar bridge_status con estado `STOPPED`.
2. Cerrar archivos si hay handles abiertos.
3. Loguear motivo de salida.
4. Limpiar timer.

Pseudo:

```text
OnDeinit(reason):
  ExportBridgeStatus("STOPPED", reason)
  EventKillTimer()
```

---

# 14. Detección de nueva vela

Para cada símbolo/timeframe:

Guardar:

```text
last_exported_bar_time[symbol][timeframe]
```

Lógica:

```text
rates = CopyRates(symbol, timeframe, 1, bars_to_export)
```

Importante:
- Shift 0 es vela actual en formación.
- Shift 1 es última vela cerrada.
- Exportar solo velas cerradas para estrategia.

Si `last_closed_bar_time > last_exported_bar_time`, exportar.

---

# 15. Export candles

Archivo:

```text
/market/candles/candles_{symbol}_{timeframe}.csv
```

Modo V1:

- Puede reescribir últimas N velas cerradas.
- O puede append incremental.
- Recomendación inicial: append con deduplicación externa.

Campos exactos:

```text
schema_version
export_id
exported_at_utc
terminal_id
account_login
symbol
timeframe
candle_time_utc
open
high
low
close
tick_volume
spread_points
real_volume
is_closed
source
```

Regla:

```text
is_closed = true
source = MT5_BRIDGE
```

---

# 16. Export market snapshot

Archivo:

```text
/market/snapshots/latest_market_snapshot.csv
```

Campos:

```text
schema_version
exported_at_utc
terminal_id
account_login
symbol
bid
ask
last
spread_points
spread_price
point
digits
tick_size
tick_value
contract_size
volume_min
volume_max
volume_step
trade_mode
session_status
last_tick_time_utc
```

Datos MT5 sugeridos:

- SymbolInfoDouble
- SymbolInfoInteger
- SymbolInfoTick

Si un campo no existe o falla:

- Exportar vacío o 0 según tipo.
- Registrar error en bridge_errors.
- No inventar.

---

# 17. Export account snapshot

Archivo:

```text
/account/snapshots/account_snapshot.csv
```

Campos:

```text
schema_version
exported_at_utc
terminal_id
account_login
account_server
currency
balance
equity
margin
free_margin
margin_level
profit_open
leverage
trade_allowed
trade_expert
company
```

Datos MT5:

- AccountInfoDouble
- AccountInfoInteger
- AccountInfoString

---

# 18. Export positions open

Archivo:

```text
/account/positions/positions_open.csv
```

Campos:

```text
schema_version
exported_at_utc
terminal_id
account_login
position_ticket
symbol
type
volume
price_open
sl
tp
price_current
profit
swap
commission
magic
comment
time_open_utc
strategy_id
source_tag
```

Notas:

- `strategy_id` y `source_tag` se derivan del comentario/magic si existe.
- Si es trade manual, usar:
  - `strategy_id = MANUAL_OR_UNKNOWN`
  - `source_tag = MT5_MANUAL`

---

# 19. Export orders pending

Archivo:

```text
/account/orders/orders_pending.csv
```

Campos:

```text
schema_version
exported_at_utc
terminal_id
account_login
order_ticket
symbol
type
volume_initial
volume_current
price_open
sl
tp
price_current
magic
comment
time_setup_utc
expiration_utc
strategy_id
source_tag
```

---

# 20. Export deals incremental

Archivo:

```text
/account/deals/deals_history_incremental.csv
```

Campos:

```text
schema_version
exported_at_utc
terminal_id
account_login
deal_ticket
order_ticket
position_id
symbol
deal_type
entry_type
volume
price
profit
commission
swap
fee
time_utc
magic
comment
reason
strategy_id
source_tag
```

## Método

1. Seleccionar historial desde `now - InpDealsLookbackDays`.
2. Recorrer deals.
3. Exportar solo deals no exportados.
4. Guardar último deal ticket o cache de tickets.
5. La app también deduplica por `deal_ticket`.

Regla:
No confiar solo en orden temporal si el broker reordena datos; deduplicar por ticket.

---

# 21. Export bridge status

Archivo:

```text
/events/bridge_status/bridge_status.json
```

Campos:

```json
{
  "schema_version": "MZP_BRIDGE_V1",
  "exported_at_utc": "2026-05-02T15:00:00Z",
  "terminal_id": "MT5_TERMINAL_001",
  "account_login": 123456,
  "account_server": "Broker-Server",
  "account_currency": "USD",
  "bridge_version": "MZP_BridgeEA_v1",
  "ea_status": "RUNNING",
  "auto_trading_enabled": false,
  "connected": true,
  "last_tick_time_utc": "2026-05-02T14:59:59Z",
  "symbols_enabled": ["XAUUSD"],
  "errors_count": 0,
  "last_error": ""
}
```

Estados:

```text
STARTING
RUNNING
WARNING
ERROR
STOPPED
```

---

# 22. Export bridge errors

Archivo:

```text
/events/errors/bridge_errors.csv
```

Campos:

```text
schema_version
exported_at_utc
terminal_id
account_login
error_code
error_message
module
severity
context
```

Severidad:

```text
INFO
WARNING
ERROR
CRITICAL
```

Errores a registrar:

- No se puede crear carpeta.
- No se puede escribir archivo.
- Símbolo no disponible.
- Timeframe inválido.
- CopyRates falla.
- SymbolInfo falla.
- AccountInfo falla.
- HistorySelect falla.
- Comando recibido pero trading deshabilitado.
- Schema mismatch futuro.

---

# 23. Commands V1

V1 no ejecuta comandos.

Pero puede leer y rechazar de forma segura.

Archivo futuro:

```text
/commands/inbound/commands_inbound.json
```

Si aparece un comando y `InpEnableTradingCommands=false`:

Exportar ACK:

```text
status = BLOCKED_BY_EA
message = Trading commands disabled in BridgeEA V1
```

Archivo:

```text
/commands/outbound/commands_ack.csv
```

---

# 24. Kill switch futuro

Reservar campo interno:

```text
kill_switch_state = OK / BLOCKED / UNKNOWN
```

En V1:

```text
kill_switch_state = BLOCKED
```

Motivo:
No hay ejecución habilitada.

---

# 25. Validación de símbolo

Para cada símbolo en `InpSymbolsCsv`:

1. Verificar `SymbolSelect(symbol, true)`.
2. Verificar tick.
3. Verificar point/digits.
4. Verificar trade mode.
5. Exportar en market snapshot.
6. Si falla, registrar error.

No inventar nombres de símbolo.

Si el broker usa `XAUUSDm`, debe configurarse así.

---

# 26. Validación de timeframe

Mapear strings:

```text
M1
M5
M15
M30
H1
H4
D1
```

V1 usa:

```text
M15,H1,H4,D1
```

Si timeframe no soportado, registrar error y omitir.

---

# 27. Control de performance

No exportar todos los ticks en V1.

No escribir archivos enormes en cada tick.

Recomendación:

- Velas: al cierre.
- Market snapshot: cada 5 segundos.
- Account: cada 10 segundos.
- Positions: cada 5 segundos.
- Deals: cada 30-60 segundos.

Inputs pueden ajustar estos valores.

---

# 28. Compatibilidad multi-símbolo

Aunque V1 inicia con XAUUSD, el código debe permitir lista:

```text
InpSymbolsCsv = "XAUUSD,EURUSD,GBPUSD"
```

Cada símbolo exporta:

```text
candles_XAUUSD_M15.csv
candles_EURUSD_M15.csv
candles_GBPUSD_M15.csv
```

Market snapshot puede ser uno por símbolo o un CSV con filas por símbolo.

Recomendación:
Un único `latest_market_snapshot.csv` con múltiples filas.

---

# 29. Compatibilidad con la app externa

La app externa debe poder:

- Leer headers.
- Validar schema_version.
- Detectar duplicados.
- Importar incremental.
- Marcar bridge stale si status no se actualiza.
- Mostrar errores.
- No depender de columnas inexistentes.

---

# 30. Acceptance tests BridgeEA V1

## Test 1 — Compila

EA compila sin errores.

## Test 2 — Crea carpetas

Crea estructura Mapazapp.

## Test 3 — Bridge status

Genera `bridge_status.json`.

## Test 4 — Market snapshot

Genera `latest_market_snapshot.csv` con XAUUSD.

## Test 5 — Account snapshot

Genera `account_snapshot.csv`.

## Test 6 — Candles

Genera candles M15/H1/H4/D1 con velas cerradas.

## Test 7 — Positions

Genera `positions_open.csv`, aunque no haya posiciones.

## Test 8 — Deals

Genera `deals_history_incremental.csv`.

## Test 9 — Errors

Si símbolo inválido, registra error.

## Test 10 — No comandos

Si recibe comando, lo bloquea en V1.

## Test 11 — Varias horas

Corre varias horas sin bloquear MT5 ni generar archivos corruptos.

---

# 31. Entregables de Cursor/MQL5

Cursor debe entregar:

```text
MZP_BridgeEA_v1.mq5
README_BridgeEA_Runbook.md
sample_exports/
```

Sample exports:

```text
bridge_status.json
latest_market_snapshot.csv
account_snapshot.csv
positions_open.csv
orders_pending.csv
deals_history_incremental.csv
candles_XAUUSD_M15.csv
bridge_errors.csv
```

---

# 32. Runbook mínimo

El README debe explicar:

1. Dónde copiar el EA.
2. Cómo compilar.
3. Cómo adjuntarlo a un gráfico.
4. Qué inputs configurar.
5. Dónde se generan archivos.
6. Cómo verificar que está vivo.
7. Qué hacer si no exporta.
8. Cómo apagarlo.
9. Cómo limpiar exports.
10. Qué NO activar en V1.

---

# 33. Reglas de seguridad

En V1:

```text
InpEnableTradingCommands = false
InpEnableCommandRead = false o true solo para ACK bloqueado
```

No abrir operaciones.
No modificar operaciones.
No cerrar operaciones.
No cambiar SL/TP.

---

# 34. Próximo paso después del BridgeEA

Cuando este spec esté listo, recién ahí podemos crear:

`Mapazapp_Replit_Dashboard_Mock_Spec_V1.md`

Pero el mock debe usar exactamente los datos definidos por:

- Bridge Connectivity Contract.
- BridgeEA Build Spec.
- Strategy TestEA exports.
- Configuración versionada.

---

# 35. Regla final

Si un dato no sale del BridgeEA, de backtest importado o de configuración versionada, el bot externo no puede usarlo.

No se inventan variables.
