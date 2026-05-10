import { Router, type IRouter } from "express";
import type { AccountId } from "@workspace/mapazapp-core";
import { MAPAZAPP_ERROR_ACCOUNT_NOT_FOUND, MAPAZAPP_ERROR_PARAMETER_SET_NOT_FOUND, MAPAZAPP_ERROR_ZONE_NOT_FOUND } from "./errors";
import { errResponse, okResponse } from "./response";
import * as accounts from "./adapters/accounts";
import * as backtestEvidence from "./adapters/backtestEvidence";
import * as backtests from "./adapters/backtests";
import * as bridge from "./adapters/bridge";
import * as registry from "./adapters/strategyRegistry";
import * as tradeReview from "./adapters/tradeReview";
import * as scannerSimulation from "./adapters/scannerSimulation";
import * as forwardMonitor from "./adapters/forwardMonitor";
import * as assistedExecution from "./adapters/assistedExecution";
import * as backtestCampaignAdapter from "./adapters/backtestCampaign";
import * as manualCampaignAdapter from "./adapters/manualCampaign";
import * as parameterGridAdapter from "./adapters/parameterGrid";
import * as walkForwardAdapter from "./adapters/walkForward";
import * as runtimeStatusAdapter from "./adapters/runtimeStatus";

const router: IRouter = Router();

/** V2-16 mock evidence payloads — read-only, no promotion from API. */
const EVIDENCE_V2_MOCK_FLAGS = {
  reviewOnly: true as const,
  executionEnabled: false as const,
  registryMutationAllowed: false as const,
  autoApprovalEnabled: false as const,
};

const CP15_EVIDENCE_FLAGS = {
  advisoryOnly: true as const,
  registryMutationAllowed: false as const,
  canAutoApply: false as const,
};

/** D5.1b — shared runtime status model; not live MT5/bridge health. */
const RUNTIME_STATUS_FLAGS = {
  reviewOnly: true as const,
  executionEnabled: false as const,
  registryMutationAllowed: false as const,
  autoApprovalEnabled: false as const,
};

router.get("/health", (_req, res) => {
  res.json(
    okResponse({
      service: "mapazapp-api",
      checkpoint: 17,
      readOnly: true,
      mockData: "in-memory",
      evidenceMockRoutesV2: "v2-16",
    }),
  );
});

router.get("/runtime/status", (_req, res) => {
  res.json(okResponse(runtimeStatusAdapter.buildRuntimeStatusPayload(), RUNTIME_STATUS_FLAGS));
});

router.get("/backtest-campaigns/mock-latest", (_req, res) => {
  res.json(
    okResponse(
      {
        kind: "mock_latest_backtest_campaign",
        description:
          "Synthetic XAUUSD train/validation campaign from core fixtures; replay stubbed for deterministic mock API.",
        campaign: backtestCampaignAdapter.getMockLatestBacktestCampaign(),
      },
      EVIDENCE_V2_MOCK_FLAGS,
    ),
  );
});

router.get("/parameter-grid/mock-latest", (_req, res) => {
  res.json(
    okResponse(
      {
        kind: "mock_latest_parameter_grid",
        description: "Three parameter sets on shared XAUUSD validation slice (V2-14 fixture); replay stubbed.",
        grid: parameterGridAdapter.getMockLatestParameterGrid(),
      },
      EVIDENCE_V2_MOCK_FLAGS,
    ),
  );
});

router.get("/walk-forward/mock-latest", (_req, res) => {
  res.json(
    okResponse(
      {
        kind: "mock_latest_walk_forward",
        description: "Walk-forward evaluation on synthetic stable train/validation/forward rows (V2-15 fixture).",
        walkForward: walkForwardAdapter.getMockLatestWalkForward(),
      },
      EVIDENCE_V2_MOCK_FLAGS,
    ),
  );
});

router.get("/manual-campaign/mock-latest", (_req, res) => {
  res.json(
    okResponse(
      {
        kind: "mock_latest_manual_campaign",
        description: "V2-13 manual CSV import fixture → runManualDatasetCampaign (full replay on imported candles).",
        manualCampaign: manualCampaignAdapter.getMockLatestManualCampaign(),
      },
      EVIDENCE_V2_MOCK_FLAGS,
    ),
  );
});

router.get("/scanner/simulations", (_req, res) => {
  res.json(
    okResponse(
      { simulations: scannerSimulation.listScannerSimulations() },
      { reviewOnly: true, executionEnabled: false },
    ),
  );
});

