# V2-09 — Target / Liquidity Objective Model v1

## Por qué existe

El plan Entry/SL/TP (V2-03) resuelve TP en modos como `fixed_r`, `opposing_liquidity` o `hybrid_fixed_r_or_liquidity`, pero el **razonamiento explícito** sobre *qué* nivel de liquidez o estructura se prioriza, si el objetivo es realista vs ATR, si el precio ya lo alcanzó o está demasiado cerca, y cómo eso afecta confianza, quedaba disperso. V2-09 centraliza una evaluación **puramente declarativa** de candidatos de objetivo (TP) para revisión y trazabilidad — **sin** ejecución, **sin** lectura MT5, **sin** prueba de rentabilidad.

## Alcance y seguridad

- **Solo** `@workspace/mapazapp-core`: `evaluateTargetObjective(input)`, tipos, razones, settings, fixtures.
- **Sin** I/O de ficheros, BridgeEA/TestEA, DB, watcher, WebSocket, scanner en vivo, mutación de registry.
- **Sin** afirmación de edge: salidas son reglas, códigos y puntuaciones auditables.

## API principal

- `evaluateTargetObjective(input: TargetObjectiveInput): TargetObjectiveResult`
- Ajustes de prueba: `createDefaultTargetObjectiveSettingsForTests()` en `target-objective-settings.ts`
- Fixtures: `createTargetObjectiveFixtures()` en `target-objective-fixtures.ts`

## Modos de evaluación (`TargetObjectiveMode`)

| Modo | Comportamiento v1 |
|------|-------------------|
| `fixed_r` | Objetivo a `entry ± risk × fixedRTarget`. |
| `previous_high_low` | Máximo relevante: `structureHigh` / `structureLow` o último swing detectado en `recentCandles`. |
| `opposing_liquidity` | Precio en `opposingLiquidityPrice` (lado correcto de la entrada). |
| `range_extreme` | `rangeHigh` (BUY) / `rangeLow` (SELL). |
| `structure_level` | Niveles explícitos de estructura alineados con dirección. |
| `hybrid_best_available` | Genera varios candidatos y elige el mejor puntuado que cumpla `minRr` y reward mínimo; puede preferir liquidez/estructura sobre fijo R si `preferLiquidityWhenBeatsFixedR`. |
| `explicit` | Requiere `explicitTargetPrice`. |

## Clasificaciones (`TargetObjectiveClassification`)

Incluye: `ideal_target`, `acceptable_target`, `weak_target`, `too_close`, `too_far`, `already_reached`, `invalid_target`, `insufficient_data` — para integración con decision model y warnings en Entry/SL/TP.

## Reglas R:R y geometría

- Riesgo = distancia entrada–stop en la dirección del trade; reward = distancia entrada–objetivo.
- Por defecto **no** se admite reward &lt; risk salvo `allowRewardShorterThanRisk: true` (caso excepcional explícito).
- `minRr` (p. ej. ≥ 1.0) filtra candidatos seleccionables; `recommendedMinRr` etiqueta `ideal_target` vs aceptable.
- Objetivo “demasiado lejos” vs ATR: `rewardDistance > targetTooFarAtrMultiple × atr` → `too_far` (candidato no seleccionable en v1).

## Ya alcanzado / demasiado cerca

Con `currentPrice` opcional:

- **BUY:** `already_reached` si el precio está en o más allá del objetivo (más buffer en ticks); `too_close` si el reward restante es &lt; `tooCloseToTargetR × risk`.
- **SELL:** lógica simétrica.

## Integración Entry/SL/TP (V2-03)

- Campo opcional `EntrySlTpModelInput.targetObjectiveResult`.
- `hybrid_fixed_r_or_liquidity` / `opposing_liquidity`: pata de liquidez = `selectedTargetPrice` del resultado cuando `canUseObjectiveTpPrice` (no inválido / no insuficiente / no `already_reached` / no `too_close`).
- Warnings adicionales: `TARGET_OBJECTIVE_WEAK_QUALITY`, `TARGET_OBJECTIVE_TOO_CLOSE_NOTE`, etc.

## Integración Decision Model (V2-05)

- Campo opcional `DecisionModelInput.targetObjectiveResult`.
- Ajusta `entrySlTpQuality` y `timingQuality`; códigos `TARGET_OBJECTIVE_*` en `reasonCodes`.
- Variante: `invalid_target` / `insufficient_data` → `invalid_variant`; `already_reached` → `invalid_variant`; `too_close` → `weak_observe_variant` (v1).

## Limitaciones (v1)

- Un solo objetivo seleccionado por llamada; sin multi-TP parcial.
- Swings desde `recentCandles` dependen de `detectSwings` y longitud de serie; sin datos → candidato ausente o `INSUFFICIENT_SWING_DATA`.
- Alineación con contexto HTF es un ajuste de puntuación suave, no un motor de sesiones.
- No sustituye el plan de precios completo: sigue siendo necesario `buildEntrySlTpPlan` para zona, SL modes y `replayInputPreview` coherente.

## Próximo paso en roadmap

Ver `CP18_5_FINAL_AUDIT_AND_ROADMAP_V2.md` (p. ej. V2-10 campaña de ranking multi-símbolo).
