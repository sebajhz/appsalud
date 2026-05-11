# Mapazapp — Decisión de prototipo: run supervisado API/dashboard (D11.7)

**Checkpoint D11.7 — solo documentación.** Evalúa **opciones** para el **primer prototipo** de “run supervisado” (levantar servicios locales bajo control explícito), **sin implementar** nada en este commit: no `spawn`, no `child_process`, no nuevas rutas `POST`, no botones dashboard, no launcher `.exe`.

**Relacionado:** [`DEVELOPER_E2E_DRY_RUN_PLAN_D11.md`](./DEVELOPER_E2E_DRY_RUN_PLAN_D11.md), [`FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md`](./FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md), [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md), [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md), [`API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md`](./API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md) (**D11.9** — plan detallado API-only, sin ejecución en ese checkpoint), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md).

**Preferencia declarada por el equipo (D11.7):** cuando se apruebe el **primer run real**, el prototipo debería ser **API-only supervised run** (menos procesos, teardown más simple); el dashboard queda para un **segundo paso** explícito.

---

## 1. Criterios de evaluación (por opción)

Para cada opción se resume: **valor entregado**, **archivos probables**, **tests**, **riesgos** (procesos colgados, puertos, UX, seguridad), **rollback**, **recomendación**.

---

## 2. Opción A — Seguir solo con dry-run

| Dimensión | Evaluación |
|-----------|------------|
| Qué da | Máxima seguridad: **cero** procesos hijos Mapazapp; valida scripts + modelo config (**D11.2**). |
| Archivos | Ninguno obligatorio; mantener `mapazapp-e2e-dry-run.ts` y docs. |
| Tests | Los existentes del dry-run + typecheck según política. |
| Riesgo procesos | **Muy bajo** (no arranca servicios). |
| Riesgo puertos | **Muy bajo** (dry-run actual no abre sockets). |
| Riesgo UX | No hay demo “viva”; puede frustrar validación humana de `/api/healthz`. |
| Riesgo seguridad | **Muy bajo**. |
| Rollback | Trivial (no hay procesos). |
| Recomendación | **Mantener siempre** como paso **obligatorio** antes de cualquier run supervisado real; **no** sustituye validación HTTP real. |

---

## 3. Opción B — Prototipo API-only supervisado

| Dimensión | Evaluación |
|-----------|------------|
| Qué da | Un solo hijo (API) para validar bind loopback, health, logs API, teardown. |
| Archivos | Probable: paquete `@workspace/scripts` (nuevo entry o flag **tras** gate), posible doc de comando único; **no** listado como trabajo de D11.7. |
| Tests | Tests de orquestación con **dobles** de `spawn` (si se implementa), contratos de salida/timeout; readiness estático hasta entonces. |
| Riesgo procesos | **Medio-bajo** (un proceso). |
| Riesgo puertos | **Medio** si olvidan preflight — mitigar con checklist **D11.8**. |
| Riesgo UX | Operador debe saber que **no** hay dashboard automático. |
| Riesgo seguridad | **Medio-bajo** si se mantiene loopback + sin `POST` nuevos. |
| Rollback | Ctrl+C en la terminal dueña o stop del supervisor; ver [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md). |
| Recomendación | **Preferida** como **primer** run real **después** de [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md). |

---

## 4. Opción C — Prototipo API + dashboard supervisado

| Dimensión | Evaluación |
|-----------|------------|
| Qué da | Paridad cercana a `dev-start` pero bajo política de producto. |
| Archivos | Similar a B + coordinación Vite (`@workspace/mapazapp`); más superficie. |
| Tests | Dos hijos, orden de start/stop, CORS/origen Vite vs API — más casos. |
| Riesgo procesos | **Medio** (dos hijos; más carreras al cerrar). |
| Riesgo puertos | **Medio** (dos puertos). |
| Riesgo UX | Mejor demo integrada. |
| Riesgo seguridad | **Medio** (más logs y superficie de error). |
| Rollback | Más pasos; riesgo de dejar Vite colgado si stop es parcial. |
| Recomendación | **Segundo paso** tras demostrar B con evidencia estable. |

---

## 5. Opción D — Usar `mapazapp:dev-start` como puente bajo compuerta

| Dimensión | Evaluación |
|-----------|------------|
| Qué da | Reutiliza **D3.2** tal cual (preflight + build opcional + API + dashboard). |
| Archivos | Mínimos si se acepta el script actual; riesgo de **congelar** deuda técnica de producto. |
| Tests | Ya hay cobertura parcial vía diseño manual; difícil aislar “supervisión producto”. |
| Riesgo procesos | **Medio** (dos hijos + build). |
| Riesgo puertos | **Medio** (igual que hoy). |
| Riesgo UX | Buena para devs; confunde “dev helper” con “launcher”. |
| Riesgo seguridad | Similar a C; no añade IPC pero **sí** `spawn` real ya existente. |
| Rollback | Ctrl+C según D3.2. |
| Recomendación | **Puente aceptable solo** si la compuerta **D11.8** lo enumera como comando explícito y se entiende que **no** es launcher producto; **no** sustituye B para la primera evidencia “supervisada” si el objetivo es alinear con launcher futuro. |

---

## 6. Opción E — Esperar a launcher real

| Dimensión | Evaluación |
|-----------|------------|
| Qué da | Salto directo a `.exe`/empaquetado coherente con [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md). |
| Archivos | Grande: empaquetado, firma, instalación, supervisor. |
| Tests | Integración OS, CI costoso. |
| Riesgo procesos | **Alto** hasta madurar diseño D11.6. |
| Riesgo puertos | **Medio-alto** sin iteración previa API-only. |
| Riesgo UX | Alto valor final, largo time-to-feedback. |
| Riesgo seguridad | **Alto** si se apresuran IPC/acciones. |
| Rollback | Complejo (instalador, servicios). |
| Recomendación | **Fase posterior**; no bloquear aprendizaje con **B** primero. |

---

## 7. Decisión consolidada (D11.7)

1. **Dry-run (A)** permanece **obligatorio** en la cadena previa a cualquier run real.
2. El **primer run supervisado real** aprobado por humanos debería seguir **Opción B (API-only)**, alineado a la preferencia inicial del equipo.
3. **Opción C** como **segundo** incremento tras evidencia estable de B.
4. **Opción D** solo como **puente documentado** si la compuerta **D11.8** lo lista explícitamente como alternativa temporal — sin confundirlo con launcher producto.
5. **Opción E** queda fuera del “primer prototipo” inmediato post-D11.8.

**No implementación en D11.7:** la siguiente pieza de código corresponde a un checkpoint futuro explícito, **después** de cumplir [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md).

**Plan API-only (D11.9):** [`API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md`](./API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md) detalla comandos candidatos, precondiciones, evidencia y teardown — **sin ejecutar** el run en ese checkpoint.
