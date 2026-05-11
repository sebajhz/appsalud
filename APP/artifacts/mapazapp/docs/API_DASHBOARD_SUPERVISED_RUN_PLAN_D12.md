# Mapazapp — API + Dashboard Supervised Run Plan D12

**Checkpoint D12.2 — solo planificación y documentación.** Este archivo **no** ordena ejecución: **no** arrancar API, **no** arrancar dashboard, **no** ejecutar `mapazapp:dev-start`, **no** MT5, **no** watcher.

**Contexto:** el primer run real **API-only** (**D12.0**) finalizó **OK**; la evidencia está en [`API_ONLY_RUN_EVIDENCE_D12.md`](./API_ONLY_RUN_EVIDENCE_D12.md) (**D12.1**). El **siguiente salto controlado** planificado aquí es **API + dashboard** en una fase futura, **tras** nueva aprobación explícita (ver §10).

**Planes y compuertas relacionados:** [`API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md`](./API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md) (**D11.9**), [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md) (**D11.8**), [`FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md`](./FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md), [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md).

---

## 1. Purpose

Planificar un **futuro** run supervisado de **API + dashboard** (dos procesos locales: `api-server` + Vite dev del paquete `mapazapp`).

Aclaraciones:

- **D12.2 no ejecuta nada** en el repo ni en la máquina como parte del checkpoint.
- El **primer run API-only** ya fue **exitoso** (D12.0 / evidencia D12.1).
- El **siguiente salto** será **agregar el dashboard** al alcance del run, manteniendo el mismo espíritu fail-closed que D11.8–D12.1.
- **No** hay MT5 en el alcance de este plan.
- **No** hay watcher.
- **No** hay endpoints de acción **`POST`** Mapazapp.
- **No** hay launcher **`.exe`**.

---

## 2. Scope

### Permitido en el futuro run (cuando se apruebe y ejecute fuera de D12.2)

- **API server** escuchando en **`127.0.0.1:3001`** (mismo criterio que D12.0).
- **Dashboard** vía servidor de desarrollo Vite en puerto **controlado**, preferentemente **`5173`**.
- **Verificación manual** o por **HTTP** de la API (p. ej. `curl`, navegador manual si el operador lo abre).
- **Verificación visual del dashboard** solo si el responsable **autoriza** explícitamente abrir el navegador (no automatizar apertura).
- **`RuntimeStatusPanel`** en **`ConfigPage`** (snapshot read-only ya cableado en el producto; sin polling nuevo en este plan).
- **`Mt5ConfigStatusPanel`** en modo **solo lectura** / presentación conservadora — **sin** launch MT5, **sin** trading, **sin** command files.
- **Cleanup** explícito de **ambos** procesos al finalizar la ventana de prueba.

### Prohibido (incluso en el futuro run gobernado por este plan, salvo gate distinto explícito)

- Lanzamiento **MT5** desde Mapazapp o como parte del alcance del run.
- **Watcher** o lectura continua de carpetas bridge.
- **Command files** hacia MT5.
- **`POST`** de acciones Mapazapp o rutas nuevas de acción.
- **Botones operativos** de dashboard añadidos para el experimento.
- **Trading** real o simulado broker (`OrderSend` / `CTrade` / envío de órdenes).
- **Launcher `.exe`** o supervisor productivo.
- **IPC real** privilegiado (fuera de HTTP loopback ya existente para el dashboard).

---

## 3. Candidate commands

> **ADVERTENCIA — D12.2:** los comandos siguientes son **candidatos** para una **fase futura**. **No ejecutarlos** como parte del cierre de **D12.2**.

### API (Bash / shell tipo Unix, `cwd` = `APP/`)

```bash
pnpm --filter @workspace/api-server build
MAPAZAPP_API_HOST=127.0.0.1 MAPAZAPP_API_PORT=3001 pnpm --filter @workspace/api-server start
```

### Dashboard (Bash / shell tipo Unix, `cwd` = `APP/`)

```bash
pnpm --filter @workspace/mapazapp build
pnpm --filter @workspace/mapazapp dev -- --port 5173
```

### Equivalente conceptual (PowerShell, `cwd` = `APP/`)

```powershell
pnpm --filter @workspace/api-server build
$env:MAPAZAPP_API_HOST = "127.0.0.1"
$env:MAPAZAPP_API_PORT = "3001"
pnpm --filter @workspace/api-server start
```

