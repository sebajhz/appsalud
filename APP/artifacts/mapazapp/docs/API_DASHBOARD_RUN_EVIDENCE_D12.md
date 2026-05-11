# Mapazapp — API + Dashboard Run Evidence D12

**Checkpoint D12.4 — solo documentación.** Registro histórico del primer run real controlado **API + dashboard** (**D12.3**). **No** es una orden de re-ejecución: **no** arrancar API, dashboard ni MT5 desde este archivo.

**Plan de referencia:** [`API_DASHBOARD_SUPERVISED_RUN_PLAN_D12.md`](./API_DASHBOARD_SUPERVISED_RUN_PLAN_D12.md) (**D12.2**). **Compuerta:** [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md) (**D11.8**).

---

## 1. Purpose

Documentar la evidencia del primer run real **API + dashboard** controlado.

---

## 2. Run summary

| Campo | Valor |
|--------|--------|
| Checkpoint | **D12.3** |
| Tipo | API + dashboard supervised local run |
| Commit base | **`63f39eb`** (`docs(mapazapp): D12.2 API dashboard supervised run plan`) |
| Resultado general | **OK** |
| API host / port | `127.0.0.1` / **3001** |
| Dashboard host / port | `127.0.0.1` / **5173** |
| API PID (dueño del LISTEN en 3001) | **26184** |
| Dashboard PID (dueño del LISTEN en 5173) | **28064** |
| API inicio (local) | `2026-05-10T23:18:28.4820665-03:00` |
| Dashboard inicio (local) | `2026-05-10T23:19:19.0822483-03:00` |
| Fin aproximado (UTC) | `2026-05-11T02:20:01Z` |

---

## 3. Pre-run checks

- **Git:** `git status` limpio antes del run.
- **Puerto 3001:** libre antes del run (sin listener LISTEN previo verificado).
- **Puerto 5173:** libre antes del run (sin listener LISTEN previo verificado).
- **Validaciones obligatorias (desde `APP/`):**
  - `pnpm run typecheck` — **OK**
  - `pnpm --filter @workspace/api-server test` — **OK**
  - `pnpm --filter @workspace/api-server build` — **OK**
  - `pnpm --filter @workspace/mapazapp test` — **OK**
  - `pnpm --filter @workspace/mapazapp build` — **OK**
- **Notas:**
  - El build de `mapazapp` mostró un **aviso informativo** de chunk **>500 kB** (Rollup/Vite).
  - `pnpm --filter @workspace/scripts test` y `pnpm --filter @workspace/mapazapp-core test` **no** se ejecutaron por ventana de tiempo.

---

## 4. Dry-run

- **Comando:** `pnpm --filter @workspace/scripts mapazapp:e2e-dry-run -- --json` (cwd `APP/`).
- **Resultado:** exit **0**.
- **Campos relevantes del JSON:** `executionEnabled: false`, `startsProcesses: false`, `mt5Runtime: false`, `launcherExecutable: false`.
- **Alcance declarado:** sin MT5, sin watcher, sin trading desde el helper.
- **Salida capturada:** sin rutas privadas de usuario ni secretos en el fragmento archivado.

---

## 5. API start evidence

> **Nota:** comandos **históricos** del run D12.3; **no** ejecutar en cadena automática.

**PowerShell (conceptual, cwd `APP/`):**

```powershell
$env:MAPAZAPP_API_HOST = "127.0.0.1"
$env:MAPAZAPP_API_PORT = "3001"
pnpm --filter @workspace/api-server start
```

- **cwd:** `APP/`.
- **Hora de inicio (local):** `2026-05-10T23:18:28.4820665-03:00`.
- **PID dueño del LISTEN en 3001:** **26184**.
- **Shell del job (wrapper):** **16456** (no era el dueño del puerto).
- **Log sanitizado (resumen):** servidor en **host** `127.0.0.1`, **port** `3001`, mensaje **“Server listening”**.

---

## 6. API HTTP checks

**GET** `http://127.0.0.1:3001/api/healthz`

- **HTTP:** 200
- **Body:** `{"status":"ok"}`

**GET** `http://127.0.0.1:3001/api/mapazapp/runtime/status`

- **HTTP:** 200
- **Resumen del payload (sin reproducir JSON completo):**
  - `api.url`: `http://127.0.0.1:3001`
  - `api.port`: **3001**
  - `executionEnabled`: **false**
  - `sendToMt5Enabled`: **false**
  - `autoApprovalEnabled`: **false**
  - `registryMutationAllowed`: **false**
  - `manualReviewRequired`: **true**
  - `mockOnly`: **true**
  - `reviewOnly`: **true**
  - `mt5.status`: **`not_configured`**
  - `bridge.status`: **`not_configured`**
  - Sin frases **«ready to trade»** ni **«live trading»** en la respuesta revisada.

