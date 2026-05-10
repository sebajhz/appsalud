# Mapazapp — Launcher Config and Runtime Status Design

Documento **D2**: diseño formal **solo documentación**. No implementa launcher, código, endpoints ni scripts.

**Relacionado:** [`DASHBOARD_RUNTIME_ACTIONS_DESIGN.md`](./DASHBOARD_RUNTIME_ACTIONS_DESIGN.md) (**D4.1**) — cableado futuro de acciones dashboard/runtime respecto de preflight, dev-start, validador de import y modelo de estado; **sin** botones ni TSX en ese checkpoint.

---

## 1. Purpose

- Mapazapp **todavía no tiene** launcher único ni proceso supervisor.
- El objetivo futuro de producto es un ejecutable tipo **`MapazappLauncher.exe`** / **`Mapazapp.exe`** que orqueste arranque, validaciones y estado visible para el usuario.
- **Antes** de implementar ese launcher hace falta fijar **configuración** (qué se puede parametrizar) y **modelo de estado runtime** (qué se muestra y qué significa cada valor).
- El launcher **no debe fingir** conectividad real con MT5, bridge ni broker: si no se verificó algo, el estado debe reflejar **unknown**, **not_configured** o **not_checked**, no “OK verde” inventado.
- Por defecto del producto, **`executionEnabled` debe permanecer `false`** hasta fases y controles explícitos fuera de este diseño.

---

## 2. Current runtime baseline

**Estado real hoy (post-D1):**

- La **API** se levanta **por separado** (`@workspace/api-server`); requiere variable de entorno **`PORT`** en runtime.
- El **dashboard** se levanta **por separado** (`@workspace/mapazapp`, Vite); puerto por defecto típico **5173** si no se redefine `PORT`.
- Existe **CLI** de validación local de CSV (**read-only**, sin persistencia): `mapazapp-import-validate`.
- El dashboard usa principalmente **mocks in-process**; la API expone **health** y rutas **mock GET** bajo `/api/mapazapp/*`. El dashboard puede consumir el snapshot de runtime vía **`runtimeStatusDataSource`** (**D6.1**) cuando **`VITE_MAPAZAPP_API_BASE_URL`** esté configurada; sin esa URL el estado runtime en el cliente permanece **unavailable** / conservador. Existe el componente presentacional **`RuntimeStatusPanel`** (**D6.2.1**) y el montaje en **`ConfigPage`** (**D6.3.1**) vía **`RuntimeStatusPanelContainer`**: si **`VITE_MAPAZAPP_API_BASE_URL`** está definida, el dashboard puede mostrar un snapshot read-only del endpoint de runtime; sin URL sigue **unavailable**. **No** sustituye launcher ni arranque de procesos.
- **No** hay runtime MT5 integrado en Node/TS, **no** hay watcher de carpetas, **no** hay endpoint **real** de estado MT5/bridge operativo (rutas “operativas” futuras no deben simular “conectado”).
- **No** hay base de datos operativa Mapazapp en el alcance actual descrito para este mock.
- **No** hay supervisor de procesos unificado ni **logs centralizados de launcher** (la API usa logger propio, p.ej. pino).

**Comandos actuales reales** (desde el directorio **`APP/`**):

**API** (bash / macOS / Linux):

```bash
PORT=3001 pnpm --filter @workspace/api-server dev
```

**API** (PowerShell en Windows):

```powershell
$env:PORT = "3001"
pnpm --filter @workspace/api-server dev
```

Nota: el script `dev` del paquete api-server puede depender de shell POSIX (`export`); en **cmd.exe** puede hacer falta invocar `build` + `start` con `PORT` definido según README del paquete.

**Dashboard:**

```bash
pnpm --filter @workspace/mapazapp dev
```

**CLI** (cwd efectivo del paquete scripts al usar pnpm: típicamente `APP/scripts`; ajustar `--file` como ruta relativa o absoluta):

```bash
pnpm --filter @workspace/scripts mapazapp:import-validate -- --file <path> --symbol XAUUSD --timeframe M15 --json
```

En **Windows**, la forma de definir **`PORT`** y otras variables depende del shell (**PowerShell** vs **cmd** vs **Git Bash**); para usuario final se recomiendan **rutas absolutas** y una única forma documentada de arranque.

---

## 3. Launcher goals

El launcher futuro, cuando se implemente con aprobación, debería:

