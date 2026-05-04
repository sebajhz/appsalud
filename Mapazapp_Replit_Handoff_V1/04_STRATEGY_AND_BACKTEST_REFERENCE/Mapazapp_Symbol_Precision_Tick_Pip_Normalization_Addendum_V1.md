# Mapazapp — Addendum V1: precisión de símbolo, tick, punto y normalización (multi-símbolo)

**Versión:** V1  
**Ámbito:** arquitectura y contratos de datos — **no** implementación de código en este documento.  
**Producto:** Mapazapp (multi-cuenta, multi-bróker, **multi-símbolo**).

---

## 1. Objetivo

Mapazapp opera sobre **muchos instrumentos** con escalas de precio, decimales, tamaño de tick, valor de tick, spread, paso de volumen y convenciones de bróker **distintas**. Este addendum fija el requisito arquitectónico: **no se asume una unidad universal de “pips”** ni un único criterio de spread, stop, padding o redondeo para todos los símbolos.

---

## 2. No usar “pips” universales

- El sistema **no** debe calcular distancias, stops, tolerancias de barrido ni padding de zonas usando un **pip fijo global** válido para todos los instrumentos.
- Cualquier magnitud en “pips” heredada de convenciones manuales (p. ej. “10 pips de stop”) debe **traducirse** a unidades derivadas del perfil del símbolo y de los datos exportados por MT5 (puntos, ticks, precio), no de una tabla genérica por par.

---

## 3. Perfil de símbolo (symbol profile)

- **Cada símbolo canónico** (p. ej. `XAUUSD`, `EURUSD`, `NAS100`) debe tener un **perfil de símbolo** en el modelo de producto/datos.
- El perfil agrega:
  - identidad lógica (`canonicalSymbol`, `strategyId` cuando aplique);
  - parámetros de estrategia y riesgo **por símbolo** (factores ATR, factores de spread, mínimos en ticks, timeframes de referencia, etc.);
  - referencia a cómo se mapea en cada cuenta/bróker (`brokerSymbol` por `accountId`).
- Sin perfil de símbolo no hay cálculo normalizado: el motor debe rechazar o degradar operaciones que dependan de magnitudes de precio/volumen.

---

## 4. Mismo símbolo canónico, distinto `brokerSymbol` por cuenta

- Un mismo `canonicalSymbol` puede resolverse a **`brokerSymbol` distintos** según `accountId` / bróker (p. ej. `XAUUSD` vs `XAUUSDm`, `NAS100` vs `USTEC`, `GOLD` vs `GOLD.pro`).
- La clave operativa incluye siempre la dimensión **cuenta + símbolo en bróker**, no solo el nombre canónico mostrado en UI o en documentación de estrategia.

---

## 5. Datos de símbolo exportados desde MT5 (fuente de verdad)

El bot / backend debe consumir datos **provenientes de MT5** (vía BridgeEA u otra vía contractual), como mínimo en la línea del siguiente conjunto (nombres orientativos; el contrato exacto de payload se alinea con `Mapazapp_MT5_Bridge_Connectivity_Contract_V1` y `Mapazapp_BridgeEA_Build_Spec_V1`):

| Campo (orientativo) | Uso |
|---------------------|-----|
| `digits` | Precisión de visualización y redondeo de precio al número de decimales del símbolo |
| `point` | Tamaño mínimo de variación de precio en términos del terminal |
| `tick_size` | Incremento mínimo de precio negociable |
| `tick_value` | Valor monetario de un tick por lote estándar (según contrato de volumen) |
| `contract_size` | Tamaño de contrato |
| `volume_min` / `volume_max` / `volume_step` | Límites y granularidad de volumen |
| `spread_points` / `spread_price` | Spread en puntos y en **unidades de precio** |
| `brokerSymbol` | Nombre del símbolo en el servidor del bróker |
| `canonicalSymbol` | Nombre estable usado en Mapazapp entre módulos (zonas, journal, parameter sets) |

**Regla:** los cálculos de riesgo, distancia y P&L esperado deben basarse en estos valores **por instancia** (símbolo + cuenta), no en constantes globales.

---

## 6. Normalización de cálculos de estrategia

Las operaciones de estrategia (zonas, invalidaciones, barridos, filtros de calidad) deben expresarse y validarse usando, **por símbolo**:

- **unidades de precio** (diferencias en precio absoluto coherentes con `tick_size`);
- **puntos** del terminal (`point` / convención documentada en contrato);
- **ticks** (múltiplos de `tick_size`);
- **ATR** (u otra volatilidad) calculada en el **mismo símbolo y timeframe** que define la regla;
- **spread** (`spread_price` y/o `spread_points` con conversión explícita);
- **tick value** para enlazar distancia de precio con impacto en cuenta cuando se proyecte R o exposición.

