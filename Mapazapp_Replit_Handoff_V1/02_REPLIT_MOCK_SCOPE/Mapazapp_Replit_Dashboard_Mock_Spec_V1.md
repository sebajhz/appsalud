# Mapazapp — Replit Dashboard Mock Spec V1
Fecha: 2026-05-02

## Estado

Spec separado.
No integrar todavía al MD maestro.

## Objetivo

Definir qué debe construir Replit como primer prototipo visual de Mapazapp.

Este mock NO implementa lógica real de trading.
Este mock NO se conecta todavía a MT5.
Este mock NO inventa estrategia.
Este mock usa datos simulados basados en los contratos ya definidos.

---

# 1. Documentos base que debe respetar

El mock debe respetar estos documentos:

1. `Mapazapp_MT5_Bridge_Connectivity_Contract_V1.md`
   - Define datos reales que vendrán de MT5 Bridge.

2. `Mapazapp_BridgeEA_Build_Spec_V1.md`
   - Define cómo se exportan mercado, cuenta, posiciones, deals y errores.

3. `Mapazapp_MT5_TestEA_Build_Spec_V1.md`
   - Define outputs del EA de backtesting: trades, eventos, no-trade, summary.

4. `Mapazapp_IFVG_Numerical_Detection_MT5_Backtest_Spec_V1.md`
   - Define estrategia IFVG/Zonas y estados.

5. `Mapazapp_Optimization_Matrix_Symbol_Parameter_Selection_V1.md`
   - Define parameter sets aprobados por símbolo.

---

# 2. Regla principal

Replit debe crear una experiencia visual clara.

No debe crear motor real.

No debe inventar:
- Campos.
- Estrategias.
- Indicadores.
- Fórmulas.
- Señales.
- Variables de MT5.
- Reglas de riesgo no documentadas.

Si un dato no existe en:
- Bridge contract,
- Backtest output,
- Configuración versionada,
- Mock dataset definido aquí,

entonces no se usa.

---

# 3. Objetivo del mock

El mock debe permitir ver cómo se sentirá el producto:

- Estado del mercado.
- Zonas de posible compra/venta.
- Alertas.
- Riesgo.
- Cuenta.
- Backtests.
- Journal.
- Configuración.
- Salud de conexión MT5.

Debe sentirse simple, profesional y entendible.

---

# 4. Stack sugerido para Replit

Recomendación:

```text
React + TypeScript
Tailwind CSS
Mock data en JSON/TS
Sin backend real en V1
```

Opcional:
- Vite.
- Componentes simples.
- Estado local.
- No usar dependencias pesadas innecesarias.

---

# 5. Pantallas del mock

## 5.1 Home / Estado del día

Objetivo:
Mostrar en 10 segundos qué está pasando.

Debe mostrar:

- Estado MT5 Bridge.
- Cuenta.
- Riesgo del día.
- Símbolo activo.
- Dirección del día.
- Zona activa.
- Acción recomendada.
- Alertas importantes.

Ejemplo simple:

```text
XAUUSD — Oro
Estado: posible compra en observación
Motivo: tomó liquidez abajo y dejó una zona invertida
Acción: esperar retesteo. No entrar todavía.
Riesgo disponible hoy: 0.50%
Bridge MT5: conectado
```

---

## 5.2 Mercado / Zonas

Objetivo:
Mostrar zonas detectadas.

Debe mostrar cards de zona:

- Symbol.
- Dirección: compra/venta.
- Tipo: IFVG bullish/bearish.
- Rango de precios.
- Estado.
- Score.
- Motivo simple.
- Motivo técnico opcional.
- Invalidez.
- Expira en.
- Acción.

Estados posibles:

```text
CREATED
WATCHING
RETESTING
CONFIRMED
TRADE_READY
INVALIDATED
EXPIRED
USED
```

Lenguaje simple:

- “Zona de posible compra”.
- “Esperar confirmación”.
- “Zona inválida”.
- “Setup listo para revisar”.
- “No operar”.

---

## 5.3 Detalle de zona

Al abrir una zona, mostrar:

- Rango.
- Dirección.
- IFVG origen.
- Sweep asociado.
- Score breakdown.
- Retesteo.
- Confirmación.
- SL estimado.
- TP estimado.
- R:R estimado.
- No-trade reasons.
- Estado de riesgo.

Ejemplo:

```text
Zona: XAUUSD_IFVG_001
Dirección: Compra
Rango: 2320.50 – 2324.80
Score: 82
Estado: TRADE_READY
Invalida si: cierre debajo de 2318.90
R:R estimado: 1.8
Acción: revisar manualmente
```

---

## 5.4 Risk Guard

