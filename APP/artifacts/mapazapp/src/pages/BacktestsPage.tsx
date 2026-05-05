import { Layout, useActiveAccount } from '@/components/Layout';
import { BacktestStatusBadge } from '@/components/StatusBadge';
import { mockBacktests } from '@/mock/backtests';
import { Link } from 'wouter';
import { CheckCircle, XCircle } from 'lucide-react';
import { MOCK_CHECKPOINT7_STRATEGY_REGISTRY } from '@/services/mockTradeReviewDataSource';
import { getCheckpoint8MockApprovalForParameterSet } from '@workspace/mapazapp-core';

function registryParameterSetStatus(parameterSetId: string): string {
  const ps = MOCK_CHECKPOINT7_STRATEGY_REGISTRY.parameterSets.find((p) => p.parameterSetId === parameterSetId);
  return ps?.status ?? '—';
}

/** Checkpoint 8 advisory label from core fixtures (fictional); not live import. */
function checkpoint8AdvisoryLabel(parameterSetId: string): string {
  const a = getCheckpoint8MockApprovalForParameterSet(parameterSetId);
  if (!a) return '—';
  return `${a.status} · ${a.approvedFor}`;
}

export default function BacktestsPage() {
  const { activeAccountId, activeAccount } = useActiveAccount();

  return (
    <Layout title="Backtests">
      <div className="space-y-5">
        <p className="text-sm text-slate-400">
          Parameter sets shown here are mock backtest rows. Formal lifecycle status for trade review vs alerts comes from
          the checkpoint 7 strategy registry (<span className="font-mono text-slate-500">Registry status</span> column).
          <span className="font-mono text-slate-500"> CP8 import eval</span> shows a fictional advisory outcome from core
          checkpoint-8 fixtures (CSV/backtest model skeleton — not MT5). There is no live scanner in this build.
        </p>
        <p className="text-xs">
          <Link href="/parameter-sets" className="text-blue-400 hover:text-blue-300" data-testid="link-strategy-sets-from-backtests">
            Strategy &amp; parameter sets inspector (read-only)
          </Link>
        </p>

        <div className="rounded-lg border border-slate-800 overflow-x-auto" data-testid="backtests-table">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Registry status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">CP8 import eval</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Symbol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">TF</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Win %</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">PF</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Max DD</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Net %</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Trades</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Acct</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {mockBacktests.map(bt => {
                const allowedForActive = bt.allowedAccountIds.includes(activeAccountId);
                return (
                  <tr
                    key={bt.id}
                    className={`hover:bg-slate-800/30 transition-colors ${bt.status === 'REJECTED' ? 'opacity-60' : ''}`}
                    data-testid={`backtest-row-${bt.id}`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-slate-200 font-medium">{bt.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{bt.id}</p>
                    </td>
                    <td className="px-4 py-3"><BacktestStatusBadge status={bt.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400" title="From checkpoint 7 mock registry">
                      {registryParameterSetStatus(bt.id)}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs text-slate-500 max-w-[14rem] truncate"
                      title="Checkpoint 8 fictional import + advisory evaluation (core fixtures)"
                      data-testid={`backtest-cp8-${bt.id}`}
                    >
                      {checkpoint8AdvisoryLabel(bt.id)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{bt.symbol}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{bt.timeframe}</td>
                    <td className="px-4 py-3 text-right">
                      {bt.status === 'PENDING' ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <span className={bt.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>{bt.winRate}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {bt.status === 'PENDING' ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <span className={bt.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400'}>{bt.profitFactor}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {bt.status === 'PENDING' ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <span className={bt.maxDrawdownPct > 10 ? 'text-red-400' : 'text-slate-300'}>{bt.maxDrawdownPct}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {bt.status === 'PENDING' ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <span className={bt.netProfitPct >= 0 ? 'text-emerald-400' : 'text-red-400'}>{bt.netProfitPct > 0 ? '+' : ''}{bt.netProfitPct}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">{bt.totalTrades || '—'}</td>
                    <td className="px-4 py-3 text-center" data-testid={`backtest-allowed-${bt.id}`}>
                      {bt.status === 'APPROVED' ? (
                        allowedForActive ? (
                          <span className="inline-flex mx-auto" title="Allowed for active account">
                            <CheckCircle className="w-4 h-4 text-emerald-400" aria-hidden />
                          </span>
                        ) : (
                          <span className="inline-flex mx-auto" title="Not allowed for active account">
                            <XCircle className="w-4 h-4 text-slate-600" aria-hidden />
                          </span>
                        )
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/backtests/${bt.id}`} className="text-xs text-blue-400 hover:text-blue-300" data-testid={`view-backtest-${bt.id}`}>View</Link>
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
