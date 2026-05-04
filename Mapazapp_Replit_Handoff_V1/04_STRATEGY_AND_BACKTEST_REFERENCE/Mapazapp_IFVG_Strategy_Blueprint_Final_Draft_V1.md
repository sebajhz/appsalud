# Mapazapp — IFVG Strategy Blueprint (Final Draft) V1

**Nombre de estrategia candidata:** **Mapazapp IFVG Zone Reaction V1**  
**Versión del documento:** V1 (final draft)  
**Estado:** especificación para implementación futura (MT5 TestEA, scanner live, backend). **No** es código ejecutable.

**Alineación:** este blueprint consolida y ordena el contenido de referencia en `Mapazapp_IFVG_Numerical_Detection_MT5_Backtest_Spec_V1.md`, `Mapazapp_Optimization_Matrix_Symbol_Parameter_Selection_V1.md`, `Mapazapp_Symbol_Precision_Tick_Pip_Normalization_Addendum_V1.md`, y los contratos de bridge (`Mapazapp_MT5_Bridge_Connectivity_Contract_V1`, `Mapazapp_BridgeEA_Build_Spec_V1`). El mock del dashboard (`MOCK_DATA_CONTRACT`, `CURSOR_HANDOFF`) puede usar estados simplificados hasta que la UI se alinee con esta máquina de estados.

---

## 1. Purpose

Este documento es el **blueprint final draft** del núcleo (~80 %) del motor Mapazapp: **detección de setup**, **estrategia IFVG/zonas**, **backtest**, **validación de parameter sets** y **integración con riesgo y fondeo**.

Define *qué* debe calcularse y *en qué orden lógico*, para que:

- el **TestEA** en MT5 Strategy Tester exporte inputs, métricas y series coherentes con la matriz de optimización;
- el **scanner live** reutilice la misma semántica de estados y umbrales (con datos en tiempo real vía BridgeEA);
- el **backend** persista zonas, scores, `noTradeReason` y vínculos `accountId` + símbolo + parameter set sin asumir “un pip para todos”.

---

## 2. Core philosophy

Mapazapp **no** debe comportarse como un bot rígido de señal que predice **un único precio de entrada**.

Debe comportarse como **asistente de trader humano disciplinado**:

- leer **contexto** de mercado;
- detectar **comportamiento de liquidez** (barrido, casi-barrido, ruptura real vs reclamo);
- detectar **movimiento anormal / significativo** (displacement);
- detectar **zonas**, no puntos exactos;
- **esperar** retest y confirmación;
- **clasificar** la idea: observar, esperar, lista para operar o inválida;
- **respetar siempre** riesgo por cuenta, drawdown y reglas de la prop firm.

Principios técnicos transversales:

- **Sin predicción de precio exacto:** las salidas son zonas, buffers y estados.
- **Zonas en lugar de puntos:** entradas “área”, SL/TP derivados de estructura + buffers dinámicos.
- **Tolerancias dinámicas:** barrido, near-sweep, padding de zona y buffer de SL usan `max(ATR·factor, spread·factor, tick·mínimos)` por símbolo (ver addendum de normalización).
- **Normalización ATR / spread / tick:** toda distancia en precio debe referirse a datos MT5 del símbolo en esa cuenta (`tick_size`, `spread_price`, ATR en el TF correcto).
- **Calidad por score:** se ponderan contexto, liquidez, displacement, IFVG, retest, confirmación; el score **no** sustituye *hard gates* de riesgo ni de parameter set.
- **Hard risk gates:** sin perfil de símbolo, sin parameter set aprobado, con drawdown/spread/news bloqueados → no hay `TRADE_READY` aunque el score sea alto.
- **Testeable en MT5:** cada regla debe mapearse a inputs exportables y a logs reproducibles en Strategy Tester.

---

## 3. Buy model (flujo lógico)

Secuencia **lógica** (no todos los pasos son simultáneos; la máquina de estados gobierna transiciones):