Objetivo:
Mostrar si el trader puede operar.

Debe mostrar:

- Balance.
- Equity.
- Riesgo por trade.
- Riesgo usado hoy.
- Pérdida diaria permitida.
- Pérdida máxima.
- Trades tomados hoy.
- Max trades del día.
- Estado: habilitado/bloqueado.
- Motivo de bloqueo.

Ejemplo:

```text
Estado: habilitado
Riesgo permitido por trade: 0.50%
Riesgo restante hoy: 0.75%
Trades hoy: 1/2
```

Bloqueos posibles:

```text
DAILY_DRAWDOWN_NEAR
MAX_TRADES_REACHED
NEWS_BLACKOUT
PSYCHOLOGICAL_LOCK
SPREAD_TOO_HIGH
NO_APPROVED_PARAMETER_SET
```

---

## 5.5 Prop Firm Guard

Objetivo:
Mostrar reglas de fondeo.

Debe mostrar:

- Firma seleccionada.
- Tipo de challenge.
- Profit target.
- Daily drawdown.
- Max drawdown.
- Consistency rule.
- News restriction.
- Weekend restriction.
- Estado actual.
- Advertencias.

Ejemplo:

```text
Prop Firm: The5ers
Daily loss: OK
Max loss: OK
News rule: noticia USD en 45 min
Acción: no abrir operaciones cerca de noticia
```

---

## 5.6 Backtests

Objetivo:
Mostrar sets testeados y aprobados.

Debe mostrar tabla:

- parameter_set_id.
- strategy_id.
- symbol.
- status.
- train period.
- validation period.
- profit factor.
- expectancy R.
- drawdown.
- trades.
- winrate.
- robustness score.
- estado.

Estados:

```text
draft
tested_train
validated
approved_for_demo
approved_for_alerts
approved_for_assisted_execution
rejected
retired
```

Acciones mock:
- Ver detalle.
- Comparar sets.
- Marcar favorito visualmente.
- No habilitar live real.

---

## 5.7 Detalle de backtest

Debe mostrar:

- Inputs usados.
- Métricas.
- Score de robustez.
- Train vs validation.
- Trades por mes.
- Rachas perdedoras.
- Prop firm violations.
- Sensibilidad.
- Motivo de aprobación/rechazo.

Ejemplo:

```text
MZP_IFVG_XAUUSD_V1_SET_003
Profit factor train: 1.42
Profit factor validation: 1.22
Expectancy validation: 0.18R
Max drawdown: 3.8%
Estado: approved_for_demo
```

---

## 5.8 Journal

Objetivo:
Mostrar operaciones reales/importadas o mock.

Campos:

- trade_id.
- fecha.
- símbolo.
- dirección.
- estrategia.
- parameter_set_id.
- zona.
- score.
- resultado en R.
- resultado dinero.
- emoción.
- cumplimiento.
- comentario.
- lección.

Debe permitir filtros mock:

- Por símbolo.
- Por estrategia.
- Por resultado.
- Por emoción.
- Por cumplimiento.

---

## 5.9 Psicología / Control

Objetivo:
Mostrar reglas anti-revancha y disciplina.

Debe mostrar:

- Estado emocional declarado.
- Última pérdida.
- Racha.
- Bloqueos activos.
- Checklist antes de operar.
- Recordatorio de plan.

Checklist:

```text
¿Hay zona válida?
¿Hay confirmación?
¿El R:R sirve?
¿Estoy dentro del riesgo?
¿Hay noticia?
¿Estoy entrando por plan?
```

---

## 5.10 Alertas

Objetivo:
Mostrar alertas del sistema.

Tipos:

```text
MARKET_CONTEXT
ZONE_CREATED
ZONE_RETESTING
SETUP_CONFIRMED
TRADE_READY
NO_TRADE
RISK_BLOCK
BRIDGE_DOWN
NEWS_WARNING
BACKTEST_APPROVED
```

Ejemplos:

```text
XAUUSD: zona de posible compra creada.
XAUUSD: precio volvió a zona, falta confirmación.
XAUUSD: setup listo para revisar. Score 82.
No operar: spread alto.
MT5 Bridge no actualiza hace 90 segundos.
```

---

## 5.11 Configuración

Objetivo:
Mostrar que todo se configura sin tocar código.

Secciones:

- Símbolos.
- Estrategias.
- Parameter sets.
- Riesgo.
- Prop firm.
- Noticias.
- Dashboard.
- Bridge MT5.

No debe guardar real todavía si es mock.
Pero la UI debe mostrar cómo sería.

---

## 5.12 MT5 Bridge Health

Objetivo:
Mostrar salud de conexión.

