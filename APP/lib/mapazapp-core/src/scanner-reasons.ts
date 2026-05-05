import type { ScannerErrorCode, ScannerWarningCode } from "./scanner-types";

export function scannerErrorMessage(code: ScannerErrorCode): string {
  switch (code) {
    case "SCANNER_INVALID_INPUT":
      return "Scanner input failed validation.";
    case "SCANNER_MISSING_ACCOUNT_GUARD_INPUT":
      return "accountGuardInput is required for the scanner simulation.";
    case "SCANNER_MISSING_STRATEGY_REGISTRY":
      return "strategyRegistry is required.";
    case "SCANNER_MISSING_SYMBOL_PROFILE":
      return "symbolProfile is required.";
    case "SCANNER_EMPTY_CANDLES":
      return "candles array must not be empty.";
    case "SCANNER_INTERNAL":
      return "Internal scanner error.";
    default:
      return String(code);
  }
}

export function scannerWarningMessage(code: ScannerWarningCode): string {
  switch (code) {
    case "SCANNER_PIPELINE_WARNING":
      return "IFVG pipeline reported a warning.";
    case "SCANNER_ASSUMPTION_WARNING":
      return "Scanner assumptions / skeleton limitations apply.";
    case "SCANNER_ACCOUNT_GUARD_WARNING":
      return "Account guard reported non-blocking warnings.";
    case "SCANNER_REGISTRY_WARNING":
      return "Strategy registry reported warnings for this parameter set.";
    default:
      return String(code);
  }
}
