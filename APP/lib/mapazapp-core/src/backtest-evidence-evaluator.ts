import { createDefaultBacktestEvidenceThresholdsForTests } from "./backtest-evidence-settings";
import { calculateBacktestSummary } from "./backtest-metrics";
import type { BacktestDatasetSplit, BacktestImportError, BacktestImportWarning, BacktestRun, BacktestSummary } from "./backtest-types";
import { importBacktestRunFromCsvText } from "./backtest-importer";
import { backtestEvidenceReasonMessage, backtestEvidenceReasonSeverity } from "./backtest-evidence-reasons";
import type {
  BacktestEvidenceApprovalProposal,
  BacktestEvidenceBundle,
  BacktestEvidenceCoverage,
  BacktestEvidenceReasonCode,
  BacktestEvidenceReasonRef,
  BacktestEvidenceResult,
  BacktestEvidenceRunResult,
  BacktestEvidenceSplitResult,
  BacktestEvidenceStatus,
  BacktestEvidenceThresholds,
  CreateBacktestEvidenceBundleFromCsvTextsParams,
  EvaluateBacktestEvidenceInput,
  ParameterSetAllowedUsage,
} from "./backtest-evidence-types";
import type { ParameterSetApprovalLevel, ParameterSetStatus } from "./strategy-registry-types";

function pushUniqueCode(codes: BacktestEvidenceReasonCode[], code: BacktestEvidenceReasonCode): void {
  if (!codes.includes(code)) codes.push(code);
}

function ref(
  code: BacktestEvidenceReasonCode,
  split?: BacktestDatasetSplit,
  runId?: string,
): BacktestEvidenceReasonRef {
  return {
    code,
    severity: backtestEvidenceReasonSeverity(code),
    message: backtestEvidenceReasonMessage(code),
    split,
    runId,
  };
}

export function groupBacktestRunsBySplit(runs: BacktestRun[]): Record<BacktestDatasetSplit, BacktestRun[]> {
  const empty: Record<BacktestDatasetSplit, BacktestRun[]> = {
    train: [],
    validation: [],
    forward: [],
    full: [],
    unknown: [],
  };
  for (const r of runs) {
    empty[r.datasetSplit].push(r);
  }
  return empty;
}

function runsForTrainLogic(runs: BacktestRun[]): BacktestRun[] {
  return runs.filter((r) => r.datasetSplit === "train" || r.datasetSplit === "full");
}

function runsForValidationLogic(runs: BacktestRun[]): BacktestRun[] {
  return runs.filter((r) => r.datasetSplit === "validation" || r.datasetSplit === "full");
}

function runsForForwardLogic(runs: BacktestRun[]): BacktestRun[] {
  return runs.filter((r) => r.datasetSplit === "forward" || r.datasetSplit === "full");
}

function latestRun(runs: BacktestRun[]): BacktestRun | null {
  if (runs.length === 0) return null;
  return [...runs].sort((a, b) => (a.importedAt < b.importedAt ? 1 : -1))[0]!;
}

function scoreRun(run: BacktestRun, criteria: BacktestEvidenceThresholds["bestRunCriteria"]): number {
  const s = run.summary;
  const pf = s.profitFactor === Number.POSITIVE_INFINITY ? 1e9 : s.profitFactor;
  if (criteria === "profitFactor") return pf * 1_000_000 + s.expectancyR;
  if (criteria === "expectancyR") return s.expectancyR * 1_000_000 + pf;
  return s.totalR * 1_000_000 + pf;
}

export function pickBestBacktestRunForEvidence(
  runs: BacktestRun[],
  criteria: BacktestEvidenceThresholds["bestRunCriteria"],
): BacktestRun | null {
  if (runs.length === 0) return null;
  let best = runs[0]!;
  let bestScore = scoreRun(best, criteria);
  for (let i = 1; i < runs.length; i++) {
    const r = runs[i]!;
    const sc = scoreRun(r, criteria);
    if (sc > bestScore) {
      best = r;
      bestScore = sc;
    }
  }
  return best;
}

