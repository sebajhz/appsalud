# Mapazapp — Research Findings V1
Fecha: 2026-05-02

## Objetivo

Extraer aprendizajes de:
- Bots comerciales de MT5.
- Herramientas de journal.
- Reglas de prop firms.
- Contenido público de trading/SMC/ICT/YouTube.
- Documentación oficial de MT5/MQL5.

Importante:
No se asume que un youtuber, vendedor de EA o curso sea rentable solo porque lo diga.
La investigación sirve para detectar patrones útiles, riesgos y funciones que el producto debería tener.

---

## 1. Lo que se ve en bots comerciales MT5

### Patrones comunes

Muchos EAs comerciales se agrupan en:

- Grid.
- Martingala.
- Scalping M1/M5.
- XAUUSD-only.
- Trend following.
- Risk managers.
- Trade managers.
- Trailing stop tools.
- No-grid/no-martingale como argumento de venta.

### Aprendizaje útil

El mercado de EAs vende mucho:
- Automatización.
- Alta frecuencia.
- Recuperación de pérdidas.
- Grid/martingala.
- Scalping de oro.

Pero para fondeo, eso puede ser peligroso.

### Decisión para Mapazapp

Evitar como base:
- Martingala.
- Grid agresivo.
- Promediar pérdidas.
- Sin stop loss.
- Recuperación de pérdida aumentando lote.
- Scalping hiperfrecuente sin control.

Preferir:
- Pocas operaciones.
- Stop claro.
- Riesgo fijo.
- Zonas.
- Score.
- Filtro de noticias.
- Control de drawdown.
- Journal.

Fuentes revisadas:
- MQL5 Market: varios productos de grid, gold scalping, risk managers y trailing tools.
- Ejemplos públicos de EAs XAUUSD que venden “no martingale/no grid” como ventaja.
- Revisiones de EAs que advierten riesgo de grid/martingala y drawdown alto.

---

## 2. Lo que se ve en SMC/ICT/YouTube

### Patrones comunes

En contenido público de SMC/ICT aparecen repetidamente:

- Higher timeframe direction.
- Liquidity sweep.
- Market structure shift.
- Fair value gap / imbalance.
- Order block / POI.
- Previous day high/low.
- London/New York sessions.
- Entrada después de barrida + confirmación + retroceso.

### Aprendizaje útil

Esto encaja con nuestra idea, pero hay que convertirlo a reglas medibles.

No sirve programar conceptos subjetivos sin definición.

Ejemplo:
- “Tomó liquidez” debe tener fórmula.
- “Cambio de estructura” debe tener fórmula.
- “Zona importante” debe tener fórmula.
- “Confirmación” debe tener fórmula.
- “Invalidez” debe tener fórmula.

### Decisión para Mapazapp

Usar el enfoque como inspiración, pero no como religión.

La estrategia debe ser:

- Simple.
- Medible.
- Testeable.
- Por zonas.
- Configurable por símbolo.
- Validada en MT5 Strategy Tester.

---

## 3. Lo que se ve en herramientas de journal

Herramientas como TradeZella, TraderSync y Edgewonk destacan:

- Importación automática de trades.
- Reportes.
- Tags.
- Estado emocional.
- Replay/backtest.
- Análisis de comportamiento.
- Métricas por setup.
- Métricas por horario.
- Métricas por activo.
- Detección de errores repetidos.

### Decisión para Mapazapp

El journal no debe ser secundario.

Debe registrar:
- Trade.
- Setup.
- Zona.
- Score.
- Riesgo.
- Resultado en R.
- Estado emocional.
- Regla cumplida/incumplida.
- Si fue sugerido por el bot o manual.
- Si respetó fondeo.
- Captura/snapshot del contexto.

---

## 4. Lo que se ve en prop firms

### The5ers

Reglas públicas recientes revisadas:
- High Stakes con mínimo de días rentables.
- Objetivos por fase.
- Restricción de ejecución alrededor de noticias de alto impacto.
- Reglas de prácticas prohibidas.

### PropXP

Reglas públicas revisadas:
- Daily drawdown fijo basado en equity de inicio del día.
- Regla de consistencia del 40%.
- Reglas de noticias/weekend según tipo de cuenta/add-on.
- Inactividad 30 días.

### Decisión para Mapazapp

El bot debe tener Prop Firm Guard.

No basta con que una operación sea “buena”.
Debe ser operable dentro de las reglas de la firma.

El sistema debe bloquear o advertir:
- Riesgo diario alto.
- Consistencia en peligro.
- Noticia cerca.
- Inactividad.
- Exceso de trades.
- Drawdown máximo.
- Operación sin stop.
- Lote fuera de riesgo.

---

## 5. Lo que confirma documentación MT5/MQL5

### Backtesting

MT5 Strategy Tester permite probar y optimizar Expert Advisors antes de usarlos en cuenta real.
La optimización corre la estrategia con diferentes combinaciones de parámetros.

### Agentes

MT5 usa agentes locales y puede usar agentes remotos/cloud para paralelizar optimizaciones.

### MQL5

MQL5 es el lenguaje para EAs e indicadores de MT5.

### SQLite

MQL5 tiene funciones nativas de base de datos basadas en SQLite.

### Decisión para Mapazapp

- Backtesting principal en MT5.
- EA testeable para estrategia.
- Bridge EA dentro de MT5.
- App externa como cerebro, UI, journal y configuración.
- No crear backtester propio pesado en V1.

---

## 6. Conclusión de investigación

La mejor dirección no es vender “señales”.

La mejor dirección es construir:

- Motor de zonas.
- Motor de score.
- Backtest por símbolo en MT5.
- Control de riesgo.
- Prop Firm Guard.
- Journal psicológico.
- Dashboard simple.
- Ejecución asistida futura.

---

## Fuentes base consultadas

- MetaTrader 5 Strategy Optimization: https://www.metatrader5.com/en/terminal/help/algotrading/strategy_optimization
- MetaTrader 5 Strategy Testing: https://www.metatrader5.com/en/terminal/help/algotrading/testing
- MetaTester Agents: https://www.metatrader5.com/en/terminal/help/algotrading/metatester
- MQL5 Database / SQLite: https://www.mql5.com/en/docs/database
- MQL5 language: https://www.metaquotes.net/en/metatrader5/algorithmic-trading/mql5
- The5ers High Stakes rules: https://help.the5ers.com/what-are-the-general-rules-for-the-high-stakes-program/
- The5ers news trading: https://help.the5ers.com/is-news-trading-allowed-in-the-high-stakes-program/
- The5ers prohibited practices: https://help.the5ers.com/prohibited-trading-practices/
- PropXP rules: https://propxp.com/trading-rules/
- TradeZella: https://www.tradezella.com/
- TraderSync: https://tradersync.com/
- Edgewonk: https://edgewonk.com/
- ICT/SMC public examples: TradingView/TradeZella/YouTube public strategy explanations.
