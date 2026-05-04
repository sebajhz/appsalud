# Mapazapp — Trader Research Integration Plan V1
Fecha: 2026-05-02

## Estado

Research separado.
No integrar todavía al MD maestro.

Este documento resume cómo vamos a estudiar a Fede Esses y otros traders sin copiar literalmente, transformando ideas en lógica propia, testeable y programable.

---

## 1. Principio

No copiamos una estrategia.

Extraemos patrones útiles, los convertimos a reglas propias y los probamos.

La pregunta no es:

> “¿Fede tiene razón?”

La pregunta correcta es:

> “¿Qué parte de lo que él enseña se puede convertir en reglas medibles, y si lo probamos en MT5, aporta edge real para nuestro bot?”

---

## 2. Qué parece rescatable de Fede Esses

De fuentes públicas, su enfoque se centra en:

- ICT / SMC.
- IFVG.
- Daily Bias.
- Liquidity Sweep.
- Fair Value Gap.
- Order Block.
- Inducement.
- Discount / Premium.
- SMT.
- Manipulaciones de liquidez.
- MMXM.
- Risk management.
- Psicotrading.
- Trading plan.
- Fondeo.
- Sesión Nueva York.
- NQ / ES principalmente, aunque también menciona forex.

Esto no prueba rentabilidad, pero sí nos da un mapa claro de conceptos para investigar.

---

## 3. Qué NO vamos a tomar directamente

No vamos a tomar como verdad:

- Claims de +80% winrate.
- Retiros declarados.
- Resultados de alumnos.
- “Comunidad rentable”.
- “Modelo perfecto”.
- “La mejor estrategia”.

Todo eso puede ser marketing si no hay track record auditado.

Lo que sí podemos hacer:

- Convertir IFVG en fórmula.
- Convertir Daily Bias en fórmula.
- Convertir Liquidity Sweep en fórmula.
- Convertir retesteo en zona programable.
- Convertir invalidez en regla.
- Testearlo en MT5.

---

## 4. Cómo lo transformamos en algo nuestro

### 4.1 No copiar nombre

No usar “Estrategia Fede Esses”.

Nombre interno posible:

`MZP IFVG Liquidity Reversal V1`

O:

`Querly IFVG Zone Model V1`

---

### 4.2 No copiar ejecución discrecional

No queremos que el bot diga:

> “Fede acá entraría.”

Queremos que diga:

> “Se cumplen las condiciones definidas para una zona IFVG con liquidez tomada, confirmación y riesgo aceptable.”

---

### 4.3 No copiar mercado

Fede parece usar mucho NQ/ES.
Nosotros empezamos con XAUUSD.

Eso significa:

- No asumir mismos horarios.
- No asumir misma volatilidad.
- No asumir mismos stops.
- No asumir mismo número de trades.
- No asumir misma efectividad.

Todo se adapta por símbolo.

---

## 5. Componentes que podemos convertir a motor

### 5.1 Daily Bias

Debe responder:

- Hoy buscar compras.
- Hoy buscar ventas.
- Hoy neutral/no operar.

Posibles reglas:
- Draw on liquidity: objetivo probable hacia liquidez de compra/venta.
- Dirección D1/H4.
- Rango diario anterior.
- Precio respecto a apertura diaria.
- Precio respecto a zonas premium/discount.
- Si está en rango, evitar operar en el medio.

---

### 5.2 Liquidity Sweep

Debe detectar:

- Barrida de máximo/mínimo relevante.
- Vela que toma liquidez.
- Cierre de vuelta dentro del rango o rechazo.
- Tolerancia por ATR/spread.

---

### 5.3 IFVG

Debe detectar:

- FVG inicial.
- FVG invalidado.
- Inversión de la zona.
- Retesteo de la zona invertida.
- Confirmación dentro o cerca de la zona.

---

### 5.4 Confirmación

No entrar solo porque existe IFVG.

Confirmación mínima posible:
- Retesteo de IFVG.
- Rechazo.
- Cierre en dirección esperada.
- R:R mínimo.
- SL lógico.
- Sin noticia.
- Spread aceptable.

---

### 5.5 Invalidez

Cada idea debe morir si:

- Precio atraviesa zona con cierre fuerte.
- R:R deja de servir.
- Contexto cambia.
- Noticia bloquea.
- Setup expira.
- Se rompe límite de riesgo.

---

## 6. Factores comunes entre traders rentables / enfoques serios

A partir de Fede, ICT/SMC, TTrades/Arjo/otros contenidos públicos y libros de psicología/riesgo, los factores comunes parecen ser:

