# Mapazapp — Fede Esses / IFVG Research D1 V1
Fecha: 2026-05-02

## Estado

Investigación inicial basada en material público encontrado online.

No se considera una validación de rentabilidad.
No encontramos track record auditado independiente en esta primera revisión.

La estrategia se toma como candidata porque:
- Tiene bastante material público.
- Está alineada con ICT/SMC.
- El propio material público de Fede Esses menciona IFVG como modelo principal.
- IFVG es un concepto que puede convertirse a reglas programables.
- Encaja con nuestro enfoque de zonas, no de precio exacto.

---

## 1. Qué se encontró sobre Fede Esses

Fuentes públicas revisadas muestran que su ecosistema se enfoca en:

- ICT / SMC.
- IFVG.
- Daily Bias.
- Liquidity Sweep.
- Fair Value Gap.
- Order Block.
- Inducement.
- Premium / Discount.
- SMT.
- Manipulaciones de liquidez.
- MMXM.
- Teoría Quarterly.
- Risk Management.
- Psicotrading.
- Trading Plan.
- Live trading.
- Fondeo.

También se encontró que su propio sitio promociona:
- “Aprende mi estrategia IFVG”.
- “+80% winrate” como claim comercial.
- Live trading diario.
- Daily Bias para NQ/ES.
- Modelo de entrada IFVG para futuros y forex.
- Sala en sesión de Nueva York.

Esto sirve como pista de estudio, no como prueba.

---

## 2. Qué NO podemos afirmar todavía

No podemos afirmar todavía:

- Que la estrategia sea rentable en nuestro entorno.
- Que el winrate publicitado sea replicable.
- Que funcione igual en XAUUSD, EURUSD, GBPUSD, NQ o ES.
- Que sea apta para MT5 sin adaptación.
- Que sea apta para prop firms sin filtros.
- Que funcione en todos los años o condiciones de mercado.

Para aceptarla necesitamos MT5 Strategy Tester + forward test.

---

## 3. Qué sí parece valioso para Mapazapp

El modelo IFVG parece valioso como módulo porque puede definirse de forma relativamente objetiva.

Un IFVG, de forma simple, es una zona de desequilibrio/FVG que falla y luego se invierte: lo que antes debía actuar como soporte/resistencia deja de hacerlo y pasa a funcionar como zona del lado contrario.

Eso encaja perfecto con nuestro enfoque:

- Zonas.
- Confirmación.
- Invalidez.
- Scoring.
- Backtest.
- No operar si no hay contexto.

---

## 4. Propuesta de módulo

Nombre:

`IFVG Liquidity Model V1`

No reemplaza todo el motor.
Se agrega como Strategy Module intercambiable.

```text
Mapazapp Core
└── Strategy Engine
    ├── Liquidity Zone Reaction V1
    ├── IFVG Liquidity Model V1
    └── Donchian ATR Baseline
```

---

## 5. Idea simple para usuario

El bot debería decir:

- “El precio tomó liquidez y cambió dirección.”
- “Se formó una zona invertida que puede funcionar como apoyo para compra.”
- “Esperar que el precio vuelva a esa zona.”
- “Si respeta la zona, puede haber entrada.”
- “Si rompe la zona, la idea queda inválida.”

---

## 6. Traducción técnica del modelo IFVG

### 6.1 Detectar FVG

FVG alcista:
- Se forma cuando hay un desequilibrio alcista entre 3 velas.
- La vela 3 no vuelve a cubrir completamente el rango de la vela 1.
- Queda una zona sin intercambio suficiente.

FVG bajista:
- Lo mismo, pero en dirección bajista.

### 6.2 Detectar invalidación

Un FVG se invalida si el precio atraviesa/cierra del otro lado de la zona.

### 6.3 Convertirlo en IFVG

Si un FVG alcista falla y el precio cierra por debajo, puede convertirse en zona bajista.

Si un FVG bajista falla y el precio cierra por encima, puede convertirse en zona alcista.

### 6.4 Entrada

La entrada no es en un punto exacto.

La entrada se evalúa cuando el precio vuelve a la zona IFVG.

