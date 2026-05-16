# MSS / CHoCH — Relevancia temporal (E5.12.2)

## Por qué E5.12.1 no bastaba

La evidencia E5.12.1 mostró que el **smoke técnico** del export MSS/CHoCH V1 pasaba, pero el **`average_mss_choch_score` no separaba** resultados (wins, losses, unfilled, ambiguous de forma útil). Eso sugiere que **detectar** MSS o CHoCH en el TF de ejecución **no implica** que el evento sea **relevante en el tiempo** para el *setup* concreto (sweep → estructura → FVG/retest → entrada virtual).

## Qué aporta E5.12.2

- **Diagnóstico solo observación**: puntuaciones `mss_temporal_relevance_score` y `choch_temporal_relevance_score` (0–10), grados textuales (`A` / `B` / `C` / `Weak` / `None`), *flags* booleanos y **razones** tokenizadas (`mss_after_sweep`, `mss_before_entry`, `mss_too_late`, `choch_temporal_unknown`, etc.).
- **Índices de velas cerradas** (misma convención de *shift* que el resto del TestEA): relaciones **sweep ↔ MSS/CHoCH ↔ ancla FVG (*setup*) ↔ barra de entrada virtual** cuando existe *fill*.
- **Ventanas conservadoras** (solo clasificación, **sin** compuerta de producto): *near* 0–8 barras respecto al contexto de *setup*; *acceptable* 9–24 en la heurística de puntuación; *stale/too early* >24; *too late* si la ruptura queda **después** de la barra de entrada (más reciente en el tiempo que el fill).

## Qué **no** hace esta entrega

- **No** modifica generación de trades ni lógica de *outcome*.
- **No** introduce compuerta dura ni baja umbrales de detección MSS/CHoCH V1.
- **No** sustituye `mss_choch_score`; convive como columna separada.
- **No** añade ejecución en vivo, `OrderSend`, `CTrade`, `PositionOpen` ni `WebRequest`.

## Cadencia causal (documental)

En lectura discrecional se espera orden **sweep → MSS/CHoCH → FVG / retest → entrada**. Las columnas de barras (`mss_sweep_to_mss_bars`, `mss_fvg_to_mss_bars`, `mss_mss_to_entry_bars` y análogas CHoCH) materializan distancias para auditoría post-hoc.

## Resumen JSON

- `has_mss_choch_temporal_relevance_v1_logic`: `true` cuando el bundle incluye esta lógica de export.
- Promedios `average_mss_temporal_relevance_score`, `average_choch_temporal_relevance_score`.
- Contadores agregados (`mss_after_sweep_count`, `mss_before_entry_count`, …, simétricos `choch_*`).

## Evidencia y siguiente paso

- **Smoke cerrado (docs):** **E5.12.3** — [`MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md`](./MSS_CHOCH_TEMPORAL_RELEVANCE_SMOKE_EVIDENCE_E5_12_3.md) — build `MZP_TestEA_E5_12_2`, mismo bundle benchmark que E5.12.1; **PASS técnico** (`BUNDLE_EVENTS_LARGE`); temporal **observación-only**; sin compuerta.
- **Siguiente recomendado en roadmap:** **E5.13 — Premium/Discount V1** — [`PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md`](./PROFESSIONAL_TRADER_HUMANIZATION_ROADMAP_E5_11.md) §D.
