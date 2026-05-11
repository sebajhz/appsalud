# Mapazapp — Dashboard Visual Verification Run Evidence D12

**Checkpoint D12.9 — solo documentación.** Registro formal de la evidencia del run **D12.8** (verificación dashboard con operador humano previsto; ejecución material fuera de este archivo). **No** ordena re-ejecución: **no** arrancar API, **no** arrancar dashboard, **no** `mapazapp:dev-start`, **no** MT5, **no** abrir navegador desde este archivo.

**Plan de referencia:** [`DASHBOARD_VISUAL_VERIFICATION_PLAN_D12.md`](./DASHBOARD_VISUAL_VERIFICATION_PLAN_D12.md) (**D12.5**). **Evidencia de intento anterior (D12.6, commit `955f41a`):** [`DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`](./DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md) (**D12.7**).

**Cierre con operador humano (D12.10 / D12.11):** sobre el mismo hilo técnico en **`0f1362a`**, el run **D12.10** incorporó **confirmación visual humana** (checklist A–E **OK** según operador); evidencia consolidada en [`HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`](./HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md) (**D12.11**). Las secciones **§1–§7** de **este** archivo describen el estado **al archivar D12.9** (evidencia **parcial** solo por agente/HTTP).

---

## 1. Purpose

Documentar la evidencia archivada del checkpoint **D12.8** (dashboard visual verification run, **limited by environment** for the automated agent).

- **D12.8** ejecutó **API + dashboard** en loopback.
- Se verificó **API**, **dashboard HTTP**, **CORS**, **logs** y **cleanup** en el tramo documentado.
- **No** hubo **verificación visual humana real** completada por el **agente** en el tramo D12.8/D12.9 (sin navegador interactivo ni inspección DOM).
- La **validación visual humana** del mismo plan sobre commit **`0f1362a`** quedó **cerrada** en **D12.10** + **D12.11** (ver encabezado y [`HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`](./HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md)).
- **No** debe interpretarse un **HTTP 200** en **`/config`** como **UI visualmente validada** (el shell HTML de la SPA no prueba hidratación ni paneles React en pantalla).

---

## 2. Run summary

| Campo | Valor |
|--------|--------|
| Checkpoint | **D12.8** (evidencia archivada en **D12.9**) |
| Tipo | Dashboard visual verification run, **limited by environment** |
| Commit base | **`0f1362a`** (`docs(mapazapp): D12.7 dashboard visual verification evidence`) |
| Resultado general | **OK parcial** (HTTP/logs/CORS/cleanup **OK**; verificación visual humana **no** cerrada) |
| API | `127.0.0.1:3001` |
| Dashboard | `127.0.0.1:5173` |
| API PID (dueño del LISTEN en 3001) | **12148** |
| Dashboard PID (dueño del LISTEN en 5173) | **1028** |
| API inicio (local) | `2026-05-10T23:56:19.5760149-03:00` |
| Dashboard inicio (local) | `2026-05-10T23:56:36.5885834-03:00` |

---

## 3. Pre-run checks

- **Git:** `git status` limpio antes del run (HEAD **`0f1362a`** o equivalente acordado).
- **Puerto 3001:** libre antes del run (sin LISTEN ajeno).
- **Puerto 5173:** libre antes del run (sin LISTEN ajeno).
- **Validaciones obligatorias (desde `E:\MAPAZAPP\APP`):**
  - `pnpm run typecheck` — **OK**
  - `pnpm --filter @workspace/api-server test` — **OK**
  - `pnpm --filter @workspace/api-server build` — **OK**
  - `pnpm --filter @workspace/mapazapp test` — **OK**
  - `pnpm --filter @workspace/mapazapp build` — **OK**
- **Validaciones opcionales:**
  - `pnpm --filter @workspace/scripts test` — **OK**
  - `pnpm --filter @workspace/mapazapp-core test` — **OK**
- **Nota:** aviso informativo de chunk **>500 kB** en el build de `mapazapp` (Rollup/Vite) — **no** bloqueante.

---

