import { describe, expect, it } from "vitest";
import {
  buildCheckpoint15MockEvidenceBundle,
  calculateBacktestSummary,
  createCheckpoint15MockRunsAlertsOnlyPath,
  createCheckpoint15MockRunsInconsistentSymbol,
  createCheckpoint15MockRunsTradeReviewPath,
  createCheckpoint15MockRunsValidationFailure,
  createBacktestEvidenceBundleFromCsvTexts,
  createCheckpoint8MockXauForwardRun,
  createDefaultBacktestEvidenceThresholdsForTests,
  evaluateBacktestEvidence,
  evaluateBacktestEvidenceWithProposal,
  getCheckpoint15MockEvidenceBundleByParameterSetId,
  CHECKPOINT7_MOCK_STRATEGY_ID,
} from "../src/index";

describe("Checkpoint 15 — evidence (group A: no evidence)", () => {
  it("no runs => no_evidence", () => {
    const r = evaluateBacktestEvidence({
      runs: [],
      thresholds: createDefaultBacktestEvidenceThresholdsForTests(),
    });
    expect(r.status).toBe("no_evidence");
    expect(r.manualReviewRequired).toBe(true);
    expect(r.registryMutationAllowed).toBe(false);
  });
});

describe("Checkpoint 15 — evidence (group B: split requirements)", () => {
  const th = createDefaultBacktestEvidenceThresholdsForTests();

  it("validation missing => insufficient_evidence", () => {
    const run = createCheckpoint8MockXauForwardRun();
    const trainOnly = [{ ...run, datasetSplit: "train" as const, runId: "ONLY_TRAIN" }];
    const r = evaluateBacktestEvidence({ runs: trainOnly, thresholds: th });
    expect(r.status).toBe("insufficient_evidence");
    expect(r.blockingReasons.some((b) => b.code === "EVIDENCE_VALIDATION_SPLIT_MISSING")).toBe(true);
  });

  it("validation passes, forward missing => candidate_for_alerts (default thresholds)", () => {
    const runs = createCheckpoint15MockRunsAlertsOnlyPath();
    const r = evaluateBacktestEvidence({ runs, thresholds: th });
    expect(r.status).toBe("candidate_for_alerts");
    expect(r.approvedForRecommendation).toBe(true);
  });

  it("validation + forward passing => candidate_for_trade_review recommendation only", () => {
    const runs = createCheckpoint15MockRunsTradeReviewPath();
    const r = evaluateBacktestEvidence({ runs, thresholds: th });
    expect(r.status).toBe("candidate_for_trade_review");
    expect(r.recommendedParameterSetStatus).toBe("approved_for_trade_review");
    expect(r.approvedForRecommendation).toBe(true);
  });

  it("forward required for trade-review tier + missing forward => needs_more_forward", () => {
    const runs = createCheckpoint15MockRunsAlertsOnlyPath();
    const r = evaluateBacktestEvidence({
      runs,
      thresholds: { ...th, requireForwardForTradeReview: true },
    });
    expect(r.status).toBe("needs_more_forward");
    expect(r.warningReasons.some((w) => w.code === "EVIDENCE_FORWARD_SPLIT_MISSING")).toBe(true);
  });
});

describe("Checkpoint 15 — evidence (group C: rejection)", () => {
  const th = createDefaultBacktestEvidenceThresholdsForTests();

  it("failing validation metrics => rejected", () => {
    const runs = createCheckpoint15MockRunsValidationFailure();
    const r = evaluateBacktestEvidence({ runs, thresholds: th });
    expect(r.status).toBe("rejected");
    expect(r.approvedForRecommendation).toBe(false);
  });

  it("high drawdown blocks (representative validation run)", () => {
    const runs = createCheckpoint15MockRunsTradeReviewPath().map((run) => {
      if (run.datasetSplit !== "validation") return run;
      const trades = run.trades.map((t, i) => (i === 0 ? { ...t, resultR: -80 } : t));
      return { ...run, trades, summary: calculateBacktestSummary(trades) };
    });
    const r = evaluateBacktestEvidence({ runs, thresholds: th });
    expect(r.status).toBe("rejected");
  });

  it("low profit factor blocks", () => {
    const runs = createCheckpoint15MockRunsValidationFailure();
    const r = evaluateBacktestEvidence({ runs, thresholds: th });
    expect(r.blockingReasons.some((b) => b.code === "EVIDENCE_VALIDATION_METRICS_FAILED")).toBe(true);
  });
});

