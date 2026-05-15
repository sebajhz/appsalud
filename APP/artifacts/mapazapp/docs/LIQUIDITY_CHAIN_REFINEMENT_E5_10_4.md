# Cadena causal de liquidez V1 — refinamiento E5.10.4 (Mapazapp_TestEA)

## Hallazgos de E5.10.3 (smoke post–E5.10.2.1)

Tras corregir semántica y topes de **Liquidity Sweep Quality V1** (**E5.10.2.1**), el smoke mostró **métricas válidas** pero la **calidad de liquidez** (`liquidity_sweep_quality_score` y subscores) sigue **sin separar** outcomes de forma clara (promedios ~8.4 tanto en win como en loss / ambiguous / expired_unfilled). Las razones más frecuentes apuntan a que el modelo elige con frecuencia un **sweep bruto** que está **lejos del contexto del FVG/setup** (`liquidity_level_far_from_fvg`, etc.), más que al barrido “causal” que **crea** desplazamiento y deja el vacío (FVG) que luego se opera.

**Decisiones de producto (sin cambiar):** no bajar umbrales globales; no aprobar liquidez como compuerta dura; no aprobar live; no tunear artificialmente grados A/B.

## Objetivo E5.10.4

Separar **diagnósticamente** tres capas:

1. **Sweep bruto detectado** — lo que ya cubre `liquidity_event_detected` / evento PDH/PDL/swing + calidad heurística (`liquidity_sweep_quality_*`).
2. **Barrido relevante por dirección** — sigue dentro de calidad + dirección favorable / opuesta.
3. **Barrido causal cualificado** (`liquidity_chain_detected`) — heurística **sweep → reacción → desplazamiento → FVG después del sweep → proximidad espacial al FVG/setup**, alineada en el tiempo (barras antes del setup).

Todo es **solo observación y export** (`has_liquidity_chain_v1_logic`); **sin gate** y **sin bloquear trades**.

## Modelo causal (heurístico, velas cerradas)

Secuencia esperada en el **TF de ejecución** (p. ej. M15):

`sweep` (nivel tomado) → `reacción` posterior (cierre que rechaza el nivel) → `desplazamiento` (cuerpo direccional / mini-FVG en la ventana barrido–setup) → **FVG del setup formado en vela posterior al sweep** (`chain_fvg_created_after_sweep`) → entrada en contexto del FVG (`chain_distance_to_fvg_points` vs centro del FVG).

## Campos nuevos (trades CSV)

| Columna | Rol |
|--------|-----|
| `liquidity_chain_detected` | `true` solo si la cadena mínima razonable está presente |
| `liquidity_chain_grade` / `liquidity_chain_score` | Grado y puntuación **0–20** de la cadena (no sustituye los subscores legacy de calidad sweep) |
| `liquidity_chain_sweep_to_setup_bars`, `liquidity_chain_sweep_to_fvg_bars` | Separación temporal (ahora iguales a `age_bars` del sweep; reservado para extensiones) |
| `liquidity_chain_reaction_confirmed` | Coherente con reacción suficiente en calidad |
| `liquidity_chain_displacement_confirmed` | Coherente con desplazamiento suficiente |
| `liquidity_chain_fvg_created_after_sweep` | FVG (vela setup **S**) estrictamente **después** de la vela del sweep |
| `liquidity_chain_distance_to_fvg_points` | Distancia nivel de liquidez ↔ centro del FVG (puntos) |
| `liquidity_chain_reasons` | Tokens `\|`-separados (`liquidity_chain_ok`, `liquidity_chain_weak`, subcondiciones, `liquidity_chain_none`, etc.) |

## Summary JSON

`has_liquidity_chain_v1_logic: true`, contadores por grado, promedios (`average_liquidity_chain_score`, `average_liquidity_chain_sweep_to_setup_bars`) y conteos de confirmaciones / FVG-after-sweep para agregación rápida.

## `liquidity_event_score` (Entry Quality — componente liquidez)

- Si **`liquidity_chain_detected`** y score de liquidez habilitado: `liquidity_event_score` = **`liquidity_chain_score`** (0–20).
- Si hay sweep bruto pero **no** cadena cualificada: se usa el total de calidad legacy **capado a 7** y razones `liquidity_chain_weak_or_absent` + tokens de cadena/ calidad en `quality_reasons`. Así un sweep **sin** narrativa causal **no** puede aportar puntaje alto al componente liquidez.
- **Sin** compuerta: el trade virtual sigue igual; solo cambia el etiquetado/score de export.

## Compatibilidad

Bundles **sin** `has_liquidity_chain_v1_logic` ni columnas `liquidity_chain_*` siguen siendo válidos. El importador TypeScript y `validateTestEaExportSample` tratan la cadena como **opcional** salvo cuando el summary declara `has_liquidity_chain_v1_logic === true`.

## Analizador E5.9

Si el CSV incluye columnas numéricas de cadena (`liquidity_chain_score`, barras, distancia a FVG), el analizador puede rellenar **`liquidity_chain_component_stats`** además de los bloques E5.10.2.

## Próximo paso recomendado

**E5.10.5** — Smoke Strategy Tester tras recompilar **`MZP_TestEA_E5_10_4`**, exportar bundle, validar CLI y comparar distribución de `liquidity_chain_*` por outcome (sin esperar tuning artificial de A/B).
