# Mapazapp — MT5 Bridge Connectivity Contract V1
Fecha: 2026-05-02

## Estado

Spec separado.
No integrar todavía al MD maestro.

## Objetivo

Definir la conectividad entre MetaTrader 5, el Expert Advisor puente y el bot externo para que no inventemos variables, números ni datos que después no existan.

Este documento debe responder:

- Qué exporta MT5.
- Qué lee el bot externo.
- Qué datos son obligatorios.
- Qué datos son opcionales.
- Qué formato usamos.
- Cada cuánto se actualiza.
- Cómo detectamos datos nuevos.
- Cómo evitamos duplicados.
- Cómo se prepara ejecución futura.
- Qué no puede inventar Replit/Cursor.

---

# 1. Decisión de arquitectura

La arquitectura queda así:

```text
MetaTrader 5
└── MZP_BridgeEA_v1
    ├── Lee mercado
    ├── Lee cuenta
    ├── Lee posiciones
    ├── Lee historial
    ├── Exporta snapshots
    ├── Exporta velas cerradas
    ├── Exporta eventos
    └── Lee comandos futuros si están habilitados

Carpeta compartida / SQLite / CSV
└── Contrato de intercambio

Mapazapp App
├── Importa datos del bridge
├── Guarda histórico propio
├── Corre scanner live
├── Muestra dashboard
├── Gestiona journal
├── Controla riesgo
├── Controla reglas de fondeo
└── En el futuro prepara comandos
```

---

# 2. Principio

El bot externo no debe adivinar datos.

Si una pantalla o módulo necesita un dato, ese dato debe estar en este contrato.

Regla:

> Todo dato que el bot use debe venir del BridgeEA, de configuración versionada o de resultados de backtest importados.

---

# 3. Nombre del EA puente

Nombre tentativo:

```text
MZP_BridgeEA_v1.mq5
```

Este EA NO es la estrategia.
Este EA NO decide entradas.
Este EA NO optimiza parámetros.

Función:

- Exportar información confiable desde MT5.
- Mantener actualizado el estado de mercado/cuenta.
- Preparar futura ejecución segura.
- Ser puente entre MT5 y app externa.

---

# 4. Formato de intercambio V1

## Decisión V1

Usar archivos CSV/JSON al inicio.

Motivo:

- Más simple de depurar.
- Fácil de revisar manualmente.
- Menos riesgo de locks de SQLite.
- Más fácil para Replit/Cursor al principio.

## Decisión V2

SQLite compartido o SQLite generado por el EA.

Motivo:

- Mejor para histórico grande.
- Mejor para consultas.
- Mejor para journal.
- MQL5 soporta SQLite nativo.

---

# 5. Carpeta compartida

Ruta conceptual:

```text
<MQL5_COMMON_FILES>/Mapazapp/
```

Subcarpetas:

```text
/market/
  candles/
  ticks/
  spreads/
  snapshots/

/account/
  snapshots/
  positions/
  orders/
  deals/

/events/
  bridge_status/
  errors/

/commands/
  inbound/
  outbound/
  archive/

/backtest/
  results/
  runs/
```

El uso exacto de `FILE_COMMON` se define en implementación MQL5.

---

# 6. Frecuencia de actualización

## Velas

Exportar principalmente al cierre de vela.

Recomendación:

```text
D1  => al cierre de vela o al iniciar
H4  => al cierre de vela
H1  => al cierre de vela
M15 => al cierre de vela
M5  => futuro opcional
```

## Snapshot de cuenta

```text
cada 5 a 15 segundos
```

No necesita cada tick.

## Posiciones abiertas

```text
cada 5 segundos
o cuando cambie cantidad/estado
```

## Spread

```text
cada 5 a 15 segundos
y también en cada señal/evento
```

## Tick

No exportar todos los ticks en V1.

Motivo:
- Mucho volumen.
- No lo necesitamos para estrategia M15.
- Complica performance.

---

# 7. Identificación de datos nuevos

Todo archivo exportado debe tener:

```text
export_id
exported_at_utc
source_terminal_id
source_account_login
symbol
timeframe
last_bar_time
schema_version
```

La app externa debe guardar `last_imported_key`.

Clave recomendada para velas:

```text
symbol + timeframe + candle_time
```

No insertar duplicados.

---

# 8. Versionado de schema

Cada archivo debe incluir:

```text
schema_version
```

Ejemplo:

```text
schema_version = MZP_BRIDGE_V1
```

Si cambia una columna, sube la versión.

---

# 9. Archivos del Bridge V1

## 9.1 bridge_status.json

Ubicación:

