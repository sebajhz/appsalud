# Mapazapp — API + Dashboard Supervisor Prototype Design D13

**Checkpoint D13.4 — diseño; D13.5 — implementado y primer run supervisado OK** (evidencia formal: [`API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md)). Este documento define el **prototipo** de supervisor **API + dashboard** (**dos procesos**, **3001** / **5173**), alineado a **D13.2–D13.3**, evidencias **D12** y políticas **D11.4–D11.6**, **D11.8**. **D13.5** añade el ejecutable bajo alcance aprobado: script **`mapazapp:api-dashboard-supervisor`** en `APP/scripts/src/mapazapp-api-dashboard-supervisor.ts` — **`spawn` / `child_process` solo en ese archivo**; API con **node** directo en `artifacts/api-server`; dashboard con **node** al CLI de **Vite** resuelto vía **`createRequire`** desde **`artifacts/mapazapp/package.json`** (resolución por **`vite/package.json`** → **`bin/vite.js`**; Vite 7 **no** exporta el subpath `vite/bin/vite.js` en `exports` — detalle en evidencia **D13.6**) (**sin** `pnpm.cmd` como dueño del LISTEN). **D13.4** sigue siendo la fuente de diseño; el código cumple §3–§11 salvo donde el ticket de implementación refine detalles.

**Relacionado:** [`API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md), [`API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md), [`LAUNCHER_API_ONLY_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./LAUNCHER_API_ONLY_SUPERVISOR_PROTOTYPE_DESIGN_D13.md), [`NEXT_RUNTIME_EXPANSION_GATE_D13.md`](./NEXT_RUNTIME_EXPANSION_GATE_D13.md), [`API_DASHBOARD_RUN_EVIDENCE_D12.md`](./API_DASHBOARD_RUN_EVIDENCE_D12.md), [`HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`](./HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md), [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md), [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md).

---

## 1. Purpose

- **D13.2** demostró un **supervisor API-only** funcional: preflight, start controlado, health + runtime safety, cleanup del hijo propio, salida JSON segura.
- **D13.3** archivó la **evidencia** de ese run (incluida la lección **wrapper vs listener**: **`node` directo** sobre `artifacts/api-server`, no **`pnpm.cmd` + shell** como proceso “dueño” del **LISTEN** en **3001**).
- **D13.4** (**este documento**) **diseña** el supervisor **API + dashboard** (dos hijos, dos puertos, verificación HTTP del front y **CORS** hacia la API).
- **D13.5** **implementa** el prototipo y permite **run real** controlado con **aprobación explícita**; comando: `pnpm --filter @workspace/scripts mapazapp:api-dashboard-supervisor` (opciones `--help`, `--json`, `--skip-build`, `--max-wait-ms`, `--api-host`, `--api-port`, `--dashboard-host`, `--dashboard-port`).
- **D13.6** [`API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md) archiva **evidencia** formal del run bajo supervisor API+dashboard (análogo **D13.3**); **solo** documentación, **sin** ejecutar procesos en ese checkpoint.
- **D13.7** (recomendado siguiente) — **compuerta de decisión** packaging/runtime (sin mezclarla con la implementación de **D13.5**).

---

## 2. Current baseline

| Elemento | Estado relevante |
|----------|-------------------|
| Supervisor **API-only** | **Implementado** (`mapazapp-api-only-supervisor.ts`); patrón seguro de start **API** documentado en **D13.3**. |
| Runs **manuales** API + dashboard | **D12** (`API_DASHBOARD_RUN_EVIDENCE_D12.md`): **3001** / **5173**, health, runtime, **GET** dashboard, **CORS** con `Origin: http://127.0.0.1:5173`. |
| Verificación visual **humana** | **D12.11** (`HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`) — **OK**; no sustituye controles técnicos del supervisor. |
| Supervisor **unificado** dos procesos | **No** existe aún; `mapazapp:dev-start` sigue siendo **helper de desarrollo**, no producto ni evidencia formal de launcher. |
| MT5 / watcher / **POST** / trading | Fuera de alcance; **no** asumidos en **D13.5** sin nuevas compuertas. |

---

## 3. Scope of future D13.5 prototype

### Permitido (tras aprobación explícita y diseño **D13.4** cerrado)

- Supervisar **solo** la API en **`127.0.0.1:3001`** y el dashboard dev en **`127.0.0.1:5173`** (puertos fijos acordados; **sin** puerto alternativo automático).
- Registrar el **PID real del listener** de cada servicio (correlación **puerto ↔ PID** coherente con el hijo creado y señalable).
- **`GET /api/healthz`** y **`GET /api/mapazapp/runtime/status`** en la API (mismos criterios de seguridad que **D13.2**).
- Verificación **HTTP** del dashboard: p. ej. **`GET http://127.0.0.1:5173/`** y, si aplica al contrato del run, **`GET /config`** (o ruta estable documentada en el ticket de aprobación).
- Verificación **CORS**: **`GET /api/mapazapp/runtime/status`** con cabecera **`Origin: http://127.0.0.1:5173`** (alineado a evidencia **D12** y allowlist **D9.13**).
- **Stop en orden**: dashboard primero, luego API; confirmar **5173** y **3001** libres.
- **Evidencia** según §8.

### Prohibido en **D13.5** (sin nuevos gates)

- MT5, watcher, command files, **`OrderSend`** / **`CTrade`**.
- Rutas **`POST`**, action endpoints, transporte de acciones, botones dashboard **operativos**.
- Launcher **`.exe`**, instalador, **IPC real** de acciones, **DB** operativa Mapazapp, **WebSocket live** nuevo, **polling** nuevo no especificado, **`localStorage`** nuevo obligatorio del flujo.
- **`taskkill`** amplio, kill por nombre de proceso global, `process.kill` sobre PIDs no registrados como propios.

---

## 4. Proposed supervisor flow

### 1) Preflight

| Paso | Acción | Notas |
|------|--------|--------|
| Config | Validar **`LauncherConfig`** / flags equivalentes: host/puertos API y dashboard; **`allowMt5Launch`** / command files **false** o **unsafe** bloqueado; **action transport** **disabled**. | Alineado **D11.1** / **D9.10**. |
| Puerto **3001** | Debe estar **libre** antes de cualquier start. | Si ocupado ⇒ **abort**, sin matar ocupante. |
| Puerto **5173** | Debe estar **libre** antes de cualquier start. | Si ocupado ⇒ **abort**. |
| Política de puerto | **No** aceptar puerto alternativo automático para API ni dashboard en **D13.5**. | Si Vite intenta otro puerto ⇒ **fail** + cleanup de lo ya iniciado por este run. |
| Orden lógico | Si el preflight de **API** (o de puertos compartidos) **falla**, **no** iniciar dashboard. | Fail closed. |

### 2) Build

| Decisión | Recomendación **D13.4** |
|----------|-------------------------|
| ¿Build dentro del supervisor? | **Recomendado:** fases de **build previo obligatorio** (CI local o pasos manuales firmados), **igual que cultura D13.2**: `pnpm --filter @workspace/api-server build` y `pnpm --filter @workspace/mapazapp build` **antes** del `start` supervisado. |
| Si build API falla | **No** `start` API ni dashboard. |
| Si build dashboard falla | **No** `start` API ni dashboard (evitar dejar solo API “para prueba” sin ticket; si ya se aceptara API-only degradado, debe ser **opción explícita** fuera del camino feliz **D13.5**). |

### 3) Start API

- **Reutilizar** el patrón probado en **D13.2**: **`spawn`** con **`process.execPath` (`node`)** ejecutando **`node --enable-source-maps ./dist/index.mjs`** bajo **`APP/artifacts/api-server`**, con **`MAPAZAPP_API_HOST` / `MAPAZAPP_API_PORT`** (u objeto equivalente validado).
- **No** usar **`pnpm.cmd` + shell** como proceso cuyo PID se asume listener de **3001** (lección **D13.3**).
- Registrar **PID del proceso cuyo LISTEN es 3001** (debe coincidir con el hijo directo si el diseño de **D13.5** lo garantiza).
- **Antes** de arrancar dashboard: **health** + **runtime status** **OK** y “seguros” (mismos invariantes que API-only).

### 4) Start dashboard

- **Variables típicas** (como en **D12.4**): p. ej. **`VITE_MAPAZAPP_API_BASE_URL=http://127.0.0.1:3001`**.
- **Comando dev** de referencia manual: `pnpm --filter @workspace/mapazapp dev -- --port 5173 --host 127.0.0.1` (desde **`APP/`**).
- **Riesgo:** el mismo problema **wrapper/listener** que en API: el PID del proceso raíz del **`pnpm`/shell** puede **no** ser el que hace **LISTEN** en **5173**.
- **Regla:** **D13.5** no debe declarar **ownedByLauncher** hasta que el diseño de implementación garantice **PID = listener** **o** se active la opción **D** (§7): **no** implementar hasta resolver ownership.
- **Puerto:** fijar **5173**; si el dev server reporta otro puerto o el pre-bind falla ⇒ **abort** + teardown API si aplica.

### 5) Checks

| Check | Descripción |
|-------|-------------|
| API health | **`GET http://127.0.0.1:3001/api/healthz`** — **200**, contrato acordado. |
| API runtime | **`GET http://127.0.0.1:3001/api/mapazapp/runtime/status`** — `executionEnabled` **false**, **reviewOnly** donde aplique, MT5/bridge **`not_configured`**, sin claims de trading. |
| Dashboard HTTP | **`GET http://127.0.0.1:5173/`** — **2xx** (umbral exacto en ticket **D13.5**). |
| Dashboard ruta útil | Opcional **`GET /config`** (o la ruta estable acordada) si aporta señal sin side-effects. |
| CORS | **`GET /api/mapazapp/runtime/status`** con **`Origin: http://127.0.0.1:5173`** — debe ser **200** y cuerpo coherente (no error CORS del servidor). |

### 6) Stop / cleanup

| Orden | Acción |
|-------|--------|
| 1 | Señal de terminación **solo** al hijo **dashboard** con **ownedByLauncher === true** y PID verificado como listener de **5173** cuando el mecanismo de correlación esté definido. |
| 2 | Esperar salida / timeout acotado; verificar **5173** libre (**waitUntilListenGone** o equivalente). |
| 3 | Señal **solo** al hijo **API** propio en **3001**. |
| 4 | Verificar **3001** libre. |
| Política | **No** `taskkill` amplio; **no** kill por imagen; si falla stop dashboard **no** escalar a destrucción global **sin** intervención humana documentada; si falla cleanup API, **reportar** en evidencia y dejar estado **failed** claro. |

---

## 5. Process ownership rules

- **API:** hereda reglas **D13.1** / **D13.2**: **`ownedByLauncher === true`** solo si el PID proviene del **`spawn`** del proceso que **realmente escucha** en **3001** (idealmente **`node`** directo sobre `dist`, no wrapper **`pnpm`**).
- **Dashboard:** la ownership **debe resolverse antes de codificar D13.5** (ver §7). Si el comando deja un **wrapper** y el **LISTEN** está en un hijo no registrado, el supervisor **no** debe asumir ownership del wrapper.
- **No** detener procesos que **no** fueron iniciados en este run (no “adopción” por puerto abierto).
- **No** reutilizar PID de sesiones anteriores sin correlación vigente puerto/PID.
- **Registro mínimo por hijo** (concepto **D11.4**): `kind` (**`api`** | **`dashboard`**), `pid`, `port`, `startedAt`, `commandLabel` (catálogo seguro), `ownedByLauncher`, `status` (`not_started` | `starting` | `running` | `stopping` | `stopped` | `failed`).

---

## 6. Port ownership rules

- **Antes del start:** **3001** y **5173** en estado **`available`** para los roles **api** y **dashboard** (modelo conceptual **D11.5**).
- Si cualquiera está **`occupied_by_other`** ⇒ **abort** completo; **no** start parcial.
- Si **API** arranca OK y **dashboard** falla ⇒ **teardown API** (no dejar API huérfana como “éxito parcial” salvo política explícita documentada como no-objetivo del camino feliz).
- Si el dashboard **elige otro puerto** (auto-incremento Vite) ⇒ **fail** + cleanup; **D13.5** debe fijar host/puerto de forma que **5173** sea el único éxito válido.
- Tras cada start exitoso: verificar correlación **listener ↔ PID** registrado cuando el mecanismo OS esté definido (misma familia de comprobación que **D13.1** §6).

---

## 7. Dashboard start strategy options

| Opción | Descripción breve | Ventajas | Riesgos | Wrapper vs listener | Cleanup | Notas |
|--------|-------------------|----------|---------|---------------------|---------|-------|
| **A** | **Vite / `mapazapp dev` vía `pnpm`** (como hoy en docs D12). | Mínima sorpresa para devs; reproduce comandos del manual. | Alto riesgo de **PID wrapper ≠ listener**; cleanup puede fallar como en API pre-**D13.3**. | **Mal** alineado por defecto. | Frágil si no se correlaciona hijo real. | **No recomendado** como primera implementación **D13.5** sin mitigación adicional. |
| **B** | **`node` directo** sobre el binario/entry de **Vite** (p. ej. resolver `vite` en `node_modules` del paquete `mapazapp` y ejecutar CLI con args `--port 5173 --host 127.0.0.1`). | Misma filosofía que API **D13.2**; mayor probabilidad de **PID = proceso Node** que abre **5173**. | Rutas `node_modules` y versiones; args exactos deben fijarse en ticket; distinto de `pnpm` filter paths. | **Mejor** que **A** si se valida en implementación. | Mejor que **A** si listener = hijo. | **Preferencia inicial** del autor del diseño **D13.4**, sujeta a spike de viabilidad en **D13.5** (sin spike en este doc). |
| **C** | **Script wrapper controlado** en `@workspace/scripts` que internamente garantice **un solo** proceso listener o re-exporte PID del nieto de forma explícita. | Encapsula complejidad; puede documentar contrato único. | Requiere diseño cuidadoso para **no** ocultar otro wrapper; más código. | Depende del diseño; riesgo medio. | Bueno si el contrato es claro. | Viable **después** de probar **B** o si **B** no es portable. |
| **D** | **No implementar** supervisor de dashboard hasta tener estrategia de ownership verificada (solo API supervisado o seguir manual D12). | Cero riesgo de cleanup incorrecto en **5173**. | No entrega el “un solo comando” para stack completo. | N/A | N/A | **Aceptable** si **B** no es viable sin trabajo mayor. |

**Preferencia inicial del diseño D13.4:** **B** o **D**. **Evitar repetir** el patrón **A** sin garantías fuertes de que el PID supervisado es el **listener** de **5173**.

---

## 8. Logging and evidence

### Evidencia mínima obligatoria (plantilla **D13.6** / salida `--json` de **D13.5**)

1. Hash de commit (`git rev-parse HEAD`).
2. `git status --short` inicial y final.
3. Resultados **build** API y dashboard (éxito/fallo, sin logs crudos enormes).
4. **`commandLabel`** y forma resumida del comando por hijo (sin secretos).
5. **PID API** y **PID dashboard** (solo los propios declarados **owned**).
6. Puertos **3001** / **5173** y hosts.
7. Resumen **healthz** (código + snippet redactado).
8. Resumen **runtime/status** (flags clave).
9. Resultado **GET** dashboard (`/` y `/config` si aplica) — códigos, tamaño/título redactado.
10. Resultado **CORS** (código + confirmación sin volcar cabeceras sensibles completas si no aporta).
11. Logs **sanitizados** del supervisor (**D9.14.2**).
12. Método de **stop** (orden dashboard → API) y resultado por fase.
13. Confirmación **puertos libres** post-stop.

### No loguear / no archivar en claro

Rutas privadas del usuario, tokens, **raw body**, CSV, secretos, stack traces completos, volcados masivos de logs, **allowedOrigins** completos si exponen datos sensibles.

---

## 9. Failure handling

Todos los casos: **fail closed**, **sin** reintentos destructivos, **sin** MT5, **sin** acciones dashboard operativas, **sin** `taskkill` amplio.

| Fallo | Respuesta |
|-------|-----------|
| **3001** ocupado (preflight) | Abort; no start; estado `occupied_by_other` / equivalente. |
| **5173** ocupado (preflight) | Abort; no start. |
| Build API falla | No procesos; evidencia build fail. |
| Build dashboard falla | No procesos; evidencia build fail. |
| Start API falla | No dashboard; evidencia; sin PID owned válido. |
| Health API falla / timeout | Teardown API si owned; `failed`. |
| Runtime **unsafe** | Teardown API (y dashboard si hubiera arrancado); `failed`. |
| Start dashboard falla | Teardown API; `failed`. |
| **Mismatch** de puerto dashboard | Fail + teardown API; evidencia `port_mismatch`. |
| **CORS** falla (Origin 5173) | Fail + teardown ordenado (dashboard si existe, luego API); `failed`. |
| Dashboard sale temprano (`exit`) | Marcar `failed`; iniciar cleanup ordenado. |
| Cleanup **dashboard** falla / timeout | Registrar; **no** escalar a kill global; API puede seguir política de teardown documentada; operador interviene con guía fuera del supervisor. |
| Cleanup **API** falla | Registrar en evidencia; mismo principio que **D13.2**. |
| **PID mismatch** post-start | Fail closed; no asumir ownership extendido; cleanup solo si criterio de seguridad lo permite. |
| **Fuga** de hijo wrapper | Tratar como fallo de diseño/implementación; run **no OK**; corregir estrategia §7 antes de reintentar evidencia formal. |

---

## 10. Tests required before D13.5

Antes de declarar **D13.5** mergeable / run aprobado, debe existir cobertura (tests automatizados y/o plan de integración explícito) que incluya:

| # | Caso |
|---|------|
| 1 | Preflight **bloquea** si **3001** ocupado (mock de sonda de puerto). |
| 2 | Preflight **bloquea** si **5173** ocupado. |
| 3 | Start **API** reutiliza / alinea comportamiento con tests del supervisor **API-only** (mocks de hijo + health + runtime). |
| 4 | Start **dashboard** registra proceso **owned** solo cuando el contrato de PID/listener esté satisfecho (tests con doble hijo simulado según diseño elegido). |
| 5 | **Mismatch** de puerto dashboard declarado vs real ⇒ fallo + cleanup API. |
| 6 | Runtime API **unsafe** ⇒ no éxito global; teardown de procesos propios iniciados. |
| 7 | Fallo de start **dashboard** tras API OK ⇒ **cleanup API**. |
| 8 | Fallo **CORS** ⇒ estado `failed` + cleanup **dashboard** luego **API** (orden). |
| 9 | Secuencia de **stop**: dashboard antes que API (test de orden de llamadas / estado). |
| 10 | **Stop** solo envía señal a PIDs **owned**. |
| 11 | **No kill** si `ownedByLauncher === false` para cualquier hijo. |
| 12 | Tras stop exitoso: **3001** y **5173** liberados (mock / integración acotada). |
| 13 | Salida **`--json`** estable y **segura** (sin fugas de rutas; alineación redacción). |
| 14 | **Escaneo estático / grep** (si aplica): sin **`taskkill`**, sin **`OrderSend`** / **`CTrade`**, sin referencias nuevas a command files, sin rutas **POST** de acciones en código del supervisor. |

---

## 11. D13.5 approval gate

**D13.5** (implementación + posible run real **API + dashboard**) **solo** procede si:

1. **D13.4** revisado y aceptado (**este documento** + enlaces en estrategia / handoff / gate D13).
2. **Estrategia de ownership del dashboard** resuelta (§7 **B** viable documentado, o **C** aceptado, o decisión explícita de **D** pospone dashboard).
3. **Working tree limpio** en el momento del run acordado.
4. Tests §10 **OK** en CI / máquina acordada.
5. **3001** y **5173** libres inmediatamente antes del start.
6. **Orden de cleanup** doble definido y probado por tests.
7. **Plantilla de evidencia** §8 acordada para **D13.6**.

**D13.5** sigue siendo: **solo API + dashboard**; **no** MT5, watcher, **`POST`**, action endpoints, trading, **`.exe`**.

---

## 12. Recommended D13 sequence (refinada post–D13.3)

| ID | Descripción |
|----|-------------|
| **D13.1** | Diseño supervisor **API-only** ([`LAUNCHER_API_ONLY_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./LAUNCHER_API_ONLY_SUPERVISOR_PROTOTYPE_DESIGN_D13.md)). |
| **D13.2** | Implementación + run **API-only**. |
| **D13.3** | Evidencia run API-only ([`API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md)). |
| **D13.4** | **Este documento** — diseño supervisor **API + dashboard**, **sin** implementación. |
| **D13.5** | **Implementado** — `mapazapp:api-dashboard-supervisor` (`mapazapp-api-dashboard-supervisor.ts`); run real bajo **aprobación explícita** y criterios §11. |
| **D13.6** | Evidencia archivada del run **D13.5** (hashes, health, CORS, HTTP dashboard, cleanup doble). |
| **D13.7** | **Compuerta** packaging / runtime decisión (sin conflar con implementación **D13.5**). |

**No** pasar a **MT5** ni **`POST`** / trading en esta cadena sin **nuevas compuertas** documentadas.

---

## 13. Non-goals (D13.4 explícito)

**D13.4 no implementa ni autoriza:**

- Código de supervisor nuevo, **`spawn`**, **`child_process`**, arranque real de API/dashboard/MT5, watcher, command files.
- Rutas **`POST`**, action endpoints, DB, WebSocket live, trading, **`localStorage`**, IPC real, **`.exe`**, instalador, polling nuevo no diseñado.

Cualquier ítem anterior queda para **D13.5+** solo con **aprobación** y código explícito, no por este diseño.