---

## 7. Dashboard start evidence

> **Nota:** comandos **históricos** del run D12.3; **no** ejecutar en cadena automática.

**PowerShell (conceptual, cwd `APP/`):**

```powershell
$env:VITE_MAPAZAPP_API_BASE_URL = "http://127.0.0.1:3001"
pnpm --filter @workspace/mapazapp dev -- --port 5173 --host 127.0.0.1
```

- **cwd:** `APP/`.
- **Hora de inicio (local):** `2026-05-10T23:19:19.0822483-03:00`.
- **PID dueño del LISTEN en 5173:** **28064**.
- **URL:** `http://127.0.0.1:5173/`
- **Vite** imprimió **Local** con esa URL.
- **No** se abrió navegador desde el agente de automatización.

---

## 8. Dashboard verification

- **GET** raíz del dashboard (`/`): **HTTP 200**, cuerpo ~**1737** bytes (shell típico de SPA).
- **`/config`:** **HTTP 200**.
- **Heurística** en HTML inicial (`Runtime` \| `runtime` \| `MT5` \| `mt5` \| `Config`): **True**.
- **`RuntimeStatusPanel` / panel MT5:** **no** verificados en profundidad vía DOM CSR (contenido principalmente en cliente).
- **Logs de terminales** (API + Vite) revisados: **sin** errores críticos observados en el fragmento archivado.
- **CORS:** **GET** `/api/mapazapp/runtime/status` con cabecera **`Origin: http://127.0.0.1:5173`** → **HTTP 200** (sin bloqueo CORS en esta prueba).

**Aclaraciones:**

- La **verificación visual humana** profunda de `ConfigPage` y paneles queda como trabajo opcional en una **fase posterior**.
- La evidencia operativa de D12.3 se basó en **HTTP + logs**, no en sesión de navegador humana archivada aquí.

---

## 9. Stop / cleanup evidence

- **Método:** `Stop-Process -Id 28064` (dashboard / Vite, dueño del LISTEN en **5173**); `Stop-Process -Id 26184` (API / Node, dueño del LISTEN en **3001**).
- **No** `taskkill` amplio; **no** terminación por nombre global de proceso.
- **Puerto 3001:** liberado tras el stop.
- **Puerto 5173:** liberado tras el stop (sin LISTEN residual tras breve espera).
- **PIDs 26184 y 28064:** ya no existían tras el cleanup.
- **TCP:** conexiones `CLO_WAIT` / `FIN_WAIT` residuales breves con otro PID fueron **cierre de conexiones**, no un listener nuevo de Mapazapp.
- **Salida `pnpm`:** código **4294967295** tras detener el hijo Node — **coherente** con la evidencia **D12.0** al interrumpir el servidor.

---

## 10. Scope confirmations

- **No** `mapazapp:dev-start`.
- **No** lanzamiento MT5.
- **No** watcher.
- **No** command files.
- **No** `OrderSend` / `CTrade`.
- **No** `POST` Mapazapp desde esta sesión de verificación (solo **GET** documentados).
- **No** action endpoints nuevos.
- **No** botones de acción operados en el dashboard.
- **No** launcher `.exe`.
- **No** installer.
- **No** IPC real.
- **No** DB operativa como parte del run.
- **No** WebSocket live nuevo.
- **No** polling extra.
- **No** `localStorage` manual.
- **No** dependencias nuevas.
- **No** trading.
- **No** push al remoto como parte de D12.3.

---

## 11. Incidents / risks

- **Incidentes bloqueantes:** ninguno.
- **Riesgo residual:** condición de carrera teórica entre “puerto libre” y `listen`; **no** ocurrió en este run.
- **Nota Vite:** mensaje **“Re-optimizing dependencies because lockfile has changed”** — **informativo**; el arranque completó.
- **Verificación visual humana** profunda del dashboard: **no realizada** en D12.3 (ver §8).

---

## 12. Recommendation

Opciones de seguimiento documental:

- **D12.5 — Supervised dashboard visual verification plan** (revisión visual humana de `ConfigPage`, `RuntimeStatusPanel`, `Mt5ConfigStatusPanel`, sin ampliar backend/runtime).
- **D12.5 — API + dashboard run evidence review and next gate** (revisión de compuerta y próximo salto si el producto lo requiere).

**Recomendación del mantenedor de esta evidencia:** **D12.5 — Dashboard visual verification plan**, **sin** nueva expansión de backend ni runtime más allá de lo ya probado por HTTP en D12.3 — plan publicado en [`DASHBOARD_VISUAL_VERIFICATION_PLAN_D12.md`](./DASHBOARD_VISUAL_VERIFICATION_PLAN_D12.md) (**solo documentación**; ejecución visual ⇒ **D12.6** con aprobación explícita).
