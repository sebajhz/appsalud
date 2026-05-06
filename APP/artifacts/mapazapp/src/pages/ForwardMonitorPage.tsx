import { useMemo } from "react";
import { Layout, useViewMode, useActiveAccount } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TradeReviewStatusBadge } from "@/components/StatusBadge";
import { createMockForwardMonitorDataSource } from "@/services/mockForwardMonitorDataSource";
import {
  forwardMonitorCandidateNextStep,
  forwardMonitorStatusSimpleLabel,
} from "@/services/forwardMonitorUi";
import type { AccountId } from "@workspace/mapazapp-core";

export default function ForwardMonitorPage() {
  const { isTechnical } = useViewMode();
  const { activeAccountId } = useActiveAccount();
  const ds = useMemo(() => createMockForwardMonitorDataSource(), []);
  const result = useMemo(
    () => ds.getLatestForwardMonitorForAccount(activeAccountId as AccountId),
    [ds, activeAccountId],
  );

  const statusLabel = forwardMonitorStatusSimpleLabel(result.status);
  const counts = result.candidateCountsByReviewStatus;

  return (
    <Layout title="Forward monitor (mock)" supportsViewToggle>
      <div className="p-6 space-y-6 max-w-4xl">
        <div
          className="rounded-lg border border-cyan-900/50 bg-cyan-950/25 px-4 py-3 text-sm text-cyan-100"
          data-testid="forward-monitor-banner"
        >
          <strong className="text-cyan-50">Observational only</strong> — snapshot-based mock forward/demo monitor.
          No live folder watcher, no WebSocket, no database, no order execution. Not live trading advice.
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Simple view</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p className="text-slate-100">{statusLabel}</p>
            <p className="text-amber-200/90">
              Manual review only. No execution in this version.
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
              <dt>Account</dt>
              <dd className="text-slate-200">{result.accountId}</dd>
              <dt>Symbols</dt>
              <dd className="text-slate-200">{result.symbols.join(", ")}</dd>
              <dt>Timeframe</dt>
              <dd className="text-slate-200">{result.timeframe}</dd>
              <dt>Candidates (total)</dt>
              <dd className="text-slate-200">{result.candidates.length}</dd>
            </dl>
            <div className="text-xs text-slate-400 border-t border-slate-800 pt-2 space-y-1">
              <div>
                TRADE_READY: {counts.TRADE_READY} · WAIT_CONFIRMATION: {counts.WAIT_CONFIRMATION} · WAIT_RETEST:{" "}
                {counts.WAIT_RETEST} · OBSERVE: {counts.OBSERVE} · NO_TRADE: {counts.NO_TRADE}
              </div>
            </div>
          </CardContent>
        </Card>

        {result.candidates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Main candidates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.candidates.map((c) => (
                <div
                  key={`${c.symbol}-${c.candidateId}`}
                  className="rounded border border-slate-800 p-3 text-sm space-y-2"
                  data-testid={`forward-candidate-${c.candidateId}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-100">{c.symbol}</span>
                    <span className="text-xs text-slate-500">{c.direction}</span>
                    <TradeReviewStatusBadge status={c.reviewStatus} />
                  </div>
                  <p className="text-slate-300">{forwardMonitorCandidateNextStep(c)}</p>
                  <p className="text-xs text-slate-500">{c.simpleSummary}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {isTechnical && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Technical view</CardTitle>
            </CardHeader>
            <CardContent className="text-xs font-mono text-slate-400 space-y-2 break-all">
              <div>monitorRunId={result.monitorRunId}</div>
              <div>sourceType={result.sourceType}</div>
              <div>evaluationTimeUtc={result.evaluationTimeUtc}</div>
              <div>strategyId={result.strategyId}</div>
              <div>parameterSetId={result.parameterSetId}</div>
              <div>account guard allowTradeReview={String(result.accountState.allowTradeReview)}</div>
              <div>registry allowTradeReview={String(result.registryCompatibility?.allowTradeReview)}</div>
              <div>scanner refs: {result.scannerRunReferences.join(", ") || "—"}</div>
              <div>
                reviewOnly={String(result.reviewOnly)} executionEnabled={String(result.executionEnabled)} mockOnly=
                {String(result.mockOnly)} simulated={String(result.simulated)}
              </div>
              {result.candidates[0] && (
                <div className="pt-2 border-t border-slate-800">
                  reason codes: {result.candidates[0]!.technicalReasonCodes.join(", ") || "—"}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