- Validar **configuración mínima** y rechazar valores inseguros o ambiguos.
- Validar **puertos** (libres o los configurados explícitamente).
- Levantar la **API** y el **dashboard** en orden documentado, o abrir el navegador hacia la URL del dashboard.
- Mostrar un **estado consolidado** (API, dashboard, datos, MT5, bridge, safety) sin mentir sobre verificaciones no hechas.
- Si MT5 está **habilitado en config**, comprobar rutas/presencia según política aprobada (**sin** afirmar ejecución ni órdenes).
- Opcionalmente **abrir MT5** solo si política y UX lo aprueban.
- Validar **carpeta MQL5/Files** u otras rutas solo como **comprobación de existencia/paths**, no como “cuenta conectada”.
- Validar **carpeta bridge** solo como **archivos/mtime/contrato**, no como señales aprobadas.
- Mostrar **errores claros** (puerto ocupado, path inválido, modo incompatible).
- Mantener **`executionEnabled: false`** por defecto y no introducir auto-aprobación.
- Evitar **instancias duplicadas** conflictivas (bloqueo o handoff explícito).
- Permitir **cierre ordenado** de procesos hijos.

---

## 4. Non-goals

**D2 y este diseño no implementan ni autorizan:**

- Launcher ejecutable ni script de arranque productivo.
- Runtime MT5 dentro de Mapazapp (sockets, ticks live, etc.).
- Watcher continuo o polling no aprobado.
- Base de datos operativa Mapazapp como requisito del launcher.
- WebSocket live.
- **`POST`** de importación u órdenes hacia MT5.
- Ejecución real de trades, **`OrderSend`**, **`CTrade`**, archivos de comando hacia el terminal.
- Auto-aprobación de estrategias o mutación de registry desde el launcher.
- Claims de rentabilidad o “listo para vivir de trading”.

---

## 5. Configuration schema proposal

Esquema **conceptual** (no código, no validación en runtime en D2). Agrupa defaults seguros.

### `app`

| Campo | Rol |
|-------|-----|
| `runtimeMode` | Modo de producto (ver §7). |
| `environment` | p.ej. `development` / `production` (semántica por definir en implementación). |
| `executionEnabled` | **false** por defecto. |
| `autoApprovalEnabled` | **false** por defecto. |
| `readOnly` | **true** por defecto para capas de revisión. |

### `api`

| Campo | Rol |
|-------|-----|
| `host` | Bind / host de escucha (p.ej. `127.0.0.1`). |
| `port` | Puerto API (propuesto **3001** en §12). |
| `healthPath` | Ruta HTTP de health liveness (hoy existe **`/api/healthz`** como referencia). |
| `baseUrl` | URL base para enlaces y chequeos (coherente con host/port). |

### `dashboard`

| Campo | Rol |
|-------|-----|
| `host` | Host del servidor Vite/preview. |
| `port` | Puerto UI (propuesto **5173** en §12). |
| `openBrowser` | Si el launcher debe abrir navegador. |
| `basePath` | Base path de la app (p.ej. `/`). |

### `mt5`

| Campo | Rol |
|-------|-----|
| `enabled` | **false** hasta configuración explícita del operador. |
| `terminalPath` | Ruta al terminal (p.ej. `terminal64.exe`), si se usa detección manual. |
| `dataFolder` | Carpeta de datos del terminal si aplica. |
| `mql5FilesFolder` | Resolución hacia `MQL5/Files` o equivalente. |
| `defaultBrokerSymbol` | Símbolo como lo muestra el broker (opcional). |
| `defaultInternalSymbol` | Símbolo canónico interno (p.ej. `XAUUSD`). |
| `defaultTimeframe` | p.ej. `M15`. |
| `symbolMapping` | Mapa broker ↔ interno. |

### `bridge`

| Campo | Rol |
|-------|-----|
| `enabled` | **false** hasta configuración explícita. |
| `bridgeFolder` | Carpeta de staging/exports según contrato. |
| `expectedFiles` | Lista opcional de nombres esperados para sanity check. |
| `lastSeenMaxAgeSeconds` | Umbral para marcar **stale** si hay política de frescura. |

### `import`

| Campo | Rol |
|-------|-----|
| `localHistoryFolder` | Históricos grandes locales (típicamente fuera de Git). |
| `exportStagingFolder` | Staging de exports MT5/EA. |
| `allowLargeFiles` | Política explícita; default conservador. |
| `maxFileSizeMb` | Límite orientativo para UX/diagnostics. |

### `logs`

