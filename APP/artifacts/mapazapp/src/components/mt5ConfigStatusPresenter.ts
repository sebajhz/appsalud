/**
 * D10.4 — Read-only MT5 configuration status draft (presentational helpers only).
 * Static/mock view model — no scripts package dependency, no transport, no actions.
 */

export const MT5_CONFIG_STATUS_PANEL_TITLE = "MT5 configuration status (read-only draft)";

/** Mandatory safety copy lines (exact strings for governance tests). */
export const MT5_CONFIG_STATUS_REQUIRED_COPY = [
  "Read-only MT5 configuration status.",
  "This does not launch MT5 or enable trading.",
  "No command files are written.",
  "Manual review required.",
  "Bridge readiness is informational only.",
] as const;

export type Mt5ConfigStatusTone = "neutral" | "muted" | "warning";

export interface Mt5ConfigStatusViewModel {
  /** Display label for mock posture only. */
  summaryLabel: string;
  rows: Array<{ label: string; value: string; testId: string; tone: Mt5ConfigStatusTone }>;
  bullets: readonly string[];
}

/** Draft defaults: MT5 integration not configured in product UI (matches API mock posture intent). */
export function createMockMt5ConfigStatusViewModel(): Mt5ConfigStatusViewModel {
  return {
    summaryLabel: "Draft posture — not configured for live MT5",
    rows: [
      {
        label: "Declarative MT5 paths",
        value: "Not loaded in this UI (mock)",
        testId: "mt5-config-status-paths",
        tone: "muted",
      },
      {
        label: "Bridge readiness",
        value: "Informational only (no live checks)",
        testId: "mt5-config-status-bridge",
        tone: "muted",
      },
      {
        label: "Launch / command files",
        value: "Not available here",
        testId: "mt5-config-status-launch",
        tone: "neutral",
      },
      {
        label: "Trading execution",
        value: "Disabled — manual review required",
        testId: "mt5-config-status-trading",
        tone: "neutral",
      },
    ],
    bullets: [...MT5_CONFIG_STATUS_REQUIRED_COPY],
  };
}