1. **Contexto HTF:** el precio **no** está contradicho por el contexto de marco superior (ver sección 7).
2. **Liquidez vendedora:** el precio **barre** o **casi barre** liquidez del lado *sell-side* (swing high / pool vendedor), según tolerancias dinámicas.
3. **Recuperación:** tras el evento de liquidez, el precio muestra recuperación coherente con el guion de compra (no queda atrapado en invalidación inmediata).
4. **Displacement alcista:** aparece vela o secuencia con cuerpo/rango significativos en dirección alcista (sección 9).
5. **FVG bajista → IFVG alcista:** un **FVG bajista** previo queda **invalidado** al alza según `ifvg_break_mode` y buffer; pasa a **IFVG alcista** = posible **zona de compra** (sección 10).
6. **Construcción de zona:** se materializa `zone_low` / `zone_high` con padding dinámico (sección 11).
7. **Retest:** el precio **vuelve** a interactuar con la zona según `retest_mode` (sección 12); no se exige retest “pip-perfect”.
8. **Confirmación:** tras retest, confirmación alcista (sección 13).
9. **SL / TP / R:R:** SL por debajo de estructura + buffer dinámico; TP según modelo; R:R mínimo cumplido en **unidades normalizadas** (sección 14).
10. **Guards:** Risk Guard, Prop Firm Guard y **parameter set aprobado para esta cuenta** permiten la idea (sección 16).

Si cualquier *hard requirement* falla, el estado no puede ser `TRADE_READY`.

---

## 4. Sell model (flujo lógico)

Simétrico al modelo de compra:

1. Contexto HTF **no** contradice venta.
2. Barrido o **near sweep** de liquidez **buy-side**.
3. **Rechazo** posterior coherente con narrativa bajista.
4. **Displacement bajista.**
5. **FVG alcista** invalidado hacia abajo → **IFVG bajista** = posible **zona de venta**.
6. Construcción de zona con padding.
7. Retest de la zona.
8. Confirmación bajista.
9. SL/TP/R:R válidos (SL por encima de estructura de compra agotada + buffer).
10. Guards de cuenta y parameter set OK.

---

## 5. Required vs scored conditions

### 5.1 Hard requirements (binarios; si fallan → no `TRADE_READY`)

| # | Condición |
|---|-----------|
| H1 | Existe **zona válida** (IFVG convertido + construcción numérica estable). |
| H2 | La zona tiene **invalidación clara** (`invalidationPrice` definido y comunicable). |
| H3 | **R:R** ≥ mínimo documentado para el parameter set (`min_rr`). |
| H4 | **Riesgo de cuenta** permite operar (límites diarios/máximos, trades, etc.). |
| H5 | **Reglas prop firm** permiten operar (profit target, consistencia, noticias si aplica). |
| H6 | **Spread / noticias / drawdown** no bloquean el trade (filtros duros del motor de riesgo). |
| H7 | Existe **perfil de símbolo** y datos MT5 (`tick_size`, `digits`, …) para la instancia. |
| H8 | Existe **parameter set aprobado** para `canonicalSymbol` + `strategyId` y **permitido** para el `accountId` activo. |

Los hard gates **prevalecen** sobre el score.

### 5.2 Scored conditions (ponderan calidad; no sustituyen H1–H8)

| Dimensión | Qué mide (resumen) |
|-----------|---------------------|
| Alineación contexto HTF | coherencia direccional con `direction_tf` / `higher_context_tf` |
| Liquidez | sweep confirmado vs near sweep vs ausencia |
| Calidad displacement | cuerpo, rango, posición de cierre vs ATR |
| Calidad IFVG | tamaño FVG dentro de min/max ATR, claridad de break |
| Calidad retest | profundidad en zona, respeto a `tick_size`, modo `full_zone` / `midpoint` / `edge` |
| Calidad confirmación | cuerpo vs ATR, cierre vs midpoint / referencia |
| Sesión | ventana operativa permitida para el símbolo/cuenta |
| Frescura de zona | tiempo/barras desde creación vs `zone_expiry_bars` |

Los pesos numéricos están en la sección 17.

---

## 6. State machine

### 6.1 Estados V1

| Estado | Significado breve |
|--------|-------------------|
| `NO_TRADE` | Sin setup válido o hard gate bloqueando cualquier idea. |
| `OBSERVE` | Contexto o liquidez débil; solo vigilancia; score bajo o condiciones insuficientes. |
| `WAIT_RETEST` | IFVG convertido y zona construida; pendiente de retest válido. |
| `WAIT_CONFIRMATION` | Precio ha interactuado con la zona (retest); falta confirmación explícita. |
| `TRADE_READY` | Confirmación + R:R + hard gates OK; idea lista desde el punto de vista estrategia+riesgo (la ejecución es fase posterior y fuera de alcance V1 doc). |
| `INVALIDATED` | Ruptura de invalidación o lógica de fallo estructural. |
| `EXPIRED` | Tiempo/barras o contexto obsoleto según `zone_expiry_bars` / reglas de caducidad. |
| `USED` | La zona ya cumplió su ciclo operativo (p. ej. trade simulado consumido o política de una sola interacción — a definir en exporter). |

