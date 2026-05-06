# V2-04.2 — Deep Engine Audit / Decision Complexity Plan

**Checkpoint:** documentación y auditoría únicamente (sin implementación de producto en este entregable salvo correcciones doc-only si fueran necesarias).  
**Estado de referencia:** post V2-04.1 (`candidateTiming` en `ZoneCandidate`, resolución de índices en replay).  
**Seguridad:** sin ejecución, sin POST de trading, sin MT5 command reader, sin DB/watcher/WebSocket, sin mutación de registry, sin claims de rentabilidad.

---

## 1. Executive summary

### ¿El motor actual es una cadena simple de reglas o un motor de decisión flexible?

Es un **híbrido claro, aún inclinado a “pipeline + gates”** más que a un analista completo:

- **Flexible en geometría y riesgo:** zonas con padding dinámico, tolerancias ATR/spread/tick, clasificación de barrido (confirmado / near / break risk), modelo de entrada–SL–TP con varios modos, replay vela a vela con MAE/MFE y estados `missed` / `expired` / ambigüedad, y gates duros de cuenta–R:R–spread.
- **Rígido / incompleto en “contexto + variantes + anti-lookahead fuerte”:** una sola serie de velas para todos los TF lógicos, detección sobre la serie completa, contexto HTF definido en settings pero **no** aplicado en `detectIfvgZoneCandidates`, score de estrategia con **componentes aún mayormente externos o constantes** en el backtest de replay, y **sin sistema explícito de variantes** (primaria / aceptada / observación).

En síntesis: **no es solo A+B+C fijo**, porque ya existen tolerancias, estados de revisión, R:R, timing “tarde”, y replay; pero **tampoco es aún el motor disciplinado de producto** descrito en el blueprint (contexto HTF, variantes, confianza medida de punta a punta, walk-forward).

### Porcentajes aproximados (honestos)

| Ámbito | % hacia el objetivo | Justificación breve |
|--------|---------------------|---------------------|
| **Motor de decisión “filosofía Mapazapp”** | **~55–60%** | Base estructural sólida (zona, sweep classes, IFVG, retest/confirmación, plan, replay, guards). Falta contexto real, score medido en pipeline, variantes, y detección sin lookahead global. |
| **Sistema completo (core + UI + API + import real + campañas)** | **~35–40%** | Core va delante; API/dashboard siguen en fixtures; no hay importación masiva de velas MT5 en flujo de campaña documentado en código productivo. |
| **Estrategia rentable probada** | **~0–5%** | Solo evidencia técnica y tests deterministas; **ningún** resultado económico validado fuera de muestra. El 5% refleja “existe un tubo de backtest sintético”, no edge demostrado. |

---

## 2. Current engine capability map

Leyenda: **strong** · **partial** · **skeleton** · **missing** · **dangerous if trusted too early**

