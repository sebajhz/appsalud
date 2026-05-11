# Mapazapp — Dashboard Visual Verification Evidence D12

**Checkpoint D12.7 — solo documentación.** Registro formal de la evidencia del run **D12.6** (verificación dashboard limitada por entorno). **No** ordena re-ejecución: **no** arrancar API, **no** arrancar dashboard, **no** `mapazapp:dev-start`, **no** MT5, **no** abrir navegador desde este archivo.

**Plan de referencia:** [`DASHBOARD_VISUAL_VERIFICATION_PLAN_D12.md`](./DASHBOARD_VISUAL_VERIFICATION_PLAN_D12.md) (**D12.5**). **Run API + dashboard previo (contexto HTTP):** [`API_DASHBOARD_RUN_EVIDENCE_D12.md`](./API_DASHBOARD_RUN_EVIDENCE_D12.md) (**D12.4**, commit **`63f39eb`**).

---

## 1. Purpose

Documentar la evidencia archivada del checkpoint **D12.6** (dashboard visual verification run, limitado por entorno).

- **D12.6** ejecutó **API + dashboard** en loopback con los mismos criterios generales que el plan D12.5.
- Se verificó **HTTP**, **logs** y **CORS** a nivel servidor y cliente HTTP (sin sesión de navegador interactiva del agente).
- **No** hubo **verificación visual humana profunda** (DOM renderizado, paneles React inspeccionados en pantalla, consola del navegador operador, capturas visuales).
- **`ConfigPage`**, **`RuntimeStatusPanel`**, **MT5 Config Status Panel** y **consola del browser** quedan **pendientes** de validación visual real.
- **No** debe confundirse un **HTTP 200** en **`/config`** (shell estático típico de SPA ~1737 bytes) con **UI React verificada** en ejecución humana.

---

## 2. Run summary

| Campo | Valor |
|--------|--------|
| Checkpoint | **D12.6** (evidencia archivada en **D12.7**) |
| Tipo | Dashboard visual verification run, **limited by environment** |
| Commit base | **`955f41a`** (`docs(mapazapp): D12.5 dashboard visual verification plan`) |
| Resultado general | **OK parcial** (HTTP/logs/CORS **OK**; visual humano **no**) |
| API | `127.0.0.1:3001` |
| Dashboard | `127.0.0.1:5173` |
| API PID (dueño del LISTEN en 3001) | **2888** |
| Dashboard PID (dueño del LISTEN en 5173) | **23392** |
| API inicio (local) | `2026-05-10T23:48:07.0908219-03:00` |
| Dashboard inicio (local) | `2026-05-10T23:48:20.6952268-03:00` |

---

## 3. Pre-run checks

- **Git:** `git status` limpio antes del run.
- **Puerto 3001:** libre antes del run (sin listener ajeno al experimento).
- **Puerto 5173:** libre antes del run (sin listener ajeno al experimento).
- **Validaciones obligatorias (desde `APP/`):**
  - `pnpm run typecheck` — **OK**
  - `pnpm --filter @workspace/api-server test` — **OK**
  - `pnpm --filter @workspace/api-server build` — **OK**
  - `pnpm --filter @workspace/mapazapp test` — **OK**
  - `pnpm --filter @workspace/mapazapp build` — **OK**
- **Notas:**
  - Aviso informativo de chunk **>500 kB** (Rollup/Vite) en build de `mapazapp` — **no** bloqueante.
  - `pnpm --filter @workspace/scripts test` y `pnpm --filter @workspace/mapazapp-core test` **no** se ejecutaron en la ventana de este run (misma política que evidencias D12.4).

---

## 4. Dry-run

- **Comando:** `pnpm --filter @workspace/scripts mapazapp:e2e-dry-run -- --json` (cwd `APP/`).
- **Resultado:** exit **0**.
- **Campos relevantes del JSON:** `executionEnabled: false`, `startsProcesses: false`, `mt5Runtime: false`, `launcherExecutable: false`.
- **Alcance:** sin MT5, sin watcher, sin trading desde el helper.
- **Salida revisada:** sin rutas privadas de usuario ni secretos en el fragmento archivado.

---

## 5. API evidence

> **Nota:** comandos **históricos** del run D12.6; **no** ejecutar en cadena automática.

**PowerShell (conceptual, cwd `APP/`):**

```powershell
$env:MAPAZAPP_API_HOST = "127.0.0.1"
$env:MAPAZAPP_API_PORT = "3001"
pnpm --filter @workspace/api-server start
```

- **Hora de inicio (local):** `2026-05-10T23:48:07.0908219-03:00`.
- **PID dueño del LISTEN en 3001:** **2888**.

**GET** `http://127.0.0.1:3001/api/healthz`

- **HTTP:** 200
- **Body:** `{"status":"ok"}`

**GET** `http://127.0.0.1:3001/api/mapazapp/runtime/status`

