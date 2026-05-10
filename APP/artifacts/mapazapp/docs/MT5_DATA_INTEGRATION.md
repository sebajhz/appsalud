# Mapazapp — MT5 Data Integration

Declaración de **integración de datos** entre MetaTrader 5 y Mapazapp. Describe fuentes, validaciones y fases; **no** implementa ingesta automática ni watchers sin aprobación explícita.

---

## 1. Purpose

MT5 será fuente principal de **históricos** y, en el futuro bajo diseño aprobado, de datos **live o semi-live solo lectura**. Mapazapp debe consumir datos de forma **auditables**, **validables** y **seguras**: sin ejecutar órdenes desde la capa de integración descrita aquí.

---

## 2. Current state

| Pieza | Estado |
|-------|--------|
| BridgeEA / TestEA | Artefactos **export-only** en repo (sin ejecución de órdenes Mapazapp desde este doc) |
| Importadores manuales | CSV / texto en memoria en core para campañas y tests |
| API / dashboard mock | Evidencia read-only; no sustituye datos reales del broker |
| Watcher live | **No** aprobado aquí |
| Lectura automática carpeta MT5 | **No** implementada como producto |
| Ejecución real | **Fuera de alcance** de esta integración |

---

## 3. Data sources

1. **Manual CSV** — pegado/import controlado por operador.
2. **BridgeEA export** — archivos según contrato Bridge (solo lectura hacia Mapazapp).
3. **TestEA export** — resultados de Strategy Tester / exportación virtual según contrato.
4. **Futuro: polling read-only** de carpeta de export — solo si se aprueba diseño de riesgo y seguridad.
5. **Futuro: validación en launcher** — rutas y frescura de archivos antes de analizar.

---

## 4. Expected candle data

Campos esperados conceptualmente por vela (además de metadatos de origen):

- símbolo (canónico y/o broker)
- timeframe
- timestamp (con política TZ documentada)
- open, high, low, close
- tick volume (u volumen si el formato lo trae)
- spread si aplica y está disponible en fuente
- **metadata de fuente** (archivo, EA, versión, fecha de export)

---

## 5. Symbol mapping

- Símbolo interno de referencia puede ser **`XAUUSD`** (ejemplo).
- Símbolo en broker puede ser **`XAUUSD.m`**, **`GOLD`**, etc.
- El **mapeo explícito** es obligatorio antes de validar series reales mezcladas con lógica que asume un nombre canónico.

---

## 6. Timeframe mapping

Timeframes iniciales de alineación: **M15**, **H1**, **H4**, **D1**.  
La tabla exacta interna ↔ MT5 debe documentarse junto al parser que se apruebe.

---

## 7. Folder strategy

Propuesta (ajustar al árbol real antes de codificar):

- `data/mt5-history/` — datasets grandes, usualmente fuera de Git
- `fixtures/mt5/` — muestras pequeñas para tests
- `docs/data-samples/` — ejemplos documentados
- `runtime/mt5-bridge/` o carpeta equivalente — **futuro** para staging de exports validados

---

## 8. File naming

Convención orientativa:

```text
XAUUSD_M15_2024-01-01_2024-12-31.csv
XAUUSD_H1_2024-01-01_2024-12-31.csv
XAUUSD_D1_2024-01-01_2024-12-31.csv
```

Los rangos y granularidad deben coincidir con lo declarado en la documentación del dataset.

---

## 9. Validation rules

- Columnas requeridas presentes y tipadas.
- Sin timestamps duplicados (o política explícita si se permiten).
- Tiempo **estrictamente ascendente** donde corresponda.
- Consistencia de timeframe entre filas y metadatos.
- Sin uso de datos futuros respecto al contexto simulado.
- Normalización de timezone documentada.
- Metadatos de símbolo/timeframe obligatorios en pipeline productivo.
- Gaps aceptados solo si están **documentados** y el motor sabe cómo tratarlos.
- Filas inválidas: rechazo o cuarentena — nunca “arreglo silencioso” sin log.
- Preferencia por **vela cerrada** salvo modo explícito que defina vela en formación.

---

## 10. MT5 chart association questions

Preguntas abiertas a resolver antes de automatizar:

- ¿El EA va en un gráfico específico o en varios?
- ¿Lee solo el símbolo/timeframe del gráfico actual o una lista configurada?
- ¿El símbolo debe estar en Market Watch?
- ¿Qué ocurre si el usuario cambia timeframe en MT5 en caliente?
- ¿Cómo se detecta y documenta el **sufijo** del broker?
- ¿Qué timezone usa el servidor del broker y cómo se muestra al usuario?
- ¿Se consume solo vela **cerrada** o también la vela en **formación**?

---

## 11. Security rules

- Integración **read-only** hacia el mercado: sin órdenes desde esta capa.
- **No** `OrderSend`, **no** `CTrade`, **no** archivo de comandos de trade.
- **No** camino señal→orden.
- **No** asumir cuenta real para validaciones por defecto.
- **`executionEnabled`** permanece desacoplado y deshabilitado por defecto a nivel producto.

---

## 12. Implementation phases

| Fase | Contenido |
|------|-----------|
| C1 | Fixtures pequeños commiteables |
| C2 | Tests de parser / validación de formato |
| C3 | Manual de importación alineado con usuario |
| C4 | Validación de muestras BridgeEA export |
| C5 | Validación runtime de carpetas (cuando exista launcher) |
| C6 | Gate **live-read-only** solo tras aprobación formal |
