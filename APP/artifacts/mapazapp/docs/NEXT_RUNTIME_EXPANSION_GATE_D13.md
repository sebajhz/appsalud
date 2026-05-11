# Mapazapp — Next Runtime Expansion Gate D13

**Checkpoint D13.0 — solo documentación / análisis.** Cierra la **decisión formal** sobre cuál será el **próximo salto** de runtime o producto **después** de la serie **D12**. **No** implementa código, **no** arranca procesos, **no** ejecuta API, dashboard, `mapazapp:dev-start` ni MT5.

**Relacionado:** [`API_ONLY_RUN_EVIDENCE_D12.md`](./API_ONLY_RUN_EVIDENCE_D12.md), [`API_DASHBOARD_RUN_EVIDENCE_D12.md`](./API_DASHBOARD_RUN_EVIDENCE_D12.md), [`HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md`](./HUMAN_DASHBOARD_VISUAL_VERIFICATION_EVIDENCE_D12.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`END_TO_END_READINESS_AUDIT_D10.md`](./END_TO_END_READINESS_AUDIT_D10.md), [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md), [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md), [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md), [`LAUNCHER_API_ONLY_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./LAUNCHER_API_ONLY_SUPERVISOR_PROTOTYPE_DESIGN_D13.md) (**D13.1** — diseño detallado del supervisor API-only).

---

## 1. Purpose

- **D12** quedó cerrada con evidencia **técnica** (API-only, API + dashboard, health, CORS, runtime status) y **humana** (verificación visual del operador en **D12.10–D12.11**).
- Corresponde ahora **decidir con claridad** qué expansión de runtime sigue, **sin** asumir MT5, trading, `POST` ni launcher productivo.
- **D13.0** es únicamente **compuerta de decisión y documentación**: define opciones, riesgos, gates y secuencia recomendada.
- **Cualquier** expansión posterior (procesos reales, transporte, MT5, empaquetado) debe pasar por **gate explícito** y, cuando aplique, **aprobación humana** al estilo **D11.8**.

---

## 2. Current baseline

| Aspecto | Estado (post-D12) |
|--------|-------------------|
| API | Escucha típica en **`127.0.0.1:3001`** en runs aprobados; health **GET** **OK** en evidencias D12. |
| Dashboard | Dev típico en **`127.0.0.1:5173`**; integración read-only con runtime status en evidencias D12. |
| Health / runtime status | **OK** en evidencia; envelope honesto (`mockOnly` / `reviewOnly`, ejecución deshabilitada). |
| CORS | Verificado en runs documentados (allowlist dev). |
| UI | Verificada por **operador humano** según **D12.11** (no sustituye controles técnicos futuros). |
| MT5 / bridge | **`not_configured`** en modelo actual; sin launch ni watcher de producto. |
| `executionEnabled` | **`false`** en superficies gobernadas. |
| Acciones | **Sin** endpoints **`POST`** de acciones Mapazapp operativos; **sin** botones operativos nuevos en alcance D12. |
| Launcher | **No** hay `MapazappLauncher.exe` ni supervisor de producto; **`mapazapp:dev-start`** sigue siendo **helper de desarrollo** (no producto). |
| Watcher / trading | **No** en alcance aprobado D12. |

---

## 3. Remaining constraints

Hasta **nuevo gate explícito** se mantienen como **límites duros** (alineado con **D10**, **D11**, cierre **D12**):

- **No** lanzar MT5 desde Mapazapp / launcher de producto.
- **No** watcher de carpetas bridge como producto aprobado.
- **No** archivos de comando hacia MT5.
- **No** rutas **`POST`** / action endpoints operativos sin transporte + token + tests acordados (**D9.x**).
- **No** trading real ni automatización de órdenes.
- **No** DB operativa Mapazapp ni persistencia de settings sin diseño aprobado.
- **No** WebSocket live como canal de verdad operativa.
- **No** launcher **`.exe`** ni instalador en esta fase de compuerta.
- **No** botones dashboard **operativos** (start/stop host, MT5, etc.) sin diseño + aprobación.
- **No** políticas de teardown que **maten procesos ajenos** ni **`taskkill`** amplio indiscriminado; ownership solo de hijos explícitos (**D11.6**, **D3.2** como referencia de intención, no como mandato de producto).

---

## 4. Candidate next directions

Para cada opción: *qué aporta*, *archivos probables*, *riesgos*, *validaciones*, *rollback*, *complejidad*, *¿proceso real?*, *¿nueva aprobación?*, *recomendación*.

### A. Launcher/supervisor real controlado para API-only

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Paso de **comandos manuales** a **un solo proceso supervisor** que arranca/para **solo la API**, con registro de PID, logs y política de teardown alineada a **D11.4–D11.6**. |
| **Archivos probables** | `APP/scripts/src/mapazapp-launcher-*.ts`, tests en `APP/scripts`, docs en `APP/artifacts/mapazapp/docs/`; posible wiring futuro muy acotado fuera de scripts **solo tras gate**. |
| **Riesgos** | `spawn` / hijos mal identificados, fugas de proceso, confusión con `dev-start`, puertos en conflicto. |
| **Validaciones** | Dry-run (**D11.2**), preflight, evidencia de run con cleanup, revisión de ownership (**D11.5**). |
| **Rollback** | Detener supervisor; volver a arranque manual documentado; revertir commit si prototipo falla. |
| **Complejidad** | Media (un solo servicio, pero proceso real y señales). |
| **¿Proceso real?** | **Sí** (en fase de prototipo aprobado). |
| **¿Nueva aprobación?** | **Sí** (**D11.8**-style antes del primer `spawn` de producto). |
| **Recomendación** | **Opción prioritaria** como **primer** salto de valor tras D12 (ver §5). |

### B. Launcher/supervisor real controlado para API + dashboard

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Misma gobernanza que **A** pero orquestando **dos** hijos (API + Vite o equivalente), más cercano al “stack local” del desarrollador. |
| **Archivos probables** | Mismos núcleos **A** + posible extensión de modelo de proceso múltiple; riesgo de acoplar demasiado a `pnpm`/`vite`. |
| **Riesgos** | Doble superficie de fallo, orden de arranque, más ruido en logs; mayor tentación de “botón único” sin gates de acciones. |
| **Validaciones** | Todo **A** + evidencia **API + dashboard** bajo supervisor (similar a **D12.3** pero con proceso único padre). |
| **Rollback** | Igual **A**; documentar comando manual de rescate. |
| **Complejidad** | Media-alta. |
| **¿Proceso real?** | **Sí**. |
| **¿Nueva aprobación?** | **Sí** (al menos tan estricta como D12 para dos procesos). |
| **Recomendación** | **Después** de **A** estabilizado (**D13.3** plan), no como primer salto. |

### C. Empaquetado local / executable design

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Distribución para usuario final, firma, instalación, iconografía, actualizaciones. |
| **Archivos probables** | Pipeline CI, `electron`/wrapper nativo o empaquetador externo, docs de release — **área nueva** respecto al repo actual. |
| **Riesgos** | Coste de mantenimiento, superficie de seguridad enorme, expectativas de “producto listo” antes de runtime estable. |
| **Validaciones** | Política de versionado, threat model ampliado, pruebas en máquinas limpias. |
| **Rollback** | Mantener zip/script dev sin `.exe` publicado. |
| **Complejidad** | Alta. |
| **¿Proceso real?** | **Sí** (build/install). |
| **¿Nueva aprobación?** | **Sí** (gate de producto aparte). |
| **Recomendación** | **No** ahora; posponer hasta tener **supervisor + transporte** claros o decisión de producto explícita. |

### D. MT5 read-only / config discovery más avanzado

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Mejor señal en UI y runtime status sobre rutas/carpetas/validación **sin** ejecutar MT5. |
| **Archivos probables** | `mapazapp-mt5-*.ts`, `Mt5ConfigStatusPanel`, adaptadores `runtime/status`, docs **D10.x**. |
| **Riesgos** | Lectura de rutas sensibles, falsa sensación de “conectado”, complejidad antes de launcher. |
| **Validaciones** | Sanitización de paths, tests de modelo, revisión de copy legal/UX. |
| **Rollback** | Feature flags de UI o revert de mapeo. |
| **Complejidad** | Media (si se limita a modelo + presentación). |
| **¿Proceso real?** | Opcional (I/O read-only con deps inyectadas en tests; FS real solo con aprobación). |
| **¿Nueva aprobación?** | **Sí** si toca FS real o UX que implique expectativa operativa. |
| **Recomendación** | **Útil** en paralelo conceptual, pero **no** sustituye la necesidad de **supervisión de procesos**; no como único siguiente paso si el cuello es arranque gobernado. |

### E. Local action transport real, todavía sin trading

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Dashboard podría invocar acciones privilegiadas vía **HTTP loopback / IPC** con token (**D9.15**) y gates (**D9.2**). |
| **Archivos probables** | `api-server` (`app.ts`, middleware), dashboard `actionClient`, posible proceso launcher escuchando. |
| **Riesgos** | CSRF, replay, superficie **`POST`**, confusión con “control remoto”. |
| **Validaciones** | **D9.7** tests, hardening **D9.14+**, revisiones de redacción y allowlist. |
| **Rollback** | Desmontar ruta `POST`, revocar token, volver a stub `not_available`. |
| **Complejidad** | Alta. |
| **¿Proceso real?** | Puede requerir launcher sidecar. |
| **¿Nueva aprobación?** | **Sí** (gate de seguridad dedicado). |
| **Recomendación** | **Después** de tener claridad de **quién** posee procesos (**A/B**); **no** abrir `POST` antes. |

### F. Dashboard UX polish / status polish antes de runtime nuevo

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Mejor lectura de estado, copy, accesibilidad, estados vacíos — menor fricción para operadores. |
| **Archivos probables** | `APP/artifacts/mapazapp/` (dashboard), presenters, tests de UI ligeros. |
| **Riesgos** | Scope creep cosmético sin avance de arquitectura. |
| **Validaciones** | Revisiones visuales/humanas acotadas, typecheck. |
| **Rollback** | Revert UI. |
| **Complejidad** | Baja-media. |
| **¿Proceso real?** | **No** obligatorio. |
| **¿Nueva aprobación?** | Solo si el polish implica nuevas rutas o fetch. |
| **Recomendación** | **Paralelo opcional**; **no** bloquea **D13.1** si se mantiene read-only. |

### G. Persistence / settings local design

| Criterio | Detalle |
|----------|---------|
| **Qué aporta** | Config durable fuera del repo (puertos, rutas MT5 futuras, flags `unsafe`) alineado a **D10.5** / **D11.1**. |
| **Archivos probables** | Nuevo módulo de lectura/escritura segura, tests con FS temporal, docs. |
| **Riesgos** | Secretos en disco, migraciones de `schemaVersion`, conflictos con git. |
| **Validaciones** | Plantilla de config, permisos, redacción en logs, tests de corrupción de archivo. |
| **Rollback** | Borrar archivo de usuario de prueba; defaults en memoria. |
| **Complejidad** | Media. |
| **¿Proceso real?** | I/O archivo; no necesariamente red. |
| **¿Nueva aprobación?** | **Sí** antes de escribir en máquina real compartida. |
| **Recomendación** | Encajar **dentro** del diseño de launcher (**D13.1**), no como isla antes del modelo de supervisor. |

---

## 5. Recommended path

**Secuencia recomendada (alineada al cierre manual exitoso de D12):**

1. **D13.1 — Launcher/supervisor API-only prototype design (sin implementación)** — **Especificación:** [`LAUNCHER_API_ONLY_SUPERVISOR_PROTOTYPE_DESIGN_D13.md`](./LAUNCHER_API_ONLY_SUPERVISOR_PROTOTYPE_DESIGN_D13.md) (flujo preflight/build/start/health/stop, ownership, puertos, evidencia, fallos, tests §9, compuerta **D13.2**). **Sin** código ejecutable nuevo obligatorio en D13.1.

2. **D13.2 — Launcher API-only supervised start/stop prototype**  
   **Implementado** en `@workspace/scripts`: script **`mapazapp:api-only-supervisor`** (`mapazapp-api-only-supervisor.ts`). **Solo** con **aprobación explícita** y alcance **API-only**; ver **D13.1** §10 y salida `--json` para evidencia.

3. **D13.3–D13.5 — Evidencia API-only supervisor, luego diseño y prototipo API + dashboard**  
   Tras **D13.2** estable: **D13.3** evidencia archivada del run bajo supervisor; **D13.4** diseño del segundo hijo (dashboard); **D13.5** prototipo/run con **aprobación explícita**. Detalle en **D13.1** §11. **Sin** MT5 ni **`POST`** en esta cadena sin nuevas compuertas.

**Justificación:**

- Ya se demostró **manualmente** API-only y API+dashboard (**D12**); el siguiente **valor incremental** es **gobernanza** (un supervisor explícito, ownership, política de stop).
- Comenzar **API-only** reduce superficie y simplifica la primera evidencia bajo launcher.
- **No** conviene saltar ya a **MT5**, **watcher**, **`POST`** o **transporte de acciones** (**E**) sin cerrar **quién arranca y quién para** el stack local (**A** / **B**).
- **C** (exe) y **trading** quedan **fuera** de la ventana actual.

**Nota para Cursor / maintainers:** si se argumenta otra secuencia (p. ej. **G** antes de **D13.2**), debe quedar **por escrito** en un anexo o PR: solo tiene sentido si el riesgo de persistencia se considera **prerrequisito legal/ops** para cualquier `spawn`; en ese caso igualmente se recomienda **no** implementar escritura real hasta después de **D13.1** aprobado.

---

## 6. Approval gates

| Gate | Rol |
|------|-----|
| **D13.0** | **Solo decisión** — este documento; **sin** código, **sin** procesos. |
| **D13.1** | **Diseño** del prototipo API-only bajo supervisor; **sin** obligación de `spawn` aún. |
| **D13.2** | **Primer prototipo real** con procesos — **requiere aprobación explícita** y evidencia de run (similar cultura a **D12**). |
| Cada run real | Debe dejar **evidencia** archivada (comandos, hashes, health, cleanup). |
| **MT5** | **Nuevo gate** dedicado; **no** inferirse de D13.0–D13.2. |
| **`POST` / action endpoints** | **Nuevo gate** (**D9.x** completo + tests **D9.7**). |
| **Packaging `.exe` / instalador** | **Nuevo gate** de producto (**C**). |

---

## 7. Definition of done for D13.0

- [x] Documento **`NEXT_RUNTIME_EXPANSION_GATE_D13.md`** creado en `APP/artifacts/mapazapp/docs/`.
- [x] Opciones **A–G** evaluadas con criterios pedidos.
- [x] Recomendación explícita y secuencia **D13.1 → D13.2 → D13.3–D13.5** registrada (refinada en **D13.1** §11).
- [x] Próximos checkpoints propuestos y criterios de aprobación referenciados.
- [x] **Sin** cambios de código de aplicación, **sin** ejecución de servicios en el acto de redactar D13.0, **sin** dependencias nuevas.

---

## 8. Non-goals (D13.0 explícito)

**D13.0 no implementa ni autoriza:**

- Launcher real de producto, **`spawn`**, `child_process` nuevo fuera del alcance ya existente de dev helpers aprobados previamente.
- Arranque de API, dashboard, MT5, watcher, command files.
- Rutas **`POST`**, action endpoints, DB, WebSocket live, trading, `localStorage`, IPC real de acciones, empaquetado **`.exe`**, instalador, polling nuevo no diseñado.

Cualquier ítem anterior requiere **checkpoint y aprobación posteriores**, no este documento.
