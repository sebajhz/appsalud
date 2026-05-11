# Mapazapp — Human Dashboard Visual Verification Evidence D12

**Checkpoint D12.11 — solo documentación.** Archivo la evidencia del run **D12.10** con **confirmación visual humana**. **No** ordena ejecución: **no** arrancar API, **no** arrancar dashboard, **no** `mapazapp:dev-start`, **no** MT5, **no** abrir navegador desde este archivo.

**Plan de referencia:** [`DASHBOARD_VISUAL_VERIFICATION_PLAN_D12.md`](./DASHBOARD_VISUAL_VERIFICATION_PLAN_D12.md) (**D12.5**). **Contexto técnico previo (solo agente, sin cierre humano):** [`DASHBOARD_VISUAL_VERIFICATION_RUN_EVIDENCE_D12.md`](./DASHBOARD_VISUAL_VERIFICATION_RUN_EVIDENCE_D12.md) (**D12.9**, run **D12.8**).

---

## 1. Purpose

Documentar la evidencia del checkpoint **D12.10** (human dashboard visual verification run).

- **D12.10** ejecutó **API + dashboard** en loopback para revisión en **navegador real**.
- La **verificación visual** fue **realizada y reportada por el operador humano** (checklist A–E **OK** según mensaje de cierre).
- **Cursor / agente automatizado** ejecutó **soporte técnico**: pre-run, dry-run, arranque controlado, **GET** HTTP/CORS de muestra y **cleanup** por PIDs acordados; **no** inspeccionó DOM/render real ni la consola visual del navegador del operador.
- La **confirmación visual** consignada en §6 proviene **exclusivamente** del **operador humano**; **D12.11** solo **archiva** texto de evidencia, **no** re-ejecuta procesos.

---

## 2. Run summary

| Campo | Valor |
|--------|--------|
| Checkpoint | **D12.10** (evidencia humana archivada en **D12.11**) |
| Tipo | **Human** dashboard visual verification run |
| Commit base | **`23596a9`** (`docs(mapazapp): D12.9 dashboard visual run evidence`) |
| Resultado general (cierre humano) | **OK** según operador humano |
| API | `127.0.0.1:3001` |
| Dashboard | `127.0.0.1:5173` |
| API PID (dueño LISTEN **3001**) | **15432** |
| Dashboard PID (dueño LISTEN **5173**) | **3708** |
| API inicio (local, registro de sesión D12.10) | `2026-05-11T00:15:41.7206269-03:00` |
| Dashboard inicio (local, registro de sesión D12.10) | `2026-05-11T00:15:59.8893800-03:00` |
| Cleanup | **OK** (`Stop-Process` a PIDs acordados) |
| `git status` final (post-cleanup) | **Limpio** |

---

## 3. Pre-run technical checks

Resumen de lo ejecutado en **D12.10** antes del arranque de servicios:

- **Git:** `git status` limpio (HEAD **`23596a9`**).
- **Puertos:** **3001** y **5173** libres (sin LISTEN ajeno verificado antes del run).
- **Validaciones obligatorias** (cwd `E:\MAPAZAPP\APP`) — **OK:**
  - `pnpm run typecheck`
  - `pnpm --filter @workspace/api-server test`
  - `pnpm --filter @workspace/api-server build`
  - `pnpm --filter @workspace/mapazapp test`
  - `pnpm --filter @workspace/mapazapp build`
- **Validaciones opcionales** — **OK:**
  - `pnpm --filter @workspace/scripts test`
  - `pnpm --filter @workspace/mapazapp-core test`
- **Dry-run** `pnpm --filter @workspace/scripts mapazapp:e2e-dry-run -- --json` — **exit 0**; `executionEnabled: false`, `startsProcesses: false`, `mt5Runtime: false`, `launcherExecutable: false`.

---

## 4. API evidence

> Comandos **históricos** del run D12.10; **no** re-ejecutar desde este doc.

**Variables de entorno (equivalente conceptual; en PowerShell se usaron `$env:…`):**

```text
MAPAZAPP_API_HOST=127.0.0.1
MAPAZAPP_API_PORT=3001
pnpm --filter @workspace/api-server start
```

**PowerShell (cwd `E:\MAPAZAPP\APP`, tal como en la sesión):**

```powershell
$env:MAPAZAPP_API_HOST = "127.0.0.1"
$env:MAPAZAPP_API_PORT = "3001"
pnpm --filter @workspace/api-server start
```

- **PID dueño LISTEN 3001:** **15432**

**GET** `http://127.0.0.1:3001/api/healthz`

- **HTTP:** 200
- **Body:** `{"status":"ok"}`

**GET** `http://127.0.0.1:3001/api/mapazapp/runtime/status`

- **HTTP:** 200
- **Resumen:** `data.api.url` `http://127.0.0.1:3001`, `data.api.port` **3001**; `executionEnabled` **false**; `sendToMt5Enabled` **false**; `autoApprovalEnabled` **false**; `registryMutationAllowed` **false**; `manualReviewRequired` **true**; `mockOnly` **true**; `reviewOnly` **true**; MT5/bridge **`not_configured`**; sin **«ready to trade»** ni **«live trading»** en el JSON revisado.

