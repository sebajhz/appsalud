# Mapazapp — Diseño de arranque y parada seguros del launcher (D11.6)

**Checkpoint D11.6 — solo documentación.** Define **cómo** un **launcher supervisor futuro** debería iniciar y detener procesos de forma **segura y reversible**, alineado con los modelos declarativos **D11.4** (`mapazapp-launcher-process-lifecycle.ts`) y **D11.5** (`mapazapp-launcher-ownership-model.ts`), el modelo de config **D11.1** (`mapazapp-launcher-config-model.ts`), y el contraste con **`mapazapp-dev-start`** (**D3.2**). **Este documento no implementa nada:** no ejecutable, no `spawn`, no `child_process`, no `taskkill`, no `process.kill` amplio, no MT5, no trading, no command files, no IPC/HTTP operacional nuevo.

**Relacionado:** [`FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md`](./FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md), [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md), [`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`](./LAUNCHER_CONFIG_AND_STATUS_DESIGN.md), [`LAUNCHER_PROTOTYPE_DESIGN_D8.md`](./LAUNCHER_PROTOTYPE_DESIGN_D8.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md), [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md).

---

## 1. Objetivo

- Fijar **política** de **start seguro** y **stop seguro** para cuando exista un launcher de producto **aprobado**, sin escribir código de supervisor en este checkpoint.
- Reutilizar la semántica ya modelada: `ownedByLauncher`, `commandLabel` como **etiqueta segura** (nunca cadena de shell ejecutable), estados de ciclo de vida, ownership de puertos e instancia única simulables vía deps (**D11.4–D11.5**).
- Separar claramente el **script de desarrollo** actual (`mapazapp-dev-start`) de un **supervisor futuro** con registro de PIDs, política de logs y compuertas de producto.

---

## 2. Dev-start actual vs launcher supervisor futuro

| Aspecto | `mapazapp-dev-start` (D3.2) | Launcher supervisor futuro (diseño) |
|--------|-----------------------------|-------------------------------------|
| Audiencia | Contribuidores | Usuario / operador bajo política de producto |
| Orquestación | Preflight + build opcional + **hijos `pnpm`** | Validación de config + **registro explícito** de cada hijo **antes** de transición OS |
| Propiedad | Lista en memoria de `ChildProcess`; Ctrl+C intenta `kill` **solo** a hijos creados por el script | **PID registry** persistente en memoria del proceso launcher + flags `ownedByLauncher === true` solo tras fork/spawn verificado |
| Puertos | Preflight compartido con D3.1 | **Single-instance** + filas `LauncherPortEntry` (**D11.5**) con sonda/bind según política aprobada |
| Logs | Prefijos stdout/stderr por hijo | Carpeta `logsRoot` validada, rotación, **redacción** (p. ej. **D9.14.2**) |
| Alcance declarado | No MT5, no trading, no `.exe` | Igual por defecto; MT5/command files solo tras gates explícitos fuera de D11.6 |

**Conclusión:** `dev-start` es un **atajo de desarrollo** útil; el launcher futuro debe ser **más estricto** en precondiciones, evidencia, teardown y **no matar procesos ajenos**.

---

## 3. Política de hijos propios

- Solo procesos cuyo **PID** fue obtenido directamente del `spawn` (o equivalente aprobado) del launcher entran en el **conjunto supervisado**.
- Cada hijo debe mapearse a un `LauncherChildProcessRecord` (**D11.4**): `kind`, `commandLabel` (etiqueta interna tipo `api_service`), `port`, `ownedByLauncher`.
- **`markChildStopped`** en el modelo declarativo **ignora** stop si `ownedByLauncher` es falso — el launcher real debe replicar la misma regla: **nunca** enviar señal de terminación a PIDs no registrados como propios.
- Hijos **desconocidos** (`unknownChild`) solo como bucket temporal de diagnóstico; política de producto: **no** escalar privilegios para “adoptar” procesos huérfanos del sistema.

---

## 4. Política de puertos

- Antes de bind/start: evaluar roles `api`, `dashboard`, `mt5_bridge` con la misma matriz conceptual que **D11.5** (`occupied_by_other` ⇒ conflicto documentado).
- El launcher **no** asume que puede “liberar” un puerto ocupado por terceros.
- Si el operador cambia puertos en config, repetir **preflight/probe** coherente con **D3.1** antes de start.

---

## 5. Single-instance

- Antes de exponer cualquier acción de start: `evaluateSingleInstance` (**D11.5**) con señales de lock **no stale**; si `conflict`, **negar start** con mensaje accionable (segunda instancia o lock legítimo ajeno).
- Segunda instancia del launcher: **salida limpia** o handoff documentado (fuera de alcance D11.6 — solo exigir decisión explícita en implementación futura).

---

## 6. Logs

- **Pre-start:** snapshot de config **sanitizada** (`sanitizeLauncherConfigForDisplay`, **D11.1**).
- **Runtime:** líneas estructuradas por `kind` de hijo; sin rutas completas de usuario, sin tokens, sin marcadores operativos prohibidos en JSON de estado (alineado a `assertLauncherProcessLifecycleSafety`).
- **Post-stop:** resumen de códigos de salida **agregados** (no stack traces crudos al usuario final).

---

## 7. Cleanup

