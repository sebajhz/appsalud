# V2-02 — Candle Replay Trade Simulator

## Objetivo

Este checkpoint agrega un simulador de replay puro, determinista y testeable para modelar el ciclo de vida de una operacion por vela:

- espera de entrada;
- trigger de entrada;
- salida por TP/SL;
- expiracion antes de entrada;
- clasificacion de trade perdido (`missed`);
- ambiguedad SL/TP en la misma vela;
- metricas MAE/MFE en unidades R.

No agrega ejecucion real, no agrega canal MT5 de comandos, no agrega DB/watchers/WebSocket/scanner live.

## Como ayuda a probar el engine

El replay permite validar la logica de outcomes desde un `TradeReviewPlan` o input explicito hasta un estado terminal reproducible. Esto mejora la evidencia del "heart" del engine sin introducir riesgos de infraestructura o ejecucion.

## Modelos implementados

### Entry models

- `zone_touch`
- `midpoint_touch`
- `confirmation_close`
- `manual_reference_price`

### Exit models

- `fixed_r`
- `explicit_tp_sl`

## Politica de ambiguedad (misma vela toca SL y TP)

Se soportan politicas configurables:

- `conservative_sl_first`
- `optimistic_tp_first`
- `open_high_low_close`
- `open_low_high_close`
- `ambiguous`

Cuando se usa `ambiguous`, el resultado es `ambiguous_same_candle`.

## MAE/MFE

El simulador calcula excursion adversa y favorable maxima en R:

- `maxAdverseExcursionR` (MAE)
- `maxFavorableExcursionR` (MFE)

Usa `riskDistance = abs(entry - sl)` y evita division por cero.

## Precision por simbolo

Todos los precios de entrada/SL/TP se normalizan por `tickSize` del `symbolProfile`, evitando supuestos universales de pip.

## Limitaciones actuales

- El modelo `missed` es una version simple por umbral de movimiento favorable antes del trigger.
- No hay modelado de comisiones/slippage ni de microestructura intrabar real.
- No prueba rentabilidad por si mismo; solo mejora realismo y trazabilidad del outcome.

## Siguiente paso recomendado

`V2-03 — Entry/SL/TP Model v1` para profundizar reglas de trigger/salida con variantes estructurales y mejor calibracion.