```powershell
pnpm --filter @workspace/mapazapp build
pnpm --filter @workspace/mapazapp dev -- --port 5173
```

**Notas de política:**

- **No** usar `pnpm --filter @workspace/scripts mapazapp:dev-start` en el primer salto API+dashboard **salvo** aprobación explícita futura que cite ese script como comando §2.9 de D11.8. Este plan favorece **terminales separadas** y control manual de PIDs para alinear teardown con D12.0.
- **No** abrir el navegador automáticamente desde scripts del experimento.
- **No** iniciar MT5.

---

## 4. Ports

| Rol | Host | Puerto | Notas |
|-----|--------|--------|--------|
| API | `127.0.0.1` | **3001** | Alineado a D9.12 / D12.0. |
| Dashboard (Vite dev) | `127.0.0.1` o `localhost` | **5173** | Preferido; otro puerto solo con aprobación explícita y documentación en la evidencia. |

Antes del run futuro:

- **Confirmar** que **3001** y **5173** están **libres** (mismo método conservador que en D12.0: observar listeners, no asumir).
- Si **cualquiera** está ocupado por un proceso **no** identificado como propio del experimento ⇒ **frenar**, **no** matar procesos ajenos, **reportar** y **no** continuar el run.

---

## 5. Pre-run checks

Checklist **antes** de aprobar o ejecutar el futuro run API+dashboard:

- [ ] **`git status`** limpio (sin cambios accidentales).
- [ ] **Tests / build mínimos OK** (desde `APP/` según convención del repo):
  - [ ] `pnpm run typecheck`
  - [ ] `pnpm --filter @workspace/api-server test`
  - [ ] `pnpm --filter @workspace/api-server build`
  - [ ] `pnpm --filter @workspace/mapazapp test`
  - [ ] `pnpm --filter @workspace/mapazapp build`
- [ ] **Dry-run OK:** `pnpm --filter @workspace/scripts mapazapp:e2e-dry-run` (o variante `-- --json` si se acuerda en el ticket de aprobación) — verificar flags declarativos (`executionEnabled: false`, `startsProcesses: false`, etc.).
- [ ] **Puertos 3001 y 5173** libres o justificados como propios del experimento.
- [ ] **Evidencia D12.1** leída y entendida como baseline de comportamiento API-only.
- [ ] **Plan de cleanup** definido (orden de parada, PIDs a registrar, confirmación de liberación de puertos) **antes** de encender servicios.

---

## 6. Runtime checks

Cuando el run se **ejecute en fase futura** (fuera de D12.2), verificar como mínimo:

- **GET** `http://127.0.0.1:3001/api/healthz` — respuesta JSON **`status: ok`** (o contrato vigente documentado).
- **GET** `http://127.0.0.1:3001/api/mapazapp/runtime/status` — envelope coherente con política mock-only / ejecución deshabilitada (comparar con D12.0).
- **Dashboard** carga en **`http://127.0.0.1:5173`** o **`http://localhost:5173`** (según bind de Vite) sin pantalla en blanco **obvia** en la home de prueba acordada.
- **`ConfigPage`** muestra **runtime status** vía el flujo existente (panel read-only).
- **Panel MT5** muestra solo estado **read-only** / disclaimers — **sin** launch, **sin** trading, **sin** acciones nuevas.
- **Consolas** de API y dashboard: sin errores **visibles** que indiquen fallo de build o CORS bloqueando el flujo GET acordado.
- **No** realizar **`POST`** Mapazapp como parte de la verificación.
- **No** usar botones de acción del dashboard para side-effects (no deben existir para este run; si aparecieran cambios inesperados ⇒ **abort**).

---

## 7. Evidence to capture

En el checkpoint de **ejecución futuro**, archivar como mínimo:

- **Hash de commit** base del run.
- **Comandos ejecutados** (literalmente, en orden).
- **Hora inicio** y **hora fin** (zona horaria local, ISO-8601 recomendado).
- **PID API** (dueño del LISTEN en 3001 cuando aplique).
- **PID dashboard** (proceso Vite/node identificado como dueño del LISTEN en 5173 cuando aplique).
- **Puertos** confirmados en uso durante el run.
- **Respuesta** de health (redactada si hiciera falta).
- **Respuesta** de runtime status (resumen; sin tokens ni rutas sensibles).
- **Screenshot opcional** del dashboard **solo** si se autoriza política de captura.
- **Logs sanitizados** de ambas terminales (sin secretos).
- **Cleanup:** método de parada, confirmación de puertos liberados, `git status` final.

