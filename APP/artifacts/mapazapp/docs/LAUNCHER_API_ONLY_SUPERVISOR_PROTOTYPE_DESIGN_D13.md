# Mapazapp — Launcher API-only Supervisor Prototype Design D13

**Checkpoint D13.1 — diseño; D13.2 — implementación acotada.** Este documento especifica el **primer prototipo** de **launcher/supervisor** que orquesta **únicamente el proceso de la API** (`@workspace/api-server`), alineado a **D13.0** (opción **A**), **D11.4–D11.6**, **D11.8–D11.9**, y evidencias **D12**. En **D13.1** no había código; **D13.2** añade el prototipo ejecutable bajo alcance aprobado.

**Implementación D13.2 (API-only):** desde `APP/`, `pnpm --filter @workspace/scripts mapazapp:api-only-supervisor` (opciones `--help`, `--json`, `--skip-build`, `--max-wait-ms`, `--api-host`, `--api-port`). Código: `APP/scripts/src/mapazapp-api-only-supervisor.ts` — **`spawn` / `child_process` solo en este archivo** para build/start del `api-server` vía **`node build.mjs`** / **`node --enable-source-maps ./dist/index.mjs`** en `artifacts/api-server` (equivalente workspace a `pnpm --filter @workspace/api-server build|start`, PID hijo = listener); **sin** dashboard, MT5, `POST`, ni `.exe`.

**Relacionado:** [`NEXT_RUNTIME_EXPANSION_GATE_D13.md`](./NEXT_RUNTIME_EXPANSION_GATE_D13.md), [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md), [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md), [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md), [`FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md`](./FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md), [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`API_ONLY_RUN_EVIDENCE_D12.md`](./API_ONLY_RUN_EVIDENCE_D12.md), [`HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`](./HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md) (contexto D12; el prototipo D13.2 **no** incluye dashboard).

---

## 1. Purpose

- **D12** demostró **manualmente** runs supervisados: **API-only** y **API + dashboard**, con **health**, **runtime status**, **CORS** y verificación **visual humana** del dashboard (**D12.11**).
- **D13.0** decidió que el **siguiente salto** priorizado es un **supervisor API-only** antes de MT5, `POST`, transporte de acciones o empaquetado **`.exe`**.
- **D13.1** **diseñó** ese prototipo: flujos, reglas de ownership, evidencia, fallos y tests **obligatorios** alrededor de **D13.2**.
- **D13.2** (tras aprobación explícita) **implementa** el supervisor API-only y permite **run real** controlado; el `spawn` queda **confinado** a `mapazapp-api-only-supervisor.ts` (no extender sin nuevo gate).
- **D13.3** archivará evidencia del primer run bajo supervisor (plantilla §7 / salida `--json`).

---

## 2. Current baseline

| Elemento | Estado relevante |
|----------|-------------------|
| API en loopback | En runs D12: **`127.0.0.1:3001`** vía `MAPAZAPP_API_HOST` / `MAPAZAPP_API_PORT` (también admite `PORT` en modelo **D9.10** / `createApiHardeningConfigFromEnv`). |
| Bootstrap | `APP/artifacts/api-server/src/index.ts` — `validateApiHardeningConfig` + `app.listen(port, host, …)`. |
| Health | **`GET /api/healthz`** — contrato en tests (p. ej. `mapazapp.health-contract.b5.test.ts`); **fail closed** si no responde **200** con payload esperado en el run. |
| Runtime status | **`GET /api/mapazapp/runtime/status`** — envelope read-only; debe seguir honesto (**mockOnly** / **reviewOnly**, ejecución deshabilitada). |
| Dashboard | Validado en D12 por humano; **fuera de alcance** del prototipo API-only (**D13.2**). |
| Modelos existentes (sin launcher productivo) | `mapazapp-launcher-config-model.ts` (**D11.1**), `mapazapp-launcher-process-lifecycle.ts` (**D11.4**), `mapazapp-launcher-ownership-model.ts` (**D11.5**), `mapazapp-e2e-dry-run.ts` (**D11.2**), `mapazapp-dev-preflight.ts` (**D3.1**). |
| `mapazapp-dev-start.ts` (**D3.2**) | Helper de desarrollo con **`spawn`** de **API + dashboard**; **no** es el supervisor de producto; el prototipo D13.2 debe **diferenciarse** por alcance (**solo API**) y política de evidencia/ownership explícita en este diseño. |
| Launcher real / `.exe` | **No** existe. |

---

## 3. Scope of the prototype

### Permitido en **D13.2** (tras aprobación), según este diseño

