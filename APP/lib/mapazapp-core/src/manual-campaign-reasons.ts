import type { ManualCampaignDiagnostic, ManualCampaignDiagnosticLevel } from "./manual-campaign-types";

export function manualCampaignDiagnostic(
  level: ManualCampaignDiagnosticLevel,
  code: string,
  message: string,
  opts?: { sourceName?: string; detail?: string },
): ManualCampaignDiagnostic {
  return {
    level,
    code,
    message,
    ...(opts?.sourceName != null ? { sourceName: opts.sourceName } : {}),
    ...(opts?.detail != null ? { detail: opts.detail } : {}),
  };
}
