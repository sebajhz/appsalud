# Mapazapp — Testing and Validation Strategy

Este documento define la **estrategia formal de pruebas y validación** para Mapazapp. Es declaración de gobierno del proyecto: describe capas, comandos existentes y criterios futuros. **No** sustituye tests concretos ya existentes ni afirma cobertura completa.

---

## 1. Purpose

Mapazapp necesita pruebas formales porque el riesgo principal no está solo en la UI, sino en:

- lógica interna del motor (señales, replay, campañas);
- calidad y saneamiento de datos (CSV, export MT5, gaps, tiempo);
- backtesting y walk-forward (sesgo, lookahead, reproducibilidad);
- riesgo y reglas de negocio;
- integración futura con MT5 y runtime;
- seguridad: ausencia de ejecución real automática y ausencia de rutas señal→orden.

Una pantalla que “se ve bien” no demuestra corrección del motor ni seguridad operativa.

---

## 2. Current baseline

| Aspecto | Estado declarado |
|--------|------------------|
| Core | TypeScript puro (`@workspace/mapazapp-core`), amplia suite de tests |
| Tests existentes | Unitarios y de escenario en core; tests en API mock y servicios dashboard |
| API | Mock **read-only**; evidencia V2-16 vía `GET .../mock-latest` |
| Dashboard | Mock / evidencia; resúmenes conservadores sin promoción automática |
| Referencia V2-16 | Commit **`0082e26`** |
| Live execution | **No** como producto habilitado |
| Base de datos operativa Mapazapp | **No** en dominio productivo actual |
| Watcher / carpeta MT5 automática | **No** aprobado en esta estrategia |
| WebSocket live | **No** |

---

## 3. Validation layers

1. **Static / typecheck** — tipos consistentes en workspace.
2. **Unit tests** — funciones y módulos aislados.
3. **Engine scenario tests** — fixtures deterministas, caminos felices y de fallo.
4. **Data format tests** — esquema CSV/export, columnas, tipos.
5. **Replay / backtest tests** — salidas coherentes, sin NaN arbitrarios, evidencia estable.
6. **Walk-forward tests** — splits, gobernanza, recomendaciones conservadoras.
7. **API tests** — rutas, envelopes de seguridad, códigos HTTP esperados.
8. **Dashboard tests** — helpers UI, mocks y copy crítico donde exista test.
9. **Manual / human checklist** — arranque, revisión visual de modo y disclaimers.
10. **MT5 integration validation** — datos reales/sintéticos validados según reglas acordadas (fases futuras).
11. **Runtime / launcher validation** — proceso único, puertos, logs (fases futuras).
12. **Safety validation** — invariantes: ejecución deshabilitada, sin rutas peligrosas.

---

## 4. Existing commands

Desde el directorio **`APP/`**:

```bash
pnpm run typecheck
pnpm --filter @workspace/mapazapp-core test
pnpm --filter @workspace/mapazapp-core typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/mapazapp test
pnpm --filter @workspace/mapazapp typecheck
pnpm --filter @workspace/mapazapp build
```

---

## 5. Safety tests

Declarar y, cuando corresponda, implementar cobertura sobre:

- `executionEnabled` **false** por defecto en rutas y payloads mock pertinentes.
- **No** `OrderSend` / **No** `CTrade` en código MT5 de Mapazapp bajo política actual.
- **No** `POST` operativo que envíe órdenes o comande ejecución.
- **No** auto-aprobación desde mocks.
- **No** mutación de registry desde API mock de evidencia.
- **No** live trading automático.
- **No** camino señal→orden generado por el stack mock actual.
- **No** generación de comandos de trade hacia MT5.
- Configuración de riesgo ausente → bloqueo o fallo seguro de salida accionable.
- Datos inválidos o faltantes → fallo controlado, sin inventar fills.
- MT5 no disponible → **no** inventar datos de mercado como si fueran reales.
- Modo live-read-only futuro: **nunca** ejecuta órdenes.

---

## 6. MT5 data tests

Declarar necesidad de pruebas sobre:

- columnas requeridas;
- timestamp válido y parseable;
- orden temporal estricto donde aplique;
- duplicados detectados o política explícita;
- gaps y documentación del impacto;
- timezone y hora del servidor del broker;
- sufijos de broker y símbolo real vs canónico;
- mapeo símbolo interno ↔ símbolo broker;
- mapeo timeframe;
- vela cerrada vs vela en formación;
- ausencia de datos futuros ilegítimos;
- filas inválidas rechazadas o en cuarentena.

---

## 7. Replay / backtest tests

- Determinismo: misma entrada → mismo resultado (con tiempo controlado).
- Sin dependencia de `Date.now` salvo inyección explícita en tests.
- Sin `NaN` en métricas expuestas como evidencia estable.
- Evidencia estable entre ejecuciones comparables.
- Mitigación explícita de lookahead; tests de escenarios sospechosos.
- Reproducibilidad de campañas con mismos parámetros y datasets.
- Fixtures positivos y negativos documentados.

---

## 8. Strategy / signal tests

- Setup positivo esperado.
- Setup negativo (no señal).
- Datos insuficientes.
- Datos corruptos o incompletos.
- Señal repetida / política anti-spam si aplica.
- Reasons / evidencia adjunta a la salida.
- Score / confianza si existe — sin claim de rentabilidad.
- Invalidación por riesgo.
- Invalidación por contexto de mercado.

---

## 9. Risk tests

- Configuración de riesgo ausente → bloqueo accionable.
- Límites diarios/semanales (futuro) respetados.
- Reglas prop firm (futuro) cuando existan en motor.
- Drawdown y reglas de no-operar.
- Señal bloqueada si las reglas fallan.

---

## 10. API / dashboard tests

- Health / estado del servicio mock.
- Endpoints `mock-latest` y envelopes de seguridad.
- Estados vacíos y de error controlados.
- Visibilidad de **execution disabled** y **no approval** donde aplique.
- Modo o etiquetas mock/evidence visibles al usuario.
- Preparación para **runtime status** futuro (contratos por definir).

---

## 11. Manual checklist

- Levantar dashboard (modo desarrollo).
- Levantar API (modo desarrollo).
- Revisar mocks y textos “evidence only”.
- Revisar campañas / grids / walk-forward solo como evidencia.
- Revisar estados vacíos y de error en UI.
- Confirmar que **no** hay ejecución real automática.
- Comparar salidas representativas contra gráfico MT5 cuando haya datos propios (humano).
- Revisar último dato importado o mock según modo.
- Revisar símbolo y timeframe declarados.
- Revisar logs cuando existan.
- Revisar modo actual (mock / histórico / futuro live-read-only).
- Cuando exista integración: mercado abierto/cerrado coherente con fuente.

---

## 12. Checkpoints (fases propuestas)

| ID | Fase |
|----|------|
| B1 | Safety test matrix |
| B2 | MT5 data format tests |
| B3 | Replay / backtest determinism |
| B4 | Strategy / signal scenarios |
| B5 | API / dashboard health tests |

La implementación de cada fase requiere **aprobación explícita** y no forma parte de este documento.

---

## 13. Definition of Done

Para cualquier cambio futuro sensible:

1. Tests automatizados pertinentes pasan.
2. Documentación tocada se actualiza mínimamente donde aplique.
3. **No** se introduce live execution sin gate aparte.
4. **No** claims de rentabilidad en docs ni UI.
5. Evidencia y límites del modo son visibles al usuario.
6. Rollback/revert es posible (commits acotados, sin refactors masivos no pedidos).