- Tras stop ordenado: vaciar PID registry, marcar estados `stopped` o `failed` con `sanitizeLifecycleFailureToken` para tokens de error (**D11.4**).
- Archivos temporales del launcher (si existen en el futuro): solo bajo `dataRoot` / `logsRoot` aprobados; **no** escribir en el repo Git salvo política explícita.

---

## 8. Señales

- Primera fase de stop: **SIGTERM** (o equivalente Windows documentado) **solo** a hijos propios.
- Escalación: segundo intento tras **timeout** (ver §10), aún **solo** hijos propios — **no** `taskkill /IM` amplio, **no** matar por nombre de proceso global.
- El operador siempre puede usar **Ctrl+C** en la consola que **posee** el launcher (análogo a D3.2).

---

## 9. Timeout

- **Start:** tiempo máximo por hijo desde `starting` hasta señal de “ready” (health interno o HTTP **GET** acordado — diseño futuro); si vence ⇒ `markChildFailed` + rollback de hermanos ya iniciados en orden inverso.
- **Stop:** tiempo máximo de apagado gracioso; si vence ⇒ escalación controlada **solo** sobre PIDs propios.

---

## 10. Crash handling

- Si un hijo sale con código ≠ 0 mientras otros viven: política **fail-fast** documentada (recomendado para dev-paridad) o “degradado controlado” — debe elegirse en implementación y reflejarse en `lastError` / `transitionWarnings`.
- No reiniciar en bucle sin backoff (riesgo de tormenta de logs y CPU).

---

## 11. Procesos zombies / PID reuse

- Tras `wait`/`on('exit')`, marcar PID como **liberado** en el registry interno; no reusar estructuras de handle sin confirmar evento de salida.
- Antes de señalar un PID almacenado: comprobar que sigue siendo el **mismo proceso** (Windows: mecanismo futuro documentado — p.ej. query de proceso con creación time; **no** detallado en D11.6) para mitigar **PID reuse** accidental.
- Si hay duda “PID ya reciclado por el SO”: **no** enviar señal; marcar `unknown` y exigir intervención humana.

---

## 12. No matar procesos ajenos / no taskkill agresivo

- Prohibido: `taskkill` por imagen, por árbol de sesión completa, o por rangos de PID “a ojo”.
- Permitido: señales a PIDs **listados en el registry del launcher** con `ownedByLauncher === true` y comprobación de parentez/coherencia según política aprobada.

---

## 13. Datos a registrar **antes** de iniciar un hijo (mínimo)

- `kind`, `commandLabel`, **puerto previsto**, **orden** de arranque en el plan, **hash de versión** o `schemaVersion` de config leída, timestamp `startedAt` candidato, **variables de entorno efectivas** (redactadas), resultado de **single-instance** y de **port ownership**, ID de lock si aplica (**D11.5**).

---

## 14. Condiciones antes de **start**

- Config validada (`validateLauncherConfig`, **D11.1**) con `allowProcessStart` / `allowMt5Launch` / `allowCommandFiles` en los valores **seguros** exigidos por gobernanza actual (**false**).
- Preflight de puertos y scripts (misma intención que **D3.1**) **OK** para los roles que se vayan a levantar.
- Single-instance **sin** `conflict` ni lock **stale** no resuelto.
- No hay shutdown ya solicitado (`shutdownRequested` coherente con **D11.4**).

---

## 15. Condiciones antes de **stop**

- El hijo está en `running` **y** `ownedByLauncher === true`.
- O bien se solicita shutdown global del launcher y se itera hijos en **orden inverso** al start (API/dashboard: típicamente dashboard primero en stop si depende de API — decisión de producto a documentar en implementación).

---

## 16. Cuándo **negarse a iniciar**

- Cualquier conflicto de puerto `occupied_by_other`.
- Instancia duplicada / lock ajeno válido.
- Config inválida o `unsafe`.
- Preflight fallido.
- Operador no confirmó compuerta de **primer run real** cuando aplique ([`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md)).

---

## 17. Cuándo **negarse a detener**

- `ownedByLauncher === false` (el modelo ya emite `stop_ignored_not_owned_by_launcher`).
- PID desconocido o no presente en el registry (no inventar targets).
- Shutdown ya completado / hijo ya en `stopped` (operación idempotente, sin error ruidoso).

---

## 18. Reporte seguro de errores

- Usar tokens y `safeSummary` como en **D11.4** / **D11.1**; evitar excepciones crudas hacia UI o archivos de log sin pasar por sanitización.
- En errores de arranque: distinguir **config**, **puerto**, **toolchain**, **timeout** — siempre sin filtrar secretos ni rutas privadas.

---

## 19. Non-goals (D11.6)

- Implementar supervisor, `.exe`, instalador, `spawn`, `child_process`, `taskkill`, `process.kill` sobre PIDs no propios.
- Lanzar MT5, watcher, command files, `OrderSend` / `CTrade`, endpoints `POST`, botones dashboard operativos, IPC/WS live, DB, polling productivo, `localStorage`.
- Sustituir o modificar el comportamiento actual de **`mapazapp-dev-start`** — solo se contrasta.

---

## 20. Conclusión

D11.6 deja **diseño** de start/stop seguro compatible con **D11.4–D11.5** y con la postura conservadora de **D11.1**. La implementación material queda para fases posteriores **tras** la compuerta de [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md) y la decisión de prototipo en [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md).
