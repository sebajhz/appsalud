# Mapazapp

> Previous working name: QuerlyTrader Guard. Current project/product name: Mapazapp. — Replit Handoff V1

## Objetivo del paquete

Este ZIP contiene la documentación limpia para entregar a Replit antes de pedirle que construya el primer mock visual de **Mapazapp**.

Replit debe usar estos documentos como contexto de producto y alcance.

## Dónde está el código y el workspace

- **Dashboard mock Mapazapp (fuente de verdad del front):** `APP/artifacts/mapazapp/` (raíz del repo = carpeta que contiene `00_START_HERE`, `APP`, `Mapazapp_Replit_Handoff_V1`).
- **Workspace pnpm:** carpeta `APP/` (instalar dependencias y ejecutar scripts desde ahí).
- **`APP/artifacts/mockup-sandbox/`:** no es el producto Mapazapp; ignorar salvo tareas de sandbox.
- **`APP/artifacts/api-server/`:** andamiaje Replit; ignorar hasta que el proyecto active backend real.
- **`old/`:** respaldo; no usar como fuente de verdad.

Para Cursor: **`00_START_HERE/CURSOR_NAVIGATION_NOTE.md`**.

## Regla principal

Replit **NO debe inventar lógica de trading**.

Replit debe construir un **mock visual** con datos simulados, respetando los campos y contratos definidos.

No debe:
- Conectarse a MT5 real.
- Ejecutar operaciones.
- Crear estrategia.
- Calcular señales reales.
- Inventar variables nuevas.
- Cambiar fórmulas.
- Crear inputs que no estén documentados.
- Agregar botones reales de compra/venta.

Sí debe:
- Crear una app visual clara.
- Usar datos mock.
- Mostrar estado de mercado, zonas, riesgo, backtests, journal y salud del bridge.
- Respetar los nombres de campos definidos en los contratos.
- Dejar el proyecto listo para que luego Cursor conecte lógica real.

---

## Orden de lectura recomendado para Replit

**Convención de rutas:** los paths siguientes son relativos a la carpeta **`Mapazapp_Replit_Handoff_V1/`** (el directorio padre de este `00_START_HERE`).

### 1. Leer primero

`02_REPLIT_MOCK_SCOPE/Mapazapp_Replit_Dashboard_Mock_Spec_V1.md`

Este es el documento principal para construir el mock.

### 2. Leer como apoyo visual/producto

`02_REPLIT_MOCK_SCOPE/Mapazapp_Replit_Starter_Spec_V1.md`

Define el alcance inicial de Replit.

### 3. Leer para entender qué datos puede usar

`03_MT5_BRIDGE_AND_DATA_CONTRACT/Mapazapp_MT5_Bridge_Connectivity_Contract_V1.md`

Este define qué datos existirán desde MT5 Bridge.

### 4. Leer para entender el producto

`01_PRODUCT_CONTEXT/Mapazapp_V1.md`  
`01_PRODUCT_CONTEXT/Mapazapp_Product_Audit_V1.md`

*(Nota: en versiones anteriores del manifiesto el archivo de producto se citaba como `Mapazapp_Guard_V1.md`; en el paquete actual el contenido corresponde a **`Mapazapp_V1.md`**.)*

### 5. Leer solo como referencia, no implementar todavía

`04_STRATEGY_AND_BACKTEST_REFERENCE/`  
`05_RESEARCH_REFERENCE/`

Estos documentos explican estrategia, research y backtesting, pero Replit no debe programar ese motor todavía.

---

## Qué debe construir Replit ahora

Un mock React + TypeScript + Tailwind con:

- Home / Estado del día.
- Mercado / Zonas.
- Detalle de zona.
- Risk Guard.
- Prop Firm Guard.
- Backtests.
- Detalle de backtest.
- Journal.
- Psicología / Control.
- Alertas.
- Configuración.
- MT5 Bridge Health.

Todo con datos mock.

---

## Fuente de datos del mock

Crear datos simulados basados en:

- bridge status.
- market snapshot.
- account snapshot.
- zones.
- parameter sets.
- journal trades.
- alerts.
- config.

Los nombres de campos deben salir del documento de mock y del contrato de bridge.

---

## Criterio de éxito

El mock está bien si:

- Se entiende rápido.
- Se ve profesional.
- Muestra zonas y estados.
- Muestra riesgo y reglas.
- Muestra salud MT5 Bridge.
- Muestra backtests y parameter sets.
- Diferencia vista simple y vista técnica.
- No inventa lógica de trading.
- No implementa ejecución real.

---

## Nota importante

Este paquete es para **prototipo visual**.

La implementación real del motor, MT5 Bridge, TestEA, backtesting e integración se hará después con Cursor/MQL5, usando los documentos técnicos de referencia.
