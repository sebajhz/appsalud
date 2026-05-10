/**
 * D10.4 — Read-only MT5 configuration status draft (presentational helpers only).
 * Static/mock view model — no scripts package dependency, no transport, no actions.
 */

export const MT5_CONFIG_STATUS_PANEL_TITLE = "MT5 configuration (draft)";

/** Mandatory safety copy lines (exact strings for governance tests). */
export const MT5_CONFIG_STATUS_REQUIRED_COPY = [
  "Read-only MT5 configuration status.",
  "This does not launch MT5 or enable trading.",
  "No command files are written.",
  "Manual review required.",
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
    summaryLabel: "Not configured (draft)",
    rows: [
      {
        label: "Declarative MT5 paths",
        value: "Not loaded in UI",
        testId: "mt5-config-status-paths",
        tone: "muted",
      },
      {
        label: "Launch / command files",
        value: "Out of scope for this panel",
        testId: "mt5-config-status-launch",
        tone: "neutral",
      },
      {
        label: "Trading execution",
        value: "Disabled",
        testId: "mt5-config-status-trading",
        tone: "neutral",
      },
    ],
    bullets: [...MT5_CONFIG_STATUS_REQUIRED_COPY],
  };
}