```text
/events/bridge_status/bridge_status.json
```

Propósito:
Saber si el EA está vivo y conectado.

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
  "symbols_enabled": ["XAUUSD", "EURUSD"],
  "errors_count": 0,
  "last_error": ""
}
```

Uso:
- Dashboard.
- Monitor de salud.
- Alertas si el bridge no actualiza.

---

## 9.2 candles_{symbol}_{timeframe}.csv

Ubicación:

```text
/market/candles/candles_XAUUSD_M15.csv
```

Campos obligatorios:

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

Reglas:

- Exportar solo velas cerradas para estrategia.
- `is_closed=true` para velas usadas por el scanner.
- La vela actual en formación puede exportarse en otro archivo opcional.

Clave única:

```text
symbol + timeframe + candle_time_utc
```

---

## 9.3 latest_market_snapshot.csv

Ubicación:

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

Uso:

- Saber precio actual.
- Calcular spread.
- Calcular lotaje futuro.
- Validar símbolo.
- Evitar inventar `point`, `digits`, `tick_value`.

---

## 9.4 account_snapshot.csv

Ubicación:

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

Uso:

- Risk Guard.
- Prop Firm Guard.
- Dashboard.
- Journal.
- Ejecución futura.

---

## 9.5 positions_open.csv

Ubicación:

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

Uso:

- Evitar duplicar operaciones.
- Saber exposición actual.
- Controlar si ya hay trade del bot.
- Journal.

---

## 9.6 orders_pending.csv

Ubicación:

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

Uso:

- Control de órdenes pendientes.
- Futuro modo ejecución asistida.

---

## 9.7 deals_history_incremental.csv

Ubicación:

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

Regla:

- Exportar incremental por `deal_ticket`.
- La app externa deduplica por `deal_ticket`.

Uso:

- Journal automático.
- Métricas reales.
- Comparar trades tomados vs señales.

---

## 9.8 bridge_errors.csv

Ubicación:

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

Uso:

- Diagnóstico.
- Alertas.
- Debug.

---

# 10. Archivos futuros de comandos

## 10.1 commands_inbound.json

Ubicación:

```text
/commands/inbound/commands_inbound.json
```

Uso futuro:
La app externa puede dejar comandos para el EA.

Ejemplo:

```json
{
  "schema_version": "MZP_COMMAND_V1",
  "command_id": "CMD_20260502_0001",
  "created_at_utc": "2026-05-02T15:10:00Z",
  "expires_at_utc": "2026-05-02T15:11:00Z",
  "command_type": "PREPARE_ORDER",
  "symbol": "XAUUSD",
  "strategy_id": "MZP_IFVG_ZONE_REACTION_V1",
  "parameter_set_id": "MZP_IFVG_XAUUSD_V1_SET_003",
  "direction": "BUY",
  "volume": 0.10,
  "entry_type": "MARKET",
  "sl": 2318.50,
  "tp": 2328.50,
  "risk_percent": 0.50,
  "requires_manual_confirm": true,
  "risk_guard_approved": true,
  "prop_guard_approved": true,
  "kill_switch_state": "OK"
}
```

V1:
No ejecutar comandos reales.
Solo diseñar el contrato.

---

## 10.2 commands_ack.csv

Ubicación:

```text
/commands/outbound/commands_ack.csv
```

Campos:

```text
schema_version
exported_at_utc
terminal_id
account_login
command_id
status
message
mt5_ticket
error_code
```

Estados:

```text
RECEIVED
REJECTED
EXPIRED
EXECUTED
FAILED
BLOCKED_BY_EA
```

---

# 11. Magic numbers y comentarios

Todos los trades futuros del sistema deben tener:

```text
magic
comment
strategy_id
parameter_set_id
source_tag
```

Formato comentario:

```text
MZP|IFVG|XAUUSD|SET_003|ZONE_123
```

Uso:

- Identificar operaciones del bot.
- Separar manual vs bot.
- Journal automático.
- Evitar mezclar estrategias.

---

# 12. Datos que el bot externo NO debe inventar

El bot externo no debe inventar:

- digits.
- point.
- tick_size.
- tick_value.
- contract_size.
- spread.
- account balance.
- equity.
- margin.
- open positions.
- open orders.
- broker symbol name.
- minimum lot.
- lot step.
- trade mode.
- session status.

Todo eso debe venir de MT5 Bridge o config validada.

---

# 13. Datos que sí son configuración del bot

Estos datos no vienen de MT5 directamente:

- strategy_id.
- parameter_set_id.
- risk_per_trade.
- max_daily_loss_internal.
- prop firm profile.
- news blackout.
- min_score_trade.
- allowed_sessions.
- approved_symbols.
- psychological locks.
- dashboard preferences.

Deben vivir en la app externa y estar versionados.

---

# 14. Modo de escritura recomendado V1

Para evitar archivos corruptos:

1. EA escribe archivo temporal.
2. EA cierra archivo.
3. EA renombra/reemplaza archivo final.
4. App externa lee solo archivo final.

Ejemplo:

```text
latest_market_snapshot.tmp
latest_market_snapshot.csv
```

Regla:
La app externa nunca lee `.tmp`.

---

# 15. Control de duplicados

La app externa debe deduplicar por:

## Velas

```text
symbol + timeframe + candle_time_utc
```

## Deals

```text
deal_ticket
```

## Positions

```text
position_ticket
```

## Orders

```text
order_ticket
```

## Events

```text
event_id
```

---

# 16. Latencia esperada

V1 no es scalping de ticks.

Latencia aceptable:

```text
market snapshot: 5-15 segundos
candles: al cierre de vela
positions/orders: 5 segundos
account: 5-15 segundos
```

Si más adelante usamos M5 o ejecución asistida:
- Se puede bajar frecuencia.
- Pero no usar 30 segundos/tick en V1.

---

# 17. Health check

La app externa debe considerar bridge caído si:

```text
now_utc - bridge_status.exported_at_utc > 60 segundos
```

Estado:

```text
BRIDGE_OK
BRIDGE_STALE
BRIDGE_DOWN
MT5_DISCONNECTED
ACCOUNT_NOT_TRADE_ALLOWED
```

---

# 18. Flujo de importación del bot externo

```text
1. Leer bridge_status.json
2. Validar schema_version
3. Validar terminal/account esperado
4. Leer snapshots de cuenta/mercado
5. Importar velas nuevas
6. Deduplicar
7. Guardar en DB propia
8. Actualizar scanner
9. Actualizar dashboard
10. Registrar errores
```

---

# 19. SQLite V2

En V2 se puede pasar a SQLite.

Tablas sugeridas:

```text
bridge_status
market_snapshots
candles
account_snapshots
positions_open
orders_pending
deals_history
bridge_errors
commands_inbound
commands_ack
```

Ventaja:
- Mejor consulta.
- Mejor integridad.
- Mejor histórico.
- Menos archivos sueltos.

Cuidado:
- Locks de lectura/escritura.
- Performance si se escribe cada tick.
- Necesidad de transacciones.

---

# 20. Reglas para Replit/Cursor

Replit/Cursor no deben crear campos porque “parecen útiles”.

Si necesitan un campo nuevo:

1. Se agrega al contrato.
2. Se versiona schema.
3. Se define fuente.
4. Se define frecuencia.
5. Se define deduplicación.
6. Se define uso.

---

# 21. Lo que debe implementar primero el BridgeEA

Prioridad V1:

## Fase Bridge 1

- bridge_status.json
- latest_market_snapshot.csv
- account_snapshot.csv
- candles_XAUUSD_M15.csv
- candles_XAUUSD_H1.csv
- candles_XAUUSD_H4.csv
- positions_open.csv
- deals_history_incremental.csv
- bridge_errors.csv

## Fase Bridge 2

- orders_pending.csv
- multiple symbols.
- D1.
- commands_inbound/ack solo simulados.

## Fase Bridge 3

- SQLite.
- ejecución asistida.
- control de comandos.
- kill switch.

---

# 22. Criterios de aceptación del Bridge V1

El bridge está bien si:

- Exporta archivos con schema correcto.
- No duplica velas.
- No bloquea MT5.
- No genera archivos corruptos.
- Actualiza bridge_status.
- Exporta cuenta y mercado.
- Exporta historial incremental.
- App externa puede leer sin inventar campos.
- Se puede diagnosticar error.
- Funciona varias horas sin intervención.

---

# 23. Próximo documento

Después de este contrato, crear:

`Mapazapp_BridgeEA_Build_Spec_V1.md`

Ese documento debe decirle a Cursor/MQL5:

- Cómo implementar el BridgeEA.
- Qué funciones usar.
- Cómo escribir archivos.
- Cómo manejar errores.
- Cómo detectar nueva vela.
- Cómo exportar múltiple timeframe.
- Cómo preparar comandos futuros sin ejecutar todavía.

Luego sí:

`Mapazapp_Replit_Dashboard_Mock_Spec_V1.md`

---

# 24. Regla final

El dashboard, el scanner, el journal y el Risk Guard solo pueden usar datos que estén en este contrato o en configuración versionada.

Si no está en el contrato, no existe para el software.
