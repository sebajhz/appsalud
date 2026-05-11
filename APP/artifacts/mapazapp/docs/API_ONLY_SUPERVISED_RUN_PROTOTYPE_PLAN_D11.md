# Mapazapp — Plan del prototipo supervisado API-only (D11.9)

**Checkpoint D11.9 — solo documentación.** Define el **plan exacto** para el **primer run local real** limitado al **`@workspace/api-server`** (sin dashboard, sin MT5, sin watcher). **Este checkpoint no ejecuta nada:** no `pnpm start`, no `spawn`, no procesos, no `fetch` automatizado desde tooling del repo para este documento.

**Relacionado:** [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md) (**D11.8**), [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md) (**D11.7**), [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md) (**D11.6**), [`FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md`](./FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md) (**D11.3**), [`DEVELOPER_E2E_DRY_RUN_PLAN_D11.md`](./DEVELOPER_E2E_DRY_RUN_PLAN_D11.md) (**D11.2**), [`API_ONLY_RUN_EVIDENCE_D12.md`](./API_ONLY_RUN_EVIDENCE_D12.md) (**D12.1** — evidencia del run **D12.0** ejecutado OK).

**Estado D12.0:** el primer run **API-only** acorde a este plan se **ejecutó correctamente**; detalle en [`API_ONLY_RUN_EVIDENCE_D12.md`](./API_ONLY_RUN_EVIDENCE_D12.md). Este archivo sigue siendo plan de referencia; **no** re-ejecutar el run desde el propio doc.

---

## 1. Purpose

- **Planificar** el primer run real **API-only supervisado** cuando un humano apruebe la compuerta **D11.8** y el siguiente checkpoint de ejecución (**§9**).
- **No ejecutar** el run en **D11.9** (este archivo es solo plan).
- Alcance explícito: **sin dashboard**, **sin MT5**, **sin watcher**, **sin `POST`** de acciones Mapazapp.

---

## 2. Scope

### Permitido en el run futuro (tras aprobación explícita)

- Arrancar **solo** el **API server** del workspace `APP/artifacts/api-server`.
- **Bind en loopback** (`127.0.0.1` vía `MAPAZAPP_API_HOST`; ver `createApiHardeningConfigFromEnv` en `apiHardeningConfig.ts`).
- **Puerto controlado** (por defecto documentado **3001** vía `MAPAZAPP_API_PORT` o `PORT` si política del equipo lo define así).
- Verificación HTTP **GET** (manual con herramienta externa acordada: navegador, `curl`, etc. — **fuera** del alcance de este doc ejecutarlo aquí):
  - `/api/healthz`
  - `/api/mapazapp/runtime/status`
- **Captura de logs** de la terminal donde corre `pnpm … start` (stdout/stderr del proceso Node), con política de redacción (**D9.14.2**).
- **Teardown manual/controlado:** Ctrl+C / SIGINT en la terminal **dueña** del proceso (alineado a [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md)).

### No permitido en este prototipo

| prohibición | notas |
|-------------|--------|
| Dashboard (`pnpm … mapazapp dev`) | Fuera de alcance; segundo incremento explícito si se aprueba después. |
| MT5 / bridge runtime | No lanzamiento ni automatización. |
| Watcher / polling sobre carpetas | No aprobado como parte del run. |
| `open_mt5` | Solo diseño futuro (**D10.2**). |
| Endpoints de **acciones** / **`POST`** Mapazapp | Mantener gobernanza D9.x; no ampliar superficie. |
| Trading / **OrderSend** / **CTrade** | No aplica. |
| Command files hacia MT5 | No aplica. |
| `mapazapp:dev-start` | Orquesta API+dashboard; **no** es el comando del prototipo API-only. |

---

## 3. Candidate command (**NO ejecutar en D11.9**)

> **Aviso:** líneas de referencia para una **fase posterior** con aprobación **D11.8** + checkpoint de ejecución **§9**. **D11.9 no las ejecuta.**

**Directorio de trabajo:** `APP/` (raíz efectiva del workspace para filtros `pnpm`).

**Scripts reales** (`@workspace/api-server` `package.json`): `build` → `node ./build.mjs`; `start` → `node --enable-source-maps ./dist/index.mjs`. El servidor lee **`MAPAZAPP_API_HOST`**, **`MAPAZAPP_API_PORT`** (o **`PORT`**) según `index.ts` + `apiHardeningConfig.ts`.

### Bash / Git Bash (conceptual)

```bash
# NO ejecutar en checkpoint D11.9
pnpm --filter @workspace/api-server build
MAPAZAPP_API_HOST=127.0.0.1 MAPAZAPP_API_PORT=3001 pnpm --filter @workspace/api-server start
```

### PowerShell (conceptual)

```powershell
# NO ejecutar en checkpoint D11.9
pnpm --filter @workspace/api-server build
$env:MAPAZAPP_API_HOST = "127.0.0.1"
$env:MAPAZAPP_API_PORT = "3001"
pnpm --filter @workspace/api-server start
```

**Nota:** el script `dev` del paquete api-server usa `export` POSIX y encadena build+start; para Windows suele preferirse **`build` + `start`** explícitos como arriba (coherente con [`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`](./LAUNCHER_CONFIG_AND_STATUS_DESIGN.md)).

---

## 4. Preconditions (antes de cualquier ejecución futura)