Opciones:
- Entrada en retesteo de la zona.
- Entrada en 50% de la zona.
- Entrada solo con confirmación de vela.
- Entrada con confirmación + liquidity sweep previo.

### 6.5 Stop Loss

Para compra:
- Debajo del IFVG o debajo del swing/sweep que lo originó.
- Buffer por ATR/spread.

Para venta:
- Encima del IFVG o encima del swing/sweep.
- Buffer por ATR/spread.

### 6.6 Take Profit

Opciones:
- Liquidez opuesta.
- 1.5R.
- 2R.
- Parcial 1R y final en liquidez.

---

## 7. Condiciones de contexto

No usar IFVG aislado.

Se recomienda exigir al menos:

- Dirección de marco alto.
- Liquidity sweep o toma de liquidez.
- IFVG válido.
- Retesteo de zona.
- R:R mínimo.
- Spread aceptable.
- Sin noticia bloqueante.
- Riesgo disponible.

---

## 8. Variables para MT5 Strategy Tester

Inputs candidatos:

```text
direction_tf = D1/H4
zone_tf = H1/M15
confirmation_tf = M15
fvg_min_size_atr = 0.05 / 0.10 / 0.15
ifvg_break_mode = wick / close
ifvg_retest_mode = full_zone / midpoint / confirmation_candle
sweep_required = true / false
sweep_lookback = 5 / 10 / 20
sweep_tolerance_atr = 0.05 / 0.10 / 0.15
min_rr = 1.5 / 2.0
sl_buffer_atr = 0.10 / 0.15 / 0.25
max_spread_points = symbol_profile
session_filter = all_day / new_york / london
news_filter = off / manual / external
min_score_trade = 65 / 75 / 85
```

---

## 9. Scoring propuesto

Total 100:

- Dirección marco alto alineada: 20
- Liquidity sweep previo: 15
- IFVG claro y suficientemente grande: 20
- Retesteo limpio de zona: 15
- Confirmación de vela: 10
- R:R suficiente: 10
- Sin noticia/spread normal/riesgo permitido: 10

Clasificación:

- 80–100: setup fuerte.
- 65–79: setup válido con revisión.
- 45–64: observar.
- 0–44: no operar.

---

## 10. Ventajas para el bot

- Más programable que otros conceptos SMC.
- Trabaja con zonas.
- Tiene invalidación clara.
- Permite backtest.
- Permite explicar en lenguaje simple.
- Puede funcionar como módulo intercambiable.
- Encaja con MT5 Strategy Tester.

---

## 11. Riesgos

- Los FVG/IFVG pueden aparecer en exceso.
- Si no se filtra, el bot puede sobreoperar.
- Si se filtra demasiado, no opera nunca.
- Puede ser sensible al timeframe.
- Puede ser sensible a sesión.
- Puede ser sensible a spread.
- Puede sobreoptimizarse.
- El claim de winrate público no debe aceptarse como evidencia.

---

## 12. Decisión recomendada

Sí vale la pena investigar Fede Esses / IFVG.

Pero no como verdad final.
Debe entrar como:

`Strategy Candidate: IFVG Liquidity Model V1`

Y probarse contra:

`Donchian ATR Baseline`

Si IFVG no supera al baseline en robustez, drawdown, estabilidad y compatibilidad con fondeo, se descarta o queda como módulo secundario.

---

## 13. Próximo paso

Crear archivo:

`Mapazapp_IFVG_Strategy_Blueprint_V1.md`

Ese archivo debe definir con precisión:

1. Fórmula FVG.
2. Fórmula IFVG.
3. Cuándo se invalida.
4. Cuándo se retestea.
5. Qué confirma entrada.
6. Qué bloquea operación.
7. Parámetros por símbolo.
8. Inputs MT5.
9. Métricas mínimas.
10. Casos de no operar.

---

## Fuentes públicas revisadas

- Canal YouTube Fede Esses.
- Playlist “Estrategia IFVG - ICT x SMC”.
- Sitio oficial fedeessestrading.com.
- Página pública essesfede.com.
- Temario público del curso Fede Esses.
- Fuentes educativas sobre IFVG/ICT/FVG.
