import { runBacktestCampaign } from "./backtest-campaign-runner";
import type {
  BacktestCampaignDataset,
  BacktestCampaignParameterSetInput,
  BacktestCampaignRecommendation,
} from "./backtest-campaign-types";
import { createDefaultDecisionModelSettingsForTests } from "./decision-model-settings";
import { parameterGridReason } from "./parameter-grid-reasons";
import type {
  ParameterGridCandidate,
  ParameterGridCandidateResult,
  ParameterGridDatasetGroup,
  ParameterGridInput,
  ParameterGridQuality,
  ParameterGridRankingRow,
  ParameterGridReasonCode,
  ParameterGridRecommendation,
  ParameterGridResult,
  ParameterGridStatus,
  ParameterGridSummary,
} from "./parameter-grid-types";

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function buildDatasetGroups(datasets: BacktestCampaignDataset[]): ParameterGridDatasetGroup[] {
  const m = new Map<string, { count: number; splits: Set<BacktestCampaignDataset["datasetSplit"]> }>();
  for (const d of datasets) {
    const e = m.get(d.symbol) ?? { count: 0, splits: new Set() };
    e.count++;
    e.splits.add(d.datasetSplit);
    m.set(d.symbol, e);
  }
  return Array.from(m.entries()).map(([symbol, v]) => ({
    symbol,
    datasetCount: v.count,
    splits: Array.from(v.splits),
  }));
}

function filterDatasetsForCandidate(
  datasets: BacktestCampaignDataset[],
  cand: ParameterGridCandidate,
): BacktestCampaignDataset[] {
  if (!cand.compatibleCanonicalSymbols?.length) {
    return datasets.map((d) => ({ ...d }));
  }
  const allow = new Set(cand.compatibleCanonicalSymbols);
  return datasets.filter((d) => allow.has(d.symbol)).map((d) => ({ ...d }));
}

function applyTestStubs(
  datasets: BacktestCampaignDataset[],
  parameterSetId: string,
  stubMap: ParameterGridInput["testOnlyReplayStubByParameterSetId"],
): BacktestCampaignDataset[] {
  const stub = stubMap?.[parameterSetId];
  if (!stub) return datasets;
  return datasets.map((d) => ({ ...d, testOnlyReplayOverride: stub }));
}

function mergeCampaignSettings(
  base: ParameterGridInput["campaignSettings"],
  cand: ParameterGridCandidate,
): ParameterGridInput["campaignSettings"] {
  if (!cand.campaignSettingsOverrides) return base;
  return { ...base, ...cand.campaignSettingsOverrides };
}

function buildParameterSetInput(cand: ParameterGridCandidate): BacktestCampaignParameterSetInput {
  const ps = cand.parameterSet;
  let decisionModelSettings = ps.decisionModelSettings ?? createDefaultDecisionModelSettingsForTests();
  if (cand.decisionModelSettingsOverride) {
    decisionModelSettings = {
      ...decisionModelSettings,
      ...cand.decisionModelSettingsOverride,
    };
  }
  return {
    ...ps,
    decisionModelSettings,
    registryCompatibility: cand.registryCompatibility ?? ps.registryCompatibility,
  };
}

function mapRecommendation(r: BacktestCampaignRecommendation): ParameterGridRecommendation {
  return r;
}

function qualityFromCampaign(
  slice: ParameterGridCandidateResult["campaignParameterSetSlice"],
): ParameterGridQuality {
  if (!slice) return "insufficient";
  return slice.quality;
}

function computeGridRankScore(
  campaignRankScore: number,
  meanAmb: number,
  meanMiss: number,
  meanExp: number,
  grid: ParameterGridInput["gridSettings"],
): number {
  const rawBeh = meanAmb + meanMiss + meanExp;
  const beh = clamp(1 - grid.behaviorRatePenaltyWeight * 0.05 * rawBeh, 0.12, 1);
  return Number((campaignRankScore * beh * grid.conservativeScoreMultiplier).toFixed(4));
}

function aggregateGridStatus(
  results: ParameterGridCandidateResult[],
  hadException: boolean,
  compatibleCandidates: number,
): ParameterGridStatus {
  if (hadException) return "failed";
  const okRuns = results.filter((r) => r.campaignResult != null);
  if (compatibleCandidates === 0 || okRuns.length === 0) return "no_valid_parameter_sets";
  if (okRuns.some((r) => r.campaignResult?.status === "insufficient_data")) return "insufficient_data";
  if (okRuns.some((r) => r.campaignResult?.status === "completed_with_warnings")) return "completed_with_warnings";
  if (okRuns.some((r) => r.reasons.some((x) => x.code !== "GRID_OK"))) return "completed_with_warnings";
  return "completed";
}

