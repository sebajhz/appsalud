import { atrAtIndex, calculateAtrSeries } from "./atr";
import { accountGuardResultToTradePlanAccountGuardInput, evaluateAccountGuard } from "./account-guard-evaluator";
import { createDefaultAccountGuardSettingsForTests } from "./account-guard-settings";
import { detectConfirmation } from "./confirmation-detector";
import { detectRetest } from "./retest-detector";
import { computeStrategyScore } from "./strategy-score";
import { detectIfvgZoneCandidates } from "./strategy-detection";
import { evaluateParameterSetCompatibility } from "./strategy-registry-evaluator";
import { createDefaultStrategyRegistryEvaluationSettings } from "./strategy-registry-settings";
import { evaluateTradeReviewPlan } from "./trade-plan-evaluator";
import type { SweepStatus } from "./liquidity-sweep";
import type {
  ScannerCandidateResult,
  ScannerDiagnostic,
  ScannerRunId,
  ScannerSimulationInput,
  ScannerSimulationResult,
  ScannerSimulationRun,
} from "./scanner-types";
import { scannerErrorMessage } from "./scanner-reasons";

function newRunId(): ScannerRunId {
  return `scan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function pushDiag(list: ScannerDiagnostic[], d: ScannerDiagnostic): void {
  list.push(d);
}

function validateInput(input: ScannerSimulationInput): ScannerDiagnostic[] {
  const out: ScannerDiagnostic[] = [];
  if (!input.accountGuardInput) {
    pushDiag(out, {
      level: "error",
      code: "SCANNER_MISSING_ACCOUNT_GUARD_INPUT",
      message: scannerErrorMessage("SCANNER_MISSING_ACCOUNT_GUARD_INPUT"),
    });
  }
  if (!input.strategyRegistry) {
    pushDiag(out, {
      level: "error",
      code: "SCANNER_MISSING_STRATEGY_REGISTRY",
      message: scannerErrorMessage("SCANNER_MISSING_STRATEGY_REGISTRY"),
    });
  }
  if (!input.symbolProfile) {
    pushDiag(out, {
      level: "error",
      code: "SCANNER_MISSING_SYMBOL_PROFILE",
      message: scannerErrorMessage("SCANNER_MISSING_SYMBOL_PROFILE"),
    });
  }
  if (!input.candles?.length) {
    pushDiag(out, {
      level: "error",
      code: "SCANNER_EMPTY_CANDLES",
      message: scannerErrorMessage("SCANNER_EMPTY_CANDLES"),
    });
  }
  if (!input.accountId || !input.strategyId || !input.parameterSetId || !input.canonicalSymbol) {
    pushDiag(out, {
      level: "error",
      code: "SCANNER_INVALID_INPUT",
      message: "accountId, strategyId, parameterSetId, and canonicalSymbol are required.",
    });
  }
  return out;
}

function syntheticSweepGeometry(
  z: import("./zone-candidate").ZoneCandidate,
  tick: number,
): { sweepLow?: number; sweepHigh?: number; sweepStatus: SweepStatus } {
  const st = z.sweepStatus ?? "NO_SWEEP";
  if (z.direction === "BUY") {
    return {
      sweepStatus: st,
      sweepLow: Math.min(z.invalidationPrice, z.midpoint) - tick * 4,
    };
  }
  return {
    sweepStatus: st,
    sweepHigh: Math.max(z.invalidationPrice, z.midpoint) + tick * 4,
  };
}

/**
 * Pure in-memory IFVG scanner simulation: detection → registry → account guard → trade review per candidate.
 * No I/O, no MT5, no persistence, no execution.
 */
export function runScannerSimulation(input: ScannerSimulationInput): ScannerSimulationResult {
  const diagnostics: ScannerDiagnostic[] = [];
  const validationErrors = validateInput(input);
  diagnostics.push(...validationErrors);
  const hasErr = validationErrors.some((d) => d.level === "error");

  const evalMs = input.currentEvaluationTime ? Date.parse(input.currentEvaluationTime) : Date.now();
  const evalIso = Number.isFinite(evalMs) ? new Date(evalMs).toISOString() : new Date().toISOString();

  const run: ScannerSimulationRun = {
    runId: input.runId ?? newRunId(),
    accountId: input.accountId,
    strategyId: input.strategyId,
    parameterSetId: input.parameterSetId,
    canonicalSymbol: input.canonicalSymbol,
    brokerSymbol: input.brokerSymbol ?? input.symbolProfile.brokerSymbol,
    timeframe: input.timeframe,
    sourceType: input.sourceType,
    sourceName: input.sourceName,
    evaluatedAtIso: evalIso,
  };

  if (hasErr) {
    return {
      ok: false,
      run,
      status: "failed",
      diagnostics,
      detection: null,
      accountGuardResult: {
        accountId: input.accountId,
        status: "INSUFFICIENT_ACCOUNT_DATA",
        allowTradeReview: false,
        blockingReasons: [],
        warningReasons: [],
        simpleSummary: "Scanner validation failed.",
        technicalSummary: "SCANNER_INVALID_INPUT",
        metrics: null,
      },
      registryCompatibility: {
        compatible: false,
        allowObserve: false,
        allowAlert: false,
        allowTradeReview: false,
        status: "unknown",
        approvalLevel: "none",
        blockingReasons: ["PARAMETER_SET_NOT_FOUND"],
        warningReasons: [],
        parameterSet: null,
        strategy: null,
        simpleSummary: "Not evaluated — scanner input invalid.",
        technicalSummary: "SKIPPED",
      },
      candidates: [],
      reviewOnly: true,
      executionEnabled: false,
      mockOnly: true,
      simulatedScanner: true,
    };
  }

  const registryEval =
    input.strategyRegistryEvaluationSettings ?? createDefaultStrategyRegistryEvaluationSettings();
  const registryCompatibility = evaluateParameterSetCompatibility(
    {
      strategyRegistry: input.strategyRegistry,
      strategyId: input.strategyId,
      parameterSetId: input.parameterSetId,
      canonicalSymbol: input.canonicalSymbol,
      brokerSymbol: input.brokerSymbol ?? input.symbolProfile.brokerSymbol,
      accountId: input.accountId,
      requestedUsage: "trade_review",
    },
    registryEval,
  );

  for (const w of registryCompatibility.warningReasons) {
    pushDiag(diagnostics, {
      level: "warning",
      code: "SCANNER_REGISTRY_WARNING",
      message: String(w),
    });
  }

  const guardInputMerged = {
    ...input.accountGuardInput,
    accountId: input.accountId,
    approvedParameterSetForAccount: registryCompatibility.allowTradeReview,
  };

  const accountGuardSettings = input.accountGuardSettings ?? createDefaultAccountGuardSettingsForTests();
  const accountGuardResult =
    input.accountGuardResult ?? evaluateAccountGuard(guardInputMerged, accountGuardSettings);

  for (const w of accountGuardResult.warningReasons) {
    pushDiag(diagnostics, {
      level: "warning",
      code: "SCANNER_ACCOUNT_GUARD_WARNING",
      message: w.messageSimple,
    });
  }

  const tradePlanGuard = accountGuardResultToTradePlanAccountGuardInput(guardInputMerged, accountGuardResult);

  const nowMs = Number.isFinite(evalMs) ? evalMs : Date.now();
  const detection = detectIfvgZoneCandidates({
    candles: input.candles,
    symbolProfile: input.symbolProfile,
    settings: input.strategySettings,
    strategyId: input.strategyId,
    parameterSetId: input.parameterSetId,
    canonicalSymbol: input.canonicalSymbol,
    brokerSymbol: input.brokerSymbol ?? input.symbolProfile.brokerSymbol,
    nowMs,
  });

  for (const w of detection.assumptionsWarnings) {
    pushDiag(diagnostics, {
      level: "warning",
      code: "SCANNER_ASSUMPTION_WARNING",
      message: w,
    });
  }
  for (const w of detection.pipelineWarnings) {
    pushDiag(diagnostics, {
      level: "warning",
      code: "SCANNER_PIPELINE_WARNING",
      message: w,
    });
  }

  const atrSeries = calculateAtrSeries(input.candles, input.strategySettings.atrPeriod);
  const lastIdx = input.candles.length - 1;
  const last = input.candles[lastIdx]!;
  const prev = lastIdx > 0 ? input.candles[lastIdx - 1] : undefined;
  const atrLast = atrAtIndex(atrSeries, lastIdx);

  const candidates: ScannerCandidateResult[] = [];

  for (const z of detection.candidates) {
    const candDiag: ScannerDiagnostic[] = [];
    const retest = detectRetest(
      last,
      z.zoneLow,
      z.zoneHigh,
      z.midpoint,
      z.direction,
      input.strategySettings.zone.retestMode,
    );
    const confirmation = detectConfirmation(
      last,
      prev,
      z.direction,
      z.midpoint,
      atrLast,
      input.strategySettings.confirmation,
    );

    const sweepStatus: SweepStatus = z.sweepStatus ?? "NO_SWEEP";
    const score = computeStrategyScore({
      contextAlign01: 0.72,
      sweepStatus,
      displacement01: detection.diagnostics.displacementFound ? 0.72 : 0.45,
      ifvg01: 0.75,
      retest01: retest.retested ? 0.82 : 0.22,
      confirmation01: confirmation.confirmed ? 0.85 : 0.22,
      riskSpread01: 0.78,
      hardGates: {
        hasSymbolProfile: true,
        hasApprovedParameterSet: registryCompatibility.allowTradeReview,
        tradingAllowed: guardInputMerged.tradingAllowed !== false,
        operationalAllowsTrade: accountGuardResult.allowTradeReview,
        liquidityAndSessionOk: true,
      },
    });

    const sweep = syntheticSweepGeometry(z, input.symbolProfile.tickSize);

    const tradeReviewEvaluation = evaluateTradeReviewPlan({
      zoneCandidate: z,
      symbolProfile: input.symbolProfile,
      tradePlanSettings: input.tradePlanSettings,
      accountGuard: tradePlanGuard,
      retestResult: retest,
      confirmationResult: confirmation,
      score: { scoreResult: score },
      currentPrice: last.close,
      confirmationClose: confirmation.confirmed ? last.close : null,
      confirmationAtr: atrLast,
      spreadPrice: input.symbolProfile.spreadPrice,
      sweep,
      evaluationTimeIso: evalIso,
      accountId: input.accountId,
      strategyId: input.strategyId,
      parameterSetId: input.parameterSetId,
      registryCompatibility,
    });

    candidates.push({
      zoneCandidate: z,
      strategyScore: score,
      accountGuardResult,
      registryCompatibility,
      tradeReviewEvaluation,
      diagnostics: candDiag,
    });
  }

  let status: ScannerSimulationResult["status"];
  if (candidates.length === 0) {
    status = "no_candidates";
  } else {
    const warn = diagnostics.some((d) => d.level === "warning");
    status = warn || accountGuardResult.warningReasons.length > 0 ? "completed_with_warnings" : "completed";
  }

  return {
    ok: true,
    run,
    status,
    diagnostics,
    detection,
    accountGuardResult,
    registryCompatibility,
    candidates,
    reviewOnly: true,
    executionEnabled: false,
    mockOnly: true,
    simulatedScanner: true,
  };
}
