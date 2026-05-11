# Mapazapp — Auditoría de empaquetado runtime / launcher (D11.0)

**Checkpoint D11.0 — solo documentación.** Audita el salto desde **scripts de desarrollo** y **modelos TS puros** hacia un **launcher productivo empaquetable**, **sin** implementar ejecutable, **sin** `spawn` / `child_process` en el alcance de este documento, **sin** lanzar MT5 y **sin** generar `.exe` o instalador.

**Relacionado:** [`END_TO_END_READINESS_AUDIT_D10.md`](./END_TO_END_READINESS_AUDIT_D10.md), [`LAUNCHER_PROTOTYPE_DESIGN_D8.md`](./LAUNCHER_PROTOTYPE_DESIGN_D8.md), [`LAUNCHER_CONFIG_AND_STATUS_DESIGN.md`](./LAUNCHER_CONFIG_AND_STATUS_DESIGN.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md), [`DEVELOPER_E2E_DRY_RUN_PLAN_D11.md`](./DEVELOPER_E2E_DRY_RUN_PLAN_D11.md), [`FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md`](./FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md), [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md), [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md), [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md).

**Declaración explícita (D11.0):** este documento **no** genera `.exe`, **no** lanza procesos del SO, **no** usa `spawn`, **no** abre ni controla MT5, **no** define instalador ni firma de binarios.

---

## 1. Qué existe hoy

| Pieza | Rol |
|--------|-----|
| `mapazapp-dev-preflight.ts` | CLI dev: sonda puertos en loopback, lee `package.json` de workspace (solo lectura), lista comandos sugeridos; **no** arranca API/dashboard/MT5. |
| `mapazapp-dev-start.ts` | CLI dev: preflight + build opcional + **`spawn`** de `pnpm` para API y dashboard; **no** es launcher de producto. |
| `mapazapp-launcher-model.ts` | Modelo **D8.2**: `LauncherConfig` (forma anidada app/api/dashboard/…), proceso hijo lógico, derivación a `MapazappRuntimeStatus`; **sin** APIs de proceso del SO. |
| `mapazapp-launcher-preflight-bridge.ts` | Puente **D8.3**: `performDevPreflight` → actualiza modelo + `ActionResult` read-only para `validate_environment`. |
| `mapazapp-launcher-action-dispatcher.ts` | **D9.3**: gates + solo `validate_environment`; **sin** HTTP/IPC. |
| `mapazapp-mt5-config-model.ts` | Validación declarativa MT5; flags `allowLaunch` / `allowCommandFiles` → `unsafe`. |
| `mapazapp-mt5-runtime-status.ts` | Mapeo conservador a slice runtime core. |
| `mapazapp-mt5-bridge-readiness.ts` | Readiness de carpeta bridge (deps opcionales). |
| `GET /api/mapazapp/runtime/status` | Snapshot read-only; sin probes MT5 “live” como producto. |
| Dashboard + `RuntimeStatusPanel` | Lectura one-shot; sin botones operativos de host. |
| `mapazapp-launcher-process-lifecycle.ts` (**D11.4**) | Ciclo de vida hijo **declarativo**; **sin** APIs de proceso del SO. |
| `mapazapp-launcher-ownership-model.ts` (**D11.5**) | Instancia / ownership de puertos **simulado** con deps; **sin** lockfile ni bind real. |

---

## 2. Qué es solo script de desarrollo

- **`mapazapp:dev-preflight`** y **`mapazapp:dev-start`** viven en `@workspace/scripts` y están orientados a **contribuidores**, no a usuario final.
- **`dev-start`** es explícitamente orquestación **con hijos** vía `pnpm`; no hay empaquetado, sin política de logs unificada ni PID registry de producto.

---

## 3. Qué es modelo puro

- **`mapazapp-launcher-model.ts`**, **`mapazapp-mt5-config-model.ts`**, **`mapazapp-mt5-bridge-readiness.ts`**, gates/`ActionResult` en **`@workspace/mapazapp-core`**: tipos y validación en memoria; I/O solo donde se inyectan deps en tests.

---

## 4. Qué no es launcher real

- No hay **`MapazappLauncher.exe`** / binario firmado, ni canal de actualización.
- No hay **supervisor único** de producto (registro de PID, reapertura, health interno) distinto del script D3.2.
- No hay **IPC** ni **HTTP local gobernado** propiedad del launcher hacia el dashboard para acciones.
- No hay **config en archivo de usuario** persistida y versionada por el launcher (solo modelos y docs hasta fases posteriores).

---

## 5. Brechas para packaging

- Elección de runtime embebido (**Node** empaquetado vs **Edge/WebView2** vs otro) y tamaño de artefacto.
- **Estructura de instalación** (directorios, permisos, desinstalador) y política de firma (SmartScreen / Gatekeeper fuera de alcance técnico repo).
- **Variables de entorno** vs archivo de config: hoy API usa `PORT`/env; launcher productivo debería centralizar contrato.
- **Versionado de `schemaVersion`** en config local y migraciones seguras.

---

## 6. Brechas para config local

- Ruta estable fuera del repo (por usuario) + plantilla documentada (**D10.5** alinea intención MT5; launcher global aún no cableado).
- Validación al arranque: host/puertos, flags `unsafe`, token de acciones (**D9.15**).
- **D11.1** introduce modelo TS **sin** lectura/escritura real de disco para el archivo futuro.

