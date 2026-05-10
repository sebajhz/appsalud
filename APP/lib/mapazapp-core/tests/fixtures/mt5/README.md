# MT5-shaped CSV fixtures (synthetic only)

These files are **100% synthetic** fixtures for automated tests. They are **not real market history**, carry **no account data**, **no broker identifiers**, and **no private information**.

## Governance

- **Committed fixtures are intentionally small** (a handful of rows) so tests stay fast and reviewable.
- **Large MT5 exports must not be committed** to this repository — keep long histories and real broker exports outside Git or in an explicitly ignored staging area.
- Synthetic candles **do not** demonstrate profitability or predictive quality; they only exercise CSV shape and importer behavior.

## Format

Files use the **MT5-like** semicolon delimiter and angle-bracket headers recognized by `importManualCandleDataset` (`mt5_rates_like`). Filenames include **`SYNTHETIC`** to distinguish them from any future real-export naming.
