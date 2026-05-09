import type { BacktestCampaignDataset } from "./backtest-campaign-types";
import { runBacktestCampaign } from "./backtest-campaign-runner";
import type { ExportSampleBundleKind } from "./export-sample-validation-types";
import { validateExportSampleBundle } from "./export-sample-validation";
import { manualCampaignDiagnostic } from "./manual-campaign-reasons";
import {
  createBacktestCampaignDatasetFromManualImport,
  importManualCandleDataset,
} from "./manual-candle-dataset-importer";
import type {
  ManualCampaignDatasetImport,
  ManualCampaignDatasetResult,
  ManualCampaignInput,
  ManualCampaignPipelineSourceType,
  ManualCampaignReasonCode,
  ManualCampaignResult,
  ManualCampaignSource,
  ManualCampaignStatus,
  ManualCampaignSummary,
  ManualCampaignTestEaValidateOptions,
} from "./manual-campaign-types";

function slugSourceId(name: string, index: number): string {
  const s = name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "source";
  return `${s}_${index}`;
}

function bundleKindForPipelineSource(t: ManualCampaignPipelineSourceType): ExportSampleBundleKind {
  switch (t) {
    case "bridge_export_bundle_text":
      return "bridge_ea_export_bundle";
    case "testea_export_bundle_text":
      return "testea_export_bundle";
    case "mixed_export_bundle_text":
      return "mixed_export_bundle";
    default:
      return "unknown";
  }
}

function defaultTestEaOptions(input: ManualCampaignInput, src: ManualCampaignSource): ManualCampaignTestEaValidateOptions {
  return (
    input.testEaValidateOptions ?? {
      importOptions: {
        strategyId: "MZP_IFVG_ZONE_REACTION_V1",
        parameterSetId: "MZP_IFVG_XAUUSD_V1_SET_003",
        canonicalSymbol: src.expectedCanonicalSymbol ?? "XAUUSD",
        brokerSymbol: src.expectedBrokerSymbol ?? src.expectedCanonicalSymbol ?? "XAUUSD",
        accountId: undefined,
        datasetSplit: src.datasetSplit,
        sourceType: "mapazapp_testea_csv",
        runId: "MANUAL_CAMPAIGN_TESTEA",
      },
    }
  );
}

function mergeReasons(target: ManualCampaignReasonCode[], ...codes: ManualCampaignReasonCode[]): void {
  for (const c of codes) {
    if (!target.includes(c)) target.push(c);
  }
}

