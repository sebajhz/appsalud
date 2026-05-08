import type { ExportSampleValidationDiagnostic, ExportSampleDiagnosticLevel } from "./export-sample-validation-types";

export function exportSampleDiagnostic(
  level: ExportSampleDiagnosticLevel,
  code: string,
  message: string,
  opts?: { fileName?: string; detail?: string },
): ExportSampleValidationDiagnostic {
  return { level, code, message, fileName: opts?.fileName, detail: opts?.detail };
}
