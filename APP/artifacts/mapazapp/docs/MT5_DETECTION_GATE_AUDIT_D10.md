# Mapazapp — MT5 detection gate audit (D10.0)

**Checkpoint D10.0 — documentation + design gate.** Resume qué existe hoy respecto a MT5 en el repo, qué es fixture o sanitizado, qué está explícitamente fuera de alcance, y bajo qué condiciones puede avanzarse un **modelo TS puro de validación de configuración** (**D10.1**) sin abrir MT5, sin watcher y sin launcher real.

**Relacionado:** [`MT5_DATA_INTEGRATION.md`](./MT5_DATA_INTEGRATION.md), [`USER_MANUAL_MT5_SETUP.md`](./USER_MANUAL_MT5_SETUP.md), [`LAUNCHER_PROTOTYPE_DESIGN_D8.md`](./LAUNCHER_PROTOTYPE_DESIGN_D8.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md).

---

## 1. Baseline actual (código y artefactos)

| Área | Qué hay | Naturaleza |
|------|---------|------------|
| **`APP/artifacts/mt5/`** | Expertos MQL5 (`Mapazapp_BridgeEA`, `Mapazapp_TestEA`), contratos de export, muestras bajo `samples/` | **Export-only** en repo; las muestras son **pequeñas y sintéticas/sanitizadas**, no datos operativos |
| **`APP/lib/mapazapp-core/tests/fixtures/mt5/`** | CSV sintéticos mínimos | **Fixture de tests** |
| **`APP/lib/mapazapp-core/tests/fixtures/mt5-export-samples/`** | Bundles BridgeEA/TestEA sanitizados para validadores | **Fixture de tests** |
| **`runtime-status.ts` (`mapazapp-core`)** | `Mt5RuntimeSlice` con `status`, `terminalPath`, `dataFolder`, etc. | **Modelo puro**; valores por defecto conservadores (`not_configured`, sin probes) |
| **`GET /api/mapazapp/runtime/status`** | Adapter `buildRuntimeStatusPayload` | **Snapshot mock/read-only**; **no** detecta MT5 real; **no** afirma conexión |
| **`mapazapp-launcher-model.ts` (`scripts`)** | `LauncherMt5Config` (`enabled`, `terminalPath`, `mql5FilesFolder`), proceso hijo lógico `mt5` | **Esqueleto / modelo**; **sin** `spawn`, **sin** apertura de terminal |
| **`action-gates.ts` (`mapazapp-core`)** | Acciones `validate_mt5_config`, `open_mt5` | **Gates** → `not_available` / `blocked` hasta política **D10**; **no** ejecutan MT5 |
| **`dispatchLauncherAction` (`scripts`)** | Solo **`validate_environment`** llega a preflight | **No** enruta MT5 ni órdenes |

---

## 2. Qué es fixture / test / sanitizado

- Todo CSV o JSON bajo **`tests/fixtures`** o **`samples/`** embebidos en Git se considera **no operativo** y **no** sustituye datos reales del broker.
- Los expertos `.mq5` son **código fuente** para compilar en el terminal del usuario; el repo **no** ejecuta MT5 ni Strategy Tester.
- La API y el dashboard consumen **mock / evidencia read-only** salvo importaciones manuales explícitas ya documentadas (p. ej. campañas en core).

---

## 3. Qué NO existe (aún)

- Detección automática de instalación MT5 desde Node/TS productivo.
- Watcher de carpeta bridge / export en tiempo real integrado al producto.
- Archivos de comandos hacia MT5 (`OrderSend`, `CTrade`, pipes de trading).
- Estado **`MT5 connected`** o **`bridge connected`** honesto basado en lectura live (cualquier mensaje equivalente está **prohibido** en envelopes de seguridad hasta diseño aprobado).
- Launcher ejecutable unificado que abra `terminal64.exe` o supervise el proceso MT5.

---

## 4. Rutas y carpetas sensibles (no loguear en claro)