- Un **supervisor** (proceso padre o script documentado) que **solo** supervise el **servicio API**.
- Arranque de la API en **`127.0.0.1:3001`** (sin cambio automático de puerto).
- **Registro** del **PID** del hijo creado por el supervisor (`ownedByLauncher === true` solo en ese caso).
- Comprobación de que el **puerto 3001** está **libre** **antes** del start.
- **Verificación** vía **`GET /api/healthz`** y **`GET /api/mapazapp/runtime/status`** con timeouts acotados.
- **Stop** que envíe señal de terminación **solo** al PID registrado como propio.
- **Captura de evidencia** (lista §7) para archivo de run tipo **D12.1**.

### Prohibido en **D13.2** (sin nuevo gate)

- Dashboard, Vite, segundo hijo, `mapazapp:dev-start` como “producto”.
- MT5, watcher, command files, trading, `OrderSend` / `CTrade`.
- Endpoints **`POST`** / action routes, IPC real de acciones, DB, WebSocket live.
- Launcher **`.exe`**, instalador, `localStorage`, polling nuevo no especificado aquí.
- **`taskkill` amplio**, kill por nombre de imagen global, `process.kill` sobre PIDs no registrados como propios.

---

## 4. Proposed supervisor flow

### 1) Preflight

| Paso | Acción | Notas |
|------|--------|--------|
| Git (opcional / documental) | Registrar `git rev-parse HEAD` y `git status --short` en plantilla de evidencia | No sustituye aprobación humana **D11.8**. |
| Validar config | Usar / alinear con **`LauncherConfig`** (**D11.1**): host/puerto API, flags `allowProcessStart`, `allowMt5Launch`, `allowCommandFiles`, `actionTransportEnabled` | Para D13.2: **`allowProcessStart`** solo si política explícita lo permite; **`allowMt5Launch`** / **`allowCommandFiles`** **false** o equivalente seguro; **`actionTransportEnabled`** / transport API **disabled**. |
| Host/port | Fijar **`MAPAZAPP_API_HOST=127.0.0.1`**, **`MAPAZAPP_API_PORT=3001`** (o lectura equivalente vía modelo duro en script) | Coherente con `apiHardeningConfig` / `index.ts`. |
| Puerto 3001 libre | Sonda **read-only** (misma familia que **D3.1** / ownership **D11.5**: rol `api`) | Si **ocupado por otro proceso** ⇒ **no start**, estado **`occupied_by_other`** / conflicto documentado; **no** matar al ocupante. |
| Action transport | Confirmar política **`actionTransportPolicy: disabled`** (o equivalente en env) para el run | Alineado **D9.10**; sin `POST` de acciones. |
| MT5 | `mt5` / bridge en config y en runtime status: **`not_configured`** / no ready paths | Sin launch, sin watcher. |

### 2) Build

- **Recomendación D13.2:** **`pnpm --filter @workspace/api-server build` obligatorio en una fase previa explícita** (CI local o paso manual firmado en el ticket de aprobación), **antes** del `start` supervisado.
- Alternativa **no recomendada** para el primer run: build dentro del mismo proceso que hace `spawn` del `start` — aumenta tiempo hasta health y mezcla fallos; si se acepta, debe documentarse igual en evidencia.
- **Build fail** ⇒ **fail closed**, no intentar `start` con `dist` incompleto.

### 3) Start

- **Comando futuro típico** (desde `APP/`, como en D12), **sin** `.exe`:

```bash
MAPAZAPP_API_HOST=127.0.0.1 MAPAZAPP_API_PORT=3001 pnpm --filter @workspace/api-server start
```

(PowerShell: variables de entorno equivalentes.)

- **D13.2:** si se añade código de supervisor, **`child_process.spawn`** (o API equivalente aprobada) **solo aquí**, una vez cumplido preflight + build OK.
- Tras `spawn`: guardar **PID**, **`startedAt`**, **`commandLabel`** seguro (p. ej. `api_server` — **etiqueta**, no shell libre; **D11.4**), **`ownedByLauncher: true`**.

### 4) Health

- **`GET http://127.0.0.1:3001/api/healthz`**
- **Timeout** recomendado: **2–5 s** (valor exacto fijado en ticket **D13.2** / evidencia); si expira ⇒ **fallo de fase**, sin reintentos agresivos que abran más sockets en bucle.
- Respuesta no **200** o payload inválido ⇒ **fail closed**.

### 5) Runtime status (seguridad)

