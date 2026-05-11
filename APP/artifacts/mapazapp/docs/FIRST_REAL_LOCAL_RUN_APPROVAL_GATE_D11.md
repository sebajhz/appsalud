# Mapazapp — Compuerta de aprobación: primer run local real (D11.8)

**Checkpoint D11.8 — solo documentación / checklist.** Establece la **aprobación formal obligatoria** antes de permitir **por primera vez** un **run local real** (procesos distintos del dry-run declarativo). **Este documento no ejecuta nada** y **no** autoriza `mapazapp:dev-start`, API, dashboard ni MT5 por sí mismo.

**Relacionado:** [`FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md`](./FIRST_CONTROLLED_LOCAL_RUN_PLAN_D11.md), [`DEVELOPER_E2E_DRY_RUN_PLAN_D11.md`](./DEVELOPER_E2E_DRY_RUN_PLAN_D11.md), [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md), [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md), [`API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md`](./API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md), [`API_ONLY_RUN_EVIDENCE_D12.md`](./API_ONLY_RUN_EVIDENCE_D12.md), [`API_DASHBOARD_RUN_EVIDENCE_D12.md`](./API_DASHBOARD_RUN_EVIDENCE_D12.md), [`END_TO_END_READINESS_AUDIT_D10.md`](./END_TO_END_READINESS_AUDIT_D10.md).

**Seguimiento D12:** el run **D12.0** (API-only supervisado) quedó **completado OK**; evidencia en [`API_ONLY_RUN_EVIDENCE_D12.md`](./API_ONLY_RUN_EVIDENCE_D12.md). El run **D12.3** (**API + dashboard**, dos procesos locales) quedó **completado OK**; evidencia en [`API_DASHBOARD_RUN_EVIDENCE_D12.md`](./API_DASHBOARD_RUN_EVIDENCE_D12.md) (**D12.4**). Cualquier **ampliación posterior** (más procesos, `dev-start`, MT5, acciones, etc.) sigue requiriendo **nueva aprobación explícita** y comando §2.9 literal actualizado; esta compuerta **no** autoriza automáticamente fases futuras.

---

## 1. Resultado esperado de la compuerta

| Resultado | Significado |
|-----------|-------------|
| **No aprobado** | Falta al menos un ítem obligatorio del §2 o se viola un límite del §3; **no** se ejecuta run real. |
| **Aprobado** | Responsable humano firma §2.12; se permite **solo** el comando exacto listado en §2.9, dentro de duración §2.8 y con teardown §2.7. |
| **Si aprobado — próximo checkpoint** | Seguir el plan **D11.9** [`API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md`](./API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md) (**solo texto**). La **ejecución material** del primer run API-only corresponde a **D12.0** (o ID equivalente) con **aprobación explícita** posterior — no confundir **D11.9** (plan) con el run real. D11.8 solo habilita la transición, no ejecuta. |

---

## 2. Checklist obligatorio — antes de aprobar run real

- [ ] **2.1** `git status` limpio (sin ruido accidental de artefactos).
- [ ] **2.2** Último commit **revisado** y hash anotado en la evidencia.
- [ ] **2.3** `pnpm run typecheck` (desde `APP/` según CONTRIBUTING) **OK**.
- [ ] **2.4** `pnpm --filter @workspace/scripts test` (o el conjunto de tests acordado para el cambio) **OK**.
- [ ] **2.5** `pnpm --filter @workspace/scripts mapazapp:e2e-dry-run` **exit 0**.
- [ ] **2.6** Puertos **verificados** (`mapazapp:dev-preflight` o método equivalente documentado) para los roles que el run vaya a usar.
- [ ] **2.7** **Rollback / cleanup definido:** quién y cómo detiene el proceso (terminal dueña, señales, orden de stop — ver [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md)).
- [ ] **2.8** **Duración máxima** de la prueba acordada (p. ej. ventana de N minutos); al vencer ⇒ stop obligatorio aunque “parezca OK”.
- [ ] **2.9** **Comando exacto permitido** escrito literalmente en el ticket/PR de aprobación (sin placeholders). Debe alinearse con [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md) (**API-only** preferido para el primer run).
- [ ] **2.10** **Quién aprueba:** rol/nombre (maintainer u operador designado).
- [ ] **2.11** **Evidencia a capturar:** salidas redactadas (sin tokens, sin rutas completas sensibles), hashes de commit, resultado de health **GET** si aplica.
- [ ] **2.12** **Firma explícita** en el registro de aprobación: texto tipo «Run real aprobado según D11.8 el … por …» (fecha y responsable concretos).

### Condiciones que **detienen** la prueba (fail-closed)

- Fallo de typecheck/tests/dry-run/preflight.
- Puerto ocupado por proceso **no** identificado como propio del experimento.
- Aparecen en logs **tokens**, rutas privadas o marcadores operativos prohibidos.
- Se supera la duración máxima §2.8.
- Cualquier intento de ampliar alcance fuera del comando §2.9.

---

## 3. Límites duros (incluso si el run está “aprobado”)

- **No MT5** lanzado desde Mapazapp ni manual como parte del alcance del run aprobado (salvo gate distinto explícito — **fuera** del primer run gobernado).
- **No watcher** ni polling live sobre carpetas bridge.
- **No command files** hacia MT5.
- **No** endpoints **`POST`** de acciones ni transporte de acciones nuevo.
- **No** botones dashboard operativos añadidos para el run.
- **No trading** ni `OrderSend` / `CTrade`.
- **No launcher `.exe`** todavía.
- **No** proceso cuyo **teardown** no esté claro en §2.7 (si no se sabe cómo limpiar ⇒ **no aprobar**).

---

## 4. Si **no** aprobado

- Documentar **qué ítem** del §2 falló o qué límite del §3 se acercó.
- Siguiente acción: corregir tooling/tests/docs y **volver** a presentar la compuerta; **no** “salteársela” con un comando distinto.

---

## 5. Si **aprobado**

- Usar [`API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md`](./API_ONLY_SUPERVISED_RUN_PROTOTYPE_PLAN_D11.md) (**D11.9**) como plan operativo; **D11.9** no ejecuta el run por sí mismo.
- En el checkpoint de **ejecución** acordado (p. ej. **D12.0**), ejecutar **solo** el comando §2.9 dentro de la ventana §2.8 y las salvaguardas del plan **D11.9**.
- Archivar evidencia §2.11 (y la lista §5 de **D11.9** cuando aplique) al cerrar el run.

---

## 6. Non-goals (D11.8)

- Ejecutar o instruir ejecución dentro de este archivo.
- Añadir dependencias, IPC, DB, WebSocket live, `localStorage`, push remoto.

---

## 7. Conclusión

D11.8 es la **compuerta humana** entre el mundo **declarativo** (**D11.2–D11.5**) y el **primer** encendido real bajo política. Hasta completar el checklist y la firma §2.12, el estado del proyecto sigue siendo **“run real no aprobado”**.
