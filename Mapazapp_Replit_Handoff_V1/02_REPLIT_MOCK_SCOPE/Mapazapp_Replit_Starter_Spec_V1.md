# Mapazapp — Replit Starter Spec V1
Fecha: 2026-05-02

## Objetivo

Usar Replit para crear una base visual/prototipo funcional sin inventar lógica de trading.

Replit NO debe desarrollar la estrategia.
Replit debe crear la estructura inicial del producto.

---

## Qué debe construir Replit

### 1. Dashboard base

Pantallas:

- Inicio / Estado del día.
- Mercado.
- Zonas.
- Risk Guard.
- Journal.
- Backtests.
- Configuración.
- Prop Firm Rules.
- Alertas.

### 2. Datos simulados

Usar datos mock.

No conectarse todavía a MT5 real.

Ejemplos de datos:
- XAUUSD.
- Zona de posible compra.
- Score 72.
- Riesgo disponible 0.5%.
- Noticia en 2 horas.
- Estado: observar, no entrar.

### 3. Vista simple

Debe mostrar:

- Qué está pasando.
- Qué hacer ahora.
- Qué no hacer.
- Riesgo actual.
- Estado de cuenta.
- Estado de reglas de fondeo.

Ejemplo:
“Oro está cerca de una zona de posible compra. Todavía no hay entrada clara. Esperar confirmación.”

### 4. Vista técnica opcional

Debe mostrar:

- Timeframes.
- Zonas.
- Score.
- ATR.
- Spread.
- R:R.
- Invalidez.
- Motivos del score.

### 5. Configuración editable

Sin tocar código:
- Símbolos.
- Riesgo por trade.
- Riesgo diario.
- Score mínimo.
- Spread máximo.
- Ventana de noticias.
- Prop firm.
- Modo: alerta / preparar orden / ejecución desactivada.

### 6. Backtests UI

Pantalla para importar/ver resultados de MT5:
- Símbolo.
- Período.
- Parámetros.
- Net profit.
- Profit factor.
- Drawdown.
- Winrate.
- Trades.
- Estado: aprobado / rechazado / revisar.

### 7. Journal UI

Debe mostrar:
- Trades.
- Resultado.
- Setup.
- Score.
- Emoción.
- Cumplimiento.
- Comentarios.
- Lección.

---

## Qué NO debe hacer Replit

No debe:
- Inventar la estrategia.
- Crear señal real.
- Ejecutar órdenes.
- Conectarse a MT5 en V1.
- Calcular entradas reales.
- Optimizar parámetros.
- Decidir qué mercado operar.
- Escribir lógica de trading no documentada.

---

## Stack sugerido para Replit

Opción simple:
- React + TypeScript.
- Tailwind.
- Datos mock en JSON.
- Componentes limpios.

Opción backend mock:
- Node/FastAPI simple si hace falta.
- SQLite local solo como demo.

---

## Resultado esperado

Un prototipo que permita ver cómo se sentirá el producto:

- Claro.
- Simple.
- Profesional.
- Sin exceso de texto.
- Con vista simple y técnica.
- Preparado para que Cursor conecte lógica real después.

---

## Criterio de aceptación

Replit termina bien si:

- El dashboard se entiende sin saber programar.
- No inventó estrategia.
- La configuración se puede editar.
- Las zonas mock se ven claras.
- El riesgo se ve claro.
- El journal se ve útil.
- El prototipo se puede pasar a Cursor.