- **`GET http://127.0.0.1:3001/api/mapazapp/runtime/status`**
- **Checks mínimos (fail closed si incumple):**
  - `executionEnabled` **false** (o ausencia interpretada como no habilitado — criterio exacto acordado con el adapter actual).
  - `reviewOnly` **true** donde aplique al envelope.
  - MT5 / bridge: **`not_configured`** (o equivalente conservador aprobado).
  - Copy interno / flags: **sin** “ready to trade”, **sin** “live trading”, **sin** claims de ejecución real.
- Si el JSON no parsea o campos críticos faltan ⇒ **fail closed** (no declarar run OK).

### 6) Stop

- Enviar **SIGINT/SIGTERM** (o señal Windows documentada en **D13.2**) **solo** al **PID hijo registrado** con `ownedByLauncher === true`.
- **No** `taskkill /F` amplio, **no** matar por `ImageName`, **no** `process.kill` sobre PIDs no propios.
- Post-stop: verificar **liberación del puerto 3001** y que el **PID ya no exista** como listener (sonda acotada); si falla cleanup ⇒ **reportar en evidencia** §7 sin intentar destruir procesos ajenos.

---

## 5. Process ownership rules

- **`ownedByLauncher`** es **`true` solo si** el supervisor obtuvo el PID **directamente** del `spawn` (o equivalente) del proceso API (**D11.6** §3).
- Si el puerto **3001** estaba **ocupado antes** del start ⇒ **no** se inició hijo propio ⇒ **`ownedByLauncher`** permanece **false**; el supervisor **no** debe detener al ocupante.
- **No** “adoptar” PIDs encontrados por escaneo de puerto sin hijo creado por este run.
- **No** reutilizar un PID almacenado de un run anterior sin validación de identidad de proceso (mitigar **PID reuse** — política cualitativa **D11.6** §11: ante duda, **no** señal).
- **Estado mínimo en memoria** (registro de run) recomendado, alineado **D11.4**:
  - `kind`: **`api`**
  - `pid`: número | `null`
  - `port`: **3001**
  - `startedAt`: ISO-8601
  - `commandLabel`: string **seguro** / catalogado
  - `ownedByLauncher`: boolean
  - `status`: p. ej. `not_started` | `starting` | `running` | `stopping` | `stopped` | `failed`

---

## 6. Port ownership rules

- **Antes del start:** el rol **`api`** para puerto **3001** debe evaluarse a **`available`** (modelo conceptual **D11.5**: `LauncherPortOwnershipStatus`).
- Si **`occupied_by_other`**: resultado **`conflict`**; **no** start; evidencia con mensaje **redactado** (sin rutas de terceros).
- **Tras start exitoso:** comprobar que el **listener** en **3001** corresponde al **PID** del hijo registrado (mecanismo OS concreto definido en **D13.2** — p. ej. `netstat`/`Get-NetTCPConnection` bajo política de redacción). Si **no coincide** ⇒ marcar **`failed`** / mismatch, ejecutar **cleanup solo si** el hijo sigue siendo el registrado; si la correlación es ambigua ⇒ **parada segura** + intervención humana.
- **Sin** puerto alternativo automático en **D13.2**: el prototipo falla si **3001** no es el acordado.

---

## 7. Logging and evidence

### Evidencia mínima obligatoria (plantilla de run **D13.2** / **D13.3**)

1. Hash de commit (`git rev-parse HEAD`).
2. `git status --short` inicial y final.
3. Resultado **preflight** (resumen, sin datos sensibles).
4. Resultado **build** (éxito / fallo; sin log crudo de paths completos de usuario).
5. **`commandLabel`** y variante del comando (sin secretos).
6. **PID** registrado (solo el propio).
7. **Puerto** y host.
8. Respuesta **healthz** (códigos + cuerpo **truncado/redactado** si aplica).
9. **Resumen** de `runtime/status` (flags clave; **no** volcar JSON completo si contiene rutas).
10. Logs **sanitizados** del supervisor (si existen) — política **D9.14.2** / redacción API.
11. **Método de stop** (señal usada) y resultado.
12. Confirmación **puerto libre** post-stop.
13. `git status --short` final.

### No loguear / no archivar en claro

- Rutas privadas del usuario, tokens, **raw body** de requests, CSV crudo, datos de cuenta/broker, secretos, **allowedOrigins** completos si contienen datos sensibles (preferir “conteo” o hash no reversible acordado).

---

## 8. Failure handling

Todos los casos: **fail closed**, **sin** reintentos destructivos, **sin** dashboard, **sin** MT5, **sin** `taskkill` amplio.

