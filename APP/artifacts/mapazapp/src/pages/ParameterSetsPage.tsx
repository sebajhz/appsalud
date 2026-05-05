import { useMemo } from "react";
import type { AccountId } from "@workspace/mapazapp-core";
import { Layout, useActiveAccount, useViewMode } from "@/components/Layout";
import { createMockStrategyRegistryDataSource } from "@/services/mockStrategyRegistryDataSource";
import {
  classifyParameterSetBadge,
  parameterSetBadgeLabel,
  simpleParameterSetStory,
} from "@/services/strategyRegistryUi";
import { getMockSymbolMarketSpec } from "@/services/mockSymbolProfiles";
import { Link } from "wouter";

function badgeClasses(kind: ReturnType<typeof classifyParameterSetBadge>): string {
  switch (kind) {
    case "trade_review_ok":
      return "bg-emerald-900/40 text-emerald-300 border-emerald-800";
    case "alerts_only":
      return "bg-amber-900/40 text-amber-200 border-amber-800";
    case "draft_not_approved":
      return "bg-slate-800 text-slate-300 border-slate-700";
    case "blocked_account":
      return "bg-rose-950/50 text-rose-300 border-rose-900";
    case "symbol_mismatch":
      return "bg-orange-950/40 text-orange-200 border-orange-900";
    case "retired_rejected":
      return "bg-slate-900 text-slate-500 border-slate-800";
    default:
      return "bg-slate-800 text-slate-400 border-slate-700";
  }
}

export default function ParameterSetsPage() {
  const { activeAccountId, activeAccount } = useActiveAccount();
  const { isTechnical } = useViewMode();
  const ds = useMemo(() => createMockStrategyRegistryDataSource(), []);

  const strategies = ds.getStrategies();
  const sets = ds.getParameterSetsForActiveAccount(activeAccountId as AccountId);

  return (
    <Layout title="Strategy & parameter sets" supportsViewToggle>
      <div className="space-y-5 max-w-5xl">
        <div className="rounded-md border border-blue-900/50 bg-blue-950/20 p-3 text-xs text-slate-300 space-y-1">
          <p>
            <span className="font-semibold text-blue-200">Read-only.</span> Mock in-memory registry (checkpoint 7). Settings
            cannot be edited here. Approval and backtest lines are mock/advisory only — they do not prove profitability and
            do not replace future MT5 / TestEA validation.
          </p>
          <p className="text-slate-500">
            Selected account: <span className="text-slate-200 font-medium">{activeAccount.displayName}</span> (
            <span className="font-mono text-slate-400">{activeAccountId}</span>)
          </p>
        </div>

        {strategies.map((st) => (
          <div key={st.strategyId} className="rounded-lg border border-slate-800 bg-card p-5 space-y-2" data-testid={`strategy-card-${st.strategyId}`}>
            <h2 className="text-base font-semibold text-white">{st.name}</h2>
            <p className="text-xs font-mono text-slate-500">
              strategyId: {st.strategyId} · family: {st.family} · status: {st.status}
            </p>
            <p className="text-xs text-slate-500">{st.description}</p>
          </div>
        ))}

        <div className="rounded-lg border border-slate-800 overflow-x-auto" data-testid="parameter-sets-table">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Parameter set</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Symbol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Registry status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">This account</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Review</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Alerts</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sets.map((ps) => {
                const spec = getMockSymbolMarketSpec(activeAccountId, ps.canonicalSymbol);
                const compat = ds.getParameterSetCompatibility(
                  activeAccountId as AccountId,
                  ps.parameterSetId,
                  ps.canonicalSymbol,
                  spec?.brokerSymbol,
                  "trade_review",
                );
                const kind = classifyParameterSetBadge(compat);
                const adv = ds.getParameterSetBacktestAdvisory(ps.parameterSetId);
                return (
                  <tr key={ps.parameterSetId} className="hover:bg-slate-800/20" data-testid={`ps-row-${ps.parameterSetId}`}>
                    <td className="px-4 py-3">
                      <p className="text-slate-200 font-medium">{ps.parameterSetId}</p>
                      {!isTechnical && (
                        <p className="text-xs text-slate-500 mt-1 max-w-md">{simpleParameterSetStory(compat)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                      {ps.canonicalSymbol}
                      {ps.brokerSymbol ? <span className="text-slate-500"> · {ps.brokerSymbol}</span> : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {ps.status} / {ps.approvalLevel}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded border ${badgeClasses(kind)}`}>
                        {parameterSetBadgeLabel(kind)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400">{compat.allowTradeReview ? "✓" : "—"}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{compat.allowAlert ? "✓" : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Link
                          href={`/parameter-sets/${encodeURIComponent(ps.parameterSetId)}`}
                          className="text-xs text-blue-400 hover:text-blue-300"
                          data-testid={`ps-detail-link-${ps.parameterSetId}`}
                        >
                          Inspect
                        </Link>
                        {adv && (
                          <span className="text-[10px] text-slate-600 font-mono" title="Checkpoint 8 advisory (mock)">
                            CP8: {adv.status}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