| Área | Clasificación | Notas (código / doc) |
|------|---------------|----------------------|
| **Symbol precision** | **strong** | `SymbolMarketSpec`, `roundToTickSize`, buffers en `normalize.ts`; alineado con addendum multi-símbolo. |
| **Dynamic tolerances** | **strong** | Sweep, zona, break IFVG, SL buffer: `max(ATR·factor, spread·factor, tick·mínimos)` en la práctica del core. |
| **Sweep / near sweep / break risk** | **strong** | `liquidity-sweep.ts`: `CONFIRMED_SWEEP`, `NEAR_SWEEP`, `POSSIBLE_BREAK_RISK`, `NO_SWEEP`. |
| **Displacement** | **partial** | `displacement.ts` calcula dirección y calidad; en `strategy-detection.ts` solo se exige **presencia en ventana** para un flag global de diagnóstico — **no** filtra por candidato. Muchos candidatos IFVG pueden existir **sin** desplazamiento validado en la ventana (vs blueprint que lo trata como paso lógico clave). |
| **FVG / IFVG** | **strong** | `fvg-detector.ts`, `ifvg-converter.ts` con buffer dinámico y modo wick/close. |
| **Zone construction** | **strong** | `zone-candidate.ts`: bounds + padding + invalidación + midpoint. |
| **Candidate timing / anti-lookahead** | **partial** | `candidate-timing.ts` + uso en `ifvg-replay-backtest.ts` mejora inicio de búsqueda y slice de replay. La **detección** sigue viendo toda la serie; riesgo metodológico documentado en V2-04. |
| **Retest** | **partial** | `retest-detector.ts` + modos en settings; calidad subscore no siempre derivada del detector en el score global del pipeline de replay. |
| **Confirmation** | **partial** | `confirmation-detector.ts`; integrado en plan y backtest replay. |
| **Entry model** | **strong** | `entry-sl-tp-model.ts`: varios modos y mapeo a replay. |
| **Stop loss model** | **strong** | Modos estructura / sweep / zona / ATR / explícito + tick rounding. |
| **Take profit model** | **partial** | `fixed_r`, `previous_high_low`, `opposing_liquidity`, `hybrid` en core; **la tubería IFVG no siempre inyecta** `opposingLiquidityPrice` / estructura desde detección automática (depende del input / backtest settings). |
| **R:R validation** | **strong** | Gates en `trade-plan-gates.ts` y geometría en `entry-sl-tp-model.ts`. |
| **Late trade / missed trade** | **partial** | “Tarde” en plan de precios (`currentPrice`, chase, target cercano); `missed` en `replay-trade-simulator.ts` por umbral R antes de entrada — modelo simple. |
| **Replay candle-by-candle** | **strong** | `replay-trade-simulator.ts` con eventos y políticas de misma vela. |
| **MAE / MFE** | **strong** | En unidades R en resultado de replay; agregados en `ifvg-replay-backtest.ts`. |
| **HTF bias / context** | **skeleton** | `IfvgStrategySettings.context` existe; **no** hay motor HTF en `strategy-detection.ts`. `computeStrategyScore` espera `contextAlign01` del llamador (placeholder en `scanner-simulation.ts`). |
| **Confidence scoring** | **partial** | `strategy-score.ts` con pesos y bandas; **el replay backtest usa `defaultScore` constante** para `evaluateTradeReviewPlan`, así que la “confianza” en campaña sintética puede **no** reflejar componentes medidos. |
| **Session / time filters** | **skeleton** | TF labels en settings; sin filtro de sesión operativo en detección pura. |
| **News / manual blackout** | **partial** | Gates en `trade-plan-gates.ts` / guard de cuenta (`newsBlackout`, `psychologicalLock`); no hay feed de noticias real. |
| **Multi-symbol support** | **partial** | Modelo de perfil y tests multi-símbolo; sin runner de campaña ni import unificado. |
| **Account / risk / prop guard** | **strong** | Integración en gates y evaluador de plan. |
| **Backtest metrics** | **partial** | Métricas en R y resúmenes; útiles para sintéticos; falta gobernanza walk-forward y datasets reales importados. |
| **Explainability** | **partial** | Razones, summaries, traces en backtest; falta traza unificada “variante + score descompuesto medido” en todos los caminos. |

---

## 3. A+B+C vs complex decision audit

Interpretación: **A** = estructura IFVG/zona; **B** = interacción de liquidez; **C** = desplazamiento / impulso; **A2/B2** = variantes o calidades alternativas; **contexto** = HTF/bias; **tolerancia** = near-sweep etc.; **confianza** = score con componentes reales; **R:R** y **timing** = gates y modelos de entrada/salida.