| Fallo | Respuesta del supervisor |
|-------|---------------------------|
| Puerto ocupado | Abort preflight; estado `occupied_by_other`; **no** start. |
| Build fail | Abort; no `spawn` de `start`. |
| Start fail (spawn error) | `failed`; sin PID propio o PID inválido; evidencia del error **redactado**. |
| API no escucha | Timeout start; si hay PID pero no listen coherente ⇒ **stop propio si owned** + `failed`. |
| Health fail / timeout | `failed` post-start; teardown del hijo **si** `ownedByLauncher`. |
| Runtime status “unsafe” | Tratar como fallo de verificación; mismo teardown que health fail. |
| Proceso sale temprano | `on('exit')` / equivalente; marcar `failed`; **no** reinicio en bucle sin política aprobada (**D11.6** §10). |
| Stop fail | Registrar en evidencia; **no** escalar a kill global; operador interviene manualmente con comando documentado **fuera** del supervisor. |
| PID mismatch post-start | **No** asumir ownership extendido; **fail closed** + evidencia. |
| Logs con datos sensibles | Fallo de cumplimiento de redacción; run **no OK** hasta corregir configuración de logging. |

---

## 9. Tests required before / with implementation (D13.2)

Antes de declarar **D13.2** mergeable / run aprobado, debe existir cobertura automatizada (o plan explícito en el mismo PR si algunos tests son integración manual documentada) que incluya:

| # | Caso |
|---|------|
| 1 | **Start bloqueado** si puerto **3001** ocupado (mock de deps de sonda). |
| 2 | Tras start simulado: queda **registrado** un único proceso **owned**. |
| 3 | **Health timeout** ⇒ estado `failed` / no “OK” del run. |
| 4 | Respuesta runtime **unsafe** (p. ej. `executionEnabled: true` inyectado en test) ⇒ **bloquea** éxito del supervisor. |
| 5 | **Stop** solo envía señal al **PID** con `ownedByLauncher`. |
| 6 | **No kill** si `ownedByLauncher === false` (regresión contra kill accidental). |
| 7 | Tras stop: **puerto liberado** (mock / integración local acotada). |
| 8 | Logs / serializers: **paths redactados** donde aplique (alineación **D9.14.2**). |
| 9 | **Invariantes de alcance:** no arranque de dashboard, no MT5, no rutas `POST` nuevas (tests estáticos o de smoke acotados). |
| 10 | **Escaneo estático / grep** en CI (si aplica al repo): sin **`taskkill`**, sin **`OrderSend`** / **`CTrade`** en código nuevo del supervisor, sin referencias a command files prohibidos. |

---

## 10. D13.2 approval gate

**D13.2** (implementación + posible run real) **solo** procede si:

1. **D13.1** revisado y aceptado (este documento + enlaces en estrategia/handoff).
2. **Working tree limpio** en el momento del run acordado.
3. **Tests obligatorios** §9 **OK** en CI / máquina acordada.
4. **Puerto 3001 libre** verificado inmediatamente antes del start.
5. **Comando exacto** del run (incl. env vars) **escrito literalmente** en el registro de aprobación (**D11.8** §2.9).
6. **Cleanup** documentado: quién detiene, con qué señal, orden de verificación de puerto.
7. **Plantilla de evidencia** §7 acordada.

**D13.2** sigue siendo: **solo API**, **no** dashboard, **no** MT5, **no** watcher, **no** `POST` / action endpoints, **no** trading.

---

## 11. Recommended D13 sequence (refinada)

| ID | Descripción |
|----|-------------|
| **D13.1** | Diseño prototipo supervisor API-only (**este documento**); **sin** implementación. |
| **D13.2** | Implementación + run real **API-only**; **aprobación explícita**; `spawn` solo aquí si aprobado. |
| **D13.3** | Evidencia archivada del run bajo supervisor (análoga **D12.1**): hashes, health, runtime, cleanup, logs redactados. |
| **D13.4** | Diseño supervisor **API + dashboard** (segundo hijo, orden de start/stop, health dashboard). |
| **D13.5** | Prototipo / run **API + dashboard** bajo supervisor; **aprobación explícita** separada. |

**No** pasar a **MT5**, **`POST`**, ni **trading** en esta cadena sin **nuevas compuertas** documentadas.

---

## 12. Non-goals (D13.1)

Este checkpoint **no** implementa ni autoriza: código de supervisor productivo, **`spawn`**, **`child_process`**, arranque real de API/dashboard/MT5, watcher, command files, **`POST`**, action endpoints, DB, WebSocket live, trading, **`.exe`**, instalador, IPC real.
