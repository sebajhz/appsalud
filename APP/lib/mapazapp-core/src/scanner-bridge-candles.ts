import type { AccountId, CanonicalSymbol, ParameterSetId, StrategyId } from "./ids";
import type { BridgeCandleRow, BridgeMarketSnapshotRow } from "./bridge-types";
import type { BridgeImportError, BridgeImportWarning } from "./bridge-import-result";
import { parseBridgeCandlesCsv } from "./bridge-parse-csv";
import { deriveSymbolMarketSpecFromBridgeMarketSnapshot } from "./bridge-symbol-profile";
import type { SymbolMarketSpec } from "./symbol-profile";
import type { IfvgStrategySettings } from "./strategy-settings";
import type { ParameterSetCompatibilityResult, ParameterSetRegistry } from "./strategy-registry-types";
import type { AccountGuardInput } from "./account-guard-types";
import type { TradePlanEvaluationSettings } from "./trade-plan-settings";
import type {
  ScannerDiagnostic,
  ScannerSimulationResult,
  ScannerTimeframe,
  ScannerSourceType,
  ScannerSimulationRun,
} from "./scanner-types";
import { runScannerSimulation } from "./scanner-simulation";
import type { ScannerSimulationInput } from "./scanner-types";
import { evaluateAccountGuard } from "./account-guard-evaluator";
import { createDefaultAccountGuardSettingsForTests } from "./account-guard-settings";
import { evaluateParameterSetCompatibility } from "./strategy-registry-evaluator";
import { createDefaultStrategyRegistryEvaluationSettings } from "./strategy-registry-settings";

/** OHLC candle derived from one BridgeEA candles CSV row (in-memory only). */
export function bridgeCandleRowToCandle(row: BridgeCandleRow): import("./candle").Candle {
  const t = Date.parse(row.candleTimeUtc);
  return {
    time: Number.isFinite(t) ? t : 0,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    tickVolume: row.tickVolume,
    spreadPoints: row.spreadPoints,
    isClosed: row.isClosed,
  };
}

export interface RunScannerSimulationFromBridgeCandlesCsvInput {
  csvText: string;
  symbolProfile: SymbolMarketSpec | null;
  marketSnapshotRow?: BridgeMarketSnapshotRow | null;
  accountId: AccountId;
  strategyId: StrategyId;
  parameterSetId: ParameterSetId;
  canonicalSymbol: CanonicalSymbol;
  brokerSymbol?: string;
  timeframe: ScannerTimeframe;
  strategySettings: IfvgStrategySettings;
  accountGuardInput: AccountGuardInput;
  tradePlanSettings: TradePlanEvaluationSettings;
  strategyRegistry: ParameterSetRegistry;
  sourceName?: string;
  currentEvaluationTime?: string;
}

export type BridgeScannerSimulationResult = ScannerSimulationResult & {
  bridgeImportOk: boolean;
  bridgeErrors: BridgeImportError[];
  bridgeWarnings: BridgeImportWarning[];
};