---

## 8. Stop / cleanup

Política para el run futuro:

- **Detener API y dashboard individualmente** (cada uno en su terminal dueña, o `Stop-Process -Id <PID>` **solo** sobre PIDs **registrados** como hijos del experimento — mismo estilo que D12.0).
- **No** `taskkill` amplio ni terminación por **nombre global** de proceso.
- **Confirmar** puerto **3001** liberado tras parar API.
- **Confirmar** puerto **5173** liberado tras parar dashboard.
- **Confirmar** ausencia de procesos **huérfanos** claramente atribuibles a la prueba (si queda duda ⇒ documentar y escalar antes de matar procesos no identificados).
- **`git status`** final **limpio** (sin artefactos accidentales commitados).

---

## 9. Failure handling

Ante fallo, política **fail-closed**: **frenar**, **capturar salida**, **no** reintentar de forma destructiva, **no** levantar MT5.

| Caso | Acción |
|------|--------|
| **API build fail** | No iniciar API; no iniciar dashboard; documentar salida de build; corregir en trabajo de código aparte (fuera de D12.2). |
| **Dashboard build fail** | No iniciar dashboard; API solo si ya aprobado y útil para diagnóstico — preferible **no** continuar el run dual; documentar. |
| **API start fail** | No proseguir con dashboard; revisar env/puerto/bind; capturar logs. |
| **Dashboard start fail** | Parar API si estaba arriba (según plan de cleanup); capturar logs Vite. |
| **Puerto ocupado** | **Abort** inmediato; identificar listener; **no** matar procesos ajenos. |
| **Health fail** | No considerar el run OK; parar servicios; capturar cuerpo de error HTTP y logs API. |
| **Runtime status fail** | Igual que health fail; verificar CORS y URL base del cliente dashboard. |
| **Dashboard blank screen** | Capturar consola browser (si se usa) y terminal Vite; parar ambos servicios; no reintentar en bucle agresivo. |
| **CORS issue** | Documentar `Origin` del Vite y allowlist en `api-server`; **no** relajar CORS “a ciegas” durante el run; abortar y llevar fix a PR aparte si hace falta. |
| **Cleanup fail** | Documentar PIDs y puertos aún en uso; **no** ampliar alcance del experimento; escalar a humano antes de acciones agresivas sobre procesos. |

---

## 10. Approval gate

**D12.2 no aprueba la ejecución.** Solo deja por escrito el plan.

La **ejecución real** de API + dashboard requerirá un **checkpoint nuevo** con firma humana explícita (análogo a §2.12 de D11.8), por ejemplo:

- **Opción A — `D12.3` — First API + dashboard supervised local run, explicit approval required**  
  Un solo gate: checklist D11.8 **re-basado** para **dos** procesos (API + Vite), comando literal §2.9 actualizado, ventana de tiempo, evidencia §7.

- **Opción B — `D12.2.1` — API + dashboard checklist validation, no process start**  
  Paso intermedio **solo documentación / checklist**: validar en mesa que CORS, scripts `package.json`, puertos y narrativa de cleanup están listos — **sin** arrancar procesos.

**Recomendación:** usar **`D12.3`** como compuerta principal de **primera ejecución** API+dashboard (simétrico a cómo D11.9 planeó y D12.0 ejecutó API-only). Reservar **`D12.2.1`** solo si el equipo quiere **una ronda extra** de revisión estática **sin** encender servicios antes de votar la aprobación de D12.3.

---

## 11. Non-goals

D12.2 **no** implementa ni encarga:

- Cambios de **código** o **scripts nuevos**.
- **Launcher** productivo o **`.exe`**.
- **`spawn`**, **`child_process`**, **`taskkill`** como parte de este documento.
- **Acciones de dashboard** nuevas o **`POST`** de acciones.
- **MT5** runtime, **watcher**, **DB**, **WebSocket live**, **polling** nuevo, **`localStorage`** operativo, **IPC real** más allá del modelo actual.
- **Trading** o endpoints de ejecución.
