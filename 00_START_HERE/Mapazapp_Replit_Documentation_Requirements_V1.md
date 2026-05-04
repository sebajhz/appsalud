# Mapazapp — Replit Documentation Requirements V1

## Objetivo

Replit debe documentar todo lo que construya para que luego Cursor pueda continuar el proyecto sin perder contexto.

El entregable de Replit no es solo código visual. También debe incluir documentación clara del mock, estructura, decisiones y pendientes.

---

# 1. Regla principal

Replit debe documentar:

- Qué construyó.
- Qué archivos creó.
- Qué datos son mock.
- Qué pantallas existen.
- Qué componentes existen.
- Qué queda pendiente.
- Qué NO implementó.
- Cómo Cursor debe continuar.

---

# 2. README obligatorio

Replit debe crear o actualizar:

```text
README.md
```

Debe incluir:

## 2.1 Nombre del proyecto

```text
Mapazapp
```

Aclaración:

```text
Previous working name: QuerlyTrader Guard.
Current product/project name: Mapazapp.
```

## 2.2 Propósito del mock

Explicar que es:

- Dashboard visual.
- Datos simulados.
- Sin MT5 real.
- Sin backend real.
- Sin trading real.
- Sin ejecución de órdenes.

## 2.3 Cómo correr el proyecto

Ejemplo:

```text
npm install
npm run dev
```

o lo que corresponda según stack.

## 2.4 Estructura de carpetas

Explicar carpetas como:

```text
src/components
src/pages
src/mock
src/types
src/utils
```

## 2.5 Pantallas implementadas

Listar:

- Home / Estado del día.
- Mercado / Zonas.
- Detalle de zona.
- Risk Guard.
- Prop Firm Guard.
- Backtests.
- Journal.
- Psicología / Control.
- Alertas.
- Configuración.
- MT5 Bridge Health.

## 2.6 Datos mock

Explicar cada archivo mock:

```text
bridgeStatus
account
zones
backtests
journal
alerts
config
```

## 2.7 Próximo paso para Cursor

Explicar cómo reemplazar mocks por APIs reales:

```text
GET /api/bridge/status
GET /api/account
GET /api/zones
GET /api/backtests
GET /api/journal
GET /api/alerts
GET /api/config
```

---

# 3. Archivo obligatorio de contexto para Cursor

Replit debe crear:

```text
docs/CURSOR_HANDOFF.md
```

Este archivo debe responder:

## 3.1 Qué quedó hecho

- Pantallas.
- Componentes.
- Mock data.
- Navegación.
- Estados visuales.

## 3.2 Qué NO quedó hecho

Debe decir explícitamente:

- No hay conexión real a MT5.
- No hay backend Python real.
- No hay SQLite real.
- No hay estrategia real.
- No hay backtesting real.
- No hay ejecución de órdenes.

## 3.3 Cómo conectar luego

Debe explicar:

- Dónde están los mock data.
- Qué componentes consumen esos datos.
- Qué tipos/interfaces se usan.
- Qué endpoints futuros se esperan.
- Qué partes deberían quedar iguales cuando Cursor conecte backend real.

## 3.4 Decisiones de UI

Debe documentar:

- Layout general.
- Sidebar.
- Cards.
- Estados.
- Colores/labels si aplica.
- Vista simple vs vista técnica.

## 3.5 Pendientes

Debe listar TODOs ordenados:

```text
TODO Backend
TODO MT5 Bridge
TODO Backtest Importer
TODO Real Scanner
TODO Risk Guard real
TODO Journal import
TODO API integration
```

---

# 4. Archivo obligatorio de datos mock

Replit debe crear:

```text
docs/MOCK_DATA_CONTRACT.md
```

Debe incluir:

- Qué archivos mock existen.
- Qué campos tiene cada entidad.
- De qué documento viene cada campo si aplica.
- Qué campos son inventados solo para UI.
- Qué campos deben reemplazarse por datos reales luego.

Regla:

Si Replit agrega un campo auxiliar para UI, debe marcarlo:

```text
ui_only: true
```

o documentarlo como campo visual, no como dato real del motor.

---

# 5. Archivo opcional de decisiones

Si Replit toma decisiones relevantes, crear:

```text
docs/DECISIONS.md
```

Ejemplo:

```text
- Se usó React + TypeScript + Tailwind.
- Se mantuvo mock data separado de componentes.
- Se creó toggle simple/técnico.
- No se agregó backend porque está fuera de scope.
```

---

# 6. Comentarios en código

Replit debe comentar solo donde ayude.

Ejemplos útiles:

```ts
// Mock only. Later Cursor should replace this with GET /api/zones.
```

```ts
// UI-only status label. Trading logic must come from backend/strategy engine later.
```

Evitar comentarios inútiles o excesivos.

---

# 7. Tipos/interfaces

Si usa TypeScript, Replit debe crear tipos claros:

```text
BridgeStatus
AccountSnapshot
Zone
BacktestParameterSet
JournalTrade
Alert
RiskState
```

Y debe documentar que esos tipos están basados en los contratos del handoff.

---

# 8. Prohibición importante

Replit no debe esconder lógica falsa dentro de componentes.

Ejemplo incorrecto:

```ts
const score = calculateScore(...)
```

Ejemplo correcto:

```ts
score: 82 // mock value from mock/zones.ts
```

El cálculo real de score se implementará después en Cursor/backend/strategy engine.

---

# 9. Entregable final esperado de Replit

Replit debe entregar:

```text
Mapazapp dashboard mock
README.md
docs/CURSOR_HANDOFF.md
docs/MOCK_DATA_CONTRACT.md
docs/DECISIONS.md opcional
src/mock/*
src/types/*
src/components/*
```

---

# 10. Regla final

El objetivo de la documentación es que Cursor pueda continuar sin preguntar:

- Qué es Mapazapp.
- Qué parte hizo Replit.
- Qué parte es mock.
- Qué parte falta.
- Qué datos son reales/futuros.
- Qué APIs debe conectar.
- Qué no debe tocar todavía.

Replit debe dejar el proyecto preparado para la siguiente fase, no solo visualmente, sino también documentalmente.