export function runParameterGrid(input: ParameterGridInput): ParameterGridResult {
  const primaryReasonCodes: ParameterGridReasonCode[] = [];
  const reasons: import("./parameter-grid-types").ParameterGridReason[] = [];
  const candidateResults: ParameterGridCandidateResult[] = [];

  const safety = {
    reviewOnly: true as const,
    executionEnabled: false as const,
    registryMutationAllowed: false as const,
    autoApprovalEnabled: false as const,
  };

  const pushReason = (code: ParameterGridReasonCode, message: string) => {
    if (!primaryReasonCodes.includes(code)) primaryReasonCodes.push(code);
    reasons.push(parameterGridReason(code, message));
  };

  const emptySummary: ParameterGridSummary = {
    datasetCount: input.datasets.length,
    datasetGroups: buildDatasetGroups(input.datasets),
    candidateCount: input.candidates.length,
    campaignRuns: 0,
    successfulCampaignRuns: 0,
    compatibleCandidates: 0,
    primaryReasonCodes,
  };

  const fail = (status: ParameterGridStatus): ParameterGridResult => ({
    status,
    summary: { ...emptySummary, primaryReasonCodes },
    candidates: candidateResults,
    ranking: [],
    reasons,
    ...safety,
  });

  if (!input.datasets.length) {
    pushReason("GRID_EMPTY_DATASETS", "Parameter grid requires at least one dataset");
    return fail("no_valid_datasets");
  }

  if (!input.candidates.length) {
    pushReason("GRID_EMPTY_CANDIDATES", "Parameter grid requires at least one candidate parameter set");
    return fail("no_valid_parameter_sets");
  }

  let campaignRuns = 0;
  let successfulCampaignRuns = 0;
  let compatibleCandidates = 0;
  let hadException = false;

  for (const cand of input.candidates) {
    const ps = buildParameterSetInput(cand);
    const pid = ps.parameterSetId;

    if (
      cand.registryCompatibility &&
      cand.registryCompatibility.compatible === false &&
      cand.registryCompatibility.blockingReasons.length > 0
    ) {
      pushReason("GRID_REGISTRY_INCOMPATIBLE", `Candidate ${pid} blocked by registry compatibility`);
      candidateResults.push({
        parameterSetId: pid,
        strategyId: ps.strategyId,
        datasetSymbolsUsed: [],
        registryCompatible: false,
        registrySkipped: true,
        campaignResult: null,
        campaignParameterSetSlice: null,
        gridRankScore: 0,
        recommendation: "not_rankable",
        quality: "insufficient",
        reasons: [parameterGridReason("GRID_REGISTRY_INCOMPATIBLE", "Registry compatibility marked incompatible")],
        meanAmbiguousRate: 0,
        meanMissedRate: 0,
        meanExpiredRate: 0,
      });
      continue;
    }

    let ds = filterDatasetsForCandidate(input.datasets, cand);
    ds = applyTestStubs(ds, pid, input.testOnlyReplayStubByParameterSetId);

    if (!ds.length) {
      pushReason(
        "GRID_CANDIDATE_NO_COMPATIBLE_DATASETS",
        `Candidate ${pid} has no datasets after symbol compatibility filter`,
      );
      candidateResults.push({
        parameterSetId: pid,
        strategyId: ps.strategyId,
        datasetSymbolsUsed: [],
        registryCompatible: true,
        registrySkipped: false,
        campaignResult: null,
        campaignParameterSetSlice: null,
        gridRankScore: 0,
        recommendation: "not_rankable",
        quality: "insufficient",
        reasons: [
          parameterGridReason(
            "GRID_CANDIDATE_NO_COMPATIBLE_DATASETS",
            "No datasets match compatibleCanonicalSymbols for this candidate",
          ),
        ],
        meanAmbiguousRate: 0,
        meanMissedRate: 0,
        meanExpiredRate: 0,
      });
      continue;
    }

    compatibleCandidates++;
    campaignRuns++;

    const settings = mergeCampaignSettings(input.campaignSettings, cand);

    let campaignResult;
    try {
      campaignResult = runBacktestCampaign({
        datasets: ds,
        parameterSets: [ps],
        campaignSettings: settings,
        defaultAccountGuardInput: input.defaultAccountGuardInput,
        defaultRegistryCompatibility: input.defaultRegistryCompatibility,
      });
    } catch {
      hadException = true;
      pushReason("GRID_EXCEPTION", `runBacktestCampaign threw for candidate ${pid}`);
      candidateResults.push({
        parameterSetId: pid,
        strategyId: ps.strategyId,
        datasetSymbolsUsed: [...new Set(ds.map((d) => d.symbol))],
        registryCompatible: true,
        registrySkipped: false,
        campaignResult: null,
        campaignParameterSetSlice: null,
        gridRankScore: 0,
        recommendation: "not_rankable",
        quality: "insufficient",
        reasons: [parameterGridReason("GRID_EXCEPTION", "Campaign run failed with an exception")],
        meanAmbiguousRate: 0,
        meanMissedRate: 0,
        meanExpiredRate: 0,
      });
      continue;
    }

    successfulCampaignRuns++;

    const slice =
      campaignResult.parameterSetResults.find((x) => x.parameterSetId === pid) ??
      campaignResult.parameterSetResults[0] ??
      null;

    const runs = campaignResult.runResults.filter((r) => r.parameterSetId === pid);
    const meanAmb = avg(runs.map((r) => r.ambiguousRate));
    const meanMiss = avg(runs.map((r) => r.missedRate));
    const meanExp = avg(runs.map((r) => r.expiredRate));

    const baseScore = slice?.rankScore ?? 0;
    const gridRankScore = computeGridRankScore(baseScore, meanAmb, meanMiss, meanExp, input.gridSettings);

    const recommendation = slice ? mapRecommendation(slice.recommendation) : "not_rankable";
    const quality = qualityFromCampaign(slice);

    const rowReasons: import("./parameter-grid-types").ParameterGridReason[] = [
      parameterGridReason("GRID_OK", "Campaign slice completed for grid candidate"),
    ];
    if (campaignResult.status === "completed_with_warnings") {
      rowReasons.push(parameterGridReason("GRID_CAMPAIGN_WARNINGS", "Underlying campaign completed with warnings"));
    }

    candidateResults.push({
      parameterSetId: pid,
      strategyId: ps.strategyId,
      datasetSymbolsUsed: [...new Set(ds.map((d) => d.symbol))],
      registryCompatible: true,
      registrySkipped: false,
      campaignResult,
      campaignParameterSetSlice: slice,
      gridRankScore,
      recommendation,
      quality,
      reasons: rowReasons,
      meanAmbiguousRate: Number(meanAmb.toFixed(4)),
      meanMissedRate: Number(meanMiss.toFixed(4)),
      meanExpiredRate: Number(meanExp.toFixed(4)),
    });
  }

  const rankingBase: ParameterGridRankingRow[] = candidateResults
    .filter((r) => r.campaignResult != null)
    .map((r) => ({
      rank: 0,
      parameterSetId: r.parameterSetId,
      strategyId: r.strategyId,
      gridRankScore: r.gridRankScore,
      recommendation: r.recommendation,
      quality: r.quality,
      tradeCount: r.campaignParameterSetSlice?.tradeCount ?? 0,
      splitsCovered: r.campaignParameterSetSlice?.splitsCovered ?? [],
    }))
    .sort((a, b) => {
      const s = b.gridRankScore - a.gridRankScore;
      if (s !== 0) return s;
      return a.parameterSetId.localeCompare(b.parameterSetId);
    });

  const ranking = rankingBase.map((row, i) => ({ ...row, rank: i + 1 }));

  if (compatibleCandidates === 0 && input.candidates.length > 0) {
    return {
      status: "no_valid_parameter_sets",
      summary: {
        datasetCount: input.datasets.length,
        datasetGroups: buildDatasetGroups(input.datasets),
        candidateCount: input.candidates.length,
        campaignRuns,
        successfulCampaignRuns,
        compatibleCandidates,
        primaryReasonCodes,
      },
      candidates: candidateResults,
      ranking: [],
      reasons,
      ...safety,
    };
  }

  const status = aggregateGridStatus(candidateResults, hadException, compatibleCandidates);

  return {
    status,
    summary: {
      datasetCount: input.datasets.length,
      datasetGroups: buildDatasetGroups(input.datasets),
      candidateCount: input.candidates.length,
      campaignRuns,
      successfulCampaignRuns,
      compatibleCandidates,
      primaryReasonCodes,
    },
    candidates: candidateResults,
    ranking,
    reasons,
    ...safety,
  };
}