router.get("/scanner/simulations/latest", (_req, res) => {
  res.json(
    okResponse(scannerSimulation.latestScannerSimulation(), { reviewOnly: true, executionEnabled: false }),
  );
});

router.get("/accounts/:accountId/scanner/simulations/latest", (req, res) => {
  const { accountId } = req.params;
  if (!accounts.findAccount(accountId)) {
    res.status(404).json(errResponse([{ ...MAPAZAPP_ERROR_ACCOUNT_NOT_FOUND, detail: accountId }]));
    return;
  }
  const sim = scannerSimulation.latestScannerSimulationForAccount(accountId as AccountId);
  res.json(okResponse(sim, { reviewOnly: true, executionEnabled: false }));
});

router.get("/accounts", (_req, res) => {
  res.json(okResponse(accounts.listAccounts()));
});

router.get("/accounts/:accountId/summary", (req, res) => {
  const { accountId } = req.params;
  const row = accounts.getAccountSummary(accountId);
  if (!row) {
    res.status(404).json(errResponse([{ ...MAPAZAPP_ERROR_ACCOUNT_NOT_FOUND, detail: accountId }]));
    return;
  }
  res.json(okResponse(row));
});

router.get("/accounts/:accountId/guard", (req, res) => {
  const { accountId } = req.params;
  if (!accounts.findAccount(accountId)) {
    res.status(404).json(errResponse([{ ...MAPAZAPP_ERROR_ACCOUNT_NOT_FOUND, detail: accountId }]));
    return;
  }
  res.json(okResponse(tradeReview.guardForAccount(accountId as AccountId)));
});

router.get("/accounts/:accountId/trade-reviews", (req, res) => {
  const { accountId } = req.params;
  if (!accounts.findAccount(accountId)) {
    res.status(404).json(errResponse([{ ...MAPAZAPP_ERROR_ACCOUNT_NOT_FOUND, detail: accountId }]));
    return;
  }
  const plans = tradeReview.tradeReviewsForAccount(accountId as AccountId);
  res.json(
    okResponse(
      {
        accountId,
        plans: plans.map((p) => ({
          accountId: p.accountId,
          zone: p.zone,
          evaluation: p.evaluation,
          registryCompatibility: p.registryCompatibility,
        })),
      },
      { reviewOnly: true, executionEnabled: false },
    ),
  );
});

router.get("/accounts/:accountId/trade-reviews/:zoneId", (req, res) => {
  const { accountId, zoneId } = req.params;
  if (!accounts.findAccount(accountId)) {
    res.status(404).json(errResponse([{ ...MAPAZAPP_ERROR_ACCOUNT_NOT_FOUND, detail: accountId }]));
    return;
  }
  const plan = tradeReview.tradeReviewForZone(accountId as AccountId, zoneId);
  if (!plan) {
    res.status(404).json(errResponse([{ ...MAPAZAPP_ERROR_ZONE_NOT_FOUND, detail: zoneId }]));
    return;
  }
  res.json(
    okResponse(
      {
        accountId,
        zone: plan.zone,
        evaluation: plan.evaluation,
        registryCompatibility: plan.registryCompatibility,
      },
      { reviewOnly: true, executionEnabled: false },
    ),
  );
});

router.get("/strategies", (_req, res) => {
  res.json(okResponse(registry.listStrategies()));
});

router.get("/parameter-sets", (_req, res) => {
  res.json(okResponse(registry.listParameterSets()));
});

router.get("/parameter-sets/:parameterSetId", (req, res) => {
  const row = registry.getParameterSetById(req.params.parameterSetId);
  if (!row) {
    res.status(404).json(errResponse([{ ...MAPAZAPP_ERROR_PARAMETER_SET_NOT_FOUND, detail: req.params.parameterSetId }]));
    return;
  }
  res.json(okResponse(row));
});

router.get("/backtest-evidence", (_req, res) => {
  res.json(
    okResponse(
      {
        summaries: backtestEvidence.listBacktestEvidenceSummaries(),
        evaluationNotes:
          "Checkpoint 15 mock bundles only — fictional splits; no MT5 folder ingestion; no registry mutation.",
      },
      CP15_EVIDENCE_FLAGS,
    ),
  );
});

router.get("/parameter-sets/:parameterSetId/backtest-evidence", (req, res) => {
  const bundle = backtestEvidence.evidenceBundleForParameterSet(req.params.parameterSetId);
  if (!bundle) {
    res.status(404).json(errResponse([{ ...MAPAZAPP_ERROR_PARAMETER_SET_NOT_FOUND, detail: req.params.parameterSetId }]));
    return;
  }
  res.json(okResponse(bundle, CP15_EVIDENCE_FLAGS));
});

