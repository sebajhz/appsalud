/**
 * D9.2 — Pure shared local action gate model for future action-bridge workflows.
 * No HTTP, no POST, no spawn, no MT5 runtime. Aligns with LOCAL_ACTION_BRIDGE_THREAT_MODEL_D9.md.
 */

import {
  assertActionResultSafety,
  createActionNotAvailableResult,
  createBlockedActionResult,
  createDefaultActionSafety,
  createSuccessfulReadOnlyActionResult,
  MAPAZAPP_ACTION_IDS,
  type MapazappActionId,
  type MapazappActionResult,
  type MapazappActionSafety,
  type MapazappActionSource,
} from "./action-result";

export type MapazappActionCallerSource =
  | "dashboard"
  | "api"
  | "launcher"
  | "script"
  | "unknown";

export type MapazappActionClass =
  | "read_only_status"
  | "read_only_preflight"
  | "file_validation"
  | "process_lifecycle"
  | "logs"
  | "mt5_config"
  | "mt5_launch"
  | "trading_execution";

export type MapazappActionGateDecisionStatus =
  | "allowed"
  | "blocked"
  | "not_available"
  | "requires_launcher"
  | "requires_transport_gate"
  | "requires_user_confirmation"
  | "requires_file_consent"
  | "error";

export type MapazappActionRiskLevel = "low" | "medium" | "high" | "forbidden";

export interface MapazappActionGateRequest {
  actionId: MapazappActionId;
  callerSource: MapazappActionCallerSource;
  hasUserConfirmation?: boolean;
  hasFileConsent?: boolean;
  transportGatePresent?: boolean;
  launcherAvailable?: boolean;
  nowIso?: string;
  params?: Record<string, unknown>;
}

export interface MapazappActionGateDefinition {
  actionId: MapazappActionId;
  actionClass: MapazappActionClass;
  riskLevel: MapazappActionRiskLevel;
  requiresLauncher: boolean;
  requiresTransportGate: boolean;
  requiresUserConfirmation: boolean;
  requiresFileConsent: boolean;
  allowsProcessStart: boolean;
  allowsFileRead: boolean;
  allowsMT5: boolean;
  allowsTrading: boolean;
  allowedCallerSources: readonly MapazappActionCallerSource[];
  reason: string;
}

export interface MapazappActionGateRequirements {
  launcherRequired: boolean;
  transportGateRequired: boolean;
  userConfirmationRequired: boolean;
  fileConsentRequired: boolean;
}

export interface MapazappActionGateDecision {
  allowed: boolean;
  status: MapazappActionGateDecisionStatus;
  actionId: MapazappActionId;
  callerSource: MapazappActionCallerSource;
  actionClass: MapazappActionClass;
  riskLevel: MapazappActionRiskLevel;
  message: string;
  safety: MapazappActionSafety;
  requirements: MapazappActionGateRequirements;
  generatedAt: string;
  errors: string[];
  warnings: string[];
}

export interface MapazappActionGatePolicy {
  transportGateEnabled: boolean;
  launcherAvailable: boolean;
  allowReadOnlyStatus: boolean;
  allowLauncherSidePreflight: boolean;
  allowFileValidation: boolean;
  allowProcessLifecycle: boolean;
  allowLogsOpen: boolean;
  allowMt5ConfigValidation: boolean;
  allowMt5Launch: boolean;
  allowTradingExecution: boolean;
}

export function createDefaultActionGatePolicy(): MapazappActionGatePolicy {
  return {
    transportGateEnabled: false,
    launcherAvailable: false,
    allowReadOnlyStatus: true,
    allowLauncherSidePreflight: true,
    allowFileValidation: false,
    allowProcessLifecycle: false,
    allowLogsOpen: false,
    allowMt5ConfigValidation: false,
    allowMt5Launch: false,
    allowTradingExecution: false,
  };
}

let definitionCache: Map<MapazappActionId, MapazappActionGateDefinition> | null = null;

