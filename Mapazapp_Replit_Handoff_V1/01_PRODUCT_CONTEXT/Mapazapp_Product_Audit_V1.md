# Mapazapp — Product Audit V1
Fecha: 2026-05-02

## Resumen ejecutivo

Mapazapp no debe ser un simple bot de señales.

Debe ser un sistema de trading asistido con:
- Motor de mercado.
- Zonas y contexto.
- Backtesting en MT5.
- Perfiles por símbolo.
- Control de riesgo.
- Reglas de fondeo.
- Journal automático.
- Psicología operativa.
- Dashboard claro.
- Ejecución asistida futura.

El producto debe ayudar al trader a operar mejor y a no operar cuando no corresponde.

---

## Auditoría como programador

### Lo correcto

Arquitectura híbrida:
- MT5: EA puente + EA testeable.
- App externa: cerebro, dashboard, configuración, journal y análisis.
- Replit: prototipo visual/base inicial.
- Cursor: implementación seria y mantenible.

### Lo que NO debe pasar

No pedirle a Cursor/Replit:
- “Diseñá una estrategia rentable.”
- “Inventá la lógica.”
- “Calculá vos qué conviene.”
- “Optimizá cualquier cosa hasta que gane.”

La estrategia debe estar escrita antes.

### Módulos mínimos

- Data import.
- Strategy engine.
- Zone engine.
- Score engine.
- Risk guard.
- Prop firm guard.
- Journal engine.
- Backtest result importer.
- Dashboard.
- Alert engine.

---

## Auditoría como tester

El bot debe poder probarse.

Pruebas mínimas:
- Cálculo de zonas.
- Cálculo de score.
- Spread máximo.
- Conversión pips/puntos/precio por símbolo.
- ATR por timeframe.
- Invalidez de zona.
- Reglas de bloqueo.
- Reglas de noticias.
- Importación MT5.
- No duplicación de trades.
- Journal automático.
- Configuración por símbolo.
- Backtest output parser.

Pregunta clave del tester:

> ¿El bot hace exactamente lo que definimos?

No alcanza con que “parezca inteligente”.

---

## Auditoría como trader profesional

Un trader necesita:

1. Saber si hoy conviene mirar compras, ventas o no operar.
2. Saber dónde están las zonas importantes.
3. Saber qué invalida la idea.
4. Saber si el riesgo vale la pena.
5. Saber si hay noticia cerca.
6. Saber si la cuenta permite operar.
7. Saber si ya operó demasiado.
8. Saber si está cumpliendo el plan.
9. Saber si ese setup funcionó históricamente en ese símbolo.
10. Saber cuándo frenar.

El bot debe decir “no operar” muchas veces.

Eso no es un defecto. Es parte de su valor.

---

## Auditoría como producto/empresa

Un producto serio para traders nuevos y avanzados debe tener dos capas.

### Vista simple

Lenguaje humano:
- “Hoy el oro está más comprador.”
- “El precio está llegando a zona de posible compra.”
- “Todavía no hay entrada clara.”
- “No operar: noticia cerca.”
- “No operar: riesgo diario comprometido.”

### Vista técnica

Detalle opcional:
- Timeframes.
- Zonas.
- ATR.
- Estructura.
- Liquidez.
- Confirmación.
- R:R.
- Score.
- Invalidez.

---

## Qué necesita cumplir para satisfacer expectativas

### Trader nuevo

Necesita:
- Qué hacer.
- Qué no hacer.
- Explicación simple.
- Protección contra errores.
- Evitar operar por ansiedad.

### Trader avanzado

Necesita:
- Métricas.
- Backtests.
- Ajustes por símbolo.
- Reglas auditables.
- Exportación/importación.
- Control fino.

### Dueño del producto

Necesita:
- Sistema confiable.
- Documentado.
- Testeable.
- Escalable.
- No basado en promesas falsas.
- No dependiente de una “caja negra”.

---

## Riesgos detectados

1. Querer meter demasiadas estrategias.
2. Hacer UI antes de motor.
3. Delegar lógica a Cursor.
4. Repetir backtester propio lento.
5. Usar pips fijos universales.
6. Optimizar demasiado.
7. Ignorar reglas de fondeo.
8. Ignorar psicología.
9. Permitir ejecución antes de validar.
10. Crear alertas ambiguas.

---

## Recomendación principal

Antes de código real:

1. Documentar estrategia.
2. Documentar perfiles por símbolo.
3. Documentar backtest MT5.
4. Crear prototipo Replit sin lógica inventada.
5. Implementar en Cursor con tests.
