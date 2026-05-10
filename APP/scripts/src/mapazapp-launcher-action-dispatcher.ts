/**
 * D9.3 / D9.4.1 — Internal launcher-side action dispatcher (no HTTP, no IPC, no spawn).
 * Evaluates shared D9.2 gates and only routes `validate_environment` to the D8.3 preflight bridge.
 * D9.4.1: preflight errors, unsafe preflight payloads, and gate/action safety faults yield safe
 * `MapazappActionResult` values instead of leaking throws or unsafe strings (still transport-free).
 */

import {
  assertActionGateDecisionSafety,
  assertActionResultSafety,
  createActionGateActionResult,
  createBlockedActionResult,
  createDefaultActionGatePolicy,
  createDefaultActionSafety,
  evaluateActionGate,
  type MapazappActionCallerSource,
  type MapazappActionGateDecision,
  type MapazappActionGatePolicy,
  type MapazappActionResult,
  type MapazappActionSource,
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

const GATE_SAFETY_FAILURE_MESSAGE = "Gate safety validation failed.";
const GATE_ACTION_CONVERSION_FAULT_MESSAGE = "Internal gate conversion fault.";
const PREFLIGHT_THROWN_MESSAGE = "Environment validation fault; nothing was started.";
const PREFLIGHT_UNSAFE_PAYLOAD_MESSAGE =
  "Environment validation produced an unsafe payload; nothing was started.";
const DISPATCH_ROUTE_FAULT_MESSAGE = "Dispatcher routing fault.";

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

function callerToActionSource(caller: MapazappActionCallerSource): MapazappActionSource {
  return caller === "unknown" ? "unknown" : caller;
}

function createSyntheticGateSafetyFailureDecision(
  actionId: MapazappActionId,
  callerSource: MapazappActionCallerSource,
  generatedAt: string,
): MapazappActionGateDecision {
  return {
    allowed: false,
    status: "blocked",
    actionId,
    callerSource,
    actionClass: "read_only_status",
    riskLevel: "low",
    message: GATE_SAFETY_FAILURE_MESSAGE,
    safety: createDefaultActionSafety(),
    requirements: {
      launcherRequired: false,
      transportGateRequired: false,
      userConfirmationRequired: false,
      fileConsentRequired: false,
    },
    generatedAt,
    errors: [GATE_SAFETY_FAILURE_MESSAGE],
    warnings: [],
  };
}

function buildGateSafetyFailureDispatch(
  actionId: MapazappActionId,
  callerSource: MapazappActionCallerSource,
  generatedAt: string,
): LauncherActionDispatchResult {
  const gateDecision = createSyntheticGateSafetyFailureDecision(actionId, callerSource, generatedAt);
  const actionResult = createBlockedActionResult(actionId, GATE_SAFETY_FAILURE_MESSAGE, {
    source: callerToActionSource(callerSource),
    generatedAt,
    errors: [GATE_SAFETY_FAILURE_MESSAGE],
  });
  return {
    gateDecision,
    actionResult,
    processModel: null,
    runtimeStatus: null,
  };
}

function actionResultFromGateDecisionSafe(gateDecision: MapazappActionGateDecision): MapazappActionResult {
  try {
    const ar = createActionGateActionResult(gateDecision);
    if (assertActionResultSafety(ar).ok) {
      return ar;
    }
  } catch {
    /* fall through to conservative blocked result */
  }
  return createBlockedActionResult(gateDecision.actionId, GATE_ACTION_CONVERSION_FAULT_MESSAGE, {
    source: callerToActionSource(gateDecision.callerSource),
    generatedAt: gateDecision.generatedAt,
    errors: [GATE_ACTION_CONVERSION_FAULT_MESSAGE],
  });
}

function createPreflightThrownActionResult(
  callerSource: MapazappActionCallerSource,
  generatedAt: string,
): MapazappActionResult {
  return {
    ok: false,
    actionId: "validate_environment",
    status: "error",
    source: callerToActionSource(callerSource),
    message: PREFLIGHT_THROWN_MESSAGE,
    safety: createDefaultActionSafety(),
    logsPreview: [],
    warnings: [],
    errors: [PREFLIGHT_THROWN_MESSAGE],
    generatedAt,
  };
}

function createPreflightUnsafePayloadActionResult(
  callerSource: MapazappActionCallerSource,
  generatedAt: string,
): MapazappActionResult {
  return {
    ok: false,
    actionId: "validate_environment",
    status: "error",
    source: callerToActionSource(callerSource),
    message: PREFLIGHT_UNSAFE_PAYLOAD_MESSAGE,
    safety: createDefaultActionSafety(),
    logsPreview: [],
    warnings: [],
    errors: [PREFLIGHT_UNSAFE_PAYLOAD_MESSAGE],
    generatedAt,
  };
}

function nonValidateAllowedActionResult(
  actionId: MapazappActionId,
  generatedAt: string,
): MapazappActionResult {
  const actionResult = createBlockedActionResult(actionId, DISPATCH_ONLY_VALIDATE_ENV_MESSAGE, {
    source: "launcher",
    generatedAt,
  });
  if (assertActionResultSafety(actionResult).ok) {
    return actionResult;
  }
  return createBlockedActionResult(actionId, DISPATCH_ROUTE_FAULT_MESSAGE, {
    source: "launcher",
    generatedAt,
    errors: [DISPATCH_ROUTE_FAULT_MESSAGE],
  });
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

  const gateSafety = assertActionGateDecisionSafety(gateDecision);
  if (!gateSafety.ok) {
    return buildGateSafetyFailureDispatch(request.actionId, callerSource, generatedAt);
  }

  if (!gateDecision.allowed) {
    const actionResult = actionResultFromGateDecisionSafe(gateDecision);
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
    try {
      const { model, actionResult } = await runPreflight({
        ...request.preflightOptions,
        generatedAt: request.preflightOptions?.generatedAt ?? generatedAt,
      });
      if (!assertActionResultSafety(actionResult).ok) {
        return {
          gateDecision,
          actionResult: createPreflightUnsafePayloadActionResult(callerSource, generatedAt),
          processModel: null,
          runtimeStatus: null,
        };
      }
      const runtimeStatus =
        actionResult.runtimeStatus ?? deriveLauncherRuntimeStatus(model);
      return {
        gateDecision,
        actionResult,
        processModel: model,
        runtimeStatus,
      };
    } catch {
      return {
        gateDecision,
        actionResult: createPreflightThrownActionResult(callerSource, generatedAt),
        processModel: null,
        runtimeStatus: null,
      };
    }
  }

  const actionResult = nonValidateAllowedActionResult(request.actionId, generatedAt);

  return {
    gateDecision,
    actionResult,
    processModel: null,
    runtimeStatus: null,
  };
}