export function runManualDatasetCampaign(input: ManualCampaignInput): ManualCampaignResult {
  const diagnostics: import("./manual-campaign-types").ManualCampaignDiagnostic[] = [];
  const datasetResults: ManualCampaignDatasetResult[] = [];
  const datasets: BacktestCampaignDataset[] = [];
  const primaryReasonCodes: ManualCampaignReasonCode[] = [];

  const baseSummary: ManualCampaignSummary = {
    sourceCount: input.sources.length,
    campaignDatasetsBuilt: 0,
    exportBundleRuns: 0,
    privacyPassedAll: true,
    campaignRunCount: 0,
    campaignValidRunCount: 0,
    rankableSymbolCount: 0,
    primaryReasonCodes,
  };

  const safety = {
    reviewOnly: true as const,
    executionEnabled: false as const,
    registryMutationAllowed: false as const,
    autoApprovalEnabled: false as const,
  };

  const fail = (status: ManualCampaignStatus, summary: ManualCampaignSummary): ManualCampaignResult => ({
    status,
    summary: { ...summary, primaryReasonCodes },
    diagnostics,
    datasetResults,
    campaignResult: null,
    ...safety,
  });

  if (!input.sources.length) {
    mergeReasons(primaryReasonCodes, "MANUAL_CAMPAIGN_NO_SOURCES");
    diagnostics.push(
      manualCampaignDiagnostic("error", "MANUAL_CAMPAIGN_NO_SOURCES", "No sources provided for manual campaign"),
    );
    return fail("insufficient_data", { ...baseSummary, sourceCount: 0 });
  }

  if (!input.parameterSets.length) {
    mergeReasons(primaryReasonCodes, "MANUAL_CAMPAIGN_NO_PARAMETER_SETS");
    diagnostics.push(
      manualCampaignDiagnostic("error", "MANUAL_CAMPAIGN_NO_PARAMETER_SETS", "parameterSets must not be empty"),
    );
    return fail("insufficient_data", baseSummary);
  }

  let anyPrivacyBlocked = false;
  let anyBundleInvalid = false;
  let anyManualImportFailed = false;
  let exportBundleRuns = 0;

  const imp = input.importSettings ?? {};

  for (let i = 0; i < input.sources.length; i++) {
    const src = input.sources[i]!;
    const sid = slugSourceId(src.sourceName, i);

    if (src.sourceType === "manual_csv_text") {
      const importAudit: ManualCampaignDatasetImport = {
        sourceName: src.sourceName,
        pipelineSourceType: src.sourceType,
      };
      if (!src.csvText?.trim()) {
        mergeReasons(primaryReasonCodes, "MANUAL_CAMPAIGN_SOURCE_MISSING_CSV");
        anyManualImportFailed = true;
        diagnostics.push(
          manualCampaignDiagnostic("error", "MANUAL_CAMPAIGN_SOURCE_MISSING_CSV", "manual_csv_text source requires csvText", {
            sourceName: src.sourceName,
          }),
        );
        datasetResults.push({
          sourceName: src.sourceName,
          pipelineSourceType: src.sourceType,
          import: importAudit,
          campaignDatasetCreated: false,
        });
        continue;
      }

      const manualRes = importManualCandleDataset({
        csvText: src.csvText,
        canonicalSymbol: src.expectedCanonicalSymbol ?? "XAUUSD",
        brokerSymbol: src.expectedBrokerSymbol,
        timeframe: src.expectedTimeframe ?? "M15",
        datasetSplit: src.datasetSplit,
        sourceName: src.sourceName,
        formatHint: imp.manualFormatHint ?? "auto_detect",
        minRows: imp.manualMinRows,
        includeParsedRows: imp.manualIncludeParsedRows,
        sourceTypeHint: imp.manualSourceTypeHint,
      });

      importAudit.manualCandleImport = manualRes;
      importAudit.validCandleRowCount = manualRes.validationSummary.validRowCount;
      importAudit.skippedRowCount = manualRes.validationSummary.skippedRowCount;
      importAudit.csvBodyRowCount = manualRes.validationSummary.rowCount;

      for (const w of manualRes.warnings) {
        diagnostics.push(
          manualCampaignDiagnostic("warning", w.code, w.message, {
            sourceName: src.sourceName,
            detail: w.detail ?? (w.rowIndex != null ? String(w.rowIndex) : undefined),
          }),
        );
      }
      for (const e of manualRes.errors) {
        diagnostics.push(
          manualCampaignDiagnostic("error", e.code, e.message, { sourceName: src.sourceName, detail: e.detail }),
        );
      }

      if (!manualRes.ok || !manualRes.dataset) {
        anyManualImportFailed = true;
        mergeReasons(primaryReasonCodes, "MANUAL_CAMPAIGN_MANUAL_IMPORT_FAILED");
        datasetResults.push({
          sourceName: src.sourceName,
          pipelineSourceType: src.sourceType,
          import: importAudit,
          campaignDatasetCreated: false,
        });
        continue;
      }

      const ds = createBacktestCampaignDatasetFromManualImport(manualRes, {
        symbolProfile: src.symbolProfile,
        datasetId: `manual_campaign_${sid}`,
      });
      if (!ds) {
        anyManualImportFailed = true;
        mergeReasons(primaryReasonCodes, "MANUAL_CAMPAIGN_MANUAL_IMPORT_FAILED");
        datasetResults.push({
          sourceName: src.sourceName,
          pipelineSourceType: src.sourceType,
          import: importAudit,
          campaignDatasetCreated: false,
        });
        continue;
      }
      const out: BacktestCampaignDataset = { ...ds, sourceName: src.sourceName };
      datasets.push(out);
      baseSummary.campaignDatasetsBuilt++;
      datasetResults.push({
        sourceName: src.sourceName,
        pipelineSourceType: src.sourceType,
        import: importAudit,
        campaignDatasetCreated: true,
        datasetId: out.datasetId,
      });
      continue;
    }

    // Export bundle paths
    const bundleKind = bundleKindForPipelineSource(src.sourceType);
    const importAudit: ManualCampaignDatasetImport = {
      sourceName: src.sourceName,
      pipelineSourceType: src.sourceType,
    };

    if (!src.files?.length) {
      mergeReasons(primaryReasonCodes, "MANUAL_CAMPAIGN_SOURCE_MISSING_FILES");
      anyBundleInvalid = true;
      diagnostics.push(
        manualCampaignDiagnostic(
          "error",
          "MANUAL_CAMPAIGN_SOURCE_MISSING_FILES",
          "Export bundle source requires files[] (fileName + text)",
          { sourceName: src.sourceName },
        ),
      );
      datasetResults.push({
        sourceName: src.sourceName,
        pipelineSourceType: src.sourceType,
        import: importAudit,
        campaignDatasetCreated: false,
      });
      continue;
    }

    exportBundleRuns++;
    const bundle = validateExportSampleBundle(
      {
        bundleKind,
        files: src.files,
        expectedCanonicalSymbol: src.expectedCanonicalSymbol ?? "XAUUSD",
        expectedBrokerSymbol: src.expectedBrokerSymbol,
        expectedTimeframe: src.expectedTimeframe ?? "M15",
        symbolProfile: src.symbolProfile,
        privacyMode: input.privacyMode,
        datasetSplit: src.datasetSplit,
        sourceName: src.sourceName,
      },
      defaultTestEaOptions(input, src),
    );

    importAudit.exportBundleStatus = bundle.status;
    importAudit.exportBundleKind = bundle.bundleKind;
    importAudit.bundleHadCandlesCsv = bundle.bridge?.candlesManualImport != null;
    if (bundle.bridge?.candlesManualImport) {
      importAudit.validCandleRowCount = bundle.bridge.candlesManualImport.validationSummary?.validRowCount;
      importAudit.skippedRowCount = bundle.bridge.candlesManualImport.validationSummary?.skippedRowCount;
      importAudit.csvBodyRowCount = bundle.bridge.candlesManualImport.validationSummary?.rowCount;
      importAudit.manualCandleImport = bundle.bridge.candlesManualImport;
    }

    if (src.sourceType === "testea_export_bundle_text") {
      importAudit.testEaEvidenceOnly = true;
    }

    for (const d of bundle.diagnostics) {
      const level = d.level === "error" ? "error" : d.level === "warning" ? "warning" : "info";
      diagnostics.push(
        manualCampaignDiagnostic(level, d.code, d.message, { sourceName: src.sourceName, detail: d.detail }),
      );
    }

    if (!bundle.privacy.passed) {
      anyPrivacyBlocked = true;
      baseSummary.privacyPassedAll = false;
      mergeReasons(primaryReasonCodes, "MANUAL_CAMPAIGN_PRIVACY_BLOCKED");
    }

    if (bundle.status === "invalid") {
      anyBundleInvalid = true;
      mergeReasons(primaryReasonCodes, "MANUAL_CAMPAIGN_BUNDLE_INVALID");
    }

    let created = false;
    const privacyOk = bundle.privacy.passed;
    const bridgeDs =
      privacyOk && bundle.status !== "invalid" ? bundle.bridge?.campaignDataset ?? null : null;

    if (bridgeDs) {
      const out: BacktestCampaignDataset = {
        ...bridgeDs,
        datasetId: `manual_campaign_${sid}`,
        sourceName: src.sourceName,
      };
      datasets.push(out);
      baseSummary.campaignDatasetsBuilt++;
      created = true;
    } else if (
      (src.sourceType === "bridge_export_bundle_text" || src.sourceType === "mixed_export_bundle_text") &&
      privacyOk &&
      bundle.status !== "invalid"
    ) {
      mergeReasons(primaryReasonCodes, "MANUAL_CAMPAIGN_NO_CANDLE_DATASET");
      diagnostics.push(
        manualCampaignDiagnostic(
          "warning",
          "MANUAL_CAMPAIGN_NO_CANDLE_DATASET",
          "Bridge/mixed bundle did not yield a campaign candle dataset (missing candles, import failure, or symbolProfile required for adapter)",
          { sourceName: src.sourceName },
        ),
      );
    }

    if (src.sourceType === "testea_export_bundle_text" && !created) {
      mergeReasons(primaryReasonCodes, "MANUAL_CAMPAIGN_TESTEA_EVIDENCE_ONLY");
      diagnostics.push(
        manualCampaignDiagnostic(
          "info",
          "MANUAL_CAMPAIGN_TESTEA_EVIDENCE_ONLY",
          "TestEA export bundle validates trades/summary evidence only; it does not supply OHLC candles for IFVG replay unless a candles artifact exists (not part of TestEA contract)",
          { sourceName: src.sourceName },
        ),
      );
    }

    datasetResults.push({
      sourceName: src.sourceName,
      pipelineSourceType: src.sourceType,
      import: importAudit,
      campaignDatasetCreated: created,
      datasetId: created ? `manual_campaign_${sid}` : undefined,
      exportSampleValidation: bundle,
    });
  }

  baseSummary.exportBundleRuns = exportBundleRuns;

  if (!datasets.length) {
    mergeReasons(primaryReasonCodes, "MANUAL_CAMPAIGN_NO_VALID_DATASETS");
    const status: ManualCampaignStatus =
      anyPrivacyBlocked || anyBundleInvalid || anyManualImportFailed ? "import_failed" : "no_valid_datasets";
    return fail(status, {
      ...baseSummary,
      campaignDatasetsBuilt: 0,
    });
  }

  let campaignResult;
  try {
    campaignResult = runBacktestCampaign({
      datasets,
      parameterSets: input.parameterSets,
      campaignSettings: input.campaignSettings,
      defaultAccountGuardInput: input.defaultAccountGuardInput,
      defaultRegistryCompatibility: input.defaultRegistryCompatibility,
    });
  } catch (e) {
    mergeReasons(primaryReasonCodes, "MANUAL_CAMPAIGN_EXCEPTION");
    diagnostics.push(
      manualCampaignDiagnostic(
        "error",
        "MANUAL_CAMPAIGN_EXCEPTION",
        e instanceof Error ? e.message : String(e),
        { detail: "runBacktestCampaign threw" },
      ),
    );
    return fail("campaign_failed", {
      ...baseSummary,
      campaignRunCount: 0,
      campaignValidRunCount: 0,
      rankableSymbolCount: 0,
    });
  }

  baseSummary.campaignRunCount = campaignResult.summary.runCount;
  baseSummary.campaignValidRunCount = campaignResult.summary.validRunCount;
  baseSummary.rankableSymbolCount = campaignResult.summary.rankableSymbolCount;

  const hadImportLayerWarnOrErr = diagnostics.some((d) => d.level === "warning" || d.level === "error");
  const partialSourcesWithoutDataset = datasetResults.some((r) => !r.campaignDatasetCreated);
  let status: ManualCampaignStatus = "completed";
  if (campaignResult.status === "insufficient_data") {
    status = "insufficient_data";
  } else if (
    campaignResult.status === "completed_with_warnings" ||
    hadImportLayerWarnOrErr ||
    (partialSourcesWithoutDataset && datasetResults.length > 1)
  ) {
    status = "completed_with_warnings";
  } else {
    status = "completed";
  }

  if (status === "completed" && primaryReasonCodes.length === 0) {
    mergeReasons(primaryReasonCodes, "MANUAL_CAMPAIGN_OK");
  }

  return {
    status,
    summary: { ...baseSummary, primaryReasonCodes },
    diagnostics,
    datasetResults,
    campaignResult,
    ...safety,
  };
}