| Campo | Rol |
|-------|-----|
| `logsFolder` | Directorio raíz de logs del launcher/runtime. |
| `logLevel` | Nivel sugerido para componentes unificados. |
| `keepDays` | Retención sugerida (política por implementar). |

### `safety`

Duplica flags críticos para que el launcher pueda **mostrar** y **bloquear** modos inseguros sin depender solo del backend.

| Campo | Default propuesto |
|-------|-------------------|
| `executionEnabled` | **false** |
| `sendToMt5Enabled` | **false** |
| `canAutoExecute` | **false** |
| `registryMutationAllowed` | **false** |
| `manualReviewRequired` | **true** |

### Reglas de defaults (cerradas en D2)

- `executionEnabled`: **false**
- `sendToMt5Enabled`: **false**
- `canAutoExecute`: **false**
- `autoApprovalEnabled`: **false**
- `registryMutationAllowed`: **false**
- `manualReviewRequired`: **true**
- `mt5.enabled`: **false** hasta configuración explícita
- `bridge.enabled`: **false** hasta configuración explícita
- `runtimeMode` por defecto: **`mock`** o **`manual-import`** — **no** `live-read-only` hasta aprobación formal

---

## 6. Example config

Ejemplo **conceptual** (diseño únicamente). **No** es configuración activa del repo; **no** debe commitearse con rutas personales, cuentas reales ni secretos.

```json
{
  "app": {
    "runtimeMode": "manual-import",
    "environment": "development",
    "executionEnabled": false,
    "autoApprovalEnabled": false,
    "readOnly": true
  },
  "api": {
    "host": "127.0.0.1",
    "port": 3001,
    "healthPath": "/api/healthz",
    "baseUrl": "http://127.0.0.1:3001"
  },
  "dashboard": {
    "host": "127.0.0.1",
    "port": 5173,
    "openBrowser": true,
    "basePath": "/"
  },
  "mt5": {
    "enabled": false,
    "terminalPath": null,
    "dataFolder": null,
    "mql5FilesFolder": null,
    "defaultInternalSymbol": "XAUUSD",
    "defaultBrokerSymbol": null,
    "defaultTimeframe": "M15",
    "symbolMapping": {}
  },
  "bridge": {
    "enabled": false,
    "bridgeFolder": null,
    "expectedFiles": [],
    "lastSeenMaxAgeSeconds": 120
  },
  "import": {
    "localHistoryFolder": "data/mt5-history",
    "exportStagingFolder": "data/mt5-exports",
    "allowLargeFiles": false,
    "maxFileSizeMb": 25
  },
  "logs": {
    "logsFolder": "logs",
    "logLevel": "info",
    "keepDays": 14
  },
  "safety": {
    "executionEnabled": false,
    "sendToMt5Enabled": false,
    "canAutoExecute": false,
    "registryMutationAllowed": false,
    "manualReviewRequired": true
  }
}
```

---

## 7. Runtime modes

| Modo | Descripción |
|------|-------------|
| **mock** | Datos y respuestas simuladas / mocks; sin MT5 real; sin import automático; baseline seguro para desarrollo. |
| **manual-import** | El operador usa archivos locales (validados vía CLI/importador core); **sin** watcher; **sin** runtime MT5 en Node; **sin** ejecución. |
| **historical** | **Futuro**: datasets históricos locales ya validados y trazables; **sin** live. |
| **live-read-only** | **Futuro**: solo lectura desde fuentes acordadas; requiere **aprobación formal** previa; **sin** ejecución de órdenes; `executionEnabled` sigue **false** salvo fase explícita aparte. |
| **disabled / error** | Estado seguro ante configuración inválida o fallo de arranque; no continuar como si todo estuviera OK. |

**No** existe en este diseño un modo **live-trading** activo para el launcher.

---

## 8. Runtime status model

Modelo **conceptual** para un futuro panel o payload unificado. Los valores deben ser honestos respecto a qué se comprobó.

### `api`

| Campo | Notas |
|-------|--------|
| `status` | `unknown` \| `not_started` \| `starting` \| `ok` \| `error` |
| `url` | URL efectiva o pretendida |
| `port` | Puerto configurado |
| `lastCheckedAt` | ISO-8601 o null si nunca |
| `error` | Mensaje seguro para usuario (sin secretos) |

### `dashboard`

Misma idea que `api` (`status`, `url`, `port`, `lastCheckedAt`, `error`).

### `mt5`

