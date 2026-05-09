import type { WalkForwardReason, WalkForwardReasonCode } from "./walk-forward-types";

export function walkForwardReason(
  code: WalkForwardReasonCode,
  message: string,
  opts?: { parameterSetId?: string; symbol?: string },
): WalkForwardReason {
  return {
    code,
    message,
    ...(opts?.parameterSetId != null ? { parameterSetId: opts.parameterSetId } : {}),
    ...(opts?.symbol != null ? { symbol: opts.symbol } : {}),
  };
}
