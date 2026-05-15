# Liquidity Chain Reaction Audit — E5.10.6

## Contexto

Tras **E5.10.4** (cadena causal observación-only) y el smoke **E5.10.5** con build `MZP_TestEA_E5_10_4`, el bundle pasó validación técnica (`testEaStatus=valid`), pero los agregados mostraron un **cuello de botella en la reacción**:

- `liquidity_chain_fvg_after_sweep_count` alineado con prácticamente todos los trades con sweep.
- `liquidity_chain_displacement_confirmed_count` alto (orden esperado vs. modelo).
- `liquidity_chain_reaction_confirmed_count` muy bajo (orden **no** esperado para uso como señal explicativa).

**Interpretación:** la cadena exportaba bien, pero la lectura causal **no era usable** como narrativa de producto: el modelo pasó de demasiado permisivo (antes de endurecer cadena) a **demasiado restrictivo** en la etiqueta `chain_reaction_confirmed`.

## Decisiones explícitas

- **No** se bajan umbrales globales de Entry Quality.
- **No** se usa liquidez como compuerta dura ni se aprueba trading live.
- **No** se fuerzan más grados A/B artificialmente.
- Se mantiene comportamiento **solo observación / export**.

## Causa raíz (repo)

Dos factores principales:

1. **`liquidity_chain_reaction_confirmed` dependía de `liquidity_sweep_reaction_score >= 4`** — es decir, del **subscore distribuido** en Quality V1, no de una verificación geométrica dedicada de cadena. Eso podía desacoplar la etiqueta de cadena del fenómeno “reacción tras sweep”.
2. **La heurística previa de reacción en calidad** buscaba cierres favorablemente alejados del nivel **solo en el tramo entre velas `S+1` y `j-1`** (setup ↔ sweep), **sin** ventana explícita de **1–3 velas cerradas inmediatamente después del sweep** ni alternativa de **reentrada al rango de la vela previa al sweep**.

## Cambios E5.10.6

### Diagnóstico agregado (summary JSON)

Cuando `has_liquidity_chain_reaction_audit_v1_logic` es **true**:

| Campo summary |
|-----------------|
| `liquidity_chain_reaction_checked_count` |
| `liquidity_chain_reaction_fail_close_not_back_inside_count` |
| `liquidity_chain_reaction_fail_no_candle_after_sweep_count` |
| `liquidity_chain_reaction_fail_wrong_level_count` |
| `liquidity_chain_reaction_fail_sweep_after_fvg_count` |
| `liquidity_chain_reaction_fail_other_count` |

Los **fallos son mutuamente excluyentes** por trade en la clasificación audit (un trade cuenta en **una** categoría de fallo o pasa a ventana OK / confirmado).

### Columnas opcionales por trade (CSV)

| Columna |
|---------|
| `liquidity_chain_reaction_failure_reason` |
| `liquidity_chain_reaction_close_price` |
| `liquidity_chain_reaction_level` |
| `liquidity_chain_reaction_bars_checked` |

Tokens de razón incluyen entre otros:

- `liquidity_chain_reaction_ok`
- `liquidity_chain_reaction_not_applicable`
- `liquidity_chain_reaction_fail_wrong_level`
- `liquidity_chain_reaction_fail_sweep_after_fvg`
- `liquidity_chain_reaction_fail_no_candle_after_sweep`
- `liquidity_chain_reaction_fail_close_not_back_inside`
- `liquidity_chain_reaction_fail_other`

### Heurística de reacción (cerrado, conservadora)

Para sweeps **emparejados** con la dirección del setup:

- Ventana: hasta **3 velas cerradas** inmediatamente **después** del sweep (`j-1 … j-3`, índices MT5).
- **Low sweep (alcista):** cierre **por encima del nivel barrido** **o** cierre **dentro del rango [low, high] de la vela previa al sweep** (`j+1`).
- **High sweep (bajista):** cierre **por debajo del nivel barrido** **o** mismo criterio de **reentrada al rango previo al sweep**.

Orden causal para evaluar la ventana: `sweep_bar_shift > setup_bar_shift` y `j >= 2` (hay al menos una vela cerrada posterior al sweep).

**`liquidity_chain_reaction_confirmed`** en cadena usa esta auditoría dedicada (ya no el umbral del subscore distribuido).

La **calidad sweep** (`liquidity_sweep_reaction_score`) usa la misma ventana geométrica coherente con lo anterior (sin tocar umbrales globales EQ).

## Compatibilidad

- Bundles **solo E5.10.4** sin `has_liquidity_chain_reaction_audit_v1_logic` siguen siendo válidos para import opcional.
- Bundles **E5.10.6+** con el flag activo deben incluir los nuevos agregados y columnas (validador TS de muestra oficial).

## Siguiente paso operativo — E5.10.7 (Liquidity Chain Reaction smoke evidence)

**Objetivo:** obtener evidencia reproducible de que la heurística de reacción **E5.10.6** es útil como narrativa/diagnóstico (sin convertirla aún en compuerta dura).

1. Operador: recompilar **`MZP_TestEA_E5_10_6`** en MetaEditor.
2. Ejecutar el mismo **smoke XAUUSD M15 / D1** usado en evidencias previas de cadena (coherencia temporal entre runs).
3. Exportar bundle y validar con CLI `mapazapp:testea-export-validate` (o comando equivalente documentado en E4.1).
4. Medir y registrar (sin claims de rentabilidad):
   - `liquidity_chain_reaction_checked_count`
   - `liquidity_chain_reaction_confirmed_count` vs distribución de **`liquidity_chain_reaction_failure_reason`** y contadores agregados `liquidity_chain_reaction_fail_*`
   - relación del **score de cadena / liquidez** (columnas existentes cuando apliquen) **por outcome** (`win` / `loss` / `ambiguous` / etc., según exports del run)
5. **Decisión:** valorar si la heurística está **equilibrada** o sigue **demasiado estricta / permisiva** para la siguiente iteración de documentación o implementación observacional.

**Confirmaciones de producto/seguridad:** la cadena permanece **observation-only**; **no** se aprueba trading live; **no** se bajan umbrales globales de Entry Quality para fabricar A/B; los campos deben **explicar** fallos de forma auditable.

**Contexto de roadmap:** tras E5.10.7, la línea **E5.11–E5.19** describe la humanización «trader profesional» medible — ver [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md).