| Campo | Notas |
|-------|--------|
| `status` | `unknown` \| `not_configured` \| `not_checked` \| `detected` \| `not_found` \| `error` |
| `enabled` | De config |
| `terminalPath`, `dataFolder`, `mql5FilesFolder` | Eco de config o paths resueltos |
| `lastCheckedAt`, `error` | Auditoría |

**Regla:** `detected` significa alfilerazgo de **existencia/path** según chequeo implementado, **no** “cuenta conectada” ni “bridge operativo”.

### `bridge`

| Campo | Notas |
|-------|--------|
| `status` | `unknown` \| `not_configured` \| `not_checked` \| `available` \| `stale` \| `missing` \| `error` |
| `enabled` | De config |
| `bridgeFolder` | Path |
| `expectedFiles` | Lista esperada |
| `lastSeenAt`, `lastFile` | Si hay política de frescura |
| `error` | Human-safe |

**Regla:** `available` **no** implica señales aprobadas ni ejecución permitida.

### `data`

| Campo | Ejemplo de uso |
|-------|----------------|
| `status` | Resultado del último import manual / dataset activo |
| `sourceMode` | mock / manual-import / historical / … |
| `symbol`, `timeframe` | Metadatos declarados |
| `candleCount`, `lastCandleTime` | Resumen no sensible |
| `warnings` | Lista corta |

**Regla:** datos “OK” **no** implican rentabilidad.

### `safety`

Reflejo explícito de flags: `executionEnabled`, `sendToMt5Enabled`, `canAutoExecute`, `autoApprovalEnabled`, `registryMutationAllowed`, `manualReviewRequired`.

### `overall`

| Campo | Notas |
|-------|--------|
| `status` | `unknown` \| `ok` \| `degraded` \| `blocked` \| `error` |
| `message` | Resumen conservador |

### Reglas semánticas

- **`unknown`**: no se ejecutó verificación; **no** es equivalente a OK.
- **`not_configured`**: falta configuración explícita del operador.
- **`detected`** (MT5): no significa bridge conectado ni datos live válidos.
- **`available`** (bridge): no significa aprobación de estrategia ni ejecución.
- **`executionEnabled`** en status debe seguir **false** en todas las fases cubiertas por este diseño.

---

## 9. Status examples

Ejemplos **ilustrativos** (no son respuestas reales del sistema hoy).

### A. Current development mock mode

```json
{
  "api": { "status": "unknown", "url": "http://127.0.0.1:3001", "port": 3001, "lastCheckedAt": null, "error": null },
  "dashboard": { "status": "unknown", "url": "http://127.0.0.1:5173", "port": 5173, "lastCheckedAt": null, "error": null },
  "mt5": { "status": "not_configured", "enabled": false, "terminalPath": null, "dataFolder": null, "mql5FilesFolder": null, "lastCheckedAt": null, "error": null },
  "bridge": { "status": "not_configured", "enabled": false, "bridgeFolder": null, "expectedFiles": [], "lastSeenAt": null, "lastFile": null, "error": null },
  "data": { "status": "unknown", "sourceMode": "mock", "symbol": null, "timeframe": null, "candleCount": null, "lastCandleTime": null, "warnings": [] },
  "safety": { "executionEnabled": false, "sendToMt5Enabled": false, "canAutoExecute": false, "autoApprovalEnabled": false, "registryMutationAllowed": false, "manualReviewRequired": true },
  "overall": { "status": "unknown", "message": "Components not verified; mock/in-process development posture." }
}
```

### B. Manual import mode with valid CSV

```json
{
  "api": { "status": "ok", "url": "http://127.0.0.1:3001", "port": 3001, "lastCheckedAt": "2026-05-09T12:00:00.000Z", "error": null },
  "dashboard": { "status": "ok", "url": "http://127.0.0.1:5173", "port": 5173, "lastCheckedAt": "2026-05-09T12:00:05.000Z", "error": null },
  "mt5": { "status": "not_configured", "enabled": false, "terminalPath": null, "dataFolder": null, "mql5FilesFolder": null, "lastCheckedAt": null, "error": null },
  "bridge": { "status": "not_configured", "enabled": false, "bridgeFolder": null, "expectedFiles": [], "lastSeenAt": null, "lastFile": null, "error": null },
  "data": { "status": "ok", "sourceMode": "manual-import", "symbol": "XAUUSD", "timeframe": "M15", "candleCount": 120, "lastCandleTime": "2026-05-09T11:45:00.000Z", "warnings": [] },
  "safety": { "executionEnabled": false, "sendToMt5Enabled": false, "canAutoExecute": false, "autoApprovalEnabled": false, "registryMutationAllowed": false, "manualReviewRequired": true },
  "overall": { "status": "ok", "message": "Local validated import summary only; not profitability proof." }
}
```

