/**
 * D9.3 — Internal launcher-side action dispatcher (no HTTP, no IPC, no spawn).
 * Evaluates shared D9.2 gates and only routes `validate_environment` to the D8.3 preflight bridge.
 */

import {
  assertActionGateDecisionSafety,
  assertActionResultSafety,
  createActionGateActionResult,
  createBlockedActionResult,
  createDefaultActionGatePolicy,
  evaluateActionGate,
  type MapazappActionCallerSource,
  type MapazappActionGateDecision,
  type MapazappActionGatePolicy,
  type MapazappActionResult,
  type MapazappRuntimeStatus,
  type MapazappActionId,
} from "@workspace/mapazapp-core";
import {
  runLauncherValidateEnvironmentPreflight,
  type RunLauncherValidateEnvironmentPreflightOptions,
} from "./mapazapp-launcher-preflight-bridge";
import { deriveLauncherRuntimeStatus, type LauncherProcessModel } from "./mapazapp-launcher-model";

/** Default caller for programmatic launcher/script dispatch (never `dashboard`). */
export const LAUNCHER_ACTION_DISPATCH_DEFAULT_CALLER: MapazappActionCallerSource = "launcher";

const DISPATCH_ONLY_VALIDATE_ENV_MESSAGE =
  "Launcher dispatcher (D9.3) only routes validate_environment; other actions are not executed here.";

export type LauncherActionDispatchRequest = {
  actionId: MapazappActionId;
  callerSource?: MapazappActionCallerSource;
  nowIso?: string;
  params?: Record<string, unknown>;
  policy?: Partial<MapazappActionGatePolicy>;
  /** Forwarded to `evaluateActionGate` when file/consent gates apply. */
  hasFileConsent?: boolean;
  hasUserConfirmation?: boolean;
  preflightOptions?: RunLauncherValidateEnvironmentPreflightOptions;
};

export type LauncherActionDispatchResult = {
  gateDecision: MapazappActionGateDecision;
  actionResult: MapazappActionResult;
  processModel: LauncherProcessModel | null;
  runtimeStatus: MapazappRuntimeStatus | null;
};

export interface LauncherActionDispatcherDeps {
  runValidateEnvironmentPreflight?: (
    options?: RunLauncherValidateEnvironmentPreflightOptions,
  ) => Promise<{ model: LauncherProcessModel; actionResult: MapazappActionResult }>;
}

function mergeGatePolicy(partial?: Partial<MapazappActionGatePolicy>): MapazappActionGatePolicy {
  return { ...createDefaultActionGatePolicy(), ...partial };
}

/**
 * Dispatches a single action through gates and optional preflight execution.
 * Transport-free: no fetch, no child processes, no MT5 launch.
 */
export async function dispatchLauncherAction(
  request: LauncherActionDispatchRequest,
  deps?: LauncherActionDispatcherDeps,
): Promise<LauncherActionDispatchResult> {
  const generatedAt = request.nowIso ?? new Date().toISOString();
  const callerSource = request.callerSource ?? LAUNCHER_ACTION_DISPATCH_DEFAULT_CALLER;
  const policy = mergeGatePolicy(request.policy);

  const gateDecision = evaluateActionGate(
    {
      actionId: request.actionId,
      callerSource,
      nowIso: generatedAt,
      params: request.params,
      transportGatePresent: policy.transportGateEnabled,
      launcherAvailable: policy.launcherAvailable,
      hasFileConsent: request.hasFileConsent,
      hasUserConfirmation: request.hasUserConfirmation,
    },
    policy,
  );

  const gateOk = assertActionGateDecisionSafety(gateDecision);
  if (!gateOk.ok) {
    throw new Error(`Gate decision safety failed: ${gateOk.errors.join("; ")}`);
  }

  if (!gateDecision.allowed) {
    const actionResult = createActionGateActionResult(gateDecision);
    const arOk = assertActionResultSafety(actionResult);
    if (!arOk.ok) {
      throw new Error(`ActionResult safety failed: ${arOk.errors.join("; ")}`);
    }
    return {
      gateDecision,
      actionResult,
      processModel: null,
      runtimeStatus: null,
    };
  }

  if (request.actionId === "validate_environment") {
    const runPreflight =
      deps?.runValidateEnvironmentPreflight ?? runLauncherValidateEnvironmentPreflight;
    const { model, actionResult } = await runPreflight({
      ...request.preflightOptions,
      generatedAt: request.preflightOptions?.generatedAt ?? generatedAt,
    });
    const arSafety = assertActionResultSafety(actionResult);
    if (!arSafety.ok) {
      throw new Error(`ActionResult safety failed: ${arSafety.errors.join("; ")}`);
    }
    const runtimeStatus =
      actionResult.runtimeStatus ?? deriveLauncherRuntimeStatus(model);
    return {
      gateDecision,
      actionResult,
      processModel: model,
      runtimeStatus,
    };
  }

  const actionResult = createBlockedActionResult(request.actionId, DISPATCH_ONLY_VALIDATE_ENV_MESSAGE, {
    source: "launcher",
    generatedAt,
  });
  const blockedSafety = assertActionResultSafety(actionResult);
  if (!blockedSafety.ok) {
    throw new Error(`ActionResult safety failed: ${blockedSafety.errors.join("; ")}`);
  }

  return {
    gateDecision,
    actionResult,
    processModel: null,
    runtimeStatus: null,
  };
}
