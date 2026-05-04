import { Layout, useActiveAccount } from '@/components/Layout';
import { BacktestStatusBadge } from '@/components/StatusBadge';
import { mockBacktests } from '@/mock/backtests';
import { Link } from 'wouter';
import { CheckCircle, XCircle } from 'lucide-react';

export default function BacktestsPage() {
  const { activeAccountId, activeAccount } = useActiveAccount();

  return (
    <Layout title="Backtests">
      <div className="space-y-5">
        <p className="text-sm text-slate-400">
          Parameter sets tested against historical data. Only APPROVED sets are used by the live scanner.
          The "Active Account" column shows whether the selected account (<span className="text-slate-300">{activeAccount.displayName}</span>) is allowed to use each set.
        </p>

        <div className="rounded-lg border border-slate-800 overflow-x-auto" data-testid="backtests-table">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
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
