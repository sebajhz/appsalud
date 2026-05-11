# Mapazapp — Auditoría de descubrimiento read-only BridgeEA/TestEA (D10.7)

**Checkpoint D10.7 — documentación + límites.** Describe cómo **podría** implementarse el descubrimiento de archivos relacionados con BridgeEA/TestEA **solo lectura**, sin watcher, sin rutas reales por defecto y sin integración productiva.

**Relacionado:** [`MT5_DETECTION_GATE_AUDIT_D10.md`](./MT5_DETECTION_GATE_AUDIT_D10.md), [`MT5_DATA_INTEGRATION.md`](./MT5_DATA_INTEGRATION.md), [`MT5_CONFIG_STORAGE_DECISION_D10.md`](./MT5_CONFIG_STORAGE_DECISION_D10.md) (D10.5), **`mapazapp-mt5-bridge-readiness.ts`** (D10.6), **`mapazapp-bridge-sample-metadata.ts`** (D10.8 — metadata read-only de basenames/snippets), [`END_TO_END_READINESS_AUDIT_D10.md`](./END_TO_END_READINESS_AUDIT_D10.md) (D10.10), fuentes MQL5 bajo `APP/artifacts/mt5/experts/`.

---

## 1. Qué archivos BridgeEA/TestEA existen hoy en el repo

| Ruta (repo) | Naturaleza |
|-------------|------------|
| `APP/artifacts/mt5/experts/Mapazapp_BridgeEA/Mapazapp_BridgeEA.mq5` | Código fuente EA **export-only**; no ejecutado por el repo |
| `APP/artifacts/mt5/experts/Mapazapp_BridgeEA/README.md`, `EXPORT_CONTRACT.md`, `MANUAL_TEST_CHECKLIST.md` | Documentación |
| `APP/artifacts/mt5/experts/Mapazapp_BridgeEA/samples/*.csv`, `bridge_status.json` | **Fixtures sintéticos / sanitizados** para contrato y lectura humana |
| `APP/artifacts/mt5/experts/Mapazapp_TestEA/Mapazapp_TestEA.mq5` | Código fuente EA Strategy Tester **virtual export** |
| `APP/artifacts/mt5/experts/Mapazapp_TestEA/samples/backtest_trades.csv`, `backtest_summary.json` | **Fixtures ficticios** alineados al contrato TestEA |
| `APP/lib/mapazapp-core/tests/fixtures/mt5-export-samples/` | Bundles sanitizados para validadores in-memory (V2-12) |

Nada de lo anterior es una carpeta **runtime** del terminal del usuario.

---

## 2. Qué es fixture / sanitizado

- CSV/JSON bajo `samples/` y `tests/fixtures/**` son **pequeños, sintéticos y no operativos**.
- Sirven para parsers/contratos en **`@workspace/mapazapp-core`** sobre **texto en memoria**.

---

## 3. Qué NO es runtime real

- Cualquier ruta bajo instalación MT5 del usuario: `AppData`, árbol `MetaQuotes`, `MQL5/Files`, agentes del Strategy Tester, etc.
- Archivos generados por EA en cuenta **demo/real** o exports grandes fuera de control de Git.

---

## 4. Carpetas MT5 sensibles (no enumerar en claro en producto)

- Directorio de datos del terminal y subcarpetas `MQL5/Files/<export_root>/<terminal_id>/` según contrato BridgeEA.
- Rutas del ejecutable `terminal64.exe` y perfiles de usuario.

**Regla:** discovery futuro debe operar sobre paths **proporcionados por config/consentimiento** (D10.5), jamás escaneo silencioso del disco personal.

---

## 5. Qué discovery podría hacerse con consentimiento / config

1. Operador configura `bridgeFolder` (launcher config futuro).
2. Proceso **launcher-side** (o herramienta explícita) lista archivos **read-only** (`readdir` equivalente).
3. Comparación con lista esperada de nombres (contrato BridgeEA: `bridge_status.json`, `latest_market_snapshot.csv`, etc. — ver `EXPORT_CONTRACT.md` / parsers CP10).
4. Opcional: lectura de **texto** en memoria y validación vía `parseBridgeStatusJson` / CSV parsers existentes (**sin** OrderSend/CTrade).

---

## 6. Por qué no watcher todavía

- Riesgo de exfiltración continua, loops de I/O y confusión “live OK” sin semántica honesta (**D10.0**).
- Threat model D9.x exige transporte y gates antes de automatizar lecturas recurrentes.

---

## 7. Por qué no command files

- Cualquier archivo de comando hacia MT5 cruza la línea de ejecución; está **fuera** de integración datos read-only descrita aquí y prohibida por gobernanza general.

---

## 8. Relación con el modelo D10.6 (bridge readiness)

- `evaluateMt5BridgeReadiness` formaliza **postura**: `not_configured`, `ready` (**solo** “ready for read-only validation”), `missing`, `invalid`, `unsafe`, `unknown`.
- Encaja como capa **previa** a parsers: primero política + presencia de nombres esperados con **deps inyectadas**; luego validación de contenido en memoria.

## 8b. Relación con D10.8 (sample metadata)

- `createBridgeSampleMetadata` clasifica **basenames** y snippets **en memoria** (`sanitized_sample` para fixtures conocidos del repo) — **no** filesystem, **no** “bridge connected”.
- Complementa el discovery conceptual de §5 sin sustituir lectura launcher-side futura.

---

## 9. Tests futuros que harían falta (cuando exista launcher)

- Integración **opt-in** con carpeta temporal en CI (fixture copiado), sin rutas personales.
- Tests negativos: carpeta inexistente, archivos parciales, nombres incorrectos, symlink policies (si aplica SO).
- Aserciones de que logs/JSON **no** incluyen fragmentos privados (`assertMt5BridgeReadinessSafety`, tests analogos para payloads API).

---

## 10. Criterios para D10.8 (orientativo)

| # | Criterio |
|---|----------|
| 1 | Decisión D10.5 aceptada en roadmap y referenciada desde launcher design |
| 2 | Contrato de nombres de archivo BridgeEA/TestEA alineado con `EXPORT_CONTRACT.md` y parsers CP10 |
| 3 | Superficie de lectura acotada (solo texto, tamaño máximo, sin ejecución MQL desde TS) |
| 4 | Threat model D9.x actualizado si la lectura es automática o recurrente |
| 5 | Sin watcher hasta aprobación explícita de riesgo; sin command files |

---

## 11. Implementación en D10.7

- **No** se añadió file discovery real en TypeScript productivo: bastaría con reutilizar **deps inyectadas** como en D10.6.
- Cualquier código nuevo debe **evitar `fs` directo** en el núcleo reutilizable; el llamador launcher proporciona `exists` / `listFiles`.

---

## 12. Conclusión

El repo contiene **solo fuentes y fixtures** BridgeEA/TestEA. El descubrimiento **runtime** queda **explícitamente diferido** a launcher + config local + consentimiento. **D10.7 no introduce watcher ni lectura live.**
