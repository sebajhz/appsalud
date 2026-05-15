# MSS / CHoCH V1 — TestEA Export (E5.12)

## Purpose

After liquidity sweep quality (E5.10.x) and higher-timeframe structure context (E5.11), discretionary traders often seek **confirmation on the execution timeframe**: whether recent internal swings were broken **with closed candles**, not only wicked beyond a level.

E5.12 adds **observation-only** MSS / CHoCH diagnostics on the **execution timeframe** (campaign default: **M15**). This does **not** replace HTF context; it complements FVG geometry + HTF bias by exporting compact structure signals per virtual trade row.

## Why FVG + HTF alone is insufficient

- An FVG labels an imbalance; it does not prove that local execution-TF structure has shifted in the trade direction.
- HTF (H4/H1 in E5.11) summarizes slower context; execution entries often need **internal** swing breaks closer to the interaction zone.

## Closed candles only

Breaks use **close prices** vs swing levels when `InpMssChochRequireCloseBreak` / `mss_choch_require_close_break` is true.

If price pierces a level but the candle **does not close** beyond it, the EA exports `wick_break_only=true` where applicable — **diagnostic**, **not** MSS/CHoCH confirmation.

## MSS vs CHoCH (V1 simplification)

| Signal | Meaning (V1) |
|--------|----------------|
| **MSS** | Closed break beyond the latest **major** internal swing (lookback `N`) after conservative liquidity/bias context gates. |
| **CHoCH** | Earlier / weaker shift — closed break beyond a **minor** swing (`N-1`, minimum 1) when MSS conditions did not fully trigger on this snapshot. |

Counts are **non-exclusive at summary level** only where defined by export aggregation rules (CHOCH tallied when MSS absent on the same trade row).

## Observation-only contract

- **No trading gate**: MSS/CHoCH **never** blocks setup allowance or virtual trade creation.
- **No live orders**: TestEA remains Strategy Tester / export-only.
- **`mss_choch_score`**: numeric observation score (max **15** in V1) separate from entry-quality gate machinery.

## Wick-only diagnostic

`wick_break_only` highlights liquidity grabs or spikes that **failed** closed-candle confirmation for the exported MSS/CHoCH story.

## Smoke evidence

**E5.12.1** — cerrado en docs: evidencia operador sobre bundle real (`BUNDLE_EVENTS_LARGE` como warning esperado) — [`MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md`](./MSS_CHOCH_SMOKE_EVIDENCE_E5_12_1.md).

**Investigación opcional siguiente:** relevancia temporal MSS/CHoCH (**E5.12.2**) y/o **E5.13** Premium/Discount según roadmap.

## Related inputs (EA)

- `InpEnableMssChochV1`
- `InpMssChochSwingLookbackBars`
- `InpMssChochMaxBars`
- `InpMssChochRequireCloseBreak`
- `InpMssChochScoreEnabled`

Optimization mirror keys live under `optimization_parameters` in `backtest_summary.json`.
