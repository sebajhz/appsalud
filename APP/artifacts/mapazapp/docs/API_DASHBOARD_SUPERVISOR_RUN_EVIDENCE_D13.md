# Mapazapp — API + Dashboard Supervisor Run Evidence D13

## 1. Purpose

Documentar la evidencia del **primer run real exitoso** del supervisor **API + dashboard** implementado en **D13.5**.

Aclaraciones:

- **D13.5** implementó y ejecutó el supervisor de **dos procesos** (API en **3001**, dashboard Vite en **5173**), con preflight, builds, comprobaciones HTTP/CORS, cleanup ordenado y salida JSON segura.
- **D13.6** (este documento) **solo archiva evidencia** en el repositorio; **no** ejecuta API, dashboard, supervisor, MT5 ni ningún otro proceso.

**Relacionado:** [`API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md) (**D13.4** diseño / **D13.5** implementación), [`API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_ONLY_SUPERVISOR_RUN_EVIDENCE_D13.md) (**D13.3** — patrón API-only y lección de ownership).

---

## 2. Run summary

| Campo | Valor |
|--------|--------|
| Checkpoint de implementación | **D13.5** |
| Checkpoint de evidencia | **D13.6** |
| Tipo | Run del **supervisor API + dashboard** |
| Commit base | `64f06f91d87f3b6e8d3f2d92d9a59675919ddf4b` |
| Resultado general | **OK** |
| Comando | `pnpm --filter @workspace/scripts mapazapp:api-dashboard-supervisor -- --json` |
| Directorio de trabajo (`cwd`) | `e:\MAPAZAPP\APP` |
| Ventana horaria local (UTC−03:00), aproximada | Inicio **~17:03:18** — fin **~17:03:24** |
| Duración aproximada (wall-clock) | **~6 s** |
| PID API (hijo supervisado) | **2416** |
| PID dashboard (hijo supervisado) | **10292** |

---

## 3. Implementation summary

| Aspecto | Detalle |
|---------|---------|
| Módulo supervisor | `APP/scripts/src/mapazapp-api-dashboard-supervisor.ts` |
| Tests automatizados | `APP/scripts/src/mapazapp-api-dashboard-supervisor.test.ts` (casos **A–M**) |
| Script / paquete | `APP/scripts/package.json` — entrada **`mapazapp:api-dashboard-supervisor`** |
| Preflight | Host **`127.0.0.1`**; API puerto **3001**; dashboard puerto **5173**; puertos **libres** antes de cualquier `start` |
| Config | **`LauncherConfig`** + **`validateLauncherConfig`** / **`assertLauncherConfigSafety`** |
| Build | **`api-server`** build y **`mapazapp`** build integrados en el flujo del supervisor (salvo **`--skip-build`**) |
| Start API | `node --enable-source-maps ./dist/index.mjs` bajo `artifacts/api-server`; env **`MAPAZAPP_API_HOST`** / **`MAPAZAPP_API_PORT`** |
| Start dashboard | **`node`** directo al **CLI de Vite** (ruta resuelta vía `createRequire`; ver §4); **`--strictPort`**; **`VITE_MAPAZAPP_API_BASE_URL=http://127.0.0.1:3001`** |
| Checks | **`GET /api/healthz`**; **`GET /api/mapazapp/runtime/status`**; **`GET`** dashboard **`/`**; **`GET`** dashboard **`/config`**; **CORS** con **`Origin: http://127.0.0.1:5173`** hacia la API |
| Cleanup | Dashboard **primero**, API **después**; **`waitUntilListenGone`**; confirmación de puertos liberados |

---

## 4. Important implementation correction / Vite resolution

- El **primer intento** de resolver Vite con **`resolve('vite/bin/vite.js')`** **falló**.
- **Causa:** en **Vite 7** ese subpath **no** está expuesto en el campo **`exports`** del paquete `vite`; la resolución directa al binario vía ese path no es estable ni portable bajo el modelo de exports.
- **Corrección:** usar **`createRequire`** anclado a **`artifacts/mapazapp/package.json`**, resolver **`vite/package.json`**, y **derivar** la ruta hacia **`bin/vite.js`** relativa al directorio del paquete instalado.
- **Resultado:** el supervisor puede arrancar Vite con **`process.execPath` / `node` directo** al CLI real; **no** depende del **wrapper `pnpm`** como proceso “dueño” del listener; mejora el **ownership real** del dashboard respecto al puerto **5173**.
- **Riesgo controlado:** la verificación de ownership del listener del dashboard (p. ej. **`confirmDashboardListenerOwnership`**) exige que **5173** acepte conexión tras el arranque; **fail closed** si el dashboard no sube a tiempo.

