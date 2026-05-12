# Mapazapp — Real Wrapper Prototype Gate D14

## 1. Purpose

- **D14.4** ([`mapazapp-local-launcher-wrapper-model.ts`](../../../scripts/src/mapazapp-local-launcher-wrapper-model.ts)) creó el **modelo TypeScript puro** del wrapper local (modos, layout conceptual, políticas de acción, validación, serialización segura) **sin** I/O ni procesos.
- **D14.5** ([`mapazapp-local-launcher-wrapper-dry-run.ts`](../../../scripts/src/mapazapp-local-launcher-wrapper-dry-run.ts), script `mapazapp:launcher-wrapper-dry-run`) creó el **CLI dry-run** que materializa el modelo en memoria e imprime plan/JSON **sin** arrancar servicios.
- **D14.6** (**este documento**) es la **compuerta formal** para decidir si se **autoriza** un **wrapper real** con capacidad de **start/stop** de procesos (delegando en la semántica ya probada del supervisor **D13.5**), **qué alcance** tendría, **qué condiciones** deben cumplirse y **qué sigue prohibido**.
- **D14.6 no implementa código** ni scripts nuevos ejecutables más allá de la documentación.
- **D14.6 no ejecuta procesos** (sin API, dashboard, supervisor, MT5, watcher, `mapazapp:dev-start`).
- **D14.6 no genera `.exe`**, **no** instalador y **no** empaquetado real.

**Relacionado:** [`LOCAL_LAUNCHER_WRAPPER_PROTOTYPE_DECISION_D14.md`](./LOCAL_LAUNCHER_WRAPPER_PROTOTYPE_DECISION_D14.md) (**D14.3**), [`LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md`](./LOCAL_LAUNCHER_PROTOTYPE_GATE_D14.md) (**D14.0**), [`LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md`](./LOCAL_RUNTIME_FOLDER_LAYOUT_MODEL_D14.md) (**D14.1**), [`PACKAGING_DRY_RUN_MANIFEST_D14.md`](./PACKAGING_DRY_RUN_MANIFEST_D14.md) (**D14.2**), [`LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md`](./LOCAL_LAUNCHER_PACKAGING_DESIGN_D13.md) (**D13.9**), [`API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md`](./API_DASHBOARD_SUPERVISOR_RUN_EVIDENCE_D13.md) (**D13.6**), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`CURSOR_HANDOFF.md`](./CURSOR_HANDOFF.md).

---

## 2. Current baseline

| Aspecto | Estado |
|--------|--------|
| Supervisor **API-only** | **OK** — evidencia **D13.3**; `mapazapp:api-only-supervisor`. |
| Supervisor **API + dashboard** | **OK** — evidencia **D13.6**; `mapazapp:api-dashboard-supervisor`. |
| **Layout local D14.1** | **Definido** — modelo documental bajo `Mapazapp/`. |
| **Manifest dry-run D14.2** | **Definido** — contrato docs-only; sin JSON consumible fuera de docs. |
| **Decisión wrapper D14.3** | **Cerrada** — secuencia **D14.4–D14.6** y opciones A–F. |
| **Modelo wrapper D14.4** | **OK** — TS puro + tests. |
| **CLI dry-run D14.5** | **OK** — plan/validación en stdout; sin start real. |
| **Wrapper real** | **No** — aún no hay CLI que delegue en supervisor con start explícito. |
| **Launcher `.exe`** | **No**. |
| **Installer** | **No**. |
| **MT5 / `POST` / trading / action endpoints** | **No** en el camino feliz acordado para **D14.7** acotado. |

---

## 3. What “real wrapper prototype” means

- Un **CLI o módulo Node** bajo `@workspace/scripts` que **reutiliza** el **supervisor API + dashboard** existente (`mapazapp-api-dashboard-supervisor.ts` o extracción controlada de su lógica) **sin duplicar** una segunda superficie de `spawn` no auditada.
- **Puede** iniciar **API + dashboard** en loopback cuando el operador invoque explícitamente el modo real (p. ej. flag `--confirm-start`).
- **Puede** consultar **status** (health, runtime envelope, HTTP básico del dashboard, CORS) alineado a evidencia **D13.6**.
- **Puede** **detener solo procesos hijos registrados** por el mismo run (orden **dashboard → API** al bajar, ownership de listeners **D13.5**).
- **Puede** emitir **evidencia** estructurada (stdout JSON o artefacto acordado en **D14.8**) con **redacción**; **no** materializar layout de producto en disco en **D14.7** salvo lo explícitamente acordado para evidencia.
- **Sigue sin ser** **`.exe`**, **sigue sin ser** **installer**, **sigue sin ser** producto final ni auto-update.

