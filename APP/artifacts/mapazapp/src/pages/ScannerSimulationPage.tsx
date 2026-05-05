import { useMemo } from "react";
import { Layout, useViewMode, useActiveAccount } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TradeReviewStatusBadge } from "@/components/StatusBadge";
import { createMockScannerSimulationDataSource } from "@/services/mockScannerSimulationDataSource";
import {
  scannerSimulationSimpleHeadline,
  scannerSimulationTopDiagnostics,
} from "@/services/scannerSimulationUi";
import type { AccountId } from "@workspace/mapazapp-core";

export default function ScannerSimulationPage() {
  const { isTechnical } = useViewMode();
  const { activeAccountId } = useActiveAccount();
  const ds = useMemo(() => createMockScannerSimulationDataSource(), []);
  const result = useMemo(
    () => ds.getLatestSimulationForAccount(activeAccountId as AccountId),
    [ds, activeAccountId],
  );

  const headline = scannerSimulationSimpleHeadline(result);
  const diagTop = scannerSimulationTopDiagnostics(result);

  return (
    <Layout title="Scanner simulation (mock)" supportsViewToggle>
      <div className="p-6 space-y-6 max-w-4xl">
        <div
          className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
          data-testid="scanner-simulation-banner"
        >
          <strong className="text-amber-50">Scanner simulation only</strong> — not live MT5 data. In-memory
          fixture replay; no execution, no real bridge, no profitability claim.
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p className="text-slate-100">{headline}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
              <dt>Status</dt>
              <dd className="text-slate-200">{result.status}</dd>
              <dt>Source</dt>
              <dd className="text-slate-200">{result.run.sourceType}</dd>
              <dt>Account</dt>
              <dd className="text-slate-200">{result.run.accountId}</dd>
              <dt>Symbol / TF</dt>
              <dd className="text-slate-200">
                {result.run.canonicalSymbol} · {result.run.timeframe}
              </dd>
              <dt>Candidates</dt>
              <dd className="text-slate-200">{result.candidates.length}</dd>
              <dt>Run id</dt>
              <dd className="text-slate-200 break-all">{result.run.runId}</dd>
            </dl>
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-800">
              Flags: mockOnly={String(result.mockOnly)}, reviewOnly={String(result.reviewOnly)},
              executionEnabled={String(result.executionEnabled)}, simulatedScanner=
              {String(result.simulatedScanner)}
            </p>
          </CardContent>
        </Card>

        {result.candidates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Candidates (trade review)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.candidates.map((c) => (
                <div
                  key={c.zoneCandidate.zoneId}
                  className="rounded border border-slate-800 p-3 text-sm flex flex-wrap items-center gap-3"
                >
                  <span className="font-mono text-xs text-slate-400">{c.zoneCandidate.zoneId}</span>
                  <TradeReviewStatusBadge status={c.tradeReviewEvaluation.plan.status} />
                  {isTechnical && (
                    <span className="text-xs text-slate-500">
                      score {c.strategyScore?.total ?? "—"} · registry{" "}
                      {c.registryCompatibility.allowTradeReview ? "ok" : "blocked"}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Diagnostics</CardTitle>
          </CardHeader>
          <CardContent>
            {diagTop.length === 0 ? (
              <p className="text-sm text-slate-500">No diagnostics.</p>
            ) : (
              <ul className="text-xs font-mono text-slate-400 space-y-1">
                {diagTop.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {isTechnical && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Technical</CardTitle>
            </CardHeader>
            <CardContent className="text-xs font-mono text-slate-400 space-y-2 break-all">
              <div>strategyId={result.run.strategyId}</div>
              <div>parameterSetId={result.run.parameterSetId}</div>
              <div>account guard allowTradeReview={String(result.accountGuardResult.allowTradeReview)}</div>
              <div>registry allowTradeReview={String(result.registryCompatibility.allowTradeReview)}</div>
              {result.detection && (
                <div>
                  detection: swings={result.detection.diagnostics.swingCount} fvg=
                  {result.detection.diagnostics.fvgCount} ifvg={result.detection.diagnostics.ifvgCount}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