---

## 5. Pre-run validations

Validaciones ejecutadas **antes** del run real documentado (resumen; no repetidas en la ejecución de **D13.6**):

- `pnpm run typecheck` — **OK**
- `pnpm --filter @workspace/scripts test` — **OK** (**150** tests)
- `pnpm --filter @workspace/api-server test` — **OK**
- `pnpm --filter @workspace/api-server build` — **OK**
- `pnpm --filter @workspace/mapazapp-core test` — **OK**
- `pnpm --filter @workspace/mapazapp test` — **OK**
- `pnpm --filter @workspace/mapazapp build` — **OK** (avisos Vite/Rollup habituales en build, **exit 0**)

---

## 6. Supervisor JSON evidence (campos clave)

Resumen de la salida **`--json`** del run exitoso (sin payload completo):

| Campo | Valor |
|--------|--------|
| `ok` | `true` |
| `phase` | `"complete"` |
| `apiPid` | `2416` |
| `dashboardPid` | `10292` |
| `healthOk` | `true` |
| `dashboardHttpOk` | `true` |
| `dashboardConfigHttpOk` | `true` |
| `corsOk` | `true` |
| `runtimeStatusSummary` | `runtimeMode`: **`"mock"`**; envelope **`mockOnly`** / **`reviewOnly`**; **`executionEnabled`**: `false`; MT5/bridge **`not_configured`** |
| `cleanupStatus` | `"ok"` |
| `apiPortFreed` | `true` |
| `dashboardPortFreed` | `true` |
| `errors` | `[]` |
| `gitHead` | `64f06f91d87f3b6e8d3f2d92d9a59675919ddf4b` |
| `gitStatusInitial` | `null` |
| `gitStatusFinal` | `null` |

---

## 7. Safety confirmations

En el alcance de este run y de **D13.5**/**D13.6**:

- Solo **API + dashboard** supervisados; **no** MT5.
- **No** watcher de producto; **no** archivos de comando hacia MT5.
- **No** rutas **`POST`** nuevas; **no** action endpoints operativos.
- **No** botones del dashboard **ejecutados** como parte del supervisor (solo **GET** HTTP de verificación).
- **No** launcher **`.exe`**; **no** IPC real de acciones; **no** DB operativa Mapazapp.
- **No** WebSocket live nuevo como canal de verificación; **no** trading.
- **D13.6** no incluye **`git push`**.

---

## 8. Cleanup evidence

- **`cleanupStatus`**: **ok**.
- Dashboard **detenido antes** que la API.
- **`apiPortFreed`**: **true**; **`dashboardPortFreed`**: **true**.
- **No** **`taskkill`** amplio; **no** matar PIDs ajenos; el stop se limita a **hijos propios** registrados por el supervisor.
- Estado Git final del entorno de evidencia: **limpio** (coherente con `gitStatusFinal: null` en JSON cuando no se midió diff de árbol).

---

## 9. Risks / lessons learned

- El **riesgo principal** era el **ownership** del proceso dashboard / Vite (wrapper vs listener real en **5173**).
- Quedó **mitigado** usando **`node` directo** al CLI de Vite resuelto desde la jerarquía del **`package.json`** de `vite` bajo `artifacts/mapazapp`.
- Para **futuros pasos**:
  - mantener **correlación PID ↔ listener** verificable;
  - **no** depender de wrappers si **no** se controla el proceso que hace **bind**;
  - **no** aceptar **puertos alternativos** automáticos en este patrón de supervisor;
  - **no** matar por **nombre de proceso global**;
  - **no** **`taskkill`** indiscriminado.
- Antes de **empaquetado** o **launcher real**, repetir esta **política de ownership** en diseño y tests.

---

## 10. Recommendation

**Recomendación:** **D13.7 — Packaging/runtime decision gate** (en lugar de una revisión de evidencia separada antes de decidir packaging).

**Justificación breve:**

- El supervisor **API-only** quedó validado (**D13.2** / evidencia **D13.3**).
- El supervisor **API + dashboard** quedó validado (**D13.5** / evidencia **D13.6**).
- La etapa **D13** ya consolidó **supervisión local controlada** en ambos modos.
- El **próximo salto** razonable **no** debería ser MT5 ni **`POST`** todavía sin nuevas compuertas.
- Corresponde **decidir packaging**, launcher real o **endurecimiento** antes de ampliar el **runtime** operativo.
