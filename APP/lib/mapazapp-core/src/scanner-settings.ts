import { createDefaultAccountGuardSettingsForTests } from "./account-guard-settings";
import { createDefaultStrategyRegistryEvaluationSettings } from "./strategy-registry-settings";
import { createDefaultTradePlanEvaluationSettingsForTests } from "./trade-plan-settings";
import { createDefaultIfvgStrategySettingsForTests } from "./strategy-settings";

/** Defaults for offline scanner simulation tests — not live-tuned. */
export function createDefaultScannerTradePlanSettings() {
  const s = createDefaultTradePlanEvaluationSettingsForTests();
  return { ...s, testOrDevMode: false, requireAccountIdForGuard: true };
}

export function createDefaultScannerAccountGuardSettings() {
  return createDefaultAccountGuardSettingsForTests();
}

export function createDefaultScannerStrategyRegistrySettings() {
  return createDefaultStrategyRegistryEvaluationSettings();
}

export function createDefaultScannerIfvgSettings() {
  return createDefaultIfvgStrategySettingsForTests();
}
