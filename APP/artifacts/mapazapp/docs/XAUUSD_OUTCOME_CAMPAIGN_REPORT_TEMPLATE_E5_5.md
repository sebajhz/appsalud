# Mapazapp — XAUUSD Outcome Campaign Report Template (E5.5)

**Uso:** copiar la tabla a un informe operativo (p. ej. notas internas o doc **E5.5.2**). **No rellenar** hasta completar runs manuales (**E5.5.1**).  
**Runbook:** [`XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md`](./XAUUSD_OUTCOME_CAMPAIGN_RUNBOOK_E5_5.md).

**Notas de columnas:**

- **`expired_count`:** puede rellenarse como `unfilled_expired_count + expired_open_count` del summary, o dejarse vacío y detallar en `notes`.
- **`ambiguous_ratio` / `expired_ratio`:** definir en la primera fila del informe la fórmula usada (ver §8 del runbook).
- **`git_commit`:** SHA del repo al compilar el EA.

---

## Master table (one row per validated run)

| campaign_id | run_id | parameter_set_id | date_range | git_commit | ea_build | validation_status | warnings | trade_count | win_count | loss_count | ambiguous_count | expired_count | average_r | total_r | winrate | max_drawdown_r | ambiguous_ratio | trades_per_month_approx | conclusion | notes |
|-------------|--------|-------------------|------------|------------|----------|---------------------|----------|-------------|-----------|--------------|-----------------|-----------------|-----------|---------|---------|----------------|-------------------|-------------------------|------------|-------|
| | | | | | | | | | | | | | | | | | | | | |
| | | | | | | | | | | | | | | | | | | | | |

---

## Document history

| Versión | Nota |
|---------|------|
| E5.5 v1 | Plantilla vacía; ligada al runbook E5.5. |