Debe mostrar:

- Bridge status.
- Última actualización.
- Terminal ID.
- Cuenta.
- Broker/server.
- Símbolos habilitados.
- Último tick.
- Errores.
- Estado: OK / STALE / DOWN.

Ejemplo:

```text
Bridge: OK
Última actualización: hace 4s
Cuenta: 123456
Servidor: Broker-Server
Símbolos: XAUUSD
Errores: 0
```

---

# 6. Layout recomendado

## Desktop

```text
Sidebar izquierda
Top bar
Main content
Right panel opcional para alertas/riesgo
```

Sidebar:

- Inicio.
- Mercado.
- Backtests.
- Journal.
- Riesgo.
- Prop Firm.
- Alertas.
- Configuración.
- MT5 Bridge.

## Mobile

No prioridad V1, pero debe ser responsive básico.

---

# 7. Estilo visual

Queremos:

- Profesional.
- Claro.
- No saturado.
- Colores útiles, no decorativos.
- Cards grandes.
- Textos simples.
- Estados visibles.

Evitar:

- Pantallas cargadas.
- Mucho texto técnico.
- Gráficos innecesarios.
- Promesas de ganancias.
- “Comprar ahora” como botón principal.

---

# 8. Lenguaje de producto

Usar lenguaje simple.

## Bueno

```text
Hoy el oro está más comprador.
Hay zona de posible compra.
Esperar confirmación.
No operar: noticia cerca.
Riesgo diario casi alcanzado.
```

## Evitar como texto principal

```text
Bullish IFVG mitigation after MSS with sellside liquidity sweep.
```

Eso puede ir en detalle técnico opcional.

---

# 9. Mock data requerido

Crear archivo:

```text
src/mock/bridgeStatus.ts
src/mock/marketSnapshots.ts
src/mock/zones.ts
src/mock/account.ts
src/mock/positions.ts
src/mock/backtests.ts
src/mock/journal.ts
src/mock/alerts.ts
src/mock/config.ts
```

---

# 10. Mock data — bridgeStatus

Ejemplo:

```ts
export const bridgeStatus = {
  schema_version: "MZP_BRIDGE_V1",
  exported_at_utc: "2026-05-02T15:00:00Z",
  terminal_id: "MT5_TERMINAL_001",
  account_login: 123456,
  account_server: "Broker-Server",
  account_currency: "USD",
  bridge_version: "MZP_BridgeEA_v1",
  ea_status: "RUNNING",
  auto_trading_enabled: false,
  connected: true,
  last_tick_time_utc: "2026-05-02T14:59:59Z",
  symbols_enabled: ["XAUUSD"],
  errors_count: 0,
  last_error: ""
};
```

---

# 11. Mock data — zone

Ejemplo:

```ts
export const zones = [
  {
    zone_id: "XAUUSD_IFVG_20260502_001",
    symbol: "XAUUSD",
    strategy_id: "MZP_IFVG_ZONE_REACTION_V1",
    parameter_set_id: "MZP_IFVG_XAUUSD_V1_SET_003",
    direction: "BUY",
    type: "IFVG_BULLISH",
    price_from: 2320.50,
    price_to: 2324.80,
    midpoint: 2322.65,
    status: "WATCHING",
    score: 68,
    invalidation_price: 2318.90,
    reason_simple: "Zona de posible compra después de tomar liquidez inferior.",
    reason_technical: "Bearish FVG invalidated upside + lower sweep + H4 non-bearish.",
    created_at_utc: "2026-05-02T14:30:00Z",
    expires_at_utc: "2026-05-02T18:30:00Z",
    action: "WAIT_CONFIRMATION"
  }
];
```

---

# 12. Mock data — account

Ejemplo:

```ts
export const accountSnapshot = {
  schema_version: "MZP_BRIDGE_V1",
  exported_at_utc: "2026-05-02T15:00:00Z",
  account_login: 123456,
  currency: "USD",
  balance: 10000,
  equity: 10035,
  margin: 100,
  free_margin: 9935,
  margin_level: 10035,
  profit_open: 35,
  trade_allowed: true,
  trade_expert: false
};
```

---

# 13. Mock data — backtest set

Ejemplo:

```ts
export const parameterSets = [
  {
    parameter_set_id: "MZP_IFVG_XAUUSD_V1_SET_003",
    strategy_id: "MZP_IFVG_ZONE_REACTION_V1",
    symbol: "XAUUSD",
    status: "approved_for_demo",
    trained_on: "2023-01-01_to_2024-12-31",
    validated_on: "2025-01-01_to_2025-12-31",
    profit_factor_train: 1.42,
    profit_factor_validation: 1.22,
    expectancy_R_validation: 0.18,
    max_drawdown_pct: 3.8,
    trades_validation: 46,
    robustness_score: 78
  }
];
```

