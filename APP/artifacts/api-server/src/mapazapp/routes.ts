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

const router: IRouter = Router();

const CP15_EVIDENCE_FLAGS = {
  advisoryOnly: true as const,
  registryMutationAllowed: false as const,
  canAutoApply: false as const,
};

router.get("/health", (_req, res) => {
  res.json(
    okResponse({
      service: "mapazapp-api",
      checkpoint: 17,
      readOnly: true,
      mockData: "in-memory",
    }),
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
