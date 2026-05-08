import type {
  ManualCandleDatasetError,
  ManualCandleDatasetErrorCode,
  ManualCandleDatasetWarning,
  ManualCandleDatasetWarningCode,
} from "./manual-candle-dataset-types";

export function manualCandleDatasetWarning(
  code: ManualCandleDatasetWarningCode,
  message: string,
  opts?: { rowIndex?: number; detail?: string },
): ManualCandleDatasetWarning {
  return { code, message, rowIndex: opts?.rowIndex, detail: opts?.detail };
}

export function manualCandleDatasetError(
  code: ManualCandleDatasetErrorCode,
  message: string,
  detail?: string,
): ManualCandleDatasetError {
  return { code, message, detail };
}