---

# 14. Mock data — alert

Ejemplo:

```ts
export const alerts = [
  {
    alert_id: "ALERT_001",
    created_at_utc: "2026-05-02T15:01:00Z",
    type: "ZONE_CREATED",
    severity: "INFO",
    symbol: "XAUUSD",
    title: "Zona de posible compra detectada",
    message: "Oro tomó liquidez abajo y dejó una zona invertida. Esperar retesteo.",
    action: "WAIT"
  }
];
```

---

# 15. Componentes sugeridos

```text
AppShell
Sidebar
TopStatusBar
BridgeHealthCard
MarketStateCard
ZoneCard
ZoneDetailPanel
RiskGuardCard
PropFirmCard
BacktestTable
BacktestDetailCard
JournalTable
AlertList
ConfigPanel
SimpleTechnicalToggle
StatusBadge
ScoreBadge
NoTradeReasonBadge
```

---

# 16. Estados visuales

## Zona

```text
WATCHING       => observar
RETESTING      => atención
CONFIRMED      => confirmada
TRADE_READY    => revisar operación
INVALIDATED    => inválida
EXPIRED        => vencida
USED           => usada
```

## Riesgo

```text
OK
WARNING
BLOCKED
```

## Bridge

```text
BRIDGE_OK
BRIDGE_STALE
BRIDGE_DOWN
MT5_DISCONNECTED
```

---

# 17. Interacciones mock permitidas

Permitido:

- Cambiar de símbolo mock.
- Abrir detalle de zona.
- Alternar vista simple/técnica.
- Filtrar journal.
- Filtrar backtests.
- Simular bridge down.
- Simular risk blocked.
- Cambiar theme claro/oscuro si es fácil.

No permitido:

- Ejecutar trade real.
- Conectar MT5 real.
- Cambiar estrategia real.
- Guardar configuración real.
- Inventar cálculos.

---

# 18. Home page mínima

La pantalla inicial debe mostrar:

1. Bridge Health.
2. Account/Risk summary.
3. Market state.
4. Active zones.
5. Latest alerts.
6. Backtest approved set active.

Ejemplo de orden:

```text
[Bridge OK] [Risk OK] [XAUUSD active set approved]
[Market State Card]
[Active Zone Card]
[Risk Guard Card]
[Latest Alerts]
```

---

# 19. Criterios de aceptación Replit

El mock está bien si:

- Se entiende sin explicar demasiado.
- Usa datos mock definidos.
- No inventa campos fuera del contrato.
- Tiene pantallas principales.
- Se ve profesional.
- Diferencia vista simple y técnica.
- Muestra zonas y estados.
- Muestra riesgo y bridge.
- Muestra backtests/sets.
- Puede pasarse a Cursor para implementación real.

---

# 20. Qué debe entregar Replit

Entregables:

```text
React app funcional
README.md
mock data
estructura de componentes
sin integración real MT5
sin ejecución de trades
```

README debe explicar:

- Cómo correr.
- Qué pantallas hay.
- Dónde están mocks.
- Qué cosas están simuladas.
- Qué NO está implementado.

---

# 21. Prompt sugerido para Replit

Usar este prompt como base:

```text
Build a React + TypeScript + Tailwind dashboard mock for a trading assistant called Mapazapp.

Important:
This is only a visual/product prototype. Do not implement real trading logic. Do not connect to MT5. Do not invent strategy calculations. Use mock data only.

The product monitors MT5 through a Bridge EA contract and displays:
- MT5 Bridge health
- Account/risk state
- Active market zones
- IFVG strategy candidate zones
- Prop firm guard
- Backtest parameter sets
- Journal
- Alerts
- Configuration mock

Use simple language for the main UI and optional technical detail panels.

Use these statuses:
Zone: CREATED, WATCHING, RETESTING, CONFIRMED, TRADE_READY, INVALIDATED, EXPIRED, USED.
Risk: OK, WARNING, BLOCKED.
Bridge: BRIDGE_OK, BRIDGE_STALE, BRIDGE_DOWN.

Create mock data files for bridge status, market snapshots, zones, account, backtests, journal, alerts and config.

Do not add fields that are not in the provided spec.
Do not add execution buttons except disabled/coming soon states.
```

---

# 22. Regla final

El mock es para validar experiencia y flujo.

No valida estrategia.
No valida rentabilidad.
No valida ejecución.

Solo nos ayuda a ver si el software será entendible y útil antes de implementar el motor real.