## 4. Dry-run

- **Comando:** `pnpm --filter @workspace/scripts mapazapp:e2e-dry-run -- --json` (cwd `APP/`).
- **Resultado:** exit **0**.
- **Campos relevantes del JSON:** `executionEnabled: false`, `startsProcesses: false`, `mt5Runtime: false`, `launcherExecutable: false`.
- **Alcance:** sin MT5, sin watcher, sin trading desde el helper.
- **Salida revisada:** sin rutas privadas de usuario ni secretos en el fragmento mostrado.

---

## 5. API evidence

> **Nota:** comandos **históricos** del run D12.8; **no** ejecutar en cadena automática.

**PowerShell (cwd `E:\MAPAZAPP\APP`):**

```powershell
$env:MAPAZAPP_API_HOST = "127.0.0.1"
$env:MAPAZAPP_API_PORT = "3001"
pnpm --filter @workspace/api-server start
```

- **Hora de inicio (local):** `2026-05-10T23:56:19.5760149-03:00`.
- **PID dueño del LISTEN en 3001:** **12148**.

**GET** `http://127.0.0.1:3001/api/healthz`

- **HTTP:** 200
- **Body:** `{"status":"ok"}`

**GET** `http://127.0.0.1:3001/api/mapazapp/runtime/status`

- **HTTP:** 200
- **Resumen (campos en `data` / raíz según payload):**
  - `data.api.url`: `http://127.0.0.1:3001`
  - `data.api.port`: **3001**
  - `executionEnabled`: **false** (también reflejado en `data.safety` coherente con snapshot)
  - `sendToMt5Enabled`: **false** (`data.safety`)
  - `autoApprovalEnabled`: **false** (`data.safety`)
  - `registryMutationAllowed`: **false** (`data.safety` y raíz)
  - `manualReviewRequired`: **true** (`data.safety`)
  - `mockOnly`: **true** (raíz)
  - `reviewOnly`: **true** (raíz)
  - MT5 / bridge: **`not_configured`**, sin lenguaje **connected** falso
  - Sin frases **«ready to trade»** ni **«live trading»** en el JSON revisado

---

## 6. Dashboard evidence

> **Nota:** comandos **históricos** del run D12.8; **no** ejecutar en cadena automática.

**PowerShell (cwd `E:\MAPAZAPP\APP`):**

```powershell
$env:VITE_MAPAZAPP_API_BASE_URL = "http://127.0.0.1:3001"
pnpm --filter @workspace/mapazapp dev -- --port 5173 --host 127.0.0.1
```

- **Hora de inicio (local):** `2026-05-10T23:56:36.5885834-03:00`.
- **PID dueño del LISTEN en 5173:** **1028**.
- **URL Vite:** `http://127.0.0.1:5173/`

**HTTP estático:**

- **GET** `/` → **200**, cuerpo ~**1737** bytes.
- **GET** `/config` → **200**, cuerpo ~**1737** bytes.

**CORS:**

- **GET** `/api/mapazapp/runtime/status` con cabecera **`Origin: http://127.0.0.1:5173`** → **HTTP 200**.

**Logs:**

- Terminales **API** y **Vite** en el tramo revisado: **sin** errores críticos observados.

---

## 7. Visual verification status

| Check | Status | Notes |
|--------|--------|--------|
| Dashboard carga visual | **Not verified** | No interactive browser was available to the agent. |
| ConfigPage visual | **Not verified** | Static HTML 200 does not prove React render. |
| RuntimeStatusPanel visual | **Not verified** | Not inspected in rendered DOM. |
| MT5 Config Status Panel visual | **Not verified** | Not inspected in rendered DOM. |
| Browser console | **Not verified** | No browser console available. |
| Screenshot | **Not captured** | Agent did not capture images. |
| HTTP / CORS / logs | **Partial OK** | Server-side and HTTP evidence only. |

**Aclaración obligatoria:** **no** interpretar **HTTP 200** en **`/config`** como **verificación visual completa**.

---

## 8. Human operator checklist left pending