---

## 7. Brechas para logs

- Política de **rotación**, nivel, y **redacción** (reutilizar enfoque **D9.14.2** en procesos hijos si se capturan logs).
- Separación **launcher** vs **api-server** vs **Vite** (hoy logs no unificados).
- Riesgo de **rutas completas** en logs en Windows — obligatorio sanitizar como en modelos MT5.

---

## 8. Brechas para process supervision

- **Ownership**: quién crea API/dashboard, PIDs almacenados, reentrancia.
- **Reintentos** y backoff ante fallo de bind o crash.
- **Orden de arranque** (API antes que dashboard cuando haya dependencia real).
- Integración con **cierre de sesión Windows** / actualizaciones forzadas.

---

## 9. Brechas para stop safe

- **`dev-start`** mata solo hijos que él creó; launcher productivo debe evitar `taskkill` amplio y PIDs ajenos.
- **Drain** de conexiones HTTP antes de SIGTERM al API (si aplica).
- **Timeouts** y escalación si proceso no termina.

---

## 10. Brechas para integración dashboard

- **`VITE_MAPAZAPP_API_BASE_URL`**: hoy build-time; launcher podría inyectar URL o proxy local documentado.
- **Acciones**: `DashboardActionClient` sigue stub; transporte **D9.6** sin implementar.
- Copy y estados honestos (`not_checked`, `not_configured`) deben mantenerse al añadir botones en el futuro.

---

## 11. Brechas para MT5

- **Launch** y **open_mt5** solo en diseño (**D10.2**); sin implementación.
- **Watcher / command files**: explícitamente fuera de alcance actual; políticas `unsafe` en modelos.
- **Detección real** vs declaración en config — riesgo de “semáforo verde” falso sin gates adicionales.

---

## 12. Riesgos de Windows

- Rutas con espacios, antivirus bloqueando `node.exe` empaquetado, políticas corporativas.
- **`pnpm.cmd`** vs `pnpm` en `PATH` (ya visible en `dev-start`).
- **Puertos** en uso por otros servicios (IIS, hypervisor, etc.).

---

## 13. Riesgos de path privado

- `AppData`, `MetaQuotes`, perfiles de usuario no deben aparecer en **summaries** o JSON de UI/logs.
- Config local futura almacenará rutas sensibles: exige **consentimiento UX** y **sanitización** en cualquier export.

---

## 14. Riesgos de puertos ocupados

- `dev-preflight` ya detecta ocupación en loopback; launcher productivo debe surfear el mismo problema con mensajes claros y sin asumir defaults libres.

---

## 15. Criterios mínimos antes de un `.exe`

1. Supervisor con **PID registry** y apagado ordenado documentado.
2. **Config archivo usuario** validada (`schemaVersion`, flags `unsafe` imposibles en build release si política lo exige).
3. **Threat model D9.1** revisado para la superficie IPC/HTTP local real.
4. **Logs redactados** y pruebas de ausencia de secretos en salida.
5. **Single-instance** y manejo de segunda instancia (UI o exit code).
6. Separación clara **dev** vs **prod** (sin `dev-start` en ruta de usuario final).

---

## 16. Non-goals (D11.0)

- Generar **instalador** o **`.exe`**.
- Implementar **IPC**, **WebSocket live**, **DB**, **watcher**, **OrderSend/CTrade**, **POST** de acciones, **botones operativos** en dashboard.
- Conectar **runtime MT5 real** desde Node.

---

## 17. Conclusión

El repositorio dispone de **cimientos sólidos en modelos y scripts de desarrollo**, pero el **launcher empaquetable** sigue siendo trabajo **posterior** y **gobernado**: D11.0 deja trazada la brecha sin ejecutar runtime real. **D11.1–D11.2** añaden modelo de config local y dry-run **no operacional**. **D11.3** documenta el primer run local controlado (**plan**, sin ejecución en ese checkpoint). **D11.4–D11.5** añaden modelos TS de ciclo de vida e instancia/puertos **sin** `spawn`, lockfile real ni bind. **D11.6–D11.8** cierran diseño de start/stop, decisión de prototipo supervisado y **compuerta** antes del primer run real — todo **documentación únicamente**.

---

## 18. Seguimiento D11.3–D11.8

| ID | Entrega |
|----|---------|
| **D11.3** | [`FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md`](./FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md) — orden y criterios del primer run; comandos marcados como **no ejecutar** en D11.3. |
| **D11.4** | `APP/scripts/src/mapazapp-launcher-process-lifecycle.ts` + tests — transiciones declarativas; `commandLabel` solo etiqueta segura. |
| **D11.5** | `APP/scripts/src/mapazapp-launcher-ownership-model.ts` + tests — `evaluatePortOwnership` / `evaluateSingleInstance` con deps inyectadas; sin I/O de lock ni red real. |
| **D11.6** | [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md) — política start/stop seguro futuro; **sin** implementación. |
| **D11.7** | [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md) — decisión de prototipo supervisado (API-only preferido); **sin** código. |
| **D11.8** | [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md) — compuerta/checklist antes del primer run real; **sin** ejecución. |
