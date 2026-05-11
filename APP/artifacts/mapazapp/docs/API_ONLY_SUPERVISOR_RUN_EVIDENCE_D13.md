# Mapazapp — API-only Supervisor Run Evidence D13

## 1. Purpose

Documentar la evidencia del **primer run real exitoso** del supervisor **API-only** implementado en **D13.2**.

Aclaraciones:

- **D13.2** implementó el supervisor, ejecutó el run real controlado y cerró con tests y validaciones acordadas.
- **D13.3** (este documento) **solo archiva evidencia** en el repositorio; **no** ejecuta API, dashboard, supervisor, MT5 ni ningún otro proceso.
- **D13.5** / **D13.6** (supervisor y evidencia **API + dashboard**): diseño [`API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md), run archivado [`API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md).

---

## 2. Run summary

| Campo | Valor |
|--------|--------|
| Checkpoint de implementación | **D13.2** |
| Checkpoint de evidencia | **D13.3** |
| Tipo | Run del **supervisor API-only** |
| Commit base | `b4189a6a60c35801e8694f6674cae4e3d25d0f8c` |
| Resultado general | **OK** |
| Comando | `pnpm --filter @workspace/scripts mapazapp:api-only-supervisor -- --json` |
| Directorio de trabajo (`cwd`) | `e:\MAPAZAPP\APP` |
| Ventana horaria local (UTC−03:00), aproximada | Inicio **~01:20:21** — fin **~01:20:22** |
| Duración aproximada (wall-clock) | **~4 s** |
| PID del run final (supervisor) | **21844** |

---

## 3. Implementation summary

| Aspecto | Detalle |
|---------|---------|
| Módulo supervisor | `APP/scripts/src/mapazapp-api-only-supervisor.ts` |
| Tests automatizados | `APP/scripts/src/mapazapp-api-only-supervisor.test.ts` (casos **A–H**) |
| Script / paquete | `APP/scripts/package.json` — entrada **`mapazapp:api-only-supervisor`** |
| Preflight | Host **`127.0.0.1`**, puerto **3001**; comprobación de puerto libre (**defaultCheckPort**) **antes** del start |
| Start del API server | `node --enable-source-maps ./dist/index.mjs` bajo `artifacts/api-server`; variables **`MAPAZAPP_API_HOST`** / **`MAPAZAPP_API_PORT`** |
| Health | **`GET /api/healthz`** |
| Runtime (seguridad) | **`GET /api/mapazapp/runtime/status`** |
| Cleanup | **SIGTERM** al hijo **registrado como propio**; espera hasta que el listener desaparezca (**waitUntilListenGone**); confirmación de **puerto liberado** |

---

## 4. Important implementation correction

- Un intento **intermedio** del run falló con **`port_not_freed_after_stop`**.
- **Causa:** arrancar la API vía **`pnpm.cmd` + shell** hacía que el **PID del wrapper** no fuera el mismo proceso que **escuchaba en el puerto 3001** (el listener quedaba en un descendiente no señalado de la misma forma).
- **Riesgo:** detener el proceso “padre” registrado **no** liberaba el listener; el puerto podía quedar ocupado y el teardown **no** era fiable.
- **Corrección:** **`spawn` directo** con **`process.execPath` / `node`** sobre el artefacto construido en **`artifacts/api-server`** (sin cadena `pnpm` como proceso hijo del listener).
- **Resultado:** el **PID del child** corresponde al **listener**; el cleanup controlado **libera 3001** de forma coherente con el modelo de ownership.
- Esta corrección **evita matar procesos ajenos** y alinea el **ownership real** al proceso que efectivamente hace **bind** al puerto.

---

## 5. Pre-run validations

Validaciones ejecutadas **antes** del commit / run real (resumen; no repetidas en D13.3):

- `pnpm run typecheck` — **OK**
- `pnpm --filter @workspace/scripts test` — **OK** (**136** tests)
- `pnpm --filter @workspace/api-server test` — **OK**
- `pnpm --filter @workspace/api-server build` — **OK**
- `pnpm --filter @workspace/mapazapp-core test` — **OK**
- `pnpm --filter @workspace/mapazapp test` — **OK**
- `pnpm --filter @workspace/mapazapp build` — **OK** (avisos habituales Vite/Rollup, **exit 0**)