| # | Precondición |
|---|----------------|
| P1 | `git status` limpio (o política explícita del equipo si hay cambios conscientes). |
| P2 | `pnpm run typecheck` desde `APP/` **OK** (según política del cambio). |
| P3 | `pnpm --filter @workspace/scripts test` **OK** (o conjunto acordado). |
| P4 | `pnpm --filter @workspace/scripts mapazapp:e2e-dry-run` **exit 0** (**D11.2**). |
| P5 | Puerto **3001** (o el elegido) **libre** en loopback — p. ej. `mapazapp:dev-preflight` con `--dashboard-port` en valor no conflictivo **solo** para satisfacer el CLI, o verificación dedicada del puerto API; documentar el método en la evidencia. |
| P6 | **No** otro servidor Mapazapp API previo en ese puerto. |
| P7 | **Rollback / teardown** acordado (terminal dueña, sin `taskkill` amplio) — ver §6. |
| P8 | **Ventana máxima** de prueba (tiempo) definida en la aprobación **D11.8**. |
| P9 | **Responsable / aprobador** identificado (**D11.8** §2.10). |
| P10 | **Destino de logs:** terminal capturada y/o archivo **fuera** del repo si se redirige; sin pegar secretos. |
| P11 | **Sin secretos** en evidencia: no tokens reales, no rutas completas `AppData`/`MetaQuotes`. |

---

## 5. Evidence to capture (run futuro)

| Evidencia | Descripción |
|-----------|-------------|
| E1 | `git log -1 --oneline` (o rango acordado). |
| E2 | Comandos ejecutados **literalmente** (los de la aprobación **D11.8** §2.9). |
| E3 | Hora de **inicio** y **fin** (reloj local, zona si aplica). |
| E4 | Puerto efectivo (`MAPAZAPP_API_PORT` / `PORT`). |
| E5 | Respuesta **GET** `/api/healthz` (código HTTP + cuerpo **redactado** si hiciera falta). |
| E6 | Respuesta **GET** `/api/mapazapp/runtime/status` (igual). |
| E7 | Fragmento de **logs** sanitizado (sin headers de token, sin URLs con query secrets). |
| E8 | Confirmación de **cleanup** (proceso terminado, puerto liberado). |
| E9 | `git status --short` **final** limpio tras la sesión. |

---

## 6. Stop / cleanup

1. **Detener:** en la terminal que lanzó `pnpm … start`, **Ctrl+C** (SIGINT) o cierre ordenado documentado — **solo** el proceso hijo de esa sesión bajo control del operador (equivalente “launcher owns children” en espíritu **D11.6**).
2. **No** `taskkill` por imagen ni por árbol del sistema completo; **no** matar PIDs ajenos.
3. **Confirmar puerto libre:** repetir preflight o sonda equivalente **después** del stop.
4. **Huérfanos:** si quedara un proceso escuchando, identificar **dueño** (¿fue este experimento?) antes de cualquier acción; si hay duda, **no** enviar señales a PIDs no registrados por el operador.
5. **Git:** working tree sin artefactos de log accidental en paths trackeados.

---

## 7. Failure handling

| Fallo | Respuesta recomendada |
|-------|------------------------|
| Puerto ocupado | No arrancar; documentar qué servicio ocupa el puerto o cambiar puerto **solo** si la aprobación **D11.8** lo permite explícitamente. |
| Build falla | No ejecutar `start`; conservar log de build **redactado**; abortar run. |
| Start falla | No continuar a verificación HTTP; revisar env (`MAPAZAPP_API_HOST`/`PORT`) y mensaje `index.ts`. |
| Health no responde o no 200 | Parar el intento; no insistir en bucle; registrar síntoma sin inventar conectividad. |
| Runtime status falla | Distinguir error de ruta vs error de servidor; no afirmar MT5/bridge “conectados”. |
| Teardown falla | No usar fuerza bruta OS; pedir revisión humana; documentar PID/proceso **solo** si es el propio experimento. |
| Logs con datos sensibles | Abortar difusión; regenerar evidencia redactada (**D9.14.2**). |

---

## 8. Approval gate

- **D11.9 no aprueba ejecución.** Solo define el plan.
- La **primera ejecución real** requiere:
  1. Cumplimiento **completo** de [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md), y  
  2. **Confirmación explícita por escrito** del usuario/responsable para el checkpoint de ejecución (**§9**).
- **No ejecutar** sin esa aprobación escrita y sin comando literal acordado (**D11.8** §2.9).

---

## 9. Recommended next checkpoint

| Opción | Rol |
|--------|-----|
| **D12.0 — First API-only supervised local run (explicit approval required)** | Ejecutar **por primera vez** el plan de este documento tras firmar **D11.8**; capturar evidencia §5; mantener límites §2. |
| **D11.10 — API-only supervised run checklist validation (no process start)** | Repaso final solo papel/checklist (opcional) si el equipo quiere una **re-leída** sin tocar procesos — **redundante** si **D11.8** + este plan ya están completos. |

**Recomendación:** **D12.0**. El dry-run declarativo (**D11.2**) y la compuerta **D11.8** ya cumplen la función de “validación sin arrancar servicios”; añadir **D11.10** solo tiene sentido si política interna exige un acto de revisión adicional con nombre propio. El siguiente valor incremental es **ejecutar el API-only una vez** con aprobación explícita y evidencia §5.

---

## 10. Non-goals (D11.9)

- Ejecutar comandos, abrir puertos en este checkpoint, o modificar código.
- Launcher `.exe`, instalador, `spawn` nuevo, `child_process`, `taskkill`, MT5, watcher, `POST`, IPC real, DB, WebSocket live, polling, `localStorage`, dependencias nuevas.

---

## 11. Conclusión

**D11.9** fija el **contrato operativo** del primer run **API-only**. La **autorización de ejecución** fue humana (**D11.8** + **D12.0**). La evidencia archivada del run está en [`API_ONLY_RUN_EVIDENCE_D12.md`](./API_ONLY_RUN_EVIDENCE_D12.md) (**D12.1**).
