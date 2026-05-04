import type { AccountGuardSettings } from "./account-guard-types";

/**
 * Development / test defaults — **not** final prop-firm or broker rules.
 * Production must load policy from an account + rules registry.
 */
export function createDefaultAccountGuardSettingsForTests(): AccountGuardSettings {
  return {
    dailyDrawdownWarningPercent: 80,
    maxDrawdownWarningPercent: 80,
    requireBridgeForReview: false,
    requireApprovedParameterSet: true,
    allowWatchOnlyReview: false,
    allowNewsReview: false,
    requirePropFirmSnapshot: false,
  };
}
