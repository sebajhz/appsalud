# Mapazapp — Diseño de acción futura `open_mt5` (D10.2)

**Checkpoint D10.2 — solo documentación.** Describe cómo **podría** existir una acción gobernada **`open_mt5`** sin implementar código, procesos, transporte HTTP ni UI operativa.

**Relacionado:** [`MT5_DETECTION_GATE_AUDIT_D10.md`](./MT5_DETECTION_GATE_AUDIT_D10.md), [`MT5_DATA_INTEGRATION.md`](./MT5_DATA_INTEGRATION.md), [`LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md`](./LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md), [`API_TOKEN_CSRF_DESIGN_D9.md`](./API_TOKEN_CSRF_DESIGN_D9.md), [`ACTION_BRIDGE_DESIGN.md`](./ACTION_BRIDGE_DESIGN.md), [`RUNTIME_AND_LAUNCHER_STRATEGY.md`](./RUNTIME_AND_LAUNCHER_STRATEGY.md).

---

## 1. Propósito

- Permitir, **solo bajo política explícita futura**, que un **launcher supervisado** solicite la apertura del ejecutable MT5 ya configurado (`terminal64.exe` o ruta aprobada), como conveniencia de desarrollo u operador — **no** como ejecución de trading ni envío de órdenes.
- Mantener **Mapazapp** y el **dashboard del navegador** fuera del alcance directo de spawn de OS: la acción **no** debe originarse como privilegio localhost del browser sin puente gobernado.

---

## 2. Non-goals

- **No** implementación en D10.2–D10.4 (este documento es diseño únicamente).
- **No** `OrderSend`, **no** `CTrade`, **no** archivos de comando hacia MT5.
- **No** afirmar **“MT5 connected”**, **“ready to trade”** ni estado live sin evidencia honesta y diseño aparte.
- **No** watchers de carpeta ni ingesta automática como consecuencia de `open_mt5`.
- **No** trading ni automatización de cuentas.

---

## 3. Por qué todavía no se implementa

- Falta **launcher producto** con modelo de proceso, consentimiento y logs auditados.
- Falta **transporte de acciones** (token / CSRF / allowlist) alineado con **D9.x**.
- **`open_mt5`** en **`action-gates.ts`** permanece **bloqueado / no disponible** hasta política **D10+** explícita.
- Riesgo de **exfiltración de rutas** y **confusión operativa** (usuario cree que el sistema opera en cuenta real).

---

## 4. Relación con launcher futuro

- Solo el **launcher** (o script equivalente **explícitamente** etiquetado como dev y acotado) debería ejecutar la transición “abrir terminal”.
- El launcher debe: cargar config validada, comprobar flags de seguridad, registrar **solo procesos que él crea**, y rechazar rutas no consentidas.

---

## 5. Relación con action gates

- **`open_mt5`** ya tiene definición de gate (**clase** `mt5_launch`, **riesgo** alto, **launcher-only**, confirmación de usuario requerida en el modelo D9.2).
- Antes de implementar: **`allowMt5Launch`** y políticas relacionadas deben habilitarse de forma **explícita** y revisada; el dispatcher actual **no** debe enrutar ejecución hasta entonces.

---

## 6. Relación con token / CSRF

- Cualquier **HTTP** futuro hacia una superficie local debe cumplir **D9.15 / D9.16+**: header **`X-Mapazapp-Action-Token`** (o equivalente aprobado), **sin** token en query, errores seguros, CORS acotado.
- El browser **no** debe enviar una orden de apertura de proceso sin remapeo a **caller** launcher-side y verificación de token.

---

## 7. Consentimiento explícito del usuario

- Confirmación **humana** previa (checkbox/dialog) que indique: se abrirá un proceso externo (MT5), **no** implica habilitar trading en Mapazapp, y **executionEnabled** sigue **false** salvo otro gate de producto.
- Opción de **denegar por defecto** y requerir habilitación por sesión o por perfil.

---

## 8. Validación previa de `Mt5Config`

- Debe pasar el validador declarativo (**D10.1**) y el mapeo conservador a runtime (**D10.3**): **sin** `allowLaunch` / `allowCommandFiles` en posture productiva; rutas **sanitizadas** en logs y UI.
- Opcionalmente: comprobación **read-only** de existencia de ruta vía deps inyectadas en launcher (no en dashboard).

---

## 9. Process ownership

- Solo el launcher crea el proceso MT5; debe poder verificar que no está reutilizando un PID arbitrario del usuario.
- Cierre ordenado: el launcher **no** mata procesos que no le pertenezcan.

---

## 10. PID registry futuro

- Registro **interno al launcher** de PID hijo y timestamp (fuera de este diseño detallado).
- Sin exponer PID ni rutas crudas al dashboard o a logs públicos.

---

## 11. Logs sanitizados

- Misma política que **D9 / D10.0**: sin `C:\Users`, **AppData**, **MetaQuotes**, `terminal64.exe` en claro; usar marcadores redactados.

---

## 12. No command files

- La apertura del terminal **no** escribe señales de trading ni archivos de orden; cualquier integración futura de archivos bridge sigue contratos **export-only** hasta aprobación explícita.

---

## 13. D10.4 — Panel read-only de estado MT5 (nota)

- El dashboard puede mostrar **solo** estado de configuración **declarativa / mock** (**D10.4**): copy fijo y filas estáticas **sin** botón “Abrir MT5”, **sin** file picker, **sin** nuevo endpoint.
- Si en el futuro el panel dependiera de acciones reales o transporte, debe frenarse hasta cumplir este diseño y los gates D9.x.

---

## 14. Criterios mínimos antes de implementación

| # | Criterio |
|---|-----------|
| 1 | Launcher supervisado aprobado + modelo PID/ownership |
| 2 | Transporte de acciones + token/CSRF implementados y probados (**D9** plan) |
| 3 | `Mt5Config` validado; flags inseguros imposibles en build productivo |
| 4 | Consentimiento UX y copy legal/seguridad revisados |
| 5 | Logs y respuestas JSON sin fugas de rutas ni “connected” falso |
| 6 | Tests automatizados de rechazo (sin token, caller incorrecto, política off) |
| 7 | Threat model D9.1 actualizado para la superficie concreta elegida |

---

## 15. Conclusión

**`open_mt5`** permanece **diseño-only** hasta que se cumplan los criterios anteriores. **D10.2 no añade código.** Los checkpoints **D10.3–D10.4** integran **modelo runtime conservador** y **UI draft read-only** sin lanzar MT5.
