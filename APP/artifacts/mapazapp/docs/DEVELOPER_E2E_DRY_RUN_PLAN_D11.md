# Mapazapp — Plan dry-run E2E desarrollador (D11.2)

**Checkpoint D11.2 — planificación y verificación declarativa.** Describe la **secuencia end-to-end esperada** para un desarrollador **sin** iniciar API, dashboard, MT5, **sin** `spawn` / `child_process`, **sin** `fetch`, **sin** WebSocket live y **sin** base de datos.

**Implementación asociada:** CLI `pnpm --filter @workspace/scripts mapazapp:e2e-dry-run` (`mapazapp-e2e-dry-run.ts`) — imprime pasos, valida el **modelo** de config local del launcher (**D11.1**) y comprueba (solo lectura) la presencia de scripts esperados en `package.json` del workspace, alineado con `mapazapp-dev-preflight`. **No** ejecuta `mapazapp:dev-start`, **no** ejecuta `pnpm build` / `pnpm start` como parte del dry-run.

**Salida segura:** sin secretos, sin rutas privadas en resúmenes, sin frases prohibidas tipo “ready to trade” o “MT5 connected”.

**Relacionado:** [`END_TO_END_READINESS_AUDIT_D10.md`](./END_TO_END_READINESS_AUDIT_D10.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md), [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md), [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md).

---

## 1. Pasos conceptuales (orden lógico)

1. **Typecheck / tests** del monorepo según CONTRIBUTING (cuando toque integración; el CLI dry-run **no** los ejecuta).
2. **Validación declarativa** del modelo de config local del launcher (**D11.1**) — posture por defecto conservadora.
3. **Lectura opcional** de `package.json` de `@workspace/api-server`, `@workspace/mapazapp` y `@workspace/scripts` para confirmar que existen los scripts esperados por el flujo dev documentado (misma matriz conceptual que preflight).
4. **Preflight de puertos** (`mapazapp:dev-preflight`) — **paso manual separado** cuando el desarrollador quiera comprobar loopback antes de arrancar servicios; **no** forma parte de la ejecución automática del dry-run D11.2 (evita siquiera abrir sockets desde el dry-run).
5. **Arranque manual** de API y dashboard en terminales distintas — **fuera** del dry-run; el dry-run solo **recuerda** esta fase sin ejecutarla.
6. **Verificación humana** de URLs documentadas (`/api/healthz`, dashboard) — manual.
7. **Postura de seguridad:** sin `POST` de acciones, sin transporte de acciones real, sin MT5 launch desde Mapazapp.

---

## 2. Qué el dry-run **no** hace

- No ejecuta **`mapazapp:dev-start`** ni **`pnpm build`** / **`pnpm start`**.
- No abre navegador, no escribe logs en disco, no usa **`localStorage`**.
- No afirma **conectividad** ni **listo para operar**.

---

## 3. Evolución futura

Cuando exista launcher productivo, este plan se amplía con pasos **gobernados** (supervisor, logs, token de acciones, IPC) sin reutilizar el dry-run como sustituto del runtime real.

**Siguiente lectura:** [`FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md`](./FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md) (**D11.3**) — secuencia completa del primer run local controlado (solo texto; comandos marcados como no ejecutar en ese checkpoint). **Antes** de cualquier run real supervisado: [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md) (**D11.8**) y la decisión de prototipo en [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md) (**D11.7**).
