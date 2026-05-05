import { useMemo } from "react";
import type { AccountId } from "@workspace/mapazapp-core";
import { getCheckpoint8MockRunForParameterSet } from "@workspace/mapazapp-core";
import { Layout, useActiveAccount, useViewMode } from "@/components/Layout";
import { createMockStrategyRegistryDataSource } from "@/services/mockStrategyRegistryDataSource";
import { getMockSymbolMarketSpec } from "@/services/mockSymbolProfiles";
import {
  classifyParameterSetBadge,
  parameterSetBadgeLabel,
  simpleParameterSetStory,
  summarizeIfvgSettingsSimple,
  summarizeIfvgSettingsTechnical,
  tradeReadyPlainExplanation,
} from "@/services/strategyRegistryUi";
import { Link, useParams } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function ParameterSetDetailPage() {
  const params = useParams<{ parameterSetId: string }>();
  const parameterSetId = decodeURIComponent(params.parameterSetId ?? "");
  const { activeAccountId, activeAccount } = useActiveAccount();
  const { isTechnical } = useViewMode();
  const ds = useMemo(() => createMockStrategyRegistryDataSource(), []);

  const ps = ds.getParameterSetById(parameterSetId);
  const strategy = ps ? ds.getStrategyById(ps.strategyId) : null;

  const spec = ps ? getMockSymbolMarketSpec(activeAccountId, ps.canonicalSymbol) : undefined;
  const compatTradeReview = useMemo(() => {
    if (!ps) return null;
    return ds.getParameterSetCompatibility(
      activeAccountId as AccountId,
      ps.parameterSetId,
      ps.canonicalSymbol,
      spec?.brokerSymbol,
      "trade_review",
    );
  }, [ds, ps, activeAccountId, spec?.brokerSymbol]);

  const compatObserve = useMemo(() => {
    if (!ps) return null;
    return ds.getParameterSetCompatibility(
      activeAccountId as AccountId,
      ps.parameterSetId,
      ps.canonicalSymbol,
      spec?.brokerSymbol,
      "observe",
    );
  }, [ds, ps, activeAccountId, spec?.brokerSymbol]);

  const advisory = ps ? ds.getParameterSetBacktestAdvisory(ps.parameterSetId) : null;
  const cp8Run = ps ? getCheckpoint8MockRunForParameterSet(ps.parameterSetId) : null;

  if (!ps || !strategy || !compatTradeReview) {
    return (
      <Layout title="Parameter set" supportsViewToggle>
        <div className="text-center py-12" data-testid="parameter-set-not-found">
          <p className="text-slate-400">Parameter set not found.</p>
          <Link href="/parameter-sets" className="text-blue-400 text-sm mt-2 inline-block">
            Back to strategy &amp; sets
          </Link>
        </div>
      </Layout>
    );
  }

  const kind = classifyParameterSetBadge(compatTradeReview);
  const simpleRows = summarizeIfvgSettingsSimple(ps.settings);
  const technicalGroups = summarizeIfvgSettingsTechnical(ps.settings);

  return (
    <Layout title={`Parameter set · ${ps.parameterSetId}`} supportsViewToggle>
      <div className="space-y-5 max-w-3xl">
        <Link href="/parameter-sets" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 w-fit" data-testid="back-to-parameter-sets">
          <ArrowLeft className="w-3 h-3" /> Strategy &amp; parameter sets
        </Link>

        <div className="rounded-lg border border-slate-800 bg-card p-5 space-y-3" data-testid="parameter-set-detail-header">
          <h2 className="text-lg font-bold text-white font-mono">{ps.parameterSetId}</h2>
          <p className="text-sm text-slate-400">
            Strategy: <span className="text-slate-200">{strategy.name}</span> (
            <span className="font-mono text-xs">{strategy.strategyId}</span>)
          </p>
          <p className="text-xs text-slate-500">
            Selected account: <span className="text-slate-300">{activeAccount.displayName}</span> (
            <span className="font-mono">{activeAccountId}</span>)
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-card p-5 space-y-3" data-testid="parameter-set-trade-review-gate">
          <h3 className="text-sm font-semibold text-slate-300">Trade review (TRADE_READY registry gate)</h3>
          <p className="text-xs text-amber-200/90 border border-amber-900/40 bg-amber-950/20 rounded p-2">
            A detected setup is not enough. This parameter set must allow trade review for the active account and symbol
            before core can emit TRADE_READY (other gates still apply).
          </p>
          {!isTechnical ? (
            <div className="space-y-2 text-sm text-slate-300">
              <p>{simpleParameterSetStory(compatTradeReview)}</p>
              <p className="text-slate-400 text-xs">{tradeReadyPlainExplanation(compatTradeReview)}</p>
            </div>
          ) : (
            <div className="text-xs font-mono text-slate-400 space-y-1">
              <p>allowTradeReview: {String(compatTradeReview.allowTradeReview)}</p>
              <p>allowAlert: {String(compatTradeReview.allowAlert)}</p>
              <p>allowObserve: {String(compatTradeReview.allowObserve)}</p>
              <p>blockingReasons: {compatTradeReview.blockingReasons.join("; ") || "—"}</p>
              <p>warningReasons: {compatTradeReview.warningReasons.join("; ") || "—"}</p>
              <p>technicalSummary: {compatTradeReview.technicalSummary}</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-card p-5 space-y-2" data-testid="parameter-set-compatibility">
          <h3 className="text-sm font-semibold text-slate-300">Compatibility snapshot</h3>
          <p className="text-xs text-slate-500">
            Badge (this account, trade_review):{" "}
            <span className="font-mono text-slate-300">{parameterSetBadgeLabel(kind)}</span>
          </p>
          <div className="text-xs font-mono text-slate-400 space-y-1">
            <p>
              canonicalSymbol: {ps.canonicalSymbol} · brokerSymbol (set): {ps.brokerSymbol ?? "—"} · brokerSymbol (account
              mapping): {spec?.brokerSymbol ?? "—"}
            </p>
            <p>allowedAccountIds: {ps.allowedAccountIds.join(", ") || "—"}</p>
            <p>blockedAccountIds: {ps.blockedAccountIds.join(", ") || "—"}</p>
              <p>observe usage: allowObserve={String(compatObserve?.allowObserve)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-card p-5 space-y-3" data-testid="parameter-set-backtest-advisory">
          <h3 className="text-sm font-semibold text-slate-300">Backtest evidence (checkpoint 8)</h3>
          <p className="text-xs text-slate-500">
            Mock/advisory only — does not prove profitability. Real approval requires MT5 / TestEA validation later.
          </p>
          {advisory ? (
            <div className="text-xs font-mono text-slate-400 space-y-1">
              <p>
                status: {advisory.status} · approvedFor: {advisory.approvedFor} · datasetSplit:{" "}
                {cp8Run?.datasetSplit ?? "—"}
              </p>
              <p>
                PF:{" "}
                {advisory.metricSnapshot.profitFactor === Number.POSITIVE_INFINITY
                  ? "∞"
                  : advisory.metricSnapshot.profitFactor.toFixed(3)}{" "}
                · expectancyR: {advisory.metricSnapshot.expectancyR.toFixed(4)} · maxDrawdownR:{" "}
                {advisory.metricSnapshot.maxDrawdownR.toFixed(2)} · trades: {advisory.metricSnapshot.tradeCount}
              </p>
              <p>blocking: {advisory.blockingReasons.join(", ") || "—"}</p>
              <p>warnings: {advisory.warningReasons.join(", ") || "—"}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-600">No checkpoint-8 fixture for this parameter set id.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-card p-5 space-y-3" data-testid="parameter-set-settings-summary">
          <h3 className="text-sm font-semibold text-slate-300">IFVG strategy settings (read-only)</h3>
          {!isTechnical ? (
            <div className="grid grid-cols-2 gap-3">
              {simpleRows.map((row) => (
                <div key={row.label} className="rounded border border-slate-800 p-2">
                  <p className="text-[10px] text-slate-500 uppercase">{row.label}</p>
                  <p className="text-sm text-slate-200 font-mono">{row.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(technicalGroups).map(([group, fields]) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">{group}</p>
                  <div className="rounded border border-slate-800 p-2 font-mono text-[11px] text-slate-400 space-y-0.5">
                    {Object.entries(fields).map(([k, v]) => (
                      <p key={k}>
                        {k}: <span className="text-slate-300">{String(v)}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {ps.notes && <p className="text-xs text-slate-600 border border-slate-800 rounded p-3">{ps.notes}</p>}
      </div>
    </Layout>
  );
}