---

## 5. Dashboard evidence

> Comandos **históricos** del run D12.10; **no** re-ejecutar desde este doc.

**Variables (equivalente conceptual):**

```text
VITE_MAPAZAPP_API_BASE_URL=http://127.0.0.1:3001
pnpm --filter @workspace/mapazapp dev -- --port 5173 --host 127.0.0.1
```

**PowerShell (cwd `E:\MAPAZAPP\APP`):**

```powershell
$env:VITE_MAPAZAPP_API_BASE_URL = "http://127.0.0.1:3001"
pnpm --filter @workspace/mapazapp dev -- --port 5173 --host 127.0.0.1
```

- **PID dueño LISTEN 5173:** **3708**
- **URLs usadas por el operador:** `http://127.0.0.1:5173` y/o `http://localhost:5173`
- **CORS (muestra automatizada):** **GET** `/api/mapazapp/runtime/status` con `Origin: http://127.0.0.1:5173` → **HTTP 200** (sin bloqueo CORS en la prueba registrada).
- El dashboard quedó **disponible** en loopback para la revisión humana.

---

## 6. Human visual verification

**Aclaración obligatoria:** el contenido siguiente fue **reportado por el operador humano**. El **agente no revalidó** visualmente la pantalla ni la consola del navegador del operador.

**Checklist registrada como OK:**

### A. Dashboard carga

- Sin pantalla blanca persistente.
- Sin error crítico visible.
- Navegación básica usable.

### B. ConfigPage

- Accesible.
- Sin botones operativos peligrosos.
- Sin sugerir ejecución real.
- Sin secretos/rutas privadas.
- Sin **«ready to trade»**.
- Sin **«live trading»**.

### C. RuntimeStatusPanel

- Estado read-only/desarrollo.
- API coherente con `127.0.0.1:3001`.
- `executionEnabled` falso o equivalente seguro.
- MT5/bridge no **«connected»**.
- Sin auto-aprobación.
- Sin mutación de registry.
- Sin copy de trading habilitado.

### D. MT5 Config Status Panel

Copy read-only verificado como equivalente a:

- Read-only MT5 configuration status.
- This does not launch MT5 or enable trading.
- No command files are written.
- Manual review required.
- Bridge readiness is informational only.

Además: sin botón abrir MT5; sin file picker; sin **connected** falso; sin **ready to trade**.

### E. Consola / logs

- Sin errores críticos repetidos reportados.
- Sin CORS visible para runtime status.
- Sin stack traces en UI.
- Sin rutas privadas.
- Sin tokens.
- Sin CSV crudo.

**Acciones explícitamente no realizadas por el operador (según reporte):** no ejecutó botones; no MT5, watcher, POST, trading ni acciones operativas.

---

## 7. Cleanup evidence

- **`Stop-Process -Id 15432`** — API.
- **`Stop-Process -Id 3708`** — dashboard / Vite.
- **Sin** `taskkill` amplio; **sin** kill por nombre global.
- **Puerto 3001** liberado tras el stop.
- **Puerto 5173** liberado tras el stop.
- **`Get-Process` 15432 / 3708:** sin procesos tras el cleanup.
- **`git status`:** limpio tras cerrar la sesión de documentación **D12.11** (sin cambios pendientes antes del commit de este checkpoint).

---

## 8. Scope confirmations

- **No** `mapazapp:dev-start`.
- **No** lanzamiento MT5.
- **No** watcher.
- **No** command files.
- **No** `OrderSend` / `CTrade`.
- **No** `POST` Mapazapp en el alcance de la verificación.
- **No** action endpoints nuevos.
- **No** botones operativos ejecutados por el operador (según reporte).
- **No** launcher `.exe`.
- **No** IPC real.
- **No** DB operativa como parte del run.
- **No** WebSocket live nuevo.
- **No** polling extra.
- **No** `localStorage` manual.
- **No** dependencias nuevas.
- **No** trading.
- **No** push al remoto como parte de D12.10/D12.11.

---

## 9. Incidents / risks

- **Incidentes bloqueantes** reportados: **ninguno**.
- La **evidencia visual humana** **no** sustituye **tests automatizados** ni CI para regresiones futuras.
- Cualquier **cambio posterior sustancial en UI** debería volver a pasar **revisión visual** o cobertura de test **equivalente** según política de producto.
- Antes de salto mayor de runtime (**D13.x**), esta evidencia **cierra la compuerta visual** de la secuencia **D12** documentada para el mock local en el commit base indicado.

---

## 10. Recommendation

**D13.0 — Next runtime expansion gate**

**Objetivo:**

- Decidir el **próximo salto** de producto/runtime con **aprobación explícita**.
- **No** asumir MT5 en vivo ni **trading** como consecuencia de este cierre visual.

**Opciones de línea (no excluyentes; requieren diseño previo):**

- **A.** Launcher / supervisor real **controlado**.
- **B.** API + dashboard bajo **launcher** gobernado.
- **C.** **Empaquetado** local (instalador / artefactos) según gobernanza.
- **D.** MT5 **read-only** / config más avanzada **sin** ejecutar órdenes.
- **E.** Transporte de **acciones** controlado; **aún sin** trading real.