| Escenario | ¿Soportado hoy? | Nivel | ¿Dónde? | Qué falta |
|-----------|-----------------|-------|---------|-----------|
| **A + B + C** | Sí (como tubería suelta) | **partial** | `strategy-detection.ts` + sweep + ventana de displacement | C **no** es gate duro por candidato; secuencia blueprint no es estricta. |
| **A + A2 + B + C** | No explícito | **missing** | — | Sistema de variantes (misma estructura, pools/swing alternativos) y ranking entre ellas. |
| **A + near-B + stronger C** | Parcial | **partial** | `NEAR_SWEEP`, displacement quality | Ponderación coherente en score **medido**; near-sweep puede bloquear `TRADE_READY` vía settings (`allowNearSweepTradeReady`). |
| **A + weaker sweep + stronger displacement** | Parcial | **partial** | Sweep status + displacement | Score no compone automáticamente ambos desde detección en el backtest de replay. |
| **A + no perfect sweep + high context score** | No | **missing** | Context no calculado | Motor de contexto HTF + veto/alineación. |
| **A + valid setup but bad R:R = reject** | Sí | **strong** | `trade-plan-gates.ts`, `entry-sl-tp-model.ts` | — |
| **A + valid setup but late = observe/reject** | Parcial | **partial** | `entry-sl-tp-model.ts` (`lateTradePolicy`) | Integrar “late” también en estados de plan pre–precios y en narrativa unificada. |
| **A + valid setup but target too close = reject** | Sí | **strong** | `REWARD_SHORTER_THAN_RISK`, `TARGET_TOO_CLOSE_TO_PRICE` | — |
| **A + over-sweep = break risk** | Sí | **strong** | `POSSIBLE_BREAK_RISK` | Calibración y política de score/gate por símbolo. |
| **A + opposite liquidity target = better TP** | Parcial | **partial** | `opposing_liquidity`, `hybrid_fixed_r_or_liquidity` | Detección automática del nivel opuesto y cableado al `TradePlanInput` / `EntrySlTpModelInput`. |
| **A + symbol-specific tolerances = different accept/reject** | Sí | **strong** | Perfil + fórmulas dinámicas | Calibración documentada por símbolo (próxima fase). |

---

## 4. Decision model proposal (V2 — propuesta, no implementada salvo lo ya existente)

### Hard gates (binarios; bloquean `TRADE_READY` / replay “ready” según política)

- Estructura inválida o zona inestable (sin invalidación comunicable).
- Sin perfil de símbolo o ATR de confirmación inválido para precios.
- R:R por debajo del mínimo o SL demasiado ancho vs ATR (ya parcialmente en gates).
- SL/TP faltantes o geometría inválida.
- Cuenta/riesgo bloqueados (drawdown, trades, spread, noticia, lock psicológico, etc.).
- Registry / parameter set no aprobado (cuando la política lo exige).
- Lookahead inseguro para el modo de estudio (p. ej. detección global sin walk-forward) — **debe** etiquetarse en artefactos, no ocultarse.

**Ya presente en el código:** gran parte de gates de cuenta, R:R, spread, perfil, parameter set; la etiquetación de lookahead es **parcial** (diagnósticos en replay, advertencia en detección).

### Soft score (0–100 advisory; no sobrescribe hard gates)

Dimensiones propuestas (alineadas al blueprint y al código actual):

- Calidad de sweep (confirmado vs near vs break risk).
- Fuerza de displacement (y coherencia direccional con el setup).
- Calidad IFVG / tamaño relativo / claridad de ruptura.
- Calidad de retest (profundidad en zona, modo).
- Calidad de confirmación.
- Contexto / bias (HTF, premium/discount, rango — **a implementar**).
- Calidad de objetivo (R:R marginal vs fuerte, liquidez opuesta disponible).
- Calidad de timing (frescura, chase, “too late”).
- Spread / liquidez (coste relativo).

### Sistema de variantes

- **Primary:** narrativa principal (pool + IFVG + zona).
- **Accepted variant:** misma lógica con parámetros alternativos válidos (p. ej. TP híbrido vs fixed-R) que pasan gates.
- **Weak variant (observe-only):** near-sweep, break risk alto, o score bajo con estructura aún interesante.
- **Invalid variant:** falla gates o invalidación.

*Estado actual:* estados `OBSERVE`, `WAIT_*`, `NO_TRADE`, `TRADE_READY` en el evaluador; **no** hay tipo explícito “variant id” en el modelo de dominio.

### Confidence bands (propuesta; **coincide en números** con `classify` en `strategy-score.ts`)

| Banda | Acción sugerida |
|-------|------------------|
| 0–44 | No operar / no trade |
| 45–59 | Observar |
| 60–74 | Esperar (setup en desarrollo; no forzar review alto) |
| 75–84 | Revisar candidato |
| 85+ | Alta confianza — revisar candidato (sigue sin auto-aprobación) |