Checklist para el **operador humano** (URLs: `http://127.0.0.1:5173` o `http://localhost:5173`):

### A. Dashboard carga

- Sin pantalla blanca persistente.
- Sin error crítico de Vite/React visible.
- Navegación básica usable.

### B. ConfigPage

- Accesible.
- Sin botones operativos peligrosos.
- Sin sugerir ejecución real.
- Sin secretos/rutas privadas.
- Sin **«ready to trade»**.
- Sin **«live trading»**.

### C. RuntimeStatusPanel

- Texto read-only/desarrollo.
- API coherente con `127.0.0.1:3001`.
- `executionEnabled` falso o equivalente seguro.
- MT5/bridge no **«connected»**.
- Sin auto-aprobación.
- Sin mutación de registry.
- Sin copy de trading habilitado.

### D. MT5 Config Status Panel

Debe mostrar equivalente a:

- Read-only MT5 configuration status.
- This does not launch MT5 or enable trading.
- No command files are written.
- Manual review required.
- Bridge readiness is informational only.

Además:

- Sin botón abrir MT5.
- Sin file picker.
- Sin **connected** falso.
- Sin **ready to trade**.

### E. Consola / logs

- Sin errores críticos repetidos.
- Sin errores **CORS** para el flujo GET de runtime status desde el origen Vite.
- Sin stack traces en UI.
- Sin rutas privadas.
- Sin tokens.
- Sin CSV crudo.

---

## 9. Stop / cleanup evidence

- **`Stop-Process -Id 12148`** — API (dueño LISTEN **3001**).
- **`Stop-Process -Id 1028`** — dashboard / Vite (dueño LISTEN **5173**).
- **Solo** PIDs identificados por **LISTENING** en **3001** y **5173**; **sin** `taskkill` amplio; **sin** kill por nombre global.
- **Puertos 3001 y 5173** liberados tras el stop.
- **PIDs 12148 y 1028** ya no existían tras el cleanup.
- **Sin** listeners residuales Mapazapp en esos puertos en el tramo verificado.
- Los **shells** del agente pueden terminar con **código de error** de `pnpm` al cortar el proceso hijo — **esperado**, no indica fallo de política de cleanup.

---

## 10. Scope confirmations

- **No** `mapazapp:dev-start`.
- **No** MT5.
- **No** watcher.
- **No** command files.
- **No** `OrderSend` / `CTrade`.
- **No** `POST` Mapazapp (solo **GET** documentados en la sesión D12.8).
- **No** action endpoints nuevos.
- **No** botones del dashboard ejecutados para side-effects.
- **No** launcher `.exe`.
- **No** IPC real.
- **No** DB operativa como parte del run.
- **No** WebSocket live nuevo.
- **No** polling extra.
- **No** `localStorage` manual.
- **No** dependencias nuevas.
- **No** trading.
- **No** push al remoto como parte de D12.8/D12.9.

---

## 11. Incidents / risks

- **Incidentes bloqueantes** en la parte automatizada (pre-run, dry-run, HTTP, CORS, cleanup): **ninguno** documentado.
- **Riesgo principal:** sin **verificación humana** en navegador **no** hay **cierre visual real** del producto.
- **Riesgo de interpretación:** **HTTP 200** **no** equivale a **UI validada**.
- **Recomendación:** repetir **D12.8** con **operador humano** y navegador real, o planificar **D12.10** con el mismo objetivo y cierre explícito de checklist.

---

## 12. Recommendation

**D12.10 — Human dashboard visual verification run**

**Objetivo:**

- Ejecutar **API + dashboard** (misma postura de puertos y variables de entorno que planes aprobados).
- Abrir **navegador real**; el **operador humano** confirma la UI según §8.
- Capturar **notas** y/o **screenshot** si la política de datos lo permite.
- **No** ampliar backend/runtime más allá del alcance del plan visual.

**No** recomendar **D13.0** (siguiente expansión mayor de runtime) mientras la **verificación visual humana** no esté **completa y OK** según compuerta de producto.
