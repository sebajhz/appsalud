import { evaluateAccountGuard } from "./account-guard-evaluator";
import { createDefaultAccountGuardSettingsForTests } from "./account-guard-settings";
import { forwardMonitorReasonMessage } from "./forward-monitor-reasons";
import { FORWARD_MONITOR_MAX_SCANNER_RUNS, FORWARD_MONITOR_MAX_SYMBOLS } from "./forward-monitor-settings";
import type {
  ForwardMonitorCandidateState,
  ForwardMonitorDiagnostic,
  ForwardMonitorEvent,
  ForwardMonitorEventKind,
  ForwardMonitorInput,
  ForwardMonitorPlanStatusSummary,
  ForwardMonitorReasonCode,
  ForwardMonitorResult,
  ForwardMonitorRunId,
  ForwardMonitorStatus,
  ForwardMonitorSymbolState,
} from "./forward-monitor-types";
import type { ParameterSetId, StrategyId } from "./ids";
import type { TradePlanStatus } from "./trade-plan-types";
import type { ScannerCandidateResult, ScannerSimulationResult } from "./scanner-types";

function newMonitorRunId(): ForwardMonitorRunId {
  return `fm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function pushDiag(list: ForwardMonitorDiagnostic[], level: ForwardMonitorDiagnostic["level"], code: string, message: string): void {
  list.push({ level, code, message });
}

function emptyPlanSummary(): ForwardMonitorPlanStatusSummary {
  return {
    TRADE_READY: 0,
    WAIT_RETEST: 0,
    WAIT_CONFIRMATION: 0,
    OBSERVE: 0,
    NO_TRADE: 0,
    INVALIDATED: 0,
    EXPIRED: 0,
    USED: 0,
  };
}

function incPlanSummary(s: ForwardMonitorPlanStatusSummary, st: TradePlanStatus): void {
  if (st in s) {
    s[st as keyof ForwardMonitorPlanStatusSummary]++;
  }
}

function mapReviewStatusToAction(status: TradePlanStatus): ForwardMonitorCandidateState["currentAction"] {
  switch (status) {
    case "TRADE_READY":
      return "review_manually";
    case "INVALIDATED":
    case "EXPIRED":
    case "USED":
      return "ignore";
    case "NO_TRADE":
      return "blocked";
    default:
      return "wait";
  }
}

function eventKindForPlanStatus(status: TradePlanStatus): ForwardMonitorEventKind | null {
  switch (status) {
    case "WAIT_RETEST":
      return "WAITING_FOR_RETEST";
    case "WAIT_CONFIRMATION":
      return "WAITING_FOR_CONFIRMATION";
    case "TRADE_READY":
      return "TRADE_READY_REVIEW_ONLY";
    default:
      return "CANDIDATE_CREATED";
  }
}

function buildEvents(
  params: {
    status: ForwardMonitorStatus;
    candidates: ForwardMonitorCandidateState[];
    evaluationTimeUtc: string;
  },
): ForwardMonitorEvent[] {
  const events: ForwardMonitorEvent[] = [];
  const t = params.evaluationTimeUtc;
  let seq = 0;
  const add = (kind: ForwardMonitorEventKind, message: string, symbol?: string, candidateId?: string) => {
    seq++;
    events.push({
      eventId: `evt_${seq}_${params.status}`,
      occurredAtUtc: t,
      kind,
      symbol: symbol as ForwardMonitorCandidateState["symbol"] | undefined,
      candidateId,
      messageSimple: message,
      reasonCodes: [],
    });
  };

  if (params.status === "blocked_by_account_guard") {
    add("BLOCKED_BY_ACCOUNT_GUARD", "Forward monitor blocked — account guard does not allow trade review.");
    return events;
  }
  if (params.status === "blocked_by_registry") {
    add("BLOCKED_BY_PARAMETER_SET", "Forward monitor blocked — parameter set / registry does not allow trade review.");
    return events;
  }
  if (params.status === "no_candidates") {
    add("NO_CANDIDATES", "No review candidates in this snapshot.");
    return events;
  }

  for (const c of params.candidates) {
    const kind = eventKindForPlanStatus(c.reviewStatus) ?? "CANDIDATE_CREATED";
    add(kind, c.simpleSummary, c.symbol, c.candidateId);
  }
  return events;
}

function candidateFromScannerRow(
  c: ScannerCandidateResult,
  accountId: ForwardMonitorInput["accountId"],
  evaluationTimeUtc: string,
  sessionStrategyId: StrategyId,
  sessionParameterSetId: ParameterSetId,
): ForwardMonitorCandidateState {
  const plan = c.tradeReviewEvaluation.plan;
  const z = c.zoneCandidate;
  return {
    candidateId: z.zoneId,
    zoneId: z.zoneId,
    symbol: z.canonicalSymbol,
    direction: z.direction,
    reviewStatus: plan.status,
    currentAction: mapReviewStatusToAction(plan.status),
    simpleSummary: plan.simpleSummary,
    technicalReasonCodes: [...plan.reasons.map((r) => r.code), ...plan.failedHardGates],
    accountId,
    strategyId: (plan.strategyId ?? z.strategyId ?? sessionStrategyId) as StrategyId,
    parameterSetId: (plan.parameterSetId ?? z.parameterSetId ?? sessionParameterSetId) as ParameterSetId,
    lastUpdatedUtc: evaluationTimeUtc,
  };
}

function resolveAccountGuard(input: ForwardMonitorInput, diagnostics: ForwardMonitorDiagnostic[]) {
  if (input.accountGuardResult) {
    return input.accountGuardResult;
  }
  if (input.accountGuardInput) {
    const settings = createDefaultAccountGuardSettingsForTests();
    return evaluateAccountGuard(input.accountGuardInput, settings);
  }
  pushDiag(diagnostics, "error", "FORWARD_MONITOR_MISSING_ACCOUNT_GUARD", forwardMonitorReasonMessage("FORWARD_MONITOR_MISSING_ACCOUNT_GUARD"));
  return null;
}

/**
 * Pure snapshot evaluation: account guard → registry → scanner-derived candidates → observational summary.
 * No I/O, no MT5, no persistence, no execution, no registry mutation.
 */
export function evaluateForwardMonitorSnapshot(input: ForwardMonitorInput): ForwardMonitorResult {
  const diagnostics: ForwardMonitorDiagnostic[] = [];
  const monitorRunId = input.monitorRunId ?? newMonitorRunId();
  const evaluationTimeUtc = input.evaluationTimeUtc || new Date().toISOString();

  const baseFail = (status: ForwardMonitorStatus, code: ForwardMonitorReasonCode): ForwardMonitorResult => {
    pushDiag(diagnostics, "error", code, forwardMonitorReasonMessage(code));
    const emptyRegistry = input.registryCompatibility;
    const guard = resolveAccountGuard(input, diagnostics);
    return {
      ok: false,
      monitorRunId,
      status,
      accountId: input.accountId ?? ("" as ForwardMonitorInput["accountId"]),
      symbols: input.symbols ?? [],
      timeframe: input.timeframe ?? "",
      strategyId: input.strategyId ?? ("" as ForwardMonitorInput["strategyId"]),
      parameterSetId: input.parameterSetId ?? ("" as ForwardMonitorInput["parameterSetId"]),
      evaluationTimeUtc,
      sourceType: input.sourceType ?? "unknown",
      sourceName: input.sourceName,
      accountState: {
        accountId: (input.accountId ?? "") as ForwardMonitorInput["accountId"],
        allowTradeReview: guard?.allowTradeReview ?? false,
        guardStatus: guard?.status ?? "INSUFFICIENT_ACCOUNT_DATA",
        simpleSummary: guard?.simpleSummary ?? "Not evaluated.",
        technicalSummary: guard?.technicalSummary ?? "SKIPPED",
      },
      registryCompatibility: emptyRegistry,
      symbolStates: [],
      candidates: [],
      candidateCountsByReviewStatus: emptyPlanSummary(),
      events: buildEvents({ status, candidates: [], evaluationTimeUtc }),
      diagnostics,
      scannerRunReferences: [],
      reviewOnly: true,
      executionEnabled: false,
      mockOnly: true,
      simulated: true,
    };
  };

  if (!input.accountId?.trim()) {
    return baseFail("failed", "FORWARD_MONITOR_INVALID_INPUT");
  }
  if (!input.symbols?.length) {
    return baseFail("failed", "FORWARD_MONITOR_INVALID_INPUT");
  }
  if (input.symbols.length > FORWARD_MONITOR_MAX_SYMBOLS) {
    return baseFail("failed", "FORWARD_MONITOR_INVALID_INPUT");
  }
  if (!input.strategyId?.trim() || !input.parameterSetId?.trim()) {
    return baseFail("failed", "FORWARD_MONITOR_INVALID_INPUT");
  }
  if (!input.timeframe?.trim()) {
    return baseFail("failed", "FORWARD_MONITOR_INVALID_INPUT");
  }
  if (input.registryCompatibility == null) {
    return baseFail("failed", "FORWARD_MONITOR_MISSING_REGISTRY");
  }

  const guard = resolveAccountGuard(input, diagnostics);
  if (!guard) {
    return baseFail("failed", "FORWARD_MONITOR_MISSING_ACCOUNT_GUARD");
  }

  const accountState: ForwardMonitorResult["accountState"] = {
    accountId: input.accountId,
    allowTradeReview: guard.allowTradeReview,
    guardStatus: guard.status,
    simpleSummary: guard.simpleSummary,
    technicalSummary: guard.technicalSummary,
  };

  if (!guard.allowTradeReview) {
    const st: ForwardMonitorStatus = "blocked_by_account_guard";
    return {
      ok: true,
      monitorRunId,
      status: st,
      accountId: input.accountId,
      symbols: input.symbols,
      timeframe: input.timeframe,
      strategyId: input.strategyId,
      parameterSetId: input.parameterSetId,
      evaluationTimeUtc,
      sourceType: input.sourceType,
      sourceName: input.sourceName,
      accountState,
      registryCompatibility: input.registryCompatibility,
      symbolStates: [],
      candidates: [],
      candidateCountsByReviewStatus: emptyPlanSummary(),
      events: buildEvents({ status: st, candidates: [], evaluationTimeUtc }),
      diagnostics,
      scannerRunReferences: [],
      reviewOnly: true,
      executionEnabled: false,
      mockOnly: true,
      simulated: true,
    };
  }

  if (!input.registryCompatibility.allowTradeReview) {
    const st: ForwardMonitorStatus = "blocked_by_registry";
    return {
      ok: true,
      monitorRunId,
      status: st,
      accountId: input.accountId,
      symbols: input.symbols,
      timeframe: input.timeframe,
      strategyId: input.strategyId,
      parameterSetId: input.parameterSetId,
      evaluationTimeUtc,
      sourceType: input.sourceType,
      sourceName: input.sourceName,
      accountState,
      registryCompatibility: input.registryCompatibility,
      symbolStates: [],
      candidates: [],
      candidateCountsByReviewStatus: emptyPlanSummary(),
      events: buildEvents({ status: st, candidates: [], evaluationTimeUtc }),
      diagnostics,
      scannerRunReferences: [],
      reviewOnly: true,
      executionEnabled: false,
      mockOnly: true,
      simulated: true,
    };
  }

  const scans = input.scannerSimulationResults ?? [];
  if (scans.length > FORWARD_MONITOR_MAX_SCANNER_RUNS) {
    return baseFail("failed", "FORWARD_MONITOR_INVALID_INPUT");
  }

  const symbolSet = new Set(input.symbols);
  const scannerRunReferences: string[] = [];
  const symbolStates: ForwardMonitorSymbolState[] = [];
  const mergedCandidates: ForwardMonitorCandidateState[] = [];
  const planSummary = emptyPlanSummary();

  if (scans.length === 0) {
    pushDiag(
      diagnostics,
      "info",
      "FORWARD_MONITOR_NO_SCANNER_INPUT",
      forwardMonitorReasonMessage("FORWARD_MONITOR_NO_SCANNER_INPUT"),
    );
    for (const s of input.symbols) {
      symbolStates.push({
        symbol: s,
        timeframe: input.timeframe,
        candidateCount: 0,
        lastEvaluatedIso: evaluationTimeUtc,
        sourceType: input.sourceType,
      });
    }
    const st: ForwardMonitorStatus = "no_candidates";
    return {
      ok: true,
      monitorRunId,
      status: st,
      accountId: input.accountId,
      symbols: input.symbols,
      timeframe: input.timeframe,
      strategyId: input.strategyId,
      parameterSetId: input.parameterSetId,
      evaluationTimeUtc,
      sourceType: input.sourceType,
      sourceName: input.sourceName,
      accountState,
      registryCompatibility: input.registryCompatibility,
      symbolStates,
      candidates: mergedCandidates,
      candidateCountsByReviewStatus: planSummary,
      events: buildEvents({ status: st, candidates: [], evaluationTimeUtc }),
      diagnostics,
      scannerRunReferences,
      reviewOnly: true,
      executionEnabled: false,
      mockOnly: true,
      simulated: true,
    };
  }

  let anyScannerFailed = false;
  let anyScannerWarning = false;

  for (const sim of scans) {
    scannerRunReferences.push(sim.run.runId);
    if (!sim.ok) {
      anyScannerFailed = true;
      pushDiag(diagnostics, "warning", "FORWARD_MONITOR_SCANNER_FAILED", `${sim.run.runId}: scanner simulation not ok.`);
    }
    if (sim.run.accountId !== input.accountId) {
      pushDiag(
        diagnostics,
        "error",
        "FORWARD_MONITOR_SCANNER_MISMATCH",
        `${sim.run.runId}: accountId ${sim.run.accountId} !== monitor ${input.accountId}`,
      );
      return {
        ok: false,
        monitorRunId,
        status: "failed" as const,
        accountId: input.accountId,
        symbols: input.symbols,
        timeframe: input.timeframe,
        strategyId: input.strategyId,
        parameterSetId: input.parameterSetId,
        evaluationTimeUtc,
        sourceType: input.sourceType,
        sourceName: input.sourceName,
        accountState,
        registryCompatibility: input.registryCompatibility,
        symbolStates,
        candidates: [],
        candidateCountsByReviewStatus: emptyPlanSummary(),
        events: [],
        diagnostics,
        scannerRunReferences,
        reviewOnly: true,
        executionEnabled: false,
        mockOnly: true,
        simulated: true,
      };
    }
    if (!symbolSet.has(sim.run.canonicalSymbol)) {
      pushDiag(
        diagnostics,
        "error",
        "FORWARD_MONITOR_SCANNER_MISMATCH",
        `${sim.run.runId}: symbol ${sim.run.canonicalSymbol} not in monitor symbols list`,
      );
      return {
        ok: false,
        monitorRunId,
        status: "failed" as const,
        accountId: input.accountId,
        symbols: input.symbols,
        timeframe: input.timeframe,
        strategyId: input.strategyId,
        parameterSetId: input.parameterSetId,
        evaluationTimeUtc,
        sourceType: input.sourceType,
        sourceName: input.sourceName,
        accountState,
        registryCompatibility: input.registryCompatibility,
        symbolStates,
        candidates: [],
        candidateCountsByReviewStatus: emptyPlanSummary(),
        events: [],
        diagnostics,
        scannerRunReferences,
        reviewOnly: true,
        executionEnabled: false,
        mockOnly: true,
        simulated: true,
      };
    }
    if (sim.diagnostics.some((d) => d.level === "warning")) {
      anyScannerWarning = true;
    }
    if (sim.status === "completed_with_warnings" || sim.accountGuardResult.warningReasons.length > 0) {
      anyScannerWarning = true;
    }

    symbolStates.push({
      symbol: sim.run.canonicalSymbol,
      timeframe: sim.run.timeframe,
      scannerRunId: sim.run.runId,
      candidateCount: sim.candidates.length,
      lastEvaluatedIso: sim.run.evaluatedAtIso,
      sourceType: input.sourceType,
      scannerResultStatus: sim.status,
    });

    for (const c of sim.candidates) {
      const row = candidateFromScannerRow(
        c,
        input.accountId,
        evaluationTimeUtc,
        input.strategyId,
        input.parameterSetId,
      );
      mergedCandidates.push(row);
      incPlanSummary(planSummary, row.reviewStatus);
    }
  }

  if (anyScannerFailed && mergedCandidates.length === 0) {
    const st: ForwardMonitorStatus = "failed";
    pushDiag(diagnostics, "error", "FORWARD_MONITOR_SCANNER_FAILED", "All scanner runs failed.");
    return {
      ok: false,
      monitorRunId,
      status: st,
      accountId: input.accountId,
      symbols: input.symbols,
      timeframe: input.timeframe,
      strategyId: input.strategyId,
      parameterSetId: input.parameterSetId,
      evaluationTimeUtc,
      sourceType: input.sourceType,
      sourceName: input.sourceName,
      accountState,
      registryCompatibility: input.registryCompatibility,
      symbolStates,
      candidates: [],
      candidateCountsByReviewStatus: emptyPlanSummary(),
      events: buildEvents({ status: st, candidates: [], evaluationTimeUtc }),
      diagnostics,
      scannerRunReferences,
      reviewOnly: true,
      executionEnabled: false,
      mockOnly: true,
      simulated: true,
    };
  }

  if (mergedCandidates.length === 0) {
    const st: ForwardMonitorStatus = "no_candidates";
    return {
      ok: true,
      monitorRunId,
      status: st,
      accountId: input.accountId,
      symbols: input.symbols,
      timeframe: input.timeframe,
      strategyId: input.strategyId,
      parameterSetId: input.parameterSetId,
      evaluationTimeUtc,
      sourceType: input.sourceType,
      sourceName: input.sourceName,
      accountState,
      registryCompatibility: input.registryCompatibility,
      symbolStates,
      candidates: mergedCandidates,
      candidateCountsByReviewStatus: planSummary,
      events: buildEvents({ status: st, candidates: [], evaluationTimeUtc }),
      diagnostics,
      scannerRunReferences,
      reviewOnly: true,
      executionEnabled: false,
      mockOnly: true,
      simulated: true,
    };
  }

  const hasAttention = mergedCandidates.some(
    (c) => c.reviewStatus === "TRADE_READY" || c.reviewStatus === "WAIT_CONFIRMATION",
  );
  let st: ForwardMonitorStatus = hasAttention ? "monitoring" : "completed_snapshot";
  if (anyScannerWarning || diagnostics.some((d) => d.level === "warning")) {
    st = "completed_with_warnings";
  }

  return {
    ok: true,
    monitorRunId,
    status: st,
    accountId: input.accountId,
    symbols: input.symbols,
    timeframe: input.timeframe,
    strategyId: input.strategyId,
    parameterSetId: input.parameterSetId,
    evaluationTimeUtc,
    sourceType: input.sourceType,
    sourceName: input.sourceName,
    accountState,
    registryCompatibility: input.registryCompatibility,
    symbolStates,
    candidates: mergedCandidates,
    candidateCountsByReviewStatus: planSummary,
    events: buildEvents({ status: st, candidates: mergedCandidates, evaluationTimeUtc }),
    diagnostics,
    scannerRunReferences,
    reviewOnly: true,
    executionEnabled: false,
    mockOnly: true,
    simulated: true,
  };
}