function finitePf(pf: number): number {
  return pf === Number.POSITIVE_INFINITY ? 1000 : pf;
}

function evaluateNumericGates(
  summary: BacktestSummary,
  thresholds: BacktestEvidenceThresholds,
  metricFailureCode: BacktestEvidenceReasonCode,
): BacktestEvidenceReasonCode[] {
  const out: BacktestEvidenceReasonCode[] = [];
  if (summary.tradeCount < thresholds.minTradesPerSplit) {
    pushUniqueCode(out, "EVIDENCE_INSUFFICIENT_TRADES_IN_SPLIT");
    return out;
  }
  const pfOk = summary.profitFactor === Number.POSITIVE_INFINITY || summary.profitFactor >= thresholds.minProfitFactor;
  if (!pfOk) pushUniqueCode(out, metricFailureCode);
  if (summary.expectancyR < thresholds.minExpectancyR) pushUniqueCode(out, metricFailureCode);
  if (summary.maxDrawdownR > thresholds.maxDrawdownR) pushUniqueCode(out, metricFailureCode);
  if (summary.maxLosingStreak > thresholds.maxLosingStreak) pushUniqueCode(out, metricFailureCode);
  if (thresholds.minWinRate !== undefined && summary.winRate < thresholds.minWinRate) {
    pushUniqueCode(out, metricFailureCode);
  }
  return out;
}

function buildCoverage(runs: BacktestRun[]): BacktestEvidenceCoverage {
  const splits = new Set(runs.map((r) => r.datasetSplit));
  return {
    hasTrain: splits.has("train") || splits.has("full"),
    hasValidation: splits.has("validation") || splits.has("full"),
    hasForward: splits.has("forward") || splits.has("full"),
    hasFull: splits.has("full"),
    hasUnknown: splits.has("unknown"),
  };
}

function consistencyCodes(runs: BacktestRun[], thresholds: BacktestEvidenceThresholds): BacktestEvidenceReasonCode[] {
  const codes: BacktestEvidenceReasonCode[] = [];
  if (runs.length === 0) return codes;
  const s0 = runs[0]!;
  for (const r of runs) {
    if (thresholds.requireSameStrategyId && r.strategyId !== s0.strategyId) {
      pushUniqueCode(codes, "EVIDENCE_INCONSISTENT_STRATEGY_ID");
    }
    if (thresholds.requireSameParameterSet && r.parameterSetId !== s0.parameterSetId) {
      pushUniqueCode(codes, "EVIDENCE_INCONSISTENT_PARAMETER_SET_ID");
    }
    if (thresholds.requireSameSymbol && r.canonicalSymbol !== s0.canonicalSymbol) {
      pushUniqueCode(codes, "EVIDENCE_INCONSISTENT_CANONICAL_SYMBOL");
    }
  }
  return codes;
}

function registryMismatchCodes(input: EvaluateBacktestEvidenceInput, primary: BacktestRun): BacktestEvidenceReasonCode[] {
  const codes: BacktestEvidenceReasonCode[] = [];
  const reg = input.registryCompatibility;
  if (!reg?.parameterSet) return codes;
  if (reg.parameterSet.parameterSetId !== primary.parameterSetId) {
    pushUniqueCode(codes, "EVIDENCE_REGISTRY_PARAMETER_SET_MISMATCH");
  }
  if (reg.parameterSet.canonicalSymbol !== primary.canonicalSymbol) {
    pushUniqueCode(codes, "EVIDENCE_REGISTRY_SYMBOL_MISMATCH");
  }
  return codes;
}