### Diferenciar niveles

| Nivel | Qué es | Qué **no** es |
|------|--------|----------------|
| **Dry-run CLI D14.5** | Solo modelo en memoria + impresión; **cero** procesos. | Supervisor ni API ni dashboard. |
| **Real wrapper prototype D14.7** | Delegación controlada en supervisor; start/stop **opt-in** con confirmación explícita. | **No** empaquetado; **no** MT5; **no** `POST` operativo. |
| **Packaged launcher** | Árbol **D14.1** + manifest **D14.2** materializado en staging/release. | **No** objetivo inmediato de **D14.7**. |
| **`.exe` / installer** | Binario firmado / flujo de instalación (**D13.9**). | **Fuera** de **D14.7**; requiere gates adicionales y **D13.9.1** cerrada para modo producto. |

---

## 4. Candidate scopes

### A. Seguir docs-only y no autorizar código de wrapper real

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Cero riesgo de regresión operativa; el equipo sigue usando supervisores **D13** y `pnpm` manualmente. |
| **Riesgos** | UX fragmentada; expectativas de “un solo comando” no satisfechas. |
| **Archivos probables** | Ninguno nuevo; solo mantener docs. |
| **¿Código?** | **No**. |
| **¿Run real?** | **No**. |
| **¿spawn / child_process?** | **No** nuevo. |
| **¿Deps nuevas?** | **No**. |
| **Validaciones** | N/A. |
| **Rollback** | N/A. |
| **Recomendación** | **Opcional** si no hay aprobación operativa; **no** es la ruta preferida tras **D14.5** si el objetivo es unificar dev. |

