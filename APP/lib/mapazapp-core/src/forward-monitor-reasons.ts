import type { ForwardMonitorReasonCode } from "./forward-monitor-types";

const MESSAGES: Record<ForwardMonitorReasonCode, string> = {
  FORWARD_MONITOR_OK: "Forward monitor snapshot evaluated.",
  FORWARD_MONITOR_INVALID_INPUT: "Forward monitor input failed validation.",
  FORWARD_MONITOR_MISSING_ACCOUNT_GUARD: "Account guard input or result is required.",
  FORWARD_MONITOR_MISSING_REGISTRY: "Registry compatibility snapshot is required.",
  FORWARD_MONITOR_SCANNER_MISMATCH: "A scanner simulation result did not match the monitor session account or symbols.",
  FORWARD_MONITOR_SCANNER_FAILED: "One or more scanner simulation runs failed.",
  FORWARD_MONITOR_NO_SCANNER_INPUT: "No scanner simulation results were supplied for this snapshot.",
};

export function forwardMonitorReasonMessage(code: ForwardMonitorReasonCode): string {
  return MESSAGES[code] ?? code;
}