function dedupeRefs(refs: BacktestEvidenceReasonRef[]): BacktestEvidenceReasonRef[] {
  const seen = new Set<string>();
  const out: BacktestEvidenceReasonRef[] = [];
  for (const r of refs) {
    const k = `${r.code}:${r.split ?? ""}:${r.runId ?? ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function partitionEvidenceRefs(all: BacktestEvidenceReasonRef[]): {
  blockingReasons: BacktestEvidenceReasonRef[];
  warningReasons: BacktestEvidenceReasonRef[];
} {
  const blockingReasons = dedupeRefs(all.filter((r) => r.severity === "blocking"));
  const blockingCodes = new Set(blockingReasons.map((b) => b.code));
  const warningReasons = dedupeRefs(
    all.filter((r) => r.severity === "warning" && !blockingCodes.has(r.code)),
  );
  return { blockingReasons, warningReasons };
}

function totalTradeCount(runs: BacktestRun[]): number {
  return runs.reduce((acc, r) => acc + r.summary.tradeCount, 0);
}

function buildRunResults(runs: BacktestRun[], thresholds: BacktestEvidenceThresholds): BacktestEvidenceRunResult[] {
  return runs.map((run) => {
    const metricFail = evaluateNumericGates(run.summary, thresholds, "EVIDENCE_VALIDATION_METRICS_FAILED");
    const splitSpecific =
      run.datasetSplit === "train"
        ? evaluateNumericGates(run.summary, thresholds, "EVIDENCE_TRAIN_METRICS_FAILED")
        : run.datasetSplit === "forward"
          ? evaluateNumericGates(run.summary, thresholds, "EVIDENCE_FORWARD_METRICS_FAILED")
          : evaluateNumericGates(run.summary, thresholds, "EVIDENCE_VALIDATION_METRICS_FAILED");
    const codes = run.datasetSplit === "train" ? splitSpecific : run.datasetSplit === "forward" ? splitSpecific : metricFail;
    const passed = codes.length === 0;
    const blocking = codes.filter((c) => c === "EVIDENCE_INSUFFICIENT_TRADES_IN_SPLIT" || c.includes("METRICS_FAILED"));
    return {
      runId: run.runId,
      datasetSplit: run.datasetSplit,
      importedAt: run.importedAt,
      tradeCount: run.summary.tradeCount,
      passedNumericGates: passed,
      blockingReasonCodes: blocking.length ? blocking : codes,
      warningReasonCodes: [],
    };
  });
}

function buildLogicalSplitResult(
  label: BacktestDatasetSplit,
  candidateRuns: BacktestRun[],
  thresholds: BacktestEvidenceThresholds,
  metricFailureCode: BacktestEvidenceReasonCode,
): BacktestEvidenceSplitResult {
  const latest = latestRun(candidateRuns);
  const best = pickBestBacktestRunForEvidence(candidateRuns, thresholds.bestRunCriteria);
  const aggregateTradeCount = candidateRuns.reduce((a, r) => a + r.summary.tradeCount, 0);

  const blocking: BacktestEvidenceReasonCode[] = [];
  const warnings: BacktestEvidenceReasonCode[] = [];

  if (candidateRuns.length > 0 && candidateRuns.length < thresholds.minRunsPerSplit) {
    pushUniqueCode(blocking, "EVIDENCE_INSUFFICIENT_RUNS_IN_SPLIT");
  }

  let passedNumeric = false;
  if (best) {
    const ng = evaluateNumericGates(best.summary, thresholds, metricFailureCode);
    if (ng.length === 0) passedNumeric = true;
    else ng.forEach((c) => pushUniqueCode(blocking, c));
  } else {
    passedNumeric = false;
  }

  return {
    split: label,
    runIds: candidateRuns.map((r) => r.runId),
    latestRunId: latest?.runId ?? null,
    bestRunId: best?.runId ?? null,
    aggregateTradeCount,
    passedNumericGates: candidateRuns.length >= thresholds.minRunsPerSplit && passedNumeric,
    blockingReasonCodes: blocking,
    warningReasonCodes: warnings,
  };
}

function deriveRequiredSplitPresence(
  thresholds: BacktestEvidenceThresholds,
  explicit: BacktestDatasetSplit[] | undefined,
): Set<BacktestDatasetSplit> {
  const s = new Set<BacktestDatasetSplit>();
  if (thresholds.requireTrain) s.add("train");
  if (thresholds.requireValidation) s.add("validation");
  /** Forward requirement for trade-review tier is handled in status logic (`needs_more_forward`), not as blanket structural missing. */
  for (const x of explicit ?? []) s.add(x);
  return s;
}

function onlyUnknownEvidence(runs: BacktestRun[]): boolean {
  return runs.length > 0 && runs.every((r) => r.datasetSplit === "unknown");
}

/**
 * Pure multi-run evidence evaluation — **does not** mutate the strategy registry or claim profitability.
 */
export function evaluateBacktestEvidence(input: EvaluateBacktestEvidenceInput): BacktestEvidenceResult {
  const thresholds = input.thresholds;
  const evidenceSource = input.evidenceSource ?? "manual_run_array";
  const runs = input.runs;

  const collected: BacktestEvidenceReasonRef[] = [];

  const pushBlock = (code: BacktestEvidenceReasonCode, split?: BacktestDatasetSplit, runId?: string) => {
    collected.push(ref(code, split, runId));
  };
  const pushWarn = (code: BacktestEvidenceReasonCode, split?: BacktestDatasetSplit, runId?: string) => {
    collected.push(ref(code, split, runId));
  };

  if (runs.length === 0) {
    pushBlock("EVIDENCE_NO_RUNS");
    const { blockingReasons, warningReasons } = partitionEvidenceRefs(collected);
    return {
      status: "no_evidence",
      approvedForRecommendation: false,
      recommendedParameterSetStatus: "unchanged",
      recommendedApprovalLevel: "none",
      blockingReasons,
      warningReasons,
      runResults: [],
      splitResults: [],
      summary: backtestEvidenceReasonMessage("EVIDENCE_NO_RUNS"),
      metricSnapshot: calculateBacktestSummary([]),
      coverage: buildCoverage([]),
      manualReviewRequired: true,
      registryMutationAllowed: false,
      evidenceSource,
    };
  }

  const coverage = buildCoverage(runs);
  if (coverage.hasUnknown) pushWarn("EVIDENCE_UNKNOWN_SPLIT_PRESENT");

  for (const c of consistencyCodes(runs, thresholds)) pushBlock(c);

  const primary = runs[0]!;
  for (const c of registryMismatchCodes(input, primary)) pushBlock(c);

  if (onlyUnknownEvidence(runs)) pushBlock("EVIDENCE_VALIDATION_SPLIT_MISSING");

  const requiredPresence = deriveRequiredSplitPresence(thresholds, input.requiredSplits);

  const trainRuns = runsForTrainLogic(runs);
  const validationRuns = runsForValidationLogic(runs);
  const forwardRuns = runsForForwardLogic(runs);

  if (requiredPresence.has("train") && trainRuns.length === 0) pushBlock("EVIDENCE_TRAIN_SPLIT_MISSING");
  if (requiredPresence.has("validation") && validationRuns.length === 0) pushBlock("EVIDENCE_VALIDATION_SPLIT_MISSING");
  if (input.requiredSplits?.includes("forward") && forwardRuns.length === 0) pushBlock("EVIDENCE_FORWARD_SPLIT_MISSING");

  const totalTrades = totalTradeCount(runs);
  if (totalTrades < thresholds.minTotalTrades) pushBlock("EVIDENCE_INSUFFICIENT_TOTAL_TRADES");

  const bySplit = groupBacktestRunsBySplit(runs);
  const fullBest = pickBestBacktestRunForEvidence(bySplit.full, thresholds.bestRunCriteria);
  const splitResults: BacktestEvidenceSplitResult[] = [
    buildLogicalSplitResult("train", trainRuns, thresholds, "EVIDENCE_TRAIN_METRICS_FAILED"),
    buildLogicalSplitResult("validation", validationRuns, thresholds, "EVIDENCE_VALIDATION_METRICS_FAILED"),
    buildLogicalSplitResult("forward", forwardRuns, thresholds, "EVIDENCE_FORWARD_METRICS_FAILED"),
    {
      split: "full",
      runIds: bySplit.full.map((r) => r.runId),
      latestRunId: latestRun(bySplit.full)?.runId ?? null,
      bestRunId: fullBest?.runId ?? null,
      aggregateTradeCount: bySplit.full.reduce((a, r) => a + r.summary.tradeCount, 0),
      passedNumericGates:
        bySplit.full.length >= thresholds.minRunsPerSplit &&
        fullBest !== null &&
        evaluateNumericGates(fullBest.summary, thresholds, "EVIDENCE_VALIDATION_METRICS_FAILED").length === 0,
      blockingReasonCodes: [],
      warningReasonCodes: [],
    },
    {
      split: "unknown",
      runIds: bySplit.unknown.map((r) => r.runId),
      latestRunId: latestRun(bySplit.unknown)?.runId ?? null,
      bestRunId: pickBestBacktestRunForEvidence(bySplit.unknown, thresholds.bestRunCriteria)?.runId ?? null,
      aggregateTradeCount: bySplit.unknown.reduce((a, r) => a + r.summary.tradeCount, 0),
      passedNumericGates: false,
      blockingReasonCodes: [],
      warningReasonCodes: bySplit.unknown.length ? ["EVIDENCE_UNKNOWN_SPLIT_PRESENT"] : [],
    },
  ];

  const varianceThreshold = thresholds.maxMetricVariance;
  let varianceViolated = false;
  if (varianceThreshold !== undefined && trainRuns.length && validationRuns.length) {
    const tBest = pickBestBacktestRunForEvidence(trainRuns, thresholds.bestRunCriteria);
    const vBest = pickBestBacktestRunForEvidence(validationRuns, thresholds.bestRunCriteria);
    if (tBest && vBest) {
      const d = Math.abs(finitePf(tBest.summary.profitFactor) - finitePf(vBest.summary.profitFactor));
      if (d > varianceThreshold) {
        varianceViolated = true;
        pushBlock("EVIDENCE_HIGH_METRIC_VARIANCE");
      }
    }
  }

  const runResults = buildRunResults(runs, thresholds);

  const validationSplitResult = splitResults.find((s) => s.split === "validation")!;
  const forwardSplitResult = splitResults.find((s) => s.split === "forward")!;
  const trainSplitResult = splitResults.find((s) => s.split === "train")!;

  const validationPassed =
    validationRuns.length >= thresholds.minRunsPerSplit && validationSplitResult.passedNumericGates;
  const forwardPassed = forwardRuns.length >= thresholds.minRunsPerSplit && forwardSplitResult.passedNumericGates;
  const trainPassed =
    !thresholds.requireTrain ||
    (trainRuns.length >= thresholds.minRunsPerSplit && trainSplitResult.passedNumericGates);

  const codeSet = new Set(collected.map((r) => r.code));
  const hasInconsistent =
    codeSet.has("EVIDENCE_INCONSISTENT_STRATEGY_ID") ||
    codeSet.has("EVIDENCE_INCONSISTENT_PARAMETER_SET_ID") ||
    codeSet.has("EVIDENCE_INCONSISTENT_CANONICAL_SYMBOL");

  const structuralInsufficient =
    onlyUnknownEvidence(runs) ||
    (thresholds.requireValidation && validationRuns.length === 0) ||
    (thresholds.requireTrain && trainRuns.length === 0) ||
    codeSet.has("EVIDENCE_INSUFFICIENT_TOTAL_TRADES") ||
    codeSet.has("EVIDENCE_TRAIN_SPLIT_MISSING") ||
    codeSet.has("EVIDENCE_VALIDATION_SPLIT_MISSING") ||
    (input.requiredSplits?.includes("forward") === true && codeSet.has("EVIDENCE_FORWARD_SPLIT_MISSING"));

  function appendMetricFailures(sr: BacktestEvidenceSplitResult, splitLabel: BacktestDatasetSplit): void {
    for (const c of sr.blockingReasonCodes) {
      pushBlock(c, splitLabel);
    }
  }

  let status: BacktestEvidenceStatus = "needs_manual_review";
  let approvedForRecommendation = false;

  if (hasInconsistent) {
    status = "inconsistent_evidence";
  } else if (structuralInsufficient) {
    status = "insufficient_evidence";
  } else if (thresholds.requireTrain && trainRuns.length > 0 && !trainPassed) {
    appendMetricFailures(trainSplitResult, "train");
    status = "rejected";
  } else if (validationRuns.length > 0 && !validationPassed) {
    appendMetricFailures(validationSplitResult, "validation");
    status = "rejected";
  } else if (forwardRuns.length > 0 && !forwardPassed) {
    appendMetricFailures(forwardSplitResult, "forward");
    status = "rejected";
  } else if (validationPassed && forwardRuns.length > 0 && forwardPassed) {
    status = "candidate_for_trade_review";
    approvedForRecommendation = true;
  } else if (validationPassed && thresholds.requireForwardForTradeReview && forwardRuns.length === 0) {
    status = "needs_more_forward";
    pushWarn("EVIDENCE_FORWARD_SPLIT_MISSING");
  } else if (validationPassed && forwardRuns.length === 0 && !thresholds.requireForwardForTradeReview) {
    status = "candidate_for_alerts";
    approvedForRecommendation = true;
  } else if (!thresholds.requireValidation && trainPassed && trainRuns.length > 0) {
    status = "candidate_for_demo";
    approvedForRecommendation = true;
  } else {
    status = "needs_manual_review";
  }

  const registryConflict =
    codeSet.has("EVIDENCE_REGISTRY_PARAMETER_SET_MISMATCH") || codeSet.has("EVIDENCE_REGISTRY_SYMBOL_MISMATCH");

  if (registryConflict || varianceViolated) {
    if (status === "candidate_for_alerts" || status === "candidate_for_trade_review") {
      status = "needs_manual_review";
      approvedForRecommendation = false;
    }
    pushWarn("EVIDENCE_MANUAL_REVIEW_TRIGGER");
  }

  const metricSnapshot = calculateBacktestSummary(runs.flatMap((r) => r.trades));

  const recommended = mapStatusToRegistryRecommendation(status);
  const approvalLevel = mapStatusToApprovalLevel(status);

  const { blockingReasons, warningReasons } = partitionEvidenceRefs(collected);

  const summaryLines: string[] = [];
  summaryLines.push(`Evidence status: ${status}.`);
  summaryLines.push("Advisory-only evaluation — not profitability proof and not a registry write.");
  if (blockingReasons.length) summaryLines.push(`Blocking: ${blockingReasons.map((b) => b.code).join(", ")}.`);
  if (warningReasons.length) summaryLines.push(`Warnings: ${warningReasons.map((w) => w.code).join(", ")}.`);

  return {
    status,
    approvedForRecommendation,
    recommendedParameterSetStatus: recommended,
    recommendedApprovalLevel: approvalLevel,
    blockingReasons,
    warningReasons,
    runResults,
    splitResults,
    summary: summaryLines.join(" "),
    metricSnapshot,
    coverage,
    manualReviewRequired: true,
    registryMutationAllowed: false,
    evidenceSource,
  };
}

function mapStatusToRegistryRecommendation(status: BacktestEvidenceStatus): ParameterSetStatus | "unchanged" {
  switch (status) {
    case "candidate_for_demo":
      return "approved_for_demo";
    case "candidate_for_alerts":
      return "approved_for_alerts";
    case "candidate_for_trade_review":
      return "approved_for_trade_review";
    default:
      return "unchanged";
  }
}

function mapStatusToApprovalLevel(status: BacktestEvidenceStatus): ParameterSetApprovalLevel {
  switch (status) {
    case "candidate_for_demo":
      return "demo";
    case "candidate_for_alerts":
      return "alerts_only";
    case "candidate_for_trade_review":
      return "trade_review";
    default:
      return "none";
  }
}

export function buildBacktestEvidenceApprovalProposal(
  evaluation: BacktestEvidenceResult,
  meta: { parameterSetId: string; strategyId: string; canonicalSymbol: string; brokerSymbol?: string },
  input: EvaluateBacktestEvidenceInput,
): BacktestEvidenceApprovalProposal {
  const usages: ParameterSetAllowedUsage[] = [];
  usages.push("observe", "backtest");
  if (evaluation.status === "candidate_for_alerts" || evaluation.status === "candidate_for_trade_review") {
    usages.push("alert");
  }
  if (evaluation.status === "candidate_for_trade_review") {
    usages.push("trade_review", "validation");
  }

  const actions: string[] = [
    "Confirm splits and CSV sources manually (Strategy Tester exports stay local).",
    "Reconcile metrics with independent checks before any registry update.",
  ];
  if (evaluation.manualReviewRequired) actions.push("Explicit human approval is required — canAutoApply is false.");

  const prev = input.currentParameterSetStatus ?? input.registryCompatibility?.parameterSet?.status ?? "unknown";

  return {
    parameterSetId: meta.parameterSetId,
    strategyId: meta.strategyId,
    canonicalSymbol: meta.canonicalSymbol,
    brokerSymbol: meta.brokerSymbol,
    proposalStatus: evaluation.status,
    recommendedParameterSetStatus: evaluation.recommendedParameterSetStatus,
    recommendedApprovalLevel: evaluation.recommendedApprovalLevel,
    allowedUsages: usages,
    requiredHumanActions: actions,
    blockingReasons: evaluation.blockingReasons,
    warningReasons: evaluation.warningReasons,
    evidenceSummary: evaluation.summary,
    registryPatchPreview:
      evaluation.recommendedParameterSetStatus === "unchanged"
        ? undefined
        : {
            parameterSetId: meta.parameterSetId,
            previousStatus: prev,
            suggestedStatus: evaluation.recommendedParameterSetStatus,
            notes: "Preview only — humans apply registry updates in a future controlled workflow.",
          },
    manualReviewRequired: true,
    canAutoApply: false,
  };
}

export function evaluateBacktestEvidenceWithProposal(
  input: EvaluateBacktestEvidenceInput,
): { evaluation: BacktestEvidenceResult; proposal: BacktestEvidenceApprovalProposal } {
  const evaluation = evaluateBacktestEvidence(input);
  const primary = input.runs[0];
  const proposal = buildBacktestEvidenceApprovalProposal(
    evaluation,
    primary
      ? {
          parameterSetId: primary.parameterSetId,
          strategyId: primary.strategyId,
          canonicalSymbol: primary.canonicalSymbol,
          brokerSymbol: primary.brokerSymbol,
        }
      : {
          parameterSetId: "UNKNOWN_PARAMETER_SET",
          strategyId: "UNKNOWN_STRATEGY",
          canonicalSymbol: "UNKNOWN",
        },
    input,
  );
  return { evaluation, proposal };
}

export function createBacktestEvidenceBundleFromCsvTexts(
  params: CreateBacktestEvidenceBundleFromCsvTextsParams,
): BacktestEvidenceBundle {
  const importErrors: BacktestImportError[] = [];
  const importWarnings: BacktestImportWarning[] = [];
  const runs: BacktestRun[] = [];
  const { commonOptions, csvFiles, thresholds, registryContext } = params;
  const th = thresholds ?? createDefaultBacktestEvidenceThresholdsForTests();

  for (const file of csvFiles) {
    const { importResult, run } = importBacktestRunFromCsvText(file.csvText, {
      strategyId: commonOptions.strategyId,
      parameterSetId: commonOptions.parameterSetId,
      canonicalSymbol: commonOptions.canonicalSymbol,
      brokerSymbol: commonOptions.brokerSymbol,
      accountId: commonOptions.accountId,
      datasetSplit: file.datasetSplit,
      sourceType: file.sourceType,
      rawFileName: file.rawFileName ?? file.fileName,
    });
    importErrors.push(...importResult.errors);
    importWarnings.push(...importResult.warnings);
    if (run) runs.push(run);
  }

  const input: EvaluateBacktestEvidenceInput = {
    runs,
    thresholds: th,
    registryCompatibility: registryContext?.registryCompatibility,
    currentParameterSetStatus: registryContext?.currentParameterSetStatus,
    evidenceSource: "csv_text_import",
  };

  const { evaluation, proposal } = evaluateBacktestEvidenceWithProposal(input);
  return {
    runs,
    importErrors,
    importWarnings,
    evaluation,
    proposal,
  };
}