**Nota:** Los nombres de clasificación en código (`WAIT_CONFIRMATION`, `TRADE_READY_WITH_REVIEW`, `STRONG_SETUP`) deben mapearse explícitamente a esta semántica de producto en un futuro `decision-model` para evitar ambigüedad UX.

---

## 5. What must change in code (módulos probables)

1. **`strategy-score.ts`** — Separar fuentes: componentes medidos desde detección vs placeholders; alinear clasificación con bandas de producto.
2. **`strategy-settings.ts`** — Mantener knobs; añadir hooks para contexto cuando exista motor HTF.
3. **`liquidity-sweep.ts`** — Posibles extensiones: “failed sweep” más rico, umbrales por régimen (tras calibración).
4. **`strategy-detection.ts`** — Opcional: gate por displacement por candidato; uso futuro de contexto; eventualmente walk-forward.
5. **`trade-plan-evaluator.ts`** — Narrativa y estados para variantes / observe por timing unificado.
6. **`entry-sl-tp-model.ts`** — Cablear más automáticamente liquidez opuesta y estructura desde el grafo de precios.
7. **`ifvg-replay-backtest.ts`** — **Sustituir `defaultScore` por score calculado** desde outputs medidos (retest, confirmación, sweep, displacement, IFVG, riesgo spread) + trazas.
8. **`decision-model.ts` (nuevo, candidato)** — Orquestar gates + soft score + variantes + códigos de explicación únicos.

---

## 6. Backtest readiness

| Pregunta | Respuesta |
|----------|-----------|
| ¿Backtests sintéticos significativos ya? | **Sí**, con limitaciones: fixtures, anti-lookahead parcial en detección, score a veces constante en replay. |
| ¿Backtests con velas MT5 importadas ya? | **No** como camino productivo único: hace falta importador CLI/UI y validación de contrato de archivos BridgeEA/TestEA en bucle de campaña. |
| ¿Ranking de símbolos ya? | **Solo de forma trivial o engañosa** si el score no está medido en el pipeline; matemáticamente se pueden ordenar runs sintéticos, pero **no** constituye ranking robusto. |
| ¿Qué falta para campañas grandes? | Motor de contexto o etiquetado honesto de lookahead; score real en replay; calibración por símbolo; import real; protocolo walk-forward y OOS. |

---

## 7. Demo readiness

| Modo | ¿Listo? | Qué probar / qué bloquea |
|------|---------|---------------------------|
| BridgeEA live export | **Sí** (probado según docs previos) | Exportación; no hay ingest automático al core en este alcance. |
| TestEA Strategy Tester export | **Sí** (probado según docs) | Mismo comentario. |
| Core offline replay con fixtures | **Sí** | `runIfvgReplayBacktest`, tests V2-04. |
| Campaña con velas importadas | **No** (salvo script local ad-hoc no estandarizado) | Falta pipeline de import + validación. |
| Monitor forward desde archivos reales | **No** | Sin watcher; monitor actual fixture-driven. |

**¿Se puede “probar en demo” hoy?** Solo en el sentido de **revisión manual**: revisar planes `TRADE_READY` sintéticos, gates, y replay en tests/fixtures. **No** hay demo de punta a punta con flujo de mercado real persistente sin construir import + monitor read-only.

---

## 8. Next 20-step roadmap (ordenado; motor primero)