### B. Implementar wrapper real API+dashboard CLI usando supervisor existente

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Un solo entrypoint para dev/power-user; reutiliza preflight, health, CORS, cleanup **D13.5**/**D13.6**. |
| **Riesgos** | Alto si se duplica `spawn` o se omite confirmación explícita; drift respecto a modelo **D14.4**. |
| **Archivos probables** | `mapazapp-local-launcher-wrapper.ts` (o nombre acordado) + tests + entrada `package.json`; **sin** tocar `mapazapp-api-dashboard-supervisor.ts` salvo refactor acotado bajo revisión. |
| **¿Código?** | **Sí**. |
| **¿Run real?** | **Sí** cuando el operador confirma start. |
| **¿spawn / child_process?** | **Sí**, **solo** vía el mismo patrón confinado que el supervisor (no nueva superficie dispersa). |
| **¿Deps nuevas?** | **No** (preferido). |
| **Validaciones** | Tests §11; smoke acotado; evidencia **D14.8**; aprobación **D11.8**-style. |
| **Rollback** | Quitar script wrapper; supervisores **D13** intactos. |
| **Recomendación** | **Recomendada** como **D14.7** tras cumplir precondiciones **§7** y aprobación explícita. |

### C. Implementar wrapper status-only sin start/stop

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Menor riesgo; agrega polling local opcional o invocación one-shot a health ya documentados **sin** orquestar hijos. |
| **Riesgos** | Valor limitado frente a supervisor directo; puede confundir si se llama “wrapper”. |
| **Archivos probables** | Módulo pequeño + CLI `status` only. |
| **¿Código?** | **Sí**. |
| **¿Run real?** | Solo si el usuario ya levantó servicios por otro medio. |
| **¿spawn?** | **No** en el diseño mínimo. |
| **¿Deps nuevas?** | **No**. |
| **Validaciones** | Tests de no-start por defecto. |
| **Rollback** | Borrar módulo. |
| **Recomendación** | **Opcional** como fase intermedia; **no** sustituye **B** si el objetivo es start/stop unificado. |

### D. Implementar wrapper start/stop pero API-only (sin dashboard)

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Menor superficie que API+dashboard; útil para entornos sin UI. |
| **Riesgos** | No cumple el caso de uso principal ya validado en **D13.6**; posible segunda implementación después. |
| **Archivos probables** | Wrapper delgado sobre `mapazapp-api-only-supervisor.ts`. |
| **¿Código?** | **Sí**. |
| **¿Run real?** | **Sí**. |
| **¿spawn?** | **Sí** (supervisor API-only). |
| **¿Deps nuevas?** | **No**. |
| **Recomendación** | **Opcional**; por defecto **B** alinea con evidencia **D13.6**. |

### E. Wrapper real con `--dry-run` visible por defecto y `--confirm-start` obligatorio para start real

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Fail-closed humano; alinea CLI con mentalidad **D14.5**; reduce arranques accidentales. |
| **Riesgos** | Bajo si está bien testeado; operadores deben conocer el flag. |
| **Archivos probables** | Mismo que **B** con CLI UX documentada. |
| **¿Código?** | **Sí**. |
| **¿Run real?** | Solo con `--confirm-start` (o equivalente documentado). |
| **¿spawn?** | **Sí** tras confirmación. |
| **¿Deps nuevas?** | **No**. |
| **Recomendación** | **Obligatorio** como requisito de diseño de **D14.7** junto con **B**. |

### F. Frenar y abrir D13.9.1 static dashboard serving strategy antes

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Alinea expectativas de “modo producto” vs Vite dev antes de empaquetado o `.exe`. |
| **Riesgos** | Retrasa **D14.7** si se exige cierre total; puede ser innecesario para prototipo dev-local. |
| **Archivos probables** | Doc **D13.9.1** (nombre a acordar). |
| **¿Código?** | **No** en el gate doc. |
| **¿Run real?** | **No** obligatorio. |
| **Recomendación** | **Ver §6** — **no** bloquea **D14.7** acotado a la misma estrategia **D13.5**; **sí** antes de packaging producto o `.exe`. |

### G. Frenar y abrir D14.2.1 / D14.2.2 manifest TS model/validator antes

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Reduce drift entre manifiesto **D14.2** y empaquetado futuro. |
| **Riesgos** | Retrasa **D14.7** si se hace obligatorio; el wrapper prototipo **no** requiere manifest materializado. |
| **Archivos probables** | TS puro + tests read-only. |
| **¿Código?** | Opcional. |
| **¿Run real?** | **No**. |
| **Recomendación** | **Opcional** antes de **D14.7**; **recomendable** antes de packaging real o validación de staging amplia. |

---

## 5. Recommended decision

**Autorizar**, como **siguiente paso de implementación** (**D14.7**), un **wrapper real mínimo** que **no** sea **`.exe`**, **no** sea packaging y **no** escriba el layout de producto en disco, sujeto a:

1. Reutilización del **supervisor API + dashboard** existente (**D13.5**) — **sin** segunda superficie de `spawn` no auditada.
2. **Modo dry-run** visible y **por defecto** seguro; **start real** solo con **`--confirm-start`** (o equivalente explícito documentado) — alineado con **§4 E** y **§8**.
3. **Sin** MT5, **sin** `POST` / action endpoints, **sin** trading, **sin** nuevas deps por defecto.
4. Evidencia y checklist de **§7**, **§9**, **§10**, **§11** satisfechos antes del primer merge de código **D14.7**.

### Secuencia recomendada

| ID | Contenido |
|----|-------------|
| **D14.6** | **Gate** (este doc) — autorización y límites. |
| **D14.7** | **Implementación + run** del prototipo real — **aprobación explícita** requerida (**D11.8**-style). |
| **D14.8** | **Evidencia formal** del run del wrapper (docs-only o JSON acordado). |
| **D14.9** | **Decisión** de estrategia de dashboard estático / compuerta de packaging producto si el wrapper debe evolucionar hacia producto. |

---

## 6. D13.9.1 dependency decision

- **D13.9.1** (**static dashboard serving strategy**) **no bloquea** un **wrapper real de desarrollo** que use la **misma** estrategia que el supervisor actual (**Vite dev** en **5173**, según **D13.5**/**D13.6**).
- **D13.9.1 sí debe cerrarse** antes de **packaging de producto**, **`.exe`** o un launcher presentado como **modo producto** únicamente con assets estáticos/preview.
- Si **D14.7** se acota explícitamente a **“prototipo dev-local = misma semántica D13.5”**, **D13.9.1** puede permanecer **abierta** en paralelo con advertencia en docs y evidencia.
- Si **D14.7** debe **simular** o **exigir** modo estático/preview como único comportamiento, entonces **D13.9.1** debe **abrirse y cerrarse antes** o en el mismo bloque de trabajo que **D14.7**.