describe("Checkpoint 15 — evidence (group D: consistency)", () => {
  const th = createDefaultBacktestEvidenceThresholdsForTests();

  it("mixed parameterSetId blocks", () => {
    const runs = createCheckpoint15MockRunsTradeReviewPath();
    const mixed = [...runs];
    mixed[0] = { ...mixed[0]!, parameterSetId: "OTHER_PS" };
    const r = evaluateBacktestEvidence({ runs: mixed, thresholds: th });
    expect(r.status).toBe("inconsistent_evidence");
  });

  it("mixed canonicalSymbol blocks", () => {
    const runs = createCheckpoint15MockRunsInconsistentSymbol();
    const r = evaluateBacktestEvidence({ runs, thresholds: th });
    expect(r.status).toBe("inconsistent_evidence");
  });
});

describe("Checkpoint 15 — evidence (group E: proposal safety)", () => {
  it("proposal.manualReviewRequired === true and canAutoApply/registryMutation flags false", () => {
    const { proposal, evaluation } = evaluateBacktestEvidenceWithProposal({
      runs: createCheckpoint15MockRunsTradeReviewPath(),
      thresholds: createDefaultBacktestEvidenceThresholdsForTests(),
    });
    expect(proposal.manualReviewRequired).toBe(true);
    expect(proposal.canAutoApply).toBe(false);
    expect(evaluation.registryMutationAllowed).toBe(false);
    expect(evaluation.manualReviewRequired).toBe(true);
  });
});

describe("Checkpoint 15 — evidence (group F: CSV bundle helper)", () => {
  const common = {
    strategyId: CHECKPOINT7_MOCK_STRATEGY_ID,
    parameterSetId: "MZP_CP15_CSV_BUNDLE_DEMO",
    canonicalSymbol: "XAUUSD",
  };

  const row =
    "trade_id,direction,entry_time,exit_time,entry_price,exit_price,result_r,result_money";

  it("two CSV texts produce train/validation evidence path", () => {
    const csvTrain = [row, "a1,BUY,2026-01-01T10:00:00Z,2026-01-01T11:00:00Z,2000,2010,1.2,0"].join("\n");
    const lines: string[] = [row];
    for (let i = 0; i < 35; i++) {
      const win = i % 3 !== 0;
      const r = win ? 1.0 : -1.0;
      lines.push(`v${i},BUY,2026-02-${String((i % 27) + 1).padStart(2, "0")}T10:00:00Z,2026-02-${String((i % 27) + 1).padStart(2, "0")}T11:00:00Z,2000,2002,${r},0`);
    }
    const csvVal = lines.join("\n");

    const bundle = createBacktestEvidenceBundleFromCsvTexts({
      csvFiles: [
        { fileName: "train.csv", csvText: csvTrain, datasetSplit: "train", sourceType: "mapazapp_testea_csv" },
        { fileName: "val.csv", csvText: csvVal, datasetSplit: "validation", sourceType: "mapazapp_testea_csv" },
      ],
      commonOptions: common,
      thresholds: {
        ...createDefaultBacktestEvidenceThresholdsForTests(),
        minTradesPerSplit: 5,
        minTotalTrades: 10,
      },
    });
    expect(bundle.runs.length).toBe(2);
    expect(bundle.evaluation.status === "candidate_for_alerts" || bundle.evaluation.status === "insufficient_evidence").toBe(
      true,
    );
    expect(bundle.proposal.canAutoApply).toBe(false);
  });

  it("invalid CSV returns import errors and does not auto-approve", () => {
    const bundle = createBacktestEvidenceBundleFromCsvTexts({
      csvFiles: [{ fileName: "bad.csv", csvText: "not,a,csv", datasetSplit: "validation", sourceType: "manual_mock" }],
      commonOptions: common,
    });
    expect(bundle.importErrors.length).toBeGreaterThan(0);
    expect(bundle.runs.length).toBe(0);
    expect(bundle.evaluation.status).toBe("no_evidence");
    expect(bundle.proposal.canAutoApply).toBe(false);
  });
});

describe("Checkpoint 15 — fixtures lookup", () => {
  it("maps known parameter sets to mock bundles", () => {
    const b = getCheckpoint15MockEvidenceBundleByParameterSetId("MZP_IFVG_XAUUSD_V1_SET_003");
    expect(b).not.toBeNull();
    expect(b!.evaluation.status).toBe("candidate_for_trade_review");
  });

  it("unknown parameter set id => null", () => {
    expect(getCheckpoint15MockEvidenceBundleByParameterSetId("MZP_MISSING")).toBeNull();
  });

  it("symbol-mix fixture builds inconsistent evidence", () => {
    const bundle = buildCheckpoint15MockEvidenceBundle(createCheckpoint15MockRunsInconsistentSymbol());
    expect(bundle.evaluation.status).toBe("inconsistent_evidence");
  });
});