- **HTTP:** 200
- **Resumen del payload (sin JSON completo):**
  - `api.url`: `http://127.0.0.1:3001`
  - `api.port`: **3001**
  - `executionEnabled`: **false**
  - `sendToMt5Enabled`: **false**
  - `autoApprovalEnabled`: **false**
  - `registryMutationAllowed`: **false**
  - `manualReviewRequired`: **true**
  - `mockOnly`: **true**
  - `reviewOnly`: **true**
  - MT5 / bridge: **`not_configured`** (postura conservadora)
  - Sin frases **«ready to trade»** ni **«live trading»** en la respuesta revisada.

---

## 6. Dashboard evidence

> **Nota:** comandos **históricos** del run D12.6; **no** ejecutar en cadena automática.

**PowerShell (conceptual, cwd `APP/`):**

```powershell
$env:VITE_MAPAZAPP_API_BASE_URL = "http://127.0.0.1:3001"
pnpm --filter @workspace/mapazapp dev -- --port 5173 --host 127.0.0.1
```

- **`VITE_MAPAZAPP_API_BASE_URL`:** `http://127.0.0.1:3001`
- **Puerto:** **5173**
- **PID dueño del LISTEN en 5173:** **23392**
- **Hora de inicio (local):** `2026-05-10T23:48:20.6952268-03:00`
- **URL Vite:** `http://127.0.0.1:5173/`

**HTTP estático (no equivalen a verificación visual completa):**

- **GET** `/` → **200**, cuerpo ~**1737** bytes (shell típico de SPA).
- **GET** `/config` → **200**, cuerpo ~**1737** bytes.

**CORS:**

- **GET** `/api/mapazapp/runtime/status` con cabecera **`Origin: http://127.0.0.1:5173`** → **200** (sin bloqueo CORS en el tramo probado).

**Logs:**

- Terminales **API** y **Vite** revisadas en el tramo archivado: **sin** errores críticos observados.

---

## 7. Visual verification status

| Check | Status | Notes |
|--------|--------|--------|
| Dashboard carga visual | **Not verified** | No browser interactive available. |
| ConfigPage visual | **Not verified** | HTML static 200 does not prove React render. |
| RuntimeStatusPanel visual | **Not verified** | Not inspected in rendered DOM. |
| MT5 Config Status Panel visual | **Not verified** | Not inspected in rendered DOM. |
| Browser console | **Not verified** | No interactive browser console available. |
| Screenshot | **Not captured** | Environment did not support visual capture. |
| HTTP / CORS / logs | **Partial OK** | Server-side and static HTTP evidence only. |

**Aclaración obligatoria:** **no** interpretar **HTTP 200** en **`/config`** como **verificación visual completa** de la página ni de los paneles montados en React.

---

## 8. Stop / cleanup evidence

- **`Stop-Process -Id 23392`** — dashboard (Vite), dueño del LISTEN en **5173**.
- **`Stop-Process -Id 2888`** — API (Node), dueño del LISTEN en **3001**.
- **Sin** `taskkill` amplio ni terminación por nombre global.
- **Puertos 3001 y 5173** liberados tras el stop.
- **PIDs 2888 y 23392** ya no existían tras el cleanup.
- **Sin** listeners residuales Mapazapp en esos puertos en el tramo verificado.
- **Sin** procesos huérfanos detectados claramente asociados a la prueba.

---

## 9. Scope confirmations

- **No** `mapazapp:dev-start`.
- **No** MT5.
- **No** watcher.
- **No** command files.
- **No** `POST` Mapazapp.
- **No** action endpoints nuevos.
- **No** botones operativos del dashboard ejecutados para side-effects.
- **No** launcher `.exe`.
- **No** IPC real.
- **No** DB operativa como parte del run.
- **No** WebSocket live nuevo.
- **No** trading.
- **No** push al remoto como parte de D12.6/D12.7.

---

## 10. Incidents / risks

- **Incidentes bloqueantes:** ninguno en el tramo HTTP/logs/CORS documentado.
- **Riesgo principal:** **verificación visual humana pendiente**; la UI en navegador real no fue inspeccionada.
- **Riesgo de interpretación:** **HTTP 200** en rutas SPA **no** equivale a **UI validada** ni a ausencia de errores de hidratación/render en cliente.
- **Recomendación:** repetir verificación con **operador humano** y **navegador real** (checkpoint sugerido **D12.8**).

---

## 11. Recommendation

**D12.8 — Human dashboard visual verification run**

**Objetivo:**

- Ejecutar **API + dashboard** (misma postura de puertos y env que planes aprobados).
- Abrir **navegador real** y recorrer rutas acordadas.
- Verificar **`ConfigPage`** (layout, copy de seguridad, ausencia de controles peligrosos fuera de mock).
- Verificar **`RuntimeStatusPanel`** (coherencia con API, flags conservadores).
- Verificar **MT5 Config Status Panel** (copy obligatorio read-only).
- Capturar **screenshot** y/o **notas** según política de datos.
- **No** ampliar backend/runtime más allá del alcance del plan visual.

**No** recomendar salto a **D13.0** (u otro hito mayor) si el cierre exige **verificación visual humana** explícita: cerrar primero **D12.8** según compuerta de producto.