---

## 7. Preconditions before D14.7

| # | Precondición |
|---|--------------|
| 1 | **Working tree limpio** en el momento de la aprobación del run **D14.7**. |
| 2 | **Tests** `pnpm --filter @workspace/scripts test` en verde (incl. **D14.4**/**D14.5**). |
| 3 | Supervisores **D13.3**/**D13.6** referenciables; sin regresión conocida en cleanup. |
| 4 | **Puertos** **3001** y **5173** libres o política **fail-closed** documentada si ocupados. |
| 5 | **`mapazapp:launcher-wrapper-dry-run`** ejecutado OK (dry-run) como verificación rápida del modelo. |
| 6 | **Aprobación explícita** operador/responsable (**D11.8**-style). |
| 7 | **Cleanup** documentado (orden dashboard → API; sin `taskkill` amplio). |
| 8 | **Esquema de evidencia** acordado para **D14.8** (campos mínimos **§10**). |
| 9 | **Sin MT5**, **sin** **`POST`**, **sin** trading en el alcance del run. |

---

## 8. Allowed D14.7 scope

**Permitido:**

- Nuevo **CLI wrapper real** bajo `@workspace/scripts` (nombre a acordar; **no** `mapazapp:launcher-wrapper` genérico sin diseño).
- **Delegación** en lógica del **supervisor API + dashboard** existente.
- Subcomandos o flags conceptuales: **`status`**, **`dry-run`** (o default dry-run), **`start`** / **`run-once`** / **`stop`** con confirmación explícita donde aplique.
- **`--confirm-start`** (o equivalente) para cualquier **process start** real.
- **Evidencia** por **stdout**/JSON en el run; ampliación a archivo solo si se acuerda y sin secretos.
- **Cleanup** controlado y comprobaciones de puertos liberados al finalizar.

**Prohibido** en **D14.7** (salvo nuevo gate explícito):

- **`.exe`**, **installer**, **packaging real**, **copia** masiva de artefactos, **`mkdir`/`writeFile`** para materializar **layout D14.1** producto.
- **MT5**, **watcher**, **command files**.
- **`POST`**, **action endpoints**, **botones** nuevos en dashboard.
- **DB** operativa, **WebSocket live** nuevo obligatorio, **`localStorage`** nuevo obligatorio.
- **Action transport** operativo, **tokens** reales sin diseño **D9.x** cerrado para ese camino.

---

## 9. Safety requirements

- **Default = dry-run** o equivalente que **no** invoque `spawn` sin confirmación explícita.
- **Process start** solo con flag **`--confirm-start`** (nombre puede ajustarse; el contrato es **opt-in** explícito).
- **Stop** solo de **procesos hijos** registrados por el wrapper/supervisor — **no** matar por nombre de proceso global (**D11.6**).
- **Orden de bajada:** **dashboard antes que API** (consistente con **D13.5**/**D13.6**).
- Comprobaciones de **puertos** y **runtime envelope** **fail-closed** si el estado es inseguro.
- Copy y JSON **sin** “ready to trade” / “live trading” / claims operativos falsos.
- **Sin secretos** en logs; **sin** rutas privadas sin redacción (**D9.14.2**, políticas **D14.1**).
- **Sin** lanzamiento MT5; **sin** habilitar action transport en el wrapper prototipo.

---

## 10. Evidence requirements (D14.8 mínimo sugerido)

| Campo / tema | Descripción |
|----------------|-------------|
| **command** | Línea exacta del wrapper invocada (sin secretos). |
| **startedAt** / **stoppedAt** | ISO8601. |
| **mode** | p. ej. `dry_run` vs `confirmed_start`. |
| **confirmStart** | boolean explícito. |
| **apiPid** / **dashboardPid** | solo si el diseño los expone (pueden ser null en dry-run). |
| **health** | Resultado health API. |
| **runtime status** | Envelope **GET** conservador. |
| **dashboard HTTP** | Resultado checks HTTP básicos (p. ej. `/`, `/config`). |
| **cors** | Resultado check CORS documentado en **D13.6**. |
| **cleanup** | Orden ejecutado y resultado. |
| **portsFreed** | o tokens de conflicto si falló. |
| **safetyFlags** | `executionEnabled`, `mockOnly`, etc., según envelope. |
| **gitStatusInitial** / **gitStatusFinal** | opcional, solo si política del equipo lo exige (sin paths privados). |
| **errors** / **warnings** | lista segura. |

---

## 11. Tests required before D14.7 commit

- **`--help`** seguro (sin frases prohibidas de trading).
- **Default / dry-run** no llama a `spawn` ni inicia API/dashboard.
- **Start sin `--confirm-start`** → bloqueado o exit code **fail-closed**.
- **Start con confirm** → delega en supervisor (tests con **mocks** de deps de proceso).
- **Falla del supervisor** → resultado JSON seguro, sin stack leak.
- **Cleanup** propagado en el resultado.
- **JSON** libre de fragmentos privados y patrones secretish (**D14.4**/**D14.5** style).
- **Sin** MT5 / `POST` / trading en strings de salida de tests.
- **Sin** escrituras a filesystem en tests del wrapper (salvo tmp explícito **fuera** de alcance si nunca se usa).
- **Static scan**: sin `taskkill`, sin `process.kill` amplio, sin kill por nombre global.
- **Entrada `package.json`** del script nuevo presente y documentada.

---

## 12. Failure handling

- **Puertos ocupados** → fallo temprano; **no** matar procesos ajenos.
- **Dry-run inválido** (args) → exit **2**; mensaje corto; **sin** stack al usuario.
- **Confirmación faltante** para start real → exit **fail-closed**; mensaje que indique el flag requerido.
- **Fallo al iniciar supervisor/API/dashboard** → evidencia de error; cleanup intentado según diseño **D13.5**.
- **Runtime unsafe** → no continuar hacia pasos que asuman salud; fail-closed.
- **Fallo parcial de cleanup** → evidenciar; **no** reintentos destructivos; **no** `taskkill` por imagen.
- **Interrupción** (SIGINT) → mismo camino de shutdown documentado en supervisor; wrapper debe propagar señal de forma acotada.

**Regla:** **fail-closed**, **sin** reintentos que amplíen blast radius, **sin** kill por nombre de proceso global.

---

## 13. Recommended next checkpoints

| ID | Contenido |
|----|-------------|
| **D14.6** | **Real wrapper prototype gate** (este documento). |
| **D14.7** | **Implementación + run** del wrapper real — aprobación explícita; límites **§8**. |
| **D14.8** | **Evidencia formal** del primer run wrapper (campos **§10**). |
| **D14.9** | **Decisión** de dashboard estático / compuerta packaging producto cuando el alcance evolucione. |

**Opcionales:**

- **D14.2.1** / **D14.2.2** — modelo TS o validador read-only del manifest si el riesgo de drift lo exige antes de packaging.
- **D13.9.1** — ver **§6** antes de producto **`.exe`** o dashboard estático como único modo.

---

## 14. Definition of done

- [x] Documento **D14.6** creado en `APP/artifacts/mapazapp/docs/REAL_WRAPPER_PROTOTYPE_GATE_D14.md`.
- [x] Opciones **A–G** evaluadas (**§4**).
- [x] **Decisión recomendada** y secuencia **D14.7–D14.9** (**§5**, **§13**).
- [x] Dependencia **D13.9.1** definida (**§6**).
- [x] Precondiciones **D14.7** listadas (**§7**).
- [x] Alcance permitido/prohibido **D14.7** (**§8**).
- [x] Requisitos de **safety**, **evidencia** y **tests** (**§9–§11**).
- [x] Manejo de **fallos** (**§12**).
- [x] **Sin código**, **sin procesos**, **sin `.exe`**, **sin empaquetado** en **D14.6**.

---

## 15. Non-goals

**D14.6 no implementa** ni autoriza ejecutar en este checkpoint:

- Código nuevo, **filesystem writes**, **copia** de archivos, **`mkdir`**, **`writeFile`** para layout producto.
- **Executable**, **installer**, empaquetado real.
- **`spawn`**, **`child_process`**, **`taskkill`**, **`process.kill`** nuevos (solo los que ya existen en supervisores **D13**).
- **API start**, **dashboard start**, **supervisor run**, **`mapazapp:dev-start`** como parte de este doc.
- **MT5**, **watcher**, **command files**.
- **`POST`**, **action endpoints**, **trading**.
- **DB**, **WebSocket live**, **IPC** nuevo.
- **`git push`**.