### 6.2 Transiciones (resumen)

- Sin zona activa → `NO_TRADE`.
- Zona potencial pero liquidez/contexto débil → `OBSERVE`.
- IFVG + zona creada, esperando retest → `WAIT_RETEST`.
- Precio toca zona según reglas de retest → `WAIT_CONFIRMATION`.
- Confirmación cumplida y H1–H8 OK → `TRADE_READY`.
- Invalidación, expiración o bloqueo de riesgo → `INVALIDATED` o `EXPIRED` (según regla aplicable).
- Post uso / cierre de ciclo → `USED` (cuando el pipeline lo defina).

---

## 7. Context calculation (marcos superiores)

**Timeframes de referencia** (ejemplo alineado con spec numérico V1 para oro; otros símbolos mantienen la *forma* pero pueden cambiar TFs en parameter set):

```text
direction_tf       = H4   # dirección operativa principal
higher_context_tf  = D1   # veto / sesgo macro
zone_tf            = M15  # construcción FVG/IFVG/zona
confirmation_tf    = M15  # confirmación (M5 candidato futuro)
```

**Entradas lógicas:**

- `direction_tf`, `higher_context_tf`;
- rango reciente de swings en HTF (**recent swing range**);
- **middle-zone filter:** si el precio queda en el **40–60 % central** del rango relevante de swing reciente → **no operar** salvo que un backtest futuro documentado demuestre lo contrario para un símbolo/parameter set;
- salida de contexto: `BUY_ONLY` | `SELL_ONLY` | `NO_TRADE` (forzar observación o no-trade cuando hay conflicto).

---

## 8. Swing and liquidity calculation

### 8.1 Swings

- **Swing high / swing low** con `swing_left_bars` y `swing_right_bars` (spec numérico).
- `context_swing_lookback` limita cuánta historia HTF participa en el rango y los pools de liquidez visibles.

### 8.2 Sweep y near sweep (precio, no pips fijos)

**Tolerancia de sweep confirmado:**

```text
sweep_tolerance_price = max(
  ATR(symbol, sweep_tf) * sweep_tolerance_atr,
  spread_price * sweep_spread_factor,
  tick_size * min_sweep_ticks
)
```

**Tolerancia de near sweep:**

```text
near_sweep_tolerance_price = max(
  ATR(symbol, sweep_tf) * near_sweep_tolerance_atr,
  spread_price * near_sweep_spread_factor,
  tick_size * min_near_sweep_ticks
)
```

### 8.3 Clasificación de evento de liquidez

| Clase | Descripción breve |
|-------|-------------------|
| **confirmed sweep** | El precio supera el nivel ± `sweep_tolerance_price` y (según reglas) **reclama** o deja patrón válido para el modelo. |
| **near sweep** | Proximidad al pool dentro de `near_sweep_tolerance_price` sin cruce completo; típicamente degrada score o fuerza `OBSERVE` (ver preguntas abiertas). |
| **no sweep** | Sin interacción válida con el pool. |
| **possible real break** | El precio rompe el nivel pero **no** reclama en `reclaim_bars`; tratar como riesgo de falsa estructura — suele empujar a `OBSERVE` o invalidación según reglas del bloque B del optimizador. |

---

## 9. Displacement calculation

**Displacement** combina:

- tamaño de **cuerpo** vs `ATR(displacement_tf) * displacement_body_factor`;
- **rango** de la vela o secuencia corta;
- **posición del cierre** dentro del rango.

**Bullish displacement:**

- cuerpo ≥ `ATR * displacement_body_factor`;
- cierre en la **parte superior** del rango (p. ej. posición normalizada ≥ `close_position_min_buy`);
- cierre **por encima** del cierre previo o referencia de estructura acordada.

**Bearish displacement:**

- cuerpo ≥ `ATR * displacement_body_factor`;
- cierre en la **parte inferior** (posición ≤ `close_position_max_sell`);
- cierre **por debajo** del cierre previo o referencia de estructura.

**Parámetros típicos:** `displacement_body_factor`, `close_position_min_buy`, `close_position_max_sell`, `min_displacement_atr` (piso adicional opcional).

---

## 10. FVG / IFVG calculation

### 10.1 FVG (3 velas, gap central)

**Bullish FVG** (gap alcista clásico):

```text
low[i+1] > high[i-1]
```

**Bearish FVG:**