| Concepto | Riesgo |
|----------|--------|
| **`terminalPath`** | Expone jerarquía del disco del usuario; nombres de usuario, `Program Files`, etc. |
| **Carpeta de datos MT5** (`AppData`, `MetaQuotes`) | Identifica instalación y sandbox del usuario |
| **`mql5FilesFolder` / `MQL5/Files`** | Puede acercarse a datos de cuenta o EA si el operador mezcla secretos |
| **`bridgeFolder`** | Datos de mercado/export; potencialmente sensibles si incluyen snapshots de cuenta |

**Regla:** resúmenes seguros (`safeSummary`) y logs deben usar **marcadores redactados** (p. ej. `[users]/[profile]`, `[USERDATA]`, `[VENDOR]`, `[TERMINAL_BINARY]`), no subcadenas literales como `C:\Users`, `AppData`, `MetaQuotes`, `terminal64.exe`.

---

## 5. Rutas que no deben usarse todavía para “detección real”

- Cualquier lectura recurrente del sistema de archivos del terminal del usuario **sin** consentimiento y **sin** launcher aprobado.
- APIs del sistema tipo registro Win32 para localizar MT5 → **fuera de alcance** de **D10.0–D10.1**.
- Combinar estado API/dashboard con “salud MT5” inferida por heurísticas débiles → **no** declarar conectividad.

---

## 6. Qué puede validarse sin abrir MT5 (alcance seguro de D10.1)

Un **validador puramente declarativo** puede:

- Comprobar flags booleanos peligrosos (`allowLaunch`, `allowCommandFiles`) y fallar **cerrado** (`unsafe`).
- Validar forma de configuración (`enabled`, paths opcionales, coherencia mínima) **sin** tocar disco si **no** se inyectan dependencias.
- Opcionalmente, si el llamador inyecta funciones **`pathExists` / `isDirectory`** (tests o launcher futuro), realizar **existencia read-only** sin ejecutar binarios.
- Sanear cualquier representación legible humana de rutas para **no** filtrar segmentos privados.

Esto **no** implica: lanzar MT5, watchers, IPC de trading, ni afirmar que el terminal está “listo para operar”.

---

## 7. Datos sensibles

- Rutas absolutas del usuario.
- Nombres de servidor/cuenta/login/balance (no deben aparecer en validadores genéricos).
- Export CSV con información de cuenta real (fuera de Git; no normalizar en **D10.1**).

---

## 8. Estados que deben permanecer bloqueados / `not_configured`

- Por defecto: **`enabled: false`** → resultado **`not_configured`** y posture **segura**.
- Acciones de producto **`open_mt5`**, **`validate_mt5_config`** en dispatcher/API: siguen **gateadas** hasta políticas posteriores (**action-gates** ya las marca como no disponibles o bloqueadas según contexto).
- Cualquier intento de habilitar **`allowLaunch`** o **`allowCommandFiles`** en el modelo **D10.1** → **`unsafe`** / error explícito.

---

## 9. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Falsa sensación de “MT5 OK” | Prohibir mensajes tipo “connected”; usar solo estados de configuración / validación estructural |
| Filtración de rutas en JSON/logs | `sanitizeMt5PathForDisplay` + `safeSummary` sin raw paths |
| Scope creep hacia launcher | **D10.1** solo modelo TS en `scripts`; **no** cablear a API/dashboard |
| Confundir fixtures con runtime | Documentar explícitamente origen synthetic/fixture |

---

## 10. Non-goals (D10.0 / D10.1)

- Abrir o ejecutar `terminal64.exe`.
- `spawn` / `child_process` desde el validador.
- Escribir archivos de comando para MT5.
- WebSocket, polling live, o watcher de carpetas en estos checkpoints.

---

## 11. Conclusión para D10.1

**No hay bloqueo:** es seguro implementar **D10.1** como **modelo TS puro** (`validateMt5Config`, sanitización, flags `unsafe`), **sin** filesystem obligatorio y **sin** lanzamiento de MT5, alineado con este audit.

Si en el futuro se requiere detección automática del ejecutable o del data folder vía SO, eso será un **checkpoint distinto** con amenaza/registro explícitos y probablemente solo en **launcher** gobernado — **fuera** del alcance actual.