export function createActionGateDefinitionList(): MapazappActionGateDefinition[] {
  return [
    {
      actionId: "show_runtime_status",
      actionClass: "read_only_status",
      riskLevel: "low",
      requiresLauncher: false,
      requiresTransportGate: false,
      requiresUserConfirmation: false,
      requiresFileConsent: false,
      allowsProcessStart: false,
      allowsFileRead: false,
      allowsMT5: false,
      allowsTrading: false,
      allowedCallerSources: ["dashboard", "api", "launcher", "script"],
      reason: "Read-only runtime snapshot (GET / in-process); no privileged execution.",
    },
    {
      actionId: "validate_environment",
      actionClass: "read_only_preflight",
      riskLevel: "medium",
      requiresLauncher: true,
      requiresTransportGate: true,
      requiresUserConfirmation: false,
      requiresFileConsent: false,
      allowsProcessStart: false,
      allowsFileRead: false,
      allowsMT5: false,
      allowsTrading: false,
      allowedCallerSources: ["launcher", "script"],
      reason:
        "Read-only dev preflight; dashboard/API callers must use a governed launcher or transport (D9.1).",
    },
    {
      actionId: "validate_csv",
      actionClass: "file_validation",
      riskLevel: "medium",
      requiresLauncher: false,
      requiresTransportGate: true,
      requiresUserConfirmation: false,
      requiresFileConsent: true,
      allowsProcessStart: false,
      allowsFileRead: true,
      allowsMT5: false,
      allowsTrading: false,
      allowedCallerSources: ["dashboard", "api", "launcher", "script"],
      reason: "Structural CSV validation requires transport gate, file consent, and policy.",
    },
    {
      actionId: "start_mapazapp_dev",
      actionClass: "process_lifecycle",
      riskLevel: "high",
      requiresLauncher: true,
      requiresTransportGate: false,
      requiresUserConfirmation: true,
      requiresFileConsent: false,
      allowsProcessStart: true,
      allowsFileRead: false,
      allowsMT5: false,
      allowsTrading: false,
      allowedCallerSources: ["launcher"],
      reason: "Process start is launcher-owned only; blocked by default policy (D9.2).",
    },
    {
      actionId: "stop_mapazapp",
      actionClass: "process_lifecycle",
      riskLevel: "high",
      requiresLauncher: true,
      requiresTransportGate: false,
      requiresUserConfirmation: true,
      requiresFileConsent: false,
      allowsProcessStart: false,
      allowsFileRead: false,
      allowsMT5: false,
      allowsTrading: false,
      allowedCallerSources: ["launcher"],
      reason: "Supervised stop is launcher-owned only; blocked by default policy (D9.2).",
    },
    {
      actionId: "open_logs",
      actionClass: "logs",
      riskLevel: "medium",
      requiresLauncher: true,
      requiresTransportGate: true,
      requiresUserConfirmation: true,
      requiresFileConsent: false,
      allowsProcessStart: false,
      allowsFileRead: false,
      allowsMT5: false,
      allowsTrading: false,
      allowedCallerSources: ["dashboard", "api", "launcher", "script"],
      reason: "Diagnostics access requires launcher/transport policy and user confirmation.",
    },
    {
      actionId: "validate_mt5_config",
      actionClass: "mt5_config",
      riskLevel: "high",
      requiresLauncher: true,
      requiresTransportGate: false,
      requiresUserConfirmation: true,
      requiresFileConsent: false,
      allowsProcessStart: false,
      allowsFileRead: false,
      allowsMT5: true,
      allowsTrading: false,
      allowedCallerSources: ["launcher"],
      reason: "MT5 path policy checks are gated until D10; not enabled in default policy.",
    },
    {
      actionId: "open_mt5",
      actionClass: "mt5_launch",
      riskLevel: "high",
      requiresLauncher: true,
      requiresTransportGate: false,
      requiresUserConfirmation: true,
      requiresFileConsent: false,
      allowsProcessStart: false,
      allowsFileRead: false,
      allowsMT5: true,
      allowsTrading: false,
      allowedCallerSources: ["launcher"],
      reason: "MT5 launch is launcher-only and gated until D10; not enabled in default policy.",
    },
  ];
}

function definitionMap(): Map<MapazappActionId, MapazappActionGateDefinition> {
  if (!definitionCache) {
    definitionCache = new Map(
      createActionGateDefinitionList().map((d) => [d.actionId, d]),
    );
  }
  return definitionCache;
}

export function getActionGateDefinition(
  actionId: MapazappActionId,
): MapazappActionGateDefinition | undefined {
  return definitionMap().get(actionId);
}

function isKnownActionId(id: string): id is MapazappActionId {
  return (MAPAZAPP_ACTION_IDS as readonly string[]).includes(id);
}

function mergeLauncher(req: MapazappActionGateRequest, policy: MapazappActionGatePolicy): boolean {
  return req.launcherAvailable ?? policy.launcherAvailable;
}

