# Mapazapp — Plan del primer run local controlado (D11.3)

**Checkpoint D11.3 — solo documentación.** Define **cómo** se ejecutará, en una **fase futura aprobada**, el **primer arranque local controlado** del workspace Mapazapp. **Este documento no ejecuta nada:** no sustituye a `mapazapp:dev-start`, no abre MT5, no habilita trading ni transporte de acciones.

**Relacionado:** [`END_TO_END_READINESS_AUDIT_D10.md`](./END_TO_END_READINESS_AUDIT_D10.md), [`DEVELOPER_E2E_DRY_RUN_PLAN_D11.md`](./DEVELOPER_E2E_DRY_RUN_PLAN_D11.md), [`LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md`](./LAUNCHER_RUNTIME_PACKAGING_AUDIT_D11.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md), [`LAUNCHER_SAFE_START_STOP_DESIGN_D11.md`](./LAUNCHER_SAFE_START_STOP_DESIGN_D11.md), [`SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md`](./SUPERVISED_RUN_PROTOTYPE_DECISION_D11.md), [`FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md`](./FIRST_REAL_LOCAL_RUN_APPROVAL_GATE_D11.md).

**Declaración explícita:** **D11.3 es plan, no ejecución.** Quien siga estos pasos en el futuro debe hacerlo **voluntariamente** y fuera del alcance de este checkpoint.

---

## 1. Objetivo del primer run

- Verificar de forma **ordenada y reversible** que el entorno local puede alcanzar un estado **read-only / mock** coherente (typecheck, tests, dry-run, preflight de puertos) **antes** de considerar cualquier orquestación tipo launcher productivo.
- **No** validar MT5 live, **no** validar bridge con watcher, **no** validar `POST` de acciones ni ejecución asistida.

---

## 2. Qué se permite probar (fase futura)

- **Git:** estado limpio o cambios conscientemente aislados en rama.
- **Calidad estática:** `pnpm run typecheck`, tests de paquetes acordados (desde `APP/`).
- **Dry-run declarativo:** `pnpm --filter @workspace/scripts mapazapp:e2e-dry-run` (no arranca servicios).
- **Preflight de puertos (opcional):** `pnpm --filter @workspace/scripts mapazapp:dev-preflight` — solo sondas locales y lectura de `package.json`; **no** es obligatorio en el mismo instante que un start real.
- **Evidencia:** capturas de salida o logs **ya redactados** por las herramientas existentes (sin pegar rutas de usuario completas ni tokens).

---

## 3. Qué NO se permite probar (en el primer run gobernado)

- **Trading real** u órdenes hacia broker.
- **MT5** lanzado o automatizado desde Mapazapp (`open_mt5`, command files, `OrderSend` / `CTrade`).
- **Watcher** o polling continuo sobre carpetas bridge/terminal.
- **Endpoints `POST`** de acciones Mapazapp, **IPC** privilegiado, **WebSocket live**, **DB** operativa como parte del “primer run”.
- **Instalador / `.exe` / launcher productivo** todavía inexistente en repo — no fingir que existe.

---

## 4. Prerrequisitos

- Repo sincronizado con el commit acordado; políticas de seguridad vigentes (`executionEnabled: false` en superficies mock, sin `POST` de acciones).
- Node + pnpm según documentación del monorepo.
- Conciencia de que **dashboard/API** pueden requerir terminales separados si en el futuro se arrancan **manualmente** (fuera de D11.3).

---

## 5. Comandos candidatos (**no ejecutar en este checkpoint**)

> **Aviso:** las líneas siguientes son **referencia** para una fase posterior; **D11.3 no las ejecuta**.

```text
# Desde APP/
git status --short
pnpm run typecheck
pnpm --filter @workspace/scripts test
pnpm --filter @workspace/scripts mapazapp:e2e-dry-run
pnpm --filter @workspace/scripts mapazapp:dev-preflight
# Solo tras aprobación explícita aparte:
# pnpm --filter @workspace/scripts mapazapp:dev-start
# pnpm --filter @workspace/api-server … / mapazapp dev … (según RUNTIME_AND_LAUNCHER_STRATEGY)
```

---

## 6. Orden esperado (gated)

1. **Revisar `git status`** — confirmar alcance y ausencia de artefactos no deseados.
2. **Correr tests** (y typecheck según política del cambio) — fallo ⇒ parar y reportar.
3. **Correr dry-run** (`mapazapp:e2e-dry-run`) — fallo ⇒ parar; no compensar con start real.
4. **Revisar puertos** (preflight **opcional**) — ocupación ⇒ resolver conflicto o posponer start real.
5. **Solo en fase futura explícita:** “start controlado” (API/dashboard en terminales separadas o script `dev-start` si aplica **y** está aprobado fuera de D11.x).

---

## 7. Criterios de éxito

- Typecheck y tests acordados **verdes** en el commit bajo prueba.
- Dry-run **exit 0** con scripts esperados presentes y modelo de config declarativo **ok**.
- Preflight (si se usa) con puertos **libres** o decisión documentada de cambiar puertos.
- Nadie afirma “MT5 conectado”, “listo para operar”, ni resultados de trading reales basados en este run.

---

## 8. Criterios de parada

- Cualquier fallo de tests/typecheck.
- Dry-run o preflight con errores no explicados.
- Detección de secretos o rutas privadas en evidencia pegada a tickets (rechazar y regenerar evidencia redactada).
- Cualquier intento de ampliar alcance a MT5 live, `POST` de acciones o watcher sin aprobación previa.

---

## 9. Cómo capturar evidencia

- Salida textual de comandos (typecheck, tests, dry-run, preflight) **sin** tokens `Bearer`, sin `X-Mapazapp-Action-Token` real, sin rutas `AppData` / `MetaQuotes` completas.
- Opcional: resumen en bullet points en el PR o nota interna enlazando **hashes** de commit, no credenciales.

---

## 10. Cómo reportar errores

- Mensaje de error **tal cual** el tooling (sin inventar “root cause” de mercado).
- Pasos reproducibles mínimos (OS, commit, comando exacto).
- Si hay fuga de ruta sensible en logs de terceros, **redactar** antes de compartir.

---

## 11. Rollback manual

- `git checkout` / `git reset` según política del equipo para volver al commit bueno.
- No matar procesos ajenos; si un `dev-start` quedó en curso en el futuro, usar **Ctrl+C** en la terminal que lo lanzó (dueño del proceso).

---

## 12. Cleanup esperado

- Working tree limpio o commits ordenados; sin archivos temporales de log con rutas crudas en el repo.
- Puertos liberados tras pruebas manuales (cerrar procesos **que uno mismo** abrió).

---

## 13. Recordatorios finales

- **No MT5** como parte del plan de primer run gobernado.
- **No trading.**
- **No watcher.**
- **No `POST` de acciones.**

---

## 14. Conclusión

D11.3 fija **disciplina y orden** para un primer run local **posterior**; los modelos **D11.4–D11.5** describen ciclo de vida e instancia/puertos **solo en tipos**, sin runtime real. **D11.6** documenta start/stop seguro futuro del launcher; **D11.7** elige API-only como primer prototipo supervisado preferido; **D11.8** es la **compuerta humana** antes del primer run real. La ejecución material queda **fuera** de D11.3 y **fuera** de D11.8 hasta checklist firmado.