1. Contexto de marco alto antes de entrada.
2. No operar en cualquier parte del gráfico.
3. Zonas, no puntos exactos.
4. Esperar confirmación.
5. Tener invalidez clara.
6. Medir el riesgo antes de entrar.
7. No operar todos los setups.
8. Filtrar por sesión.
9. Evitar noticias si la regla lo exige.
10. Registrar operaciones.
11. Pensar en probabilidades, no certezas.
12. Medir en R, no en dinero.
13. Controlar posición y drawdown.
14. Tener reglas psicológicas.
15. Testear antes de confiar.

Estos puntos sí van al ADN del bot.

---

## 7. Investigación de otros traders / enfoques

### 7.1 ICT / SMC general

Conceptos comunes:
- Liquidity.
- FVG.
- Market structure.
- Premium/discount.
- Displacement.
- Order blocks.
- Daily bias.

Uso para nosotros:
- Extraer reglas programables.
- Evitar subjetividad.
- No meter todos los conceptos a la vez.

---

### 7.2 TTrades / Arjo / educación ICT pública

Conceptos comunes:
- Daily bias simplificado.
- FVG.
- Liquidity sweep.
- Confirmación.
- Modelos repetibles.
- Fractalidad del mercado.

Uso para nosotros:
- Comparar cómo otros explican lo mismo.
- Detectar reglas que se repiten.
- Evitar depender de una sola fuente.

---

### 7.3 Trading clásico / baseline

Conceptos:
- Donchian breakout.
- ATR.
- Trend following.
- R-multiples.
- Position sizing.

Uso para nosotros:
- Crear benchmark objetivo.
- Si IFVG no supera un baseline simple, no se usa.

---

### 7.4 Psicología / riesgo

Autores/enfoques:
- Mark Douglas: pensar en probabilidades, aceptar incertidumbre.
- Van Tharp: position sizing, R-multiples, expectancy.
- Journal profesional: medir drawdown, expectancy, errores y comportamiento.

Uso para nosotros:
- Risk Guard.
- Psychology Guard.
- Journal automático.
- Bloqueos de sobreoperativa.

---

## 8. Propuesta de research loop

Para cada trader/estrategia:

1. Recolectar material público.
2. Separar marketing de conceptos.
3. Extraer conceptos repetibles.
4. Convertir a reglas.
5. Ver si sirve para zonas.
6. Ver si sirve para MT5 Strategy Tester.
7. Crear blueprint.
8. Backtest.
9. Comparar contra baseline.
10. Decidir: integrar, ajustar o descartar.

---

## 9. Qué NO se debe pedir a Replit/Cursor

No pedir:

- “Hacé una estrategia como Fede.”
- “Programá ICT.”
- “Detectá smart money.”
- “Calculá vos dónde entrar.”
- “Encontrá el mejor setup.”

Pedir:

- “Implementá IFVG según esta fórmula.”
- “Implementá sweep según esta regla.”
- “Implementá retesteo según esta zona.”
- “Implementá score según estos pesos.”
- “Implementá invalidez según estas condiciones.”
- “Exportá resultados de MT5 con estos campos.”

---

## 10. Decisión actual

Sí estudiar Fede Esses / IFVG.

Sí estudiar otros traders y fuentes.

No integrar nada al MD maestro todavía.

Crear researchs separados y al final armar:

`Mapazapp_Strategy_Ideas_Globe_V1.md`

Ese archivo será el resumen final de:
- Qué rescatamos.
- Qué descartamos.
- Qué pasa al Strategy Blueprint.
- Qué se testea primero.

---

## 11. Próximos researchs sugeridos

1. Fede Esses / IFVG profundo.
2. ICT / SMC general.
3. TTrades / Arjo / daily bias.
4. XAUUSD SMC / Gold strategies.
5. Donchian ATR baseline.
6. Psicología y riesgo profesional.
7. Journal y métricas profesionales.

---

## 12. Fuentes públicas usadas en esta etapa

Fede Esses:
- https://www.youtube.com/@FedeEsses
- https://www.youtube.com/playlist?list=PL4hId-DTkHg5crb2xiVOxuaHTcMLbVOx4
- https://fedeessestrading.com/
- https://fedeessestrading.com/curso/curso-trading-completo
- https://www.essesfede.com/

IFVG / SMC:
- https://www.tradezella.com/strategies/ifvg-trading-model
- https://dailypriceaction.com/blog/smc-trading-strategy/
- https://www.photontradingfx.com/blog/what-is-the-smc-trading-strategy
- https://www.photontradingfx.com/blog/how-do-smart-money-concepts-work
- https://strategyquant.com/blog/understanding-smart-money-concepts-through-strategyquant-indicators/
- https://acy.com/en/market-news/education/confirmation-model-ob-fvg-liquidity-sweep-j-o-20251112-094218/

Psicología / riesgo:
- https://vantharpinstitute.com/van-tharp-teaches-position-sizing-strategies-and-risk-management/
- https://traderlion.com/trading-books/trading-in-the-zone/