router.get("/parameter-sets/:parameterSetId/approval-proposal", (req, res) => {
  const proposal = backtestEvidence.approvalProposalForParameterSet(req.params.parameterSetId);
  if (!proposal) {
    res.status(404).json(errResponse([{ ...MAPAZAPP_ERROR_PARAMETER_SET_NOT_FOUND, detail: req.params.parameterSetId }]));
    return;
  }
  res.json(okResponse(proposal, CP15_EVIDENCE_FLAGS));
});

router.get("/accounts/:accountId/parameter-sets/:parameterSetId/compatibility", (req, res) => {
  const { accountId, parameterSetId } = req.params;
  if (!accounts.findAccount(accountId)) {
    res.status(404).json(errResponse([{ ...MAPAZAPP_ERROR_ACCOUNT_NOT_FOUND, detail: accountId }]));
    return;
  }
  if (!registry.getParameterSetById(parameterSetId)) {
    res.status(404).json(errResponse([{ ...MAPAZAPP_ERROR_PARAMETER_SET_NOT_FOUND, detail: parameterSetId }]));
    return;
  }
  res.json(okResponse(registry.compatibilityForAccount(accountId as AccountId, parameterSetId)));
});

router.get("/backtests", (_req, res) => {
  res.json(okResponse(backtests.listBacktests()));
});

router.get("/backtests/:parameterSetId/advisory", (req, res) => {
  const adv = backtests.advisoryForParameterSet(req.params.parameterSetId);
  res.json(
    okResponse(
      { parameterSetId: req.params.parameterSetId, advisory: adv },
      { warnings: adv ? [] : ["NO_CHECKPOINT8_FIXTURE_FOR_PARAMETER_SET"] },
    ),
  );
});

router.get("/bridge/mock-import-summary", (_req, res) => {
  res.json(okResponse(bridge.loadMockBridgeImportSummary()));
});

const FORWARD_MONITOR_FLAGS = {
  reviewOnly: true as const,
  executionEnabled: false as const,
  mockOnly: true as const,
};

router.get("/forward-monitor/latest", (_req, res) => {
  res.json(okResponse(forwardMonitor.latestForwardMonitor(), FORWARD_MONITOR_FLAGS));
});

router.get("/forward-monitor/sessions", (_req, res) => {
  res.json(okResponse({ sessions: forwardMonitor.listForwardMonitorSessions() }, FORWARD_MONITOR_FLAGS));
});

router.get("/accounts/:accountId/forward-monitor/latest", (req, res) => {
  const { accountId } = req.params;
  if (!accounts.findAccount(accountId)) {
    res.status(404).json(errResponse([{ ...MAPAZAPP_ERROR_ACCOUNT_NOT_FOUND, detail: accountId }]));
    return;
  }
  res.json(okResponse(forwardMonitor.latestForwardMonitorForAccount(accountId as AccountId), FORWARD_MONITOR_FLAGS));
});

const ASSISTED_EXECUTION_FLAGS = assistedExecution.CP17_FLAGS;

router.get("/assisted-execution/contract", (_req, res) => {
  res.json(okResponse(assistedExecution.assistedExecutionContractPayload(), ASSISTED_EXECUTION_FLAGS));
});

router.get("/assisted-execution/safety", (_req, res) => {
  res.json(okResponse(assistedExecution.assistedExecutionSafetyPayload(), ASSISTED_EXECUTION_FLAGS));
});

router.get("/assisted-execution/invariants", (_req, res) => {
  res.json(okResponse(assistedExecution.assistedExecutionInvariantsPayload(), ASSISTED_EXECUTION_FLAGS));
});

router.get("/assisted-execution/mock-validation", (_req, res) => {
  res.json(
    okResponse(assistedExecution.mockAssistedExecutionValidation(), ASSISTED_EXECUTION_FLAGS),
  );
});

router.get("/accounts/:accountId/assisted-execution/mock-validation", (req, res) => {
  const { accountId } = req.params;
  if (!accounts.findAccount(accountId)) {
    res.status(404).json(errResponse([{ ...MAPAZAPP_ERROR_ACCOUNT_NOT_FOUND, detail: accountId }]));
    return;
  }
  res.json(
    okResponse(assistedExecution.mockAssistedExecutionValidationForAccount(accountId as AccountId), ASSISTED_EXECUTION_FLAGS),
  );
});

export default router;