```text
high[i+1] < low[i-1]
```

### 10.2 Tamaño mínimo y máximo del FVG

- Filtrar FVG cuyo tamaño en precio sea **< `fvg_min_size_atr` * ATR** o **> `fvg_max_size_atr` * ATR** (descartar ruido o gaps anómalos).

### 10.3 Conversión a IFVG

- **FVG alcista** invalidado **hacia abajo** → se reinterpreta como **IFVG bajista** (zona de venta).
- **FVG bajista** invalidado **hacia arriba** → **IFVG alcista** (zona de compra).

**Modo de ruptura:** `ifvg_break_mode = close | wick` (según spec numérico; debe ser input del TestEA).

**Buffer de ruptura en precio:** `ifvg_break_buffer_price` derivado de ATR/spread/tick (análogo a otros buffers; factor `ifvg_break_buffer_atr` en parameter set).

---

## 11. Zone construction

1. **Base:** rango del IFVG (`ifvg_low`, `ifvg_high`).
2. **Padding dinámico:**

```text
zone_padding_price = max(
  ATR(symbol, timeframe) * zone_padding_atr_factor,
  spread_price * zone_padding_spread_factor,
  tick_size * min_zone_ticks
)
```

3. **Bordes:**

```text
zone_low  = ifvg_low  - zone_padding_price
zone_high = ifvg_high + zone_padding_price
```

**Campos derivados:**

- `zone_midpoint` = mitad del rango `[zone_low, zone_high]` (normalizado a `tick_size`).
- **Tamaño min/max de zona** en precio o en ATR relativo (límites del parameter set).
- `zone_expiry_bars` — caducidad por tiempo/barras sin retest o sin uso.
- `invalidation_price` — nivel que invalida la tesis de la zona.
- `reason_simple` / `reason_technical` — explicación para UI y logs (alineado con mock futuro).

---

## 12. Retest calculation

**Modos (`retest_mode`):**

| Modo | Criterio |
|------|----------|
| `full_zone` | El precio penetra cualquier parte de `[zone_low, zone_high]` respetando `tick_size`. |
| `midpoint` | Interacción con banda alrededor del `zone_midpoint`. |
| `edge` | Interacción con bandas en bordes superior/inferior con tolerancia en ticks. |

El sistema **no** exige retest exacto al pip; la evaluación es contra el **rango** y la **precisión del símbolo**.

---

## 13. Confirmation calculation

Tras un retest válido:

**Compra:**

- cierre favorable (alcista respecto a la confirmación);
- cierre **por encima** del `zone_midpoint` o referencia de rechazo definida en el parameter set;
- cuerpo ≥ `confirmation_min_body_atr * ATR(confirmation_tf)`;
- reglas opcionales de mecha / rechazo.

**Venta:** simétrico (cierre debajo del midpoint, cuerpo mínimo, etc.).

`confirmation_bars` puede permitir 1–N velas de confirmación según spec exportada.

---

## 14. SL / TP / R:R calculation

### 14.1 Stop dinámico

**Compra:**

```text
sl = min(zone_low, sweep_low) - sl_buffer_price
```

**Venta:**

```text
sl = max(zone_high, sweep_high) + sl_buffer_price
```

**Buffer de SL:**

```text
sl_buffer_price = max(
  ATR(symbol, confirmation_tf) * sl_atr_factor,
  spread_price * sl_spread_factor,
  tick_size * min_sl_ticks
)
```

### 14.2 Take profit

Modos previstos (parameter set):

| Modo | Descripción |
|------|-------------|
| `fixed_R` | TP a múltiplo fijo de riesgo (`rr_target`). |
| `liquidity_target` | TP hacia pool/opuesto definido en estructura (posible V2; ver preguntas abiertas). |
| `hybrid` | Combinación parcial fija R + objetivo estructural. |

### 14.3 R:R

- Calcular en **unidades de precio** y verificar distancia en **múltiplos válidos de `tick_size`**.
- Expresar riesgo/beneficio también en términos de cuenta usando `tick_value`, `contract_size`, `volume_step` y tamaño de posición permitido (backend / simulador).

---

## 15. Symbol normalization

**Obligatorio:** leer y aplicar `Mapazapp_Symbol_Precision_Tick_Pip_Normalization_Addendum_V1.md`.

Resumen operativo:

- **No** hay “pips universales”.
- Usar `digits`, `point`, `tick_size`, `tick_value`, `contract_size`, `volume_step`, `spread_price` / `spread_points` por **cuenta + brokerSymbol + canonicalSymbol**.
- Normalizar **todos** los precios a la rejilla de `tick_size`; mostrar con `digits`.
- Los **parameter sets son por símbolo** (p. ej. `MZP_IFVG_XAUUSD_V1_SET_003`).
- Clave lógica: `accountId + brokerSymbol + canonicalSymbol + strategyId + parameterSetId`.

---

## 16. Multi-account / prop firm integration

`TRADE_READY` **no** basta.

La cuenta debe cumplir simultáneamente:

- `accountId` registrado y activo;
- estado de **Risk Guard** OK (drawdown diario/máximo, trades, violaciones);
- **Prop Firm Guard** OK (profit target, consistencia, noticias, límites de la firma);
- **parameter set aprobado** y presente en `allowedAccountIds` (o matriz equivalente) para esa cuenta;
- sin **news blackout** activo que bloquee el símbolo;
- spread y filtros duros no en estado de bloqueo.

Si cualquiera falla → estado operativo degradado (`NO_TRADE` / `OBSERVE`) y `noTradeReason` explícito.

---

## 17. Score model V1 (sobre 100)

| Bloque | Peso sugerido |
|--------|----------------|
| Alineación de contexto HTF | 20 |
| Liquidez / sweep | 15 |
| Displacement | 15 |
| Calidad IFVG | 20 |
| Calidad retest | 10 |
| Confirmación | 10 |
| R:R / riesgo / spread OK (calidad, no duplicar hard gates) | 10 |
| **Total** | **100** |

**Bandas de interpretación (orientativas; hard gates mandan):**

| Score | Interpretación sugerida |
|-------|-------------------------|
| 0–44 | `NO_TRADE` |
| 45–59 | `OBSERVE` |
| 60–74 | `WAIT_CONFIRMATION` / revisión de zona |
| 75–84 | `TRADE_READY` con revisión explícita |
| 85–100 | Setup fuerte |

Umbral mínimo operativo sugerido: `min_score_trade` (input optimizable) para permitir avanzar de `WAIT_CONFIRMATION` a `TRADE_READY` **solo si** H1–H8 pasan.

---

## 18. Settings table (V1)

Leyenda de columnas: **Estrategia** = aplica a toda la lógica IFVG V1; **Símbolo** = parameter set por `canonicalSymbol`; **Cuenta** = override por `accountId`; **Optim MT5** = input exportable al TestEA; **UI** = solo visualización en dashboard.

| Setting | Estrategia | Símbolo | Cuenta | Optim MT5 | UI |
|---------|:----------:|:-------:|:------:|:-----------:|:--:|
| `context_swing_lookback` | ✓ | ✓ | | ✓ | |
| `swing_left_bars` | ✓ | ✓ | | ✓ | |
| `swing_right_bars` | ✓ | ✓ | | ✓ | |
| `sweep_tolerance_atr` | ✓ | ✓ | | ✓ | |
| `sweep_spread_factor` | ✓ | ✓ | | ✓ | |
| `min_sweep_ticks` | ✓ | ✓ | | ✓ | |
| `near_sweep_tolerance_atr` | ✓ | ✓ | | ✓ | |
| `near_sweep_spread_factor` | ✓ | ✓ | | ✓ | |
| `min_near_sweep_ticks` | ✓ | ✓ | | ✓ | |
| `reclaim_bars` | ✓ | ✓ | | ✓ | |
| `displacement_body_factor` | ✓ | ✓ | | ✓ | |
| `close_position_min_buy` | ✓ | ✓ | | ✓ | |
| `close_position_max_sell` | ✓ | ✓ | | ✓ | |
| `min_displacement_atr` | ✓ | ✓ | | ✓ | |
| `fvg_min_size_atr` | ✓ | ✓ | | ✓ | |
| `fvg_max_size_atr` | ✓ | ✓ | | ✓ | |
| `ifvg_break_mode` | ✓ | ✓ | | ✓ | opcional |
| `ifvg_break_buffer_atr` | ✓ | ✓ | | ✓ | |
| `zone_padding_atr_factor` | ✓ | ✓ | | ✓ | |
| `zone_padding_spread_factor` | ✓ | ✓ | | ✓ | |
| `min_zone_ticks` | ✓ | ✓ | | ✓ | |
| `zone_expiry_bars` | ✓ | ✓ | | ✓ | |
| `retest_mode` | ✓ | ✓ | | ✓ | opcional |
| `confirmation_bars` | ✓ | ✓ | | ✓ | |
| `confirmation_min_body_atr` | ✓ | ✓ | | ✓ | |
| `sl_atr_factor` | ✓ | ✓ | | ✓ | |
| `sl_spread_factor` | ✓ | ✓ | | ✓ | |
| `min_sl_ticks` | ✓ | ✓ | | ✓ | |
| `min_rr` | ✓ | ✓ | | ✓ | |
| `rr_target` | ✓ | ✓ | | ✓ | |
| `min_score_trade` | ✓ | ✓ | | ✓ | |
| `middle_zone_low_pct` / `middle_zone_high_pct` | ✓ | ✓ | | ✓ | |
| `direction_tf`, `higher_context_tf`, `zone_tf`, `confirmation_tf` | ✓ | ✓ | | ✓ | |
| Límites prop firm / riesgo | | | ✓ | | ✓ |