---

## 7. Tolerancia de barrido de liquidez (dinámica por símbolo)

Ejemplo de forma funcional (los factores `sweep_tolerance_atr`, `sweep_spread_factor`, `min_sweep_ticks` y el timeframe `sweep_tf` son **parámetros del perfil de símbolo** o del parameter set, no constantes globales):

```text
sweep_tolerance_price = max(
  ATR(symbol, sweep_tf) * sweep_tolerance_atr,
  spread_price * sweep_spread_factor,
  tick_size * min_sweep_ticks
)
```

Interpretación: la tolerancia en **precio** nunca debe ser menor que lo que exigen la volatilidad reciente, el coste de spread y la resolución mínima del mercado para ese símbolo.

---

## 8. Padding de zona (dinámico por símbolo)

Ejemplo análogo para el padding en precio de una zona:

```text
zone_padding_price = max(
  ATR(symbol, timeframe) * zone_padding_atr_factor,
  spread_price * zone_padding_spread_factor,
  tick_size * min_zone_ticks
)
```

Los factores y timeframes pertenecen al **perfil del símbolo** o al parameter set aprobado para ese símbolo.

---

## 9. Stop loss, take profit, R:R y tamaño de lote

- Deben calcularse **por símbolo y cuenta** usando al menos: `tick_size`, `tick_value`, `volume_step`, límites de volumen y **equity / riesgo por trade** de la cuenta.
- El ratio R:R se expresa en términos de **riesgo monetario** y/o **distancia en precio normalizada a ticks válidos**, no con un “pip value” único global.
- Los precios de SL/TP y niveles de entrada deben **normalizarse y redondearse** a múltiplos válidos de `tick_size` y mostrarse con `digits`.

---

## 10. Precios: redondeo y visualización

- Toda salida de precio a UI, journal o exportación debe respetar **`digits`** y la rejilla de **`tick_size`**.
- No se deben mezclar cadenas de precio de un símbolo con reglas de redondeo de otro.

---

## 11. Backtests y parameter sets por símbolo

- Los parameter sets y los resultados de backtest están **acotados a un símbolo canónico** (y a la estrategia/versión que corresponda).
- Ejemplos de identificadores lógicos:

  - `MZP_IFVG_XAUUSD_V1_SET_003`
  - `MZP_IFVG_EURUSD_V1_SET_001`
  - `MZP_IFVG_NAS100_V1_SET_001`

No existe un único “set global” válido para cruzar todos los instrumentos sin revisar compatibilidad de símbolo, bróker y cuenta.

---

## 12. Clave compuesta futura (implementación)

La clave natural para filas de estado, órdenes sugeridas, zonas vivas y resultados de backtest en el sistema real debe incluir explícitamente:

```text
accountId + brokerSymbol + canonicalSymbol + strategyId + parameterSetId
```

(sujeto a refinamiento en el esquema de API/DB, pero **sin** colapsar dimensiones en un solo símbolo string ambiguo).

---

## 13. Prohibición de supuestos globales

Queda explícitamente prohibido asumir, salvo acuerdo documentado y por símbolo:

- un spread único;
- un stop en “pips” fijos;
- un padding de zona fijo en precio;
- una precisión decimal única;
- un tamaño de tick o valor de tick compartido entre NAS100, XAUUSD y EURUSD;
- un volumen mínimo o paso de lote idéntico entre cuentas o brókers.

---

## 14. Relación con otros documentos

- **Contrato de datos y bridge:** `03_MT5_BRIDGE_AND_DATA_CONTRACT/` (campos exportados y frecuencia).
- **Backtest numérico / TestEA:** `04_STRATEGY_AND_BACKTEST_REFERENCE/Mapazapp_IFVG_Numerical_Detection_MT5_Backtest_Spec_V1.md` y especificaciones de EA — deben alinearse con este addendum para que los inputs y métricas sean **por símbolo**.
- **Mock del dashboard:** el mock puede seguir mostrando números simplificados; la **implementación real** debe obedecer este addendum.

---

## 15. Lectura obligatoria antes de implementar

Antes de implementar **estrategia**, **puente MT5**, **scanner**, **backtesting** o **cálculos de riesgo** que dependan de precio, spread, volumen o tolerancias, el equipo debe leer y aplicar este addendum junto con los contratos de bridge y el blueprint de estrategia aprobados.