function mergeTransport(req: MapazappActionGateRequest, policy: MapazappActionGatePolicy): boolean {
  return req.transportGatePresent ?? policy.transportGateEnabled;
}

function gateRequirements(def: MapazappActionGateDefinition): MapazappActionGateRequirements {
  return {
    launcherRequired: def.requiresLauncher,
    transportGateRequired: def.requiresTransportGate,
    userConfirmationRequired: def.requiresUserConfirmation,
    fileConsentRequired: def.requiresFileConsent,
  };
}

function baseDecision(
  partial: Omit<MapazappActionGateDecision, "safety" | "requirements"> & {
    safety?: MapazappActionSafety;
    requirements?: MapazappActionGateRequirements;
  },
  def: MapazappActionGateDefinition,
): MapazappActionGateDecision {
  return {
    ...partial,
    safety: partial.safety ?? createDefaultActionSafety(),
    requirements: partial.requirements ?? gateRequirements(def),
  };
}

export function evaluateActionGate(
  request: MapazappActionGateRequest,
  policy: MapazappActionGatePolicy = createDefaultActionGatePolicy(),
): MapazappActionGateDecision {
  const generatedAt = request.nowIso ?? new Date().toISOString();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isKnownActionId(request.actionId)) {
    return {
      allowed: false,
      status: "error",
      actionId: request.actionId,
      callerSource: request.callerSource,
      actionClass: "read_only_status",
      riskLevel: "medium",
      message: "Unknown or unsupported action identifier.",
      safety: createDefaultActionSafety(),
      requirements: {
        launcherRequired: false,
        transportGateRequired: false,
        userConfirmationRequired: false,
        fileConsentRequired: false,
      },
      generatedAt,
      errors: ["Unknown actionId."],
      warnings,
    };
  }

  const def = getActionGateDefinition(request.actionId);
  if (!def) {
    return {
      allowed: false,
      status: "error",
      actionId: request.actionId,
      callerSource: request.callerSource,
      actionClass: "read_only_status",
      riskLevel: "medium",
      message: "Missing gate definition for action.",
      safety: createDefaultActionSafety(),
      requirements: {
        launcherRequired: false,
        transportGateRequired: false,
        userConfirmationRequired: false,
        fileConsentRequired: false,
      },
      generatedAt,
      errors: ["Missing gate definition."],
      warnings,
    };
  }

  if (def.actionClass === "trading_execution" || def.allowsTrading) {
    return baseDecision(
      {
        allowed: false,
        status: "blocked",
        actionId: def.actionId,
        callerSource: request.callerSource,
        actionClass: def.actionClass,
        riskLevel: def.riskLevel,
        message: "Trading or execution actions are forbidden in this gate model.",
        generatedAt,
        errors: [...errors, "Trading execution class is forbidden."],
        warnings,
      },
      def,
    );
  }

  const launcherOk = mergeLauncher(request, policy);
  const transportOk = mergeTransport(request, policy);

  const callerAllowed = def.allowedCallerSources.includes(request.callerSource);

  if (
    def.actionId === "validate_environment" &&
    (request.callerSource === "dashboard" || request.callerSource === "api")
  ) {
    if (def.requiresTransportGate && !transportOk) {
      return baseDecision(
        {
          allowed: false,
          status: "requires_transport_gate",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message:
            "validate_environment from dashboard/API requires a governed transport gate; use launcher or script for direct read-only preflight.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    return baseDecision(
      {
        allowed: false,
        status: "requires_launcher",
        actionId: def.actionId,
        callerSource: request.callerSource,
        actionClass: def.actionClass,
        riskLevel: def.riskLevel,
        message:
          "validate_environment cannot be invoked as allowed from dashboard/API; route through launcher-side bridge.",
        generatedAt,
        errors,
        warnings,
      },
      def,
    );
  }

  if (!callerAllowed || request.callerSource === "unknown") {
    return baseDecision(
      {
        allowed: false,
        status: "blocked",
        actionId: def.actionId,
        callerSource: request.callerSource,
        actionClass: def.actionClass,
        riskLevel: def.riskLevel,
        message: "Caller source is not permitted for this action.",
        generatedAt,
        errors: [...errors, "Caller source not allowlisted for this action."],
        warnings,
      },
      def,
    );
  }

  if (def.actionClass === "read_only_status") {
    if (!policy.allowReadOnlyStatus) {
      return baseDecision(
        {
          allowed: false,
          status: "not_available",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "Read-only runtime status is disabled by policy.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    return baseDecision(
      {
        allowed: true,
        status: "allowed",
        actionId: def.actionId,
        callerSource: request.callerSource,
        actionClass: def.actionClass,
        riskLevel: def.riskLevel,
        message: "Read-only runtime status permitted under default gate policy.",
        generatedAt,
        errors,
        warnings,
      },
      def,
    );
  }

  if (def.actionClass === "read_only_preflight") {
    if (!policy.allowLauncherSidePreflight) {
      return baseDecision(
        {
          allowed: false,
          status: "not_available",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "Launcher-side preflight is disabled by policy.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    return baseDecision(
      {
        allowed: true,
        status: "allowed",
        actionId: def.actionId,
        callerSource: request.callerSource,
        actionClass: def.actionClass,
        riskLevel: def.riskLevel,
        message: "Read-only environment validation permitted for launcher/script caller.",
        generatedAt,
        errors,
        warnings,
      },
      def,
    );
  }

  if (def.actionClass === "file_validation") {
    if (!policy.allowFileValidation) {
      return baseDecision(
        {
          allowed: false,
          status: "not_available",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "File validation actions are disabled by policy.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    if (def.requiresTransportGate && !transportOk) {
      return baseDecision(
        {
          allowed: false,
          status: "requires_transport_gate",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "validate_csv requires an established transport gate.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    if (def.requiresFileConsent && !request.hasFileConsent) {
      return baseDecision(
        {
          allowed: false,
          status: "requires_file_consent",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "validate_csv requires explicit file consent.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    return baseDecision(
      {
        allowed: true,
        status: "allowed",
        actionId: def.actionId,
        callerSource: request.callerSource,
        actionClass: def.actionClass,
        riskLevel: def.riskLevel,
        message: "File validation permitted under policy and consent gates.",
        generatedAt,
        errors,
        warnings,
      },
      def,
    );
  }

  if (def.actionClass === "process_lifecycle") {
    if (!policy.allowProcessLifecycle) {
      return baseDecision(
        {
          allowed: false,
          status: "not_available",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "Process lifecycle actions are disabled by default policy.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    if (def.requiresLauncher && !launcherOk) {
      return baseDecision(
        {
          allowed: false,
          status: "requires_launcher",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "Process lifecycle requires an available launcher supervisor.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    if (def.requiresUserConfirmation && !request.hasUserConfirmation) {
      return baseDecision(
        {
          allowed: false,
          status: "requires_user_confirmation",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "Process lifecycle requires explicit user confirmation.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    return baseDecision(
      {
        allowed: false,
        status: "blocked",
        actionId: def.actionId,
        callerSource: request.callerSource,
        actionClass: def.actionClass,
        riskLevel: def.riskLevel,
        message: "Process lifecycle remains blocked pending future launcher governance.",
        generatedAt,
        errors: [...errors, "Process lifecycle not fully enabled in D9.2 default posture."],
        warnings,
      },
      def,
    );
  }

  if (def.actionClass === "logs") {
    if (!policy.allowLogsOpen) {
      return baseDecision(
        {
          allowed: false,
          status: "not_available",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "Open logs is disabled by policy.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    if (def.requiresTransportGate && !transportOk) {
      return baseDecision(
        {
          allowed: false,
          status: "requires_transport_gate",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "Open logs requires transport gate when invoked outside launcher-only flows.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    if (def.requiresLauncher && !launcherOk) {
      return baseDecision(
        {
          allowed: false,
          status: "requires_launcher",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "Open logs requires launcher availability.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    if (def.requiresUserConfirmation && !request.hasUserConfirmation) {
      return baseDecision(
        {
          allowed: false,
          status: "requires_user_confirmation",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "Open logs requires explicit user confirmation.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    return baseDecision(
      {
        allowed: false,
        status: "blocked",
        actionId: def.actionId,
        callerSource: request.callerSource,
        actionClass: def.actionClass,
        riskLevel: def.riskLevel,
        message: "Logs access remains blocked until diagnostics policy ships.",
        generatedAt,
        errors: [...errors, "Logs gate incomplete in D9.2."],
        warnings,
      },
      def,
    );
  }

  if (def.actionClass === "mt5_config") {
    if (!policy.allowMt5ConfigValidation) {
      return baseDecision(
        {
          allowed: false,
          status: "not_available",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "MT5 config validation is gated until D10.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    if (!launcherOk) {
      return baseDecision(
        {
          allowed: false,
          status: "requires_launcher",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "MT5 config validation requires launcher.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    if (!request.hasUserConfirmation) {
      return baseDecision(
        {
          allowed: false,
          status: "requires_user_confirmation",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "MT5 config validation requires explicit confirmation.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    return baseDecision(
      {
        allowed: false,
        status: "blocked",
        actionId: def.actionId,
        callerSource: request.callerSource,
        actionClass: def.actionClass,
        riskLevel: def.riskLevel,
        message: "MT5 config validation remains blocked pending D10 implementation.",
        generatedAt,
        errors: [...errors, "MT5 policy gate not enabled."],
        warnings,
      },
      def,
    );
  }

  if (def.actionClass === "mt5_launch") {
    if (!policy.allowMt5Launch) {
      return baseDecision(
        {
          allowed: false,
          status: "not_available",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "MT5 launch is gated until D10.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    if (!launcherOk || !request.hasUserConfirmation) {
      return baseDecision(
        {
          allowed: false,
          status: request.hasUserConfirmation ? "requires_launcher" : "requires_user_confirmation",
          actionId: def.actionId,
          callerSource: request.callerSource,
          actionClass: def.actionClass,
          riskLevel: def.riskLevel,
          message: "MT5 launch requires launcher and confirmation.",
          generatedAt,
          errors,
          warnings,
        },
        def,
      );
    }
    return baseDecision(
      {
        allowed: false,
        status: "blocked",
        actionId: def.actionId,
        callerSource: request.callerSource,
        actionClass: def.actionClass,
        riskLevel: def.riskLevel,
        message: "MT5 launch remains blocked pending D10.",
        generatedAt,
        errors: [...errors, "MT5 launch not enabled."],
        warnings,
      },
      def,
    );
  }

  return baseDecision(
    {
      allowed: false,
      status: "blocked",
      actionId: def.actionId,
      callerSource: request.callerSource,
      actionClass: def.actionClass,
      riskLevel: def.riskLevel,
      message: "Action fell through gate evaluation; treated as blocked.",
      generatedAt,
      errors: [...errors, "Unhandled action class."],
      warnings,
    },
    def,
  );
}

const GATE_PRIVATE_MARKERS = [
  "appdata",
  "metaquotes",
  "terminal64.exe",
  "c:\\users",
  "/users/",
] as const;

const GATE_OPERATIONAL_MARKERS = [
  "ready to trade",
  "ready for trading",
  "live trading",
  "real trading",
  "execute order",
  "send order",
  "ordersend",
  "ctrade",
  "mt5 connected",
  "bridge connected",
] as const;

const GATE_CREDENTIAL_RE = /\b(login|account|balance|equity|investor|server)\b/i;

const GATE_JSON_UNSAFE_RE =
  /"(executionEnabled|sendToMt5Enabled|canAutoExecute|autoApprovalEnabled|registryMutationAllowed|approved)"\s*:\s*true\b/;

export interface ActionGateDecisionSafetyAssertion {
  ok: boolean;
  errors: string[];
}

export function assertActionGateDecisionSafety(
  decision: MapazappActionGateDecision,
): ActionGateDecisionSafetyAssertion {
  const errors: string[] = [];
  const def = getActionGateDefinition(decision.actionId);

  if (def?.allowsTrading === true) {
    errors.push("Gate definition must not set allowsTrading true.");
  }

  if (decision.allowed && decision.actionClass === "trading_execution") {
    errors.push("Trading execution class cannot be combined with allowed=true.");
  }

  const s = decision.safety;
  if (s.executionEnabled) errors.push("executionEnabled must be false.");
  if (s.sendToMt5Enabled) errors.push("sendToMt5Enabled must be false.");
  if (s.canAutoExecute) errors.push("canAutoExecute must be false.");
  if (s.autoApprovalEnabled) errors.push("autoApprovalEnabled must be false.");
  if (s.registryMutationAllowed) errors.push("registryMutationAllowed must be false.");
  if (!s.manualReviewRequired) errors.push("manualReviewRequired must be true.");

  const scanText = (label: string, text: string): void => {
    const low = text.toLowerCase();
    for (const m of GATE_PRIVATE_MARKERS) {
      if (low.includes(m)) errors.push(`Disallowed path/privacy marker in ${label}: ${m}`);
    }
    for (const m of GATE_OPERATIONAL_MARKERS) {
      if (low.includes(m)) errors.push(`Disallowed operational marker in ${label}: ${m}`);
    }
    if (GATE_CREDENTIAL_RE.test(text)) {
      errors.push(`Disallowed credential-related token in ${label}.`);
    }
  };

  scanText("message", decision.message);
  for (const w of decision.warnings) scanText("warnings", w);
  for (const e of decision.errors) scanText("errors", e);

  if (decision.allowed && (decision.riskLevel === "high" || decision.riskLevel === "forbidden")) {
    errors.push("High or forbidden risk cannot be marked allowed in D9.2 gate posture.");
  }

  let raw: string;
  try {
    raw = JSON.stringify(serializeActionGateDecision(decision));
  } catch {
    errors.push("Decision could not be serialized for JSON safety scan.");
    return { ok: false, errors };
  }

  if (GATE_JSON_UNSAFE_RE.test(raw)) {
    errors.push("Serialized decision contained unsafe execution or approval JSON tokens.");
  }

  if (/\"allowsTrading\"\s*:\s*true\b/.test(raw)) {
    errors.push("Serialized decision must not contain allowsTrading true.");
  }

  const lowRaw = raw.toLowerCase();
  for (const m of GATE_OPERATIONAL_MARKERS) {
    if (lowRaw.includes(m)) {
      errors.push(`Serialized JSON contained operational substring: ${m}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function serializeActionGateDecision(
  decision: MapazappActionGateDecision,
): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(decision, (_key, value: unknown) => {
      if (typeof value === "number" && !Number.isFinite(value)) {
        return null;
      }
      return value;
    }),
  ) as Record<string, unknown>;
}

function callerToActionSource(source: MapazappActionCallerSource): MapazappActionSource {
  if (source === "unknown") return "unknown";
  return source;
}

function gateStatusToActionStatus(
  decision: MapazappActionGateDecision,
): MapazappActionResult["status"] {
  if (decision.allowed) return "ok";
  switch (decision.status) {
    case "blocked":
    case "error":
      return decision.status === "error" ? "error" : "blocked";
    case "requires_launcher":
    case "requires_transport_gate":
    case "requires_user_confirmation":
    case "requires_file_consent":
    case "not_available":
      return "not_available";
    default:
      return "not_available";
  }
}

export function createActionGateActionResult(decision: MapazappActionGateDecision): MapazappActionResult {
  const source = callerToActionSource(decision.callerSource);
  const generatedAt = decision.generatedAt;

  if (decision.allowed) {
    if (
      decision.actionClass !== "read_only_status" &&
      decision.actionClass !== "read_only_preflight"
    ) {
      const result = createActionNotAvailableResult(
        decision.actionId,
        "Gate evaluation allowed this action class, but D9.2 emits successful ActionResult payloads only for read-only status and preflight.",
        {
          source,
          generatedAt,
          warnings: decision.warnings,
          errors: decision.errors,
        },
      );
      const safetyCheck = assertActionResultSafety(result);
      if (!safetyCheck.ok) {
        throw new Error(`ActionResult safety failed: ${safetyCheck.errors.join("; ")}`);
      }
      return result;
    }
    const result = createSuccessfulReadOnlyActionResult(decision.actionId, decision.message, {
      source,
      generatedAt,
      warnings: decision.warnings,
      errors: decision.errors,
    });
    const safety = assertActionResultSafety(result);
    if (!safety.ok) {
      throw new Error(`ActionResult safety failed: ${safety.errors.join("; ")}`);
    }
    return result;
  }

  const status = gateStatusToActionStatus(decision);
  const message = decision.message;
  const errs = decision.errors.length > 0 ? decision.errors : [message];

  const result: MapazappActionResult =
    status === "blocked" ?
      createBlockedActionResult(decision.actionId, message, {
        source,
        generatedAt,
        warnings: decision.warnings,
        errors: errs,
      })
    : status === "error" ?
      {
        ok: false,
        actionId: decision.actionId,
        status: "error",
        source,
        message,
        safety: createDefaultActionSafety(),
        logsPreview: [],
        warnings: decision.warnings,
        errors: errs,
        generatedAt,
      }
    : createActionNotAvailableResult(decision.actionId, message, {
        source,
        generatedAt,
        warnings: decision.warnings,
        errors: errs,
      });

  const safety = assertActionResultSafety(result);
  if (!safety.ok) {
    throw new Error(`ActionResult safety failed: ${safety.errors.join("; ")}`);
  }
  return result;
}
