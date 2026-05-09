import type { ParameterGridReason, ParameterGridReasonCode } from "./parameter-grid-types";

export function parameterGridReason(code: ParameterGridReasonCode, message: string): ParameterGridReason {
  return { code, message };
}
