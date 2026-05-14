# Mapazapp — Analizador de sensibilidad a ambigüedad TestEA (E5.6.1)

**Tipo:** herramienta de análisis (TypeScript + CLI).  
**Prerrequisitos:** plan [`AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md`](./AMBIGUITY_SENSITIVITY_DIAGNOSTICS_E5_6.md) (**E5.6**).  
**Implementación:** `@workspace/mapazapp-core` (`testea-ambiguity-sensitivity.ts`) + CLI `pnpm --filter @workspace/scripts mapazapp:testea-ambiguity-sensitivity`.

---

## 1. Propósito

Recalcular métricas de campaña **sin volver a ejecutar MT5** ni modificar `Mapazapp_TestEA`, leyendo carpetas de export ya validadas (`backtest_summary.json` + `backtest_trades.csv`) y aplicando **modos contables alternativos** para el outcome `ambiguous`.

Sirve para comprobar si el edge positivo observado en **neutral_zero** sobrevive a supuestos **conservadores** o a **excluir** ambiguos del denominador de expectativa.

---

## 2. Modos soportados

| Modo | Efecto en `ambiguous` |
|------|------------------------|
| `neutral_zero` | Se mantiene el `result_r` del CSV (habitualmente **0R**). |
| `conservative_loss` | Cada trade `ambiguous` cuenta **−1R** en totales y curva de equity. |
| `skip_ambiguous` | Los ambiguos **no entran** en la curva de equity ni en `totalR`/`expectancy`/`countedTrades`; siguen contabilizados en `ambiguous_count` y `ambiguous_rate`. |

La CLI acepta `--mode all` (defecto implícito) o un modo único.

---

## 3. Cómo ejecutarlo (carpetas locales del Strategy Tester)

Ejemplo orientativo (ruta del operador; **no** versionar CSV de resultados en el repo):

```bash
pnpm --filter @workspace/scripts mapazapp:testea-ambiguity-sensitivity -- ^
  --search-root "C:\Users\...\AppData\Roaming\MetaQuotes\Tester\A05F66FF4A995303E43EBDC7469BF577" ^
  --campaign-folder E55 ^
  --mode all ^
  --json
```

Opciones útiles:

- `--bundle "<ruta>"` repetible para carpetas hoja concretas.
- `--search-root` + detección recursiva de directorios que contienen `backtest_summary.json` y `backtest_trades.csv`.
- `--campaign-folder E55` filtra rutas que contienen `Mapazapp\TestEA\E55\` (normalizado).
- `--sort-by fvg|expectancy|total_r|max_drawdown|ambiguous_rate`
- `--max-results <n>`
- `--csv-output "<ruta>"` escribe CSV local (por defecto **no** escribe en el repo).
- `--strict` falla si un bundle no puede importarse; sin `--strict` se **omiten** bundles rotos con aviso en stderr.

---

## 4. Por qué es solo post-proceso

- No invoca MT5 ni Strategy Tester.
- No altera los CSV originales (solo lectura).
- No cambia la lógica de trading del EA; reproduce en TypeScript las convenciones de contabilidad definidas en **E5.6** y en este documento.

---

## 5. Interpretación

- Si **solo** `neutral_zero` muestra expectativa claramente positiva y **`conservative_loss`** pasa a negativa, el setup sigue siendo **no aprobado** bajo la regla de decisión de **E5.6** (no confiar en edge que depende de tratar `ambiguous` como 0R).
- Comparar también **`skip_ambiguous`**: si mejora mucho el drawdown al quitar ambiguos de la curva pero el `totalR` sigue débil tras `conservative_loss`, el problema no es solo “denominador” sino **volumen real** de outcomes inciertos.

---

## 6. Regla de decisión (recordatorio)

No aprobar el setup si solo es rentable con **`ambiguous = 0R`** y bajo **`conservative_loss`** deja de ser aceptable sin mitigación (ver **E5.6** §7).

---

## 7. Evidencia archivada (E5.6.2)

El operador ejecutó la CLI sobre los **7 bundles E5.5.1** (carpeta **E55**); resultados y decisión documentados en [`AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md`](./AMBIGUITY_SENSITIVITY_EVIDENCE_E5_6_2.md).

---

## Historial

| Versión | Nota |
|---------|------|
| E5.6.1 v1 | Analizador core + CLI `mapazapp:testea-ambiguity-sensitivity`. |
| E5.6.1 v1.1 | Puntero a evidencia cerrada **E5.6.2**. |