function newRunId(): string {
  return `scan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function bridgeImportDiagnostics(errors: BridgeImportError[], warnings: BridgeImportWarning[]): ScannerDiagnostic[] {
  const o: ScannerDiagnostic[] = [];
  for (const e of errors) {
    o.push({ level: "error", code: e.code, message: e.message });
  }
  for (const w of warnings) {
    o.push({ level: "warning", code: w.code, message: w.message });
  }
  return o;
}

function buildRunMeta(
  input: RunScannerSimulationFromBridgeCandlesCsvInput,
  runId: string,
  evalIso: string,
): ScannerSimulationRun {
  return {
    runId,
    accountId: input.accountId,
    strategyId: input.strategyId,
    parameterSetId: input.parameterSetId,
    canonicalSymbol: input.canonicalSymbol,
    brokerSymbol: input.brokerSymbol ?? input.symbolProfile?.brokerSymbol ?? "",
    timeframe: input.timeframe,
    sourceType: "bridge_candles_csv_fixture",
    sourceName: input.sourceName,
    evaluatedAtIso: evalIso,
  };
}

/**
 * Parse BridgeEA candles CSV text, convert rows to `Candle[]`, optionally derive `SymbolMarketSpec`
 * from a market snapshot row, then run `runScannerSimulation`.
 */
export function runScannerSimulationFromBridgeCandlesCsv(
  input: RunScannerSimulationFromBridgeCandlesCsvInput,
): BridgeScannerSimulationResult {
  const parsed = parseBridgeCandlesCsv(input.csvText);
  const bridgeErrors = [...parsed.errors];
  const bridgeWarnings = [...parsed.warnings];
  const evalIso = input.currentEvaluationTime ?? new Date().toISOString();
  const runId = newRunId();

  const registryEval = createDefaultStrategyRegistryEvaluationSettings();
  const registryCompatibility: ParameterSetCompatibilityResult = evaluateParameterSetCompatibility(
    {
      strategyRegistry: input.strategyRegistry,
      strategyId: input.strategyId,
      parameterSetId: input.parameterSetId,
      canonicalSymbol: input.canonicalSymbol,
      brokerSymbol: input.brokerSymbol ?? input.symbolProfile?.brokerSymbol,
      accountId: input.accountId,
      requestedUsage: "trade_review",
    },
    registryEval,
  );

  const guardSettings = createDefaultAccountGuardSettingsForTests();
  const guardIn = {
    ...input.accountGuardInput,
    accountId: input.accountId,
    approvedParameterSetForAccount: registryCompatibility.allowTradeReview,
  };
  const accountGuardResult = evaluateAccountGuard(guardIn, guardSettings);

  if (!parsed.ok || !parsed.rows?.length) {
    return {
      ok: false,
      run: buildRunMeta(input, runId, evalIso),
      status: "failed",
      diagnostics: bridgeImportDiagnostics(bridgeErrors, bridgeWarnings),
      detection: null,
      accountGuardResult,
      registryCompatibility,
      candidates: [],
      reviewOnly: true,
      executionEnabled: false,
      mockOnly: true,
      simulatedScanner: true,
      bridgeImportOk: false,
      bridgeErrors,
      bridgeWarnings,
    };
  }

  let symbolProfile: SymbolMarketSpec | null = input.symbolProfile;
  if (input.marketSnapshotRow) {
    const d = deriveSymbolMarketSpecFromBridgeMarketSnapshot(input.marketSnapshotRow, {
      accountId: input.accountId,
      canonicalSymbol: input.canonicalSymbol,
    });
    bridgeWarnings.push(...d.warnings);
    if (d.spec) symbolProfile = d.spec;
  }

  if (!symbolProfile) {
    return {
      ok: false,
      run: buildRunMeta(input, runId, evalIso),
      status: "failed",
      diagnostics: [
        ...bridgeImportDiagnostics(bridgeErrors, bridgeWarnings),
        {
          level: "error",
          code: "SCANNER_MISSING_SYMBOL_PROFILE",
          message: "Provide symbolProfile or a market snapshot row that yields a valid SymbolMarketSpec.",
        },
      ],
      detection: null,
      accountGuardResult,
      registryCompatibility,
      candidates: [],
      reviewOnly: true,
      executionEnabled: false,
      mockOnly: true,
      simulatedScanner: true,
      bridgeImportOk: true,
      bridgeErrors,
      bridgeWarnings,
    };
  }

  const candles = parsed.rows.map(bridgeCandleRowToCandle);

  const simInput: ScannerSimulationInput = {
    runId,
    accountId: input.accountId,
    strategyId: input.strategyId,
    parameterSetId: input.parameterSetId,
    canonicalSymbol: input.canonicalSymbol,
    brokerSymbol: input.brokerSymbol,
    timeframe: input.timeframe,
    candles,
    symbolProfile,
    strategySettings: input.strategySettings,
    accountGuardInput: input.accountGuardInput,
    strategyRegistry: input.strategyRegistry,
    tradePlanSettings: input.tradePlanSettings,
    currentEvaluationTime: input.currentEvaluationTime,
    sourceType: "bridge_candles_csv_fixture" as ScannerSourceType,
    sourceName: input.sourceName,
  };

  const result = runScannerSimulation(simInput);
  const bridgeDiags = bridgeImportDiagnostics(bridgeErrors, bridgeWarnings);
  const mergedDiagnostics = [...bridgeDiags, ...result.diagnostics];
  let status = result.status;
  if (
    result.candidates.length > 0 &&
    status === "completed" &&
    mergedDiagnostics.some((d) => d.level === "warning")
  ) {
    status = "completed_with_warnings";
  }
  return {
    ...result,
    run: { ...result.run, runId },
    diagnostics: mergedDiagnostics,
    status,
    bridgeImportOk: true,
    bridgeErrors,
    bridgeWarnings,
  };
}