### C. Future MT5 configured but not found

```json
{
  "mt5": { "status": "not_found", "enabled": true, "terminalPath": "C:\\\\Program Files\\\\MetaTrader 5\\\\terminal64.exe", "dataFolder": null, "mql5FilesFolder": null, "lastCheckedAt": "2026-05-09T12:00:00.000Z", "error": "terminal path not found" },
  "safety": { "executionEnabled": false, "sendToMt5Enabled": false, "canAutoExecute": false, "autoApprovalEnabled": false, "registryMutationAllowed": false, "manualReviewRequired": true },
  "overall": { "status": "degraded", "message": "MT5 enabled in config but terminal not found; execution remains disabled." }
}
```

### D. Future bridge stale

```json
{
  "bridge": { "status": "stale", "enabled": true, "bridgeFolder": "D:\\\\exports\\\\bridge", "expectedFiles": ["candles.csv"], "lastSeenAt": "2026-05-09T10:00:00.000Z", "lastFile": "candles.csv", "error": null },
  "safety": { "executionEnabled": false, "sendToMt5Enabled": false, "canAutoExecute": false, "autoApprovalEnabled": false, "registryMutationAllowed": false, "manualReviewRequired": true },
  "overall": { "status": "degraded", "message": "Bridge folder reachable but data stale vs policy; no execution." }
}
```

**No** se incluye ejemplo de live trading real.

---

## 10. Health check rules

- **API health** (p.ej. `GET /api/healthz`): prueba **solo** disponibilidad del servicio HTTP y respuesta mínima acordada; **no** prueba MT5 ni bridge.
- **Dashboard health**: prueba **solo** que el servidor de la UI responde; **no** prueba cuenta ni datos del broker.
- **MT5 health futuro**: puede comprobar paths/presencia según política; **nunca** debe reportar “conectado al mercado” como si fuera cuenta real sin definición explícita y sin mezclar con ejecución.
- **Bridge health futuro**: basado en **archivos**, **mtime**, contrato y política de frescura; **no** implica validez comercial ni aprobación de estrategia.
- El **runtime status** debe etiquetar el **modo** (`mock`, `manual-import`, …) para evitar confusiones con live.
- Si **no** se ejecutó un chequeo, el estado debe ser **`unknown`** o **`not_checked`** — **prohibido** mostrar `ok` por defecto.

---

## 11. Logging design

Archivos/sinks **propuestos** para un launcher maduro (implementación futura):

| Log | Propósito |
|-----|-----------|
| `startup.log` | Secuencia de arranque del launcher |
| `api.log` | Salida del proceso API (o redirect desde child) |
| `dashboard.log` | Servidor UI |
| `mt5.log` | Diagnósticos de paths/detection |
| `bridge.log` | Lecturas/carpeta bridge |
| `import.log` | Validaciones CLI/import |
| `launcher.log` | Decisiones del orquestador |
| `safety.log` | Eventos de política y bloqueos |

**Hoy:** no existe `logsFolder` unificado del launcher; la API ya puede usar logger propio y `LOG_LEVEL` en entorno. El launcher futuro debería **centralizar** política de carpeta y rotación.

---

## 12. Ports and process lifecycle

- **API**: puerto propuesto por defecto **3001** (debe coincidir con `PORT` en entorno actual).
- **Dashboard**: puerto propuesto **5173** (default Vite si no se sobrescribe).
- El launcher debe **validar puertos** antes de iniciar hijos y fallar con mensaje claro si están ocupados.
- Debe **evitar instancias duplicadas** (mutex, lockfile o política documentada).
- Debe poder **terminar procesos hijos** en shutdown ordenado.
- **D2 no implementa** esta lógica; solo la documenta como requisito.

---

## 13. Windows considerations

- Rutas con **espacios** deben ir entre comillas y escaparse correctamente en scripts.
- Ejecutable típico: **`terminal64.exe`**.
- Rutas de datos suelen vivir bajo estructuras tipo **`AppData\MetaQuotes\Terminal\<id>\MQL5\Files`** (variación por instalación).
- Operadores pueden usar **PowerShell**, **cmd** o **Git Bash**: la documentación de launcher debe fijar **una** forma soportada o detectar shell.
- Variables como **`PORT`** tienen sintaxis distinta (`$env:PORT` vs `set PORT=`).
- Para usuario final: **rutas absolutas** en config y advertencia de no commitear paths personales.

