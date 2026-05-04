# Mapazapp — Document Map V1
Fecha: 2026-05-02

## Objetivo

Separar el proyecto en documentos chicos y versionados para que Replit, Cursor y MT5 reciban instrucciones claras, sin que ningún desarrollador o herramienta invente la estrategia.

**Nota (paquete V1 en disco):** las secciones siguientes describen una **taxonomía objetivo** de archivos; no todos los nombres citados existen todavía como `.md` separados. Para la lista de archivos **realmente incluidos** en este handoff, usar `Mapazapp_Replit_Handoff_V1/00_START_HERE/MANIFEST.md` (y los manifiestos en `00_START_HERE/` de la raíz del repo).

## Regla principal

La lógica de trading la definimos nosotros.

Replit/Cursor/MT5 implementan lo que está escrito.

No se les pide:
- Diseñar una estrategia rentable.
- Elegir qué señal sirve.
- Inventar reglas de entrada.
- Cambiar parámetros sin validación.
- Optimizar “a ciegas” hasta encontrar algo lindo.

Sí se les pide:
- Implementar cálculos definidos.
- Ejecutar tests definidos.
- Crear pantallas definidas.
- Exportar/importar datos definidos.
- Respetar arquitectura, riesgo y reglas.

---

## Archivos propuestos del proyecto

### 01 — Product Vision / Gobierno del proyecto

Archivo (nombre propuesto en el mapa original):
`Mapazapp_Guard_Product_Vision_V1.md`

**Alineación con este handoff V1:** el contenido de visión de producto y alcance entregado en el ZIP está en **`Mapazapp_V1.md`** (misma carpeta `01_PRODUCT_CONTEXT/`). No existe un archivo separado `Mapazapp_Guard_Product_Vision_V1.md` en el paquete.

Contiene:
- Qué problema resuelve.
- Para quién es.
- Qué no promete.
- Alcance del bot.
- Reglas de seguridad.
- Priorización 80/10/10.
- Roles de MT5, Replit y Cursor.

### 02 — Strategy Blueprint

Archivo:
`Mapazapp_Strategy_Blueprint_V1.md`

Contiene:
- Estrategia exacta.
- Modelo de mercado.
- Dirección del día.
- Zonas.
- Confirmación.
- Invalidación.
- Stop loss.
- Take profit.
- R:R.
- Parámetros por símbolo.
- Casos donde NO se opera.

Este es el documento más importante antes de programar el motor.

### 03 — Symbol Profiles

Archivo:
`Mapazapp_Symbol_Profiles_V1.md`

Contiene:
- Perfil XAUUSD.
- Perfil EURUSD.
- Perfil GBPUSD.
- Perfil NAS100.
- Perfil crypto si se habilita.
- Tolerancias por símbolo.
- ATR/volatilidad.
- Spread máximo.
- Sesiones relevantes.
- Parámetros testeables.

### 04 — MT5 Backtesting Spec

Archivo:
`Mapazapp_MT5_Backtesting_Spec_V1.md`

Contiene:
- Cómo se prueba la estrategia en MT5 Strategy Tester.
- Qué EA se usa para test.
- Qué inputs tiene.
- Qué métricas se exportan.
- Cómo se separa entrenamiento/validación.
- Cómo evitar sobreoptimización.
- Qué resultado mínimo aprueba un set.

### 05 — MT5 Bridge EA Spec

Archivo:
`Mapazapp_MT5_Bridge_EA_Spec_V1.md`

Contiene:
- Qué exporta MT5.
- CSV/JSON/SQLite.
- Velas.
- Cuenta.
- Posiciones.
- Historial.
- Spread.
- Estado de conexión.
- Cómo se prepara ejecución futura.

### 06 — Risk & Prop Firm Guard

Archivo:
`Mapazapp_Risk_PropFirm_Guard_V1.md`

Contiene:
- Drawdown diario.
- Drawdown máximo.
- Riesgo por trade.
- Máximo trades por día.
- Bloqueo por racha.
- Reglas The5ers.
- Reglas PropXP.
- News guard.
- Consistencia.

### 07 — Journal & Psychology

Archivo:
`Mapazapp_Journal_Psychology_V1.md`

Contiene:
- Journal automático desde MT5.
- Estado emocional.
- Reglas anti-revancha.
- Bloqueo por sobreoperativa.
- Lecciones por trade.
- Métricas de conducta.
- Reporte diario/semanal.

### 08 — Dashboard UX

Archivo:
`Mapazapp_Dashboard_UX_V1.md`

Contiene:
- Vista simple.
- Vista técnica.
- Qué ve un trader nuevo.
- Qué ve un trader avanzado.
- Alertas.
- Zonas.
- Estado del día.
- Riesgo disponible.
- Acciones permitidas.

### 09 — Replit Starter Spec

Archivo:
`Mapazapp_Replit_Starter_Spec_V1.md`

Contiene:
- Qué debe crear Replit primero.
- Mock dashboard.
- Gestión de configuración.
- Datos simulados.
- Sin lógica real inventada.
- Preparado para pasar a Cursor.

### 10 — Cursor Implementation Spec

Archivo:
`Mapazapp_Cursor_Implementation_Spec_V1.md`

Contiene:
- Estructura final de código.
- Módulos.
- Tests.
- Contratos.
- Validaciones.
- Roadmap de implementación.

---

## Flujo recomendado

1. Completar Product Vision.
2. Crear Strategy Blueprint.
3. Crear Symbol Profiles.
4. Crear MT5 Backtesting Spec.
5. Recién después pedir a Replit prototipo visual.
6. Luego pasar a Cursor para implementación seria.
7. Crear EA de backtest en MT5.
8. Crear Bridge EA.
9. Crear dashboard externo.
10. Unir todo con datos reales.

---

## Prioridad real

80%:
- Motor.
- Estrategia.
- Zonas.
- Backtesting.
- Validación por símbolo.

10%:
- Dashboard y forma de interpretar el mercado.

10%:
- Telegram, colores, detalles y extras.