1. **V2-04.2** — Deep engine audit (este documento).
2. **V2-05** — Decision model / soft-score redesign (gates vs score; fin de `defaultScore` en replay; trazas).
3. **V2-06** — Tolerance calibration matrix (near-sweep, break risk, wick vs close por símbolo).
4. **V2-07** — HTF bias / context engine v1 (settings → señales medibles).
5. **V2-08** — Entry variant model (primaria / aceptada / observe / inválida explícita).
6. **V2-09** — Target / liquidity model v1 (opposing liquidity automático donde aplique).
7. **V2-10** — Replay backtest sobre archivos importados BridgeEA/TestEA (batch determinista).
8. **V2-11** — Symbol campaign runner (multi-símbolo, mismas reglas de gobernanza).
9. **V2-12** — Parameter grid runner (bloques, no búsqueda global ingenua).
10. **V2-13** — Out-of-sample validation (protocolo y reportes).
11. **V2-14** — Dashboard/API cleanup (contratos alineados a evidencia de replay).
12. **V2-15** — Local file import UI o CLI (operador humano en el loop).
13. **V2-16** — Persistence decision (si/cómo SQLite u otro store local).
14. **V2-17** — Forward demo read-only desde archivos reales BridgeEA (sin watcher agresivo: flujo manual o batch).
15. **V2-18** — Alert-only review notification (umbrales documentados).
16. **V2-19** — Risk/prop firm mapping real (reglas por cuenta).
17. **V2-20** — Psychology/manual lock integration (entrada explícita del operador).
18. **V2-21** — Executable/startup scripts (operación dev/prod light).
19. **V2-22** — Stabilization and packaging.
20. **V2-23** — Assisted execution re-evaluation **solo** si la evidencia lo justifica.

---

## 9. Immediate recommendation

**Siguiente checkpoint recomendado: V2-05 — Decision model / soft-score redesign** (no calibración primero ni import primero).

**Justificación:** En `ifvg-replay-backtest.ts` el plan usa `score: { totalScore: score }` con **`defaultScore` fijo** de settings de backtest. Eso significa que campañas sintéticas pueden mostrar `TRADE_READY` y métricas **sin** que la confianza refleje retest, confirmación, sweep, displacement ni contexto. Calibrar tolerancias antes de arreglar eso optimiza ruido sobre una señal de “confianza” aún placeholder. El import real (V2-10+) es crítico, pero **segundo** respecto a que el motor produzca decisiones explicables y medibles en el mismo código que ya tenemos.

*(Si el equipo prioriza datos reales absolutamente: encajar V2-10 en paralelo solo con la condición de no interpretar rankings hasta V2-05.)*

---

## 10. Safety confirmation

- **Sin ejecución automática** en este alcance.
- **Sin claims de rentabilidad** ni recomendaciones de trading real.
- **Sin auto-aprobación** de órdenes; revisión y flags de seguridad CP18 vigentes en diseño.
- **Sin mutación de registry** en los módulos de backtest/replay (flags explícitos `registryMutationAllowed: false` en resultados de replay).

---

## 11. Validation (2026-05-06)

Comandos ejecutados desde `APP`:

- `pnpm --filter @workspace/mapazapp-core test` — **OK** (224 tests).
- `pnpm --filter @workspace/api-server test` — **OK** (26 tests).
- `pnpm --filter @workspace/mapazapp test` — **OK** (40 tests).
- `pnpm typecheck` — **OK**.

---

## 12. Deliverable checklist (para el PR/commit humano)

| Item | Valor |
|------|--------|
| **Archivos creados** | `APP/artifacts/mapazapp/docs/V2_04_2_DEEP_ENGINE_AUDIT_AND_DECISION_COMPLEXITY_PLAN.md` |
| **Archivos modificados** | Ninguno (solo este doc nuevo). |
| **Estimación motor (filosofía producto)** | ~55–60% |
| **Partes más fuertes** | Precisión por símbolo, tolerancias dinámicas, sweep classes, zona, IFVG, gates R:R/cuenta, entry-SL-TP v1, replay + MAE/MFE, replay backtest pipeline. |
| **Partes más débiles** | Contexto HTF, anti-lookahead en detección, score medido en replay, variantes explícitas, displacement no gate por candidato, import/campaña real. |
| **Siguiente checkpoint recomendado** | **V2-05 decision model / soft-score redesign** |
| **Resumen roadmap 20 pasos** | Ver sección 8: motor y decisiones medibles antes de import masivo y ranking OOS. |
| **Resultados validación** | Todos los tests y typecheck verdes (ver sección 11). |

### Mensaje de commit sugerido (no ejecutado automáticamente)

`docs(mapazapp): V2-04.2 deep engine audit and decision complexity plan`