---

## 6. Supervisor JSON evidence (resumen de campos clave)

Sin volcar el payload JSON completo; solo campos relevantes del run **OK** final:

- `ok`: **true**
- `phase`: **`"complete"`**
- `pid`: **21844**
- `healthOk`: **true**
- **Runtime / estado de seguridad (resumen):**
  - `runtimeMode`: **`"mock"`**
  - contexto **review-only**
  - `executionEnabled`: **false**
  - MT5 / bridge: **`not_configured`**
- `cleanupStatus`: **`"ok"`**
- `portFreed`: **true**
- `errors`: **[]**
- `gitHead`: **`b4189a6a60c35801e8694f6674cae4e3d25d0f8c`**
- `gitStatusInitial`: **null**
- `gitStatusFinal`: **null**

---

## 7. Safety confirmations

Confirmado para este run y alcance **D13.2**:

- Alcance **API-only** (sin arranque de dashboard).
- **No** `mapazapp:dev-start` como vehículo del run.
- **No** MT5 ni bridge operativo.
- **No** watcher de producto.
- **No** command files hacia MT5.
- **No** rutas **POST** nuevas de acciones.
- **No** action endpoints operativos.
- **No** botones dashboard operativos ligados al run.
- **No** launcher **`.exe`**.
- **No** IPC real de acciones.
- **No** base de datos operativa Mapazapp en el run.
- **No** WebSocket live nuevo como canal del run.
- **No** trading ni ejecución habilitada (`executionEnabled` **false** en verificación).
- **No** `git push` como parte de este checkpoint de evidencia (D13.3 es documentación local en repo).

---

## 8. Cleanup evidence

- `cleanupStatus`: **ok**
- `portFreed`: **true**
- **No** uso de **`taskkill`** amplio ni por nombre global.
- **No** terminación de PIDs no registrados como hijo propio del supervisor.
- Stop limitado al **child propio** creado por este run.
- Estado Git final del trabajo de implementación: **working tree limpio** (según cierre **D13.2**).

---

## 9. Risks / lessons learned

- El **riesgo principal** detectado en el camino al run estable fue la **diferencia entre proceso wrapper y proceso listener** (`pnpm`/shell vs **node** directo sobre `dist`).
- Quedó **resuelto** al garantizar que el hijo supervisado sea el proceso que **realmente escucha** en **3001**.
- Para **futuros supervisores** (p. ej. **API + dashboard**), debe repetirse la misma regla: el **ownership** y las señales de stop deben apuntar al **proceso real que escucha** en cada puerto/servicio.
- **No** aceptar wrappers que dejen **hijos huérfanos** escuchando sin correlación 1:1 con el PID registrado.
- **No** matar procesos por **nombre de imagen global** ni políticas indiscriminadas.
- **No** **`taskkill`** amplio como sustituto de un modelo de ownership claro.

---

## 10. Recommendation

- **D13.4 — API + dashboard supervisor design (sin implementación)** quedó especificado en [`API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md) (preflight doble puerto, start API con patrón **node** listener, estrategias de start dashboard §7, checks HTTP + CORS, cleanup dashboard→API, tests y compuerta **D13.5**).
- **Siguiente paso recomendado:** **D13.5 — API + dashboard supervisor prototype implementation/run, explicit approval required** (solo tras aceptar **D13.4** y resolver ownership del listener en **5173** según ese diseño).

---

## Relacionado

- [`LAUNCHER_API_ONLY_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./LAUNCHER_API_ONLY_SUPERVISOR_PROTOTYPE_DESIGN_D13.md) — diseño **D13.1** y referencia **D13.2**
- [`API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./API_DASHBOARD_SUPERVISOR_PROTOTYPE_DESIGN_D13.md) — diseño **D13.4** supervisor API + dashboard
- [`NEXT_RUNTIME_EXPANSION_GATE_D13.md`](./NEXT_RUNTIME_EXPANSION_GATE_D13.md) — compuerta **D13.0** y secuencia recomendada
- [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md) — línea de estrategia runtime/launcher
