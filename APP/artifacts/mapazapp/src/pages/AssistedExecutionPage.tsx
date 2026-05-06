import { useMemo } from "react";
import { Layout, useViewMode, useActiveAccount } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createMockAssistedExecutionDataSource } from "@/services/mockAssistedExecutionDataSource";
import {
  assistedExecutionContractExplanation,
  assistedExecutionDisabledBannerTitle,
  assistedExecutionFuturePhaseExplanation,
  assistedExecutionManualReviewBanner,
  assistedExecutionNoOrderDisclaimer,
  assistedExecutionSafetyChecklistLines,
  assistedExecutionSafetyHeadline,
  assistedExecutionTechnicalSummary,
} from "@/services/assistedExecutionUi";
import type { AccountId } from "@workspace/mapazapp-core";

export default function AssistedExecutionPage() {
  const { isTechnical } = useViewMode();
  const { activeAccountId } = useActiveAccount();
  const ds = useMemo(() => createMockAssistedExecutionDataSource(), []);
  const result = useMemo(
    () => ds.getMockAssistedExecutionValidation(activeAccountId as AccountId),
    [ds, activeAccountId],
  );
  const audit = result.auditPreview;

  return (
    <Layout title="Assisted execution (contract)" supportsViewToggle>
      <div className="p-6 space-y-6 max-w-4xl">
        <div
          className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-100"
          data-testid="assisted-execution-banner"
        >
          <p className="font-semibold text-red-50" data-testid="assisted-execution-disabled-title">
            {assistedExecutionDisabledBannerTitle()}
          </p>
          <p className="mt-2 text-red-100/95" data-testid="assisted-execution-no-order-disclaimer">
            {assistedExecutionNoOrderDisclaimer()}
          </p>
          <p className="mt-2 text-red-100/90">
            {assistedExecutionManualReviewBanner()} {assistedExecutionContractExplanation()}
          </p>
        </div>

        <Card data-testid="assisted-execution-safety-checklist-card">
          <CardHeader>
            <CardTitle className="text-base">Safety checklist (read-only)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
              {assistedExecutionSafetyChecklistLines().map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Simple view</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p className="text-slate-100" data-testid="assisted-execution-safety-headline">
              {assistedExecutionSafetyHeadline(result)}
            </p>
            <p className="text-amber-200/90" data-testid="assisted-execution-manual-only">
              Manual checklist only. No send-to-MT5, no command channel, no execution controls on this page.
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
              <dt>Account</dt>
              <dd className="text-slate-200">{audit.accountId}</dd>
              <dt>Symbol</dt>
              <dd className="text-slate-200">{audit.symbol || "—"}</dd>
              <dt>Requested action</dt>
              <dd className="text-slate-200">{audit.requestedAction}</dd>
              <dt>Trade review status</dt>
              <dd className="text-slate-200">{audit.tradeReviewStatus}</dd>
              <dt>registryMutationAllowed</dt>
              <dd className="text-slate-200">{String(audit.registryMutationAllowed)}</dd>
              <dt>manualReviewRequired</dt>
              <dd className="text-slate-200">{String(audit.manualReviewRequired)}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card data-testid="assisted-execution-future-phase-card">
          <CardHeader>
            <CardTitle className="text-base">Future phase only</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            <p>{assistedExecutionFuturePhaseExplanation()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required confirmations (model)</CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono text-slate-400 space-y-1">
            <div>Phrase required: {result.confirmationTextRequired}</div>
            <div className="pt-2 text-slate-500">Flags (effective)</div>
            <ul className="list-disc pl-4 text-slate-400">
              {Object.entries(result.humanConfirmationsEffective).map(([k, v]) => (
                <li key={k}>
                  {k}: {String(v)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card data-testid="assisted-execution-audit-preview-card">
          <CardHeader>
            <CardTitle className="text-base">Audit preview (in-memory)</CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono text-slate-400 space-y-1 break-all" data-testid="assisted-execution-audit-preview">
            <div>auditId={audit.auditId}</div>
            <div>validationStatus={audit.validationStatus}</div>
            <div>executionEnabled={String(audit.executionEnabled)} canAutoExecute={String(audit.canAutoExecute)}</div>
            <div className="pt-2 text-slate-500">blockingReasons</div>
            <ul className="list-disc pl-4">
              {audit.blockingReasons.length === 0 ? (
                <li>—</li>
              ) : (
                audit.blockingReasons.map((b) => (
                  <li key={b.code}>
                    {b.code}: {b.messageSimple}
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        {isTechnical && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Technical view</CardTitle>
            </CardHeader>
            <CardContent className="text-xs font-mono text-slate-400 break-all space-y-2">
              <div data-testid="assisted-execution-technical-summary">{assistedExecutionTechnicalSummary(result)}</div>
              <div className="pt-2 border-t border-slate-800">
                warningReasons: {result.warningReasons.map((w) => w.code).join(", ") || "—"}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