---

## 14. Security rules

- **No** `OrderSend`, **no** `CTrade`, **no** archivos de comando de trade hacia MT5 desde este diseño.
- **No** camino señal→orden.
- **No** auto-aprobación ni mutación de registry desde el launcher en fases cubiertas aquí.
- **No** ejecución real ni modo live-trading activo.
- Postura **read-only / revisión manual** por defecto.
- **No** claims de rentabilidad ni promesas de performance.

---

## 15. D2 decisions

| Decisión | Estado |
|----------|--------|
| D2 es **diseño documental**, sin código | Cerrado |
| Config con **defaults seguros** | Cerrado |
| **`unknown` / `not_configured`** son estados válidos y deseables cuando aplique | Cerrado |
| **MT5/bridge no se simulan** como conectados sin evidencia | Cerrado |
| **Dev start script** → fase **D3** o posterior (según `RUNTIME_AND_LAUNCHER_STRATEGY.md`) | Cerrado |
| **Launcher .exe** prototipo → **D4+** u orden equivalente aprobado | Cerrado |

---

## 16. Proposed next checkpoints

Orden **orientativo** (ajustable por producto):

| ID | Tema |
|----|------|
| **D3.1** | Dev **preflight** — chequeos read-only + comandos documentados (**implementado** en `@workspace/scripts`; no launcher; sin procesos hijos) |
| **D3.2** | Dev **start** MVP — levanta API + dashboard en modo desarrollo (**implementado** como `mapazapp:dev-start`; **no** launcher `.exe`; **sin** runtime MT5 integrado; bridge/MT5 “conectado” **no** aplica) |
| **D3.3+** | Mejoras futuras de orquestación dev / packaging (si se aprueba) |
| **D4** | Runtime status model en **TypeScript puro** — código en **`APP/lib/mapazapp-core/src/runtime-status.ts`** (**D5.1a** lo consolidó en `@workspace/mapazapp-core`); tipos + helpers; **sin** probes MT5/bridge reales en el modelo |
| **D5 / D5.1b** | **`GET /api/mapazapp/runtime/status`** en `@workspace/api-server` — read-only, mock envelope; MT5/bridge **`not_configured`**; **no** sustituye probes futuros ni launcher |
| **D6** | Panel dashboard de runtime status (copy anti-confusión mock vs real) — **D6.3.1** montaje en Config |
| **D7.1** | **Diseño documental del action bridge** dashboard ↔ API local / launcher — [`ACTION_BRIDGE_DESIGN.md`](./ACTION_BRIDGE_DESIGN.md); **sin** código, **sin** `POST`, **sin** launcher `.exe`; el puente de acciones se define **antes** del prototipo launcher |
| **D7.2 / D7.3** | Modelo TS **`ActionResult`** y cliente de acciones (si se aprueba) — **sin** endpoints obligatorios / **sin** botones |
| **D8.0 / D8.1** | Auditoría y diseño del **prototipo launcher** + bridge launcher-side (IPC/API interna) |
| **D9.0** | Primer endpoint local **acotado** / acción launcher equivalente (preflight u otra), con threat model mínimo |
| **D10.0** | Gate de **detección MT5** (paths/presencia, política; **sin** ejecución) |

Este documento debe revisarse antes de implementar **D5/D6** para no introducir payloads que parezcan “live ready” sin serlo.

### D4 implementado (modelo TS puro)

- Código: **`APP/lib/mapazapp-core/src/runtime-status.ts`** — export público vía `@workspace/mapazapp-core` (`export *` en `src/index.ts`). Tests: **`APP/lib/mapazapp-core/tests/d5-runtime-status-model-shared.d5.test.ts`** (vitest).
- **D5.1a:** refactor de ubicación compartida en `@workspace/mapazapp-core`.
- **D5.1b:** `GET /api/mapazapp/runtime/status` — snapshot honesto (API **`ok`** por responder; dashboard **`unknown`**; MT5/bridge **`not_configured`**); **no** estado MT5/bridge real.
- Propósito: contrato de datos **honesto** (`unknown` / `not_configured`, etc.) para futuros launcher/API/UI; **no** lectura de disco MT5, **no** `terminal64.exe`, **no** carpeta `MQL5/Files`, **no** ejecución.
- Los scripts **D3.x** aún **no** consumen este módulo (integración opcional en una fase posterior).
