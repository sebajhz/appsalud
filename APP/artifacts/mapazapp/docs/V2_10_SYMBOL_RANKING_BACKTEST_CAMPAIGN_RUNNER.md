# V2-10 — Symbol Ranking / Backtest Campaign Runner

## Por qué existe

V2-10 agrega un runner de campanas de backtest para comparar de forma controlada el comportamiento del engine IFVG entre simbolos, splits de dataset y parameter sets, con enfoque de robustez y no de "best-case return".

El objetivo es responder:

- que simbolos parecen mas compatibles con el engine actual;
- que parameter sets se ven debiles o inestables;
- donde falta evidencia (muestras/splits);
- que resultados no son confiables todavia.

## Como rankea de forma conservadora

`runBacktestCampaign(input)` ejecuta `runIfvgReplayBacktest` por combinacion dataset + parameter set, y luego agrega por simbolo y por parameter set.

El rank score considera:

- trade count (penalizacion fuerte por muestra chica);
- averageR y totalR;
- profitFactor;
- maxDrawdownR;
- winRate;
- penalizacion por diagnosticos y severidad;
- tasas de `ambiguous`, `missed`, `expired`;
- cobertura de splits (train/validation/forward/full/unknown);
- estabilidad entre datasets (desviacion de score entre runs).

Nunca sube arriba por un solo dataset sintetico o muestra pequena.

## Metricas y recomendacion

El runner clasifica recomendacion en:

- `candidate_for_more_testing`
- `needs_more_data`
- `rejected`
- `unstable`
- `promising_but_unproven`
- `not_rankable`

No existe estado "approved" en V2-10.

## Seguridad y alcance

- solo logica pura en `@workspace/mapazapp-core`;
- sin ejecucion de ordenes;
- sin lectura de comandos MT5;
- sin cambios BridgeEA/TestEA;
- sin DB, watcher, websocket o scanner live;
- `executionEnabled: false`, `registryMutationAllowed: false`, `reviewOnly: true`.

## Fixtures sinteticos incluidos

Se agregan fixtures seguros (sinteticos):

- XAUUSD promising synthetic;
- EURUSD needs_more_data;
- NAS100 unstable;
- BTCUSD rejected / alta volatilidad;
- dataset vacio / no rankable.

No son evidencia real de mercado ni prueba de rentabilidad.

## Que falta para evidencia real

Para transicionar de ranking sintetico a evidencia fuerte aun falta:

- campanas con datos historicos reales importados y auditados;
- cobertura consistente de validation + forward;
- control de overfitting y walk-forward governance;
- mas replay realism y calibracion adicional donde el engine aun es parcial.

## Siguiente paso recomendado

V2-13 orquesta `runBacktestCampaign` sobre datasets manuales y bundles validados (`V2_13_CAMPAIGN_RUNNER_OVER_MANUAL_DATASETS.md`). El siguiente incremento de producto alineado al plan maestro es **V2-14** (grid de parameter sets). La capa API/dashboard para import UI/CLI sigue diferida (p. ej. V2-17).