---

## 19. Backtest requirements

- **Cada** setting relevante debe ser **input exportable** del TestEA y trazable en logs.
- Backtests **por símbolo** y por **parameter set** (`MZP_IFVG_<SYMBOL>_V1_SET_XXX`).
- Optimización **por bloques** (A contexto, B swing/sweep, …) según matriz; no optimizar todo el universo a la vez.
- Separación estricta **train / validation / forward**; métricas de robustez mandan sobre pico de beneficio.
- Ningún parameter set entra al **scanner live** sin estado **APROBADO** y compatibilidad con cuenta.

---

## 20. Outputs expected (TestEA / scanner / backend)

Campos mínimos previstos (nombres orientativos; alinear con contratos de exportación cuando se implementen):

| Campo | Notas |
|-------|--------|
| `accountId` | cuando el simulador/scanner sea multi-cuenta |
| `canonicalSymbol` | |
| `brokerSymbol` | |
| `strategyId` | p. ej. `MZP_IFVG_ZONE_REACTION_V1` |
| `parameterSetId` | |
| `zoneId` | UUID o clave estable |
| `sweepStatus` | confirmed / near / none / break_risk |
| `displacementStatus` | |
| `ifvgId` | referencia al gap origen |
| `zoneLow`, `zoneHigh` | normalizados a tick |
| `state` | máquina de estados V1 |
| `score` | 0–100 |
| `invalidationPrice` | |
| `entryArea` | rango o midpoint según modo |
| `sl`, `tp` | |
| `rr` | |
| `noTradeReason` | enumeración estable |
| `riskGuardStatus` | OK / bloqueos |

---

## 21. Non-goals (V1 explícito)

- No martingala.
- No grid de recuperación.
- No promediar pérdidas.
- No predicción de punto único de entrada.
- No valores universales de pip/spread/stop/padding.
- **No ejecución real** antes de validación forward acordada por proceso de gobierno.
- No cambiar reglas de estrategia sin **actualizar este blueprint y los specs enlazados**.

---

## 22. Open questions (para siguiente ronda de producto)

1. **Primer símbolo** a calibrar en profundidad: probablemente **XAUUSD** — confirmar en go/no-go.
2. **Rangos iniciales** exactos de cada input por símbolo (pendiente de primera pasada de optimización por bloques).
3. **Near sweep:** ¿solo `OBSERVE` o puede alimentar `TRADE_READY` con score cap? (impacta falsos positivos.)
4. **Confirmación en M5:** ¿se introduce en V1.1 o se mantiene M15 hasta validar?
5. **TP `liquidity_target`:** ¿se pospone a V2 formal?
6. **Reglas prop firm “first-class” en V1:** cuáles de The5ers / PropXP / otras entran como hard gates día 1 vs configuración posterior.

---

## Referencias cruzadas

| Documento | Rol |
|-----------|-----|
| `Mapazapp_IFVG_Numerical_Detection_MT5_Backtest_Spec_V1.md` | Reglas numéricas y módulos del EA de test |
| `Mapazapp_Optimization_Matrix_Symbol_Parameter_Selection_V1.md` | Bloques de optimización y robustez |
| `Mapazapp_Symbol_Precision_Tick_Pip_Normalization_Addendum_V1.md` | Normalización multi-símbolo |
| `Mapazapp_MT5_Bridge_Connectivity_Contract_V1.md` | Datos en vivo |
| `Mapazapp_BridgeEA_Build_Spec_V1.md` | Construcción del EA de exportación |
| `APP/artifacts/mapazapp/docs/MOCK_DATA_CONTRACT.md` | Contrato de mock hasta alineación UI |

---

*Fin del blueprint final draft V1.*
