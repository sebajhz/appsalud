import { Layout } from '@/components/Layout';
import { BacktestStatusBadge, DirectionBadge } from '@/components/StatusBadge';
import { mockBacktests } from '@/mock/backtests';
import { Link, useParams } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function BacktestDetailPage() {
  const params = useParams<{ id: string }>();
  const bt = mockBacktests.find(b => b.id === params.id);

  if (!bt) {
    return (
      <Layout title="Backtest Detail">
        <div className="text-center py-12" data-testid="backtest-not-found">
          <p className="text-slate-400">Backtest not found.</p>
          <Link href="/backtests" className="text-blue-400 text-sm mt-2 inline-block">Back to backtests</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Backtest Detail">
      <div className="space-y-5 max-w-3xl">
        <Link href="/backtests" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 w-fit" data-testid="back-to-backtests">
          <ArrowLeft className="w-3 h-3" /> Back to backtests
        </Link>

        {/* Header */}
        <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="backtest-detail-header">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h2 className="text-lg font-bold text-white">{bt.name}</h2>
            <BacktestStatusBadge status={bt.status} />
          </div>
          <p className="text-xs font-mono text-slate-500">
            id: {bt.id} · strategy_id: {bt.strategy_id} · {bt.dateRangeFrom} → {bt.dateRangeTo}
          </p>
          {bt.rejectedReason && (
            <div className="mt-3 rounded-md border border-red-800 bg-red-950/30 p-3 text-sm text-red-300" data-testid="backtest-rejected-reason">
              {bt.rejectedReason}
            </div>
          )}
          {bt.approvedAt && (
            <p className="text-xs text-emerald-500 mt-2">Approved: {new Date(bt.approvedAt).toLocaleString()}</p>
          )}
        </div>

        {bt.status !== 'PENDING' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="backtest-stats">
              {[
                { label: 'Win Rate', value: `${bt.winRate}%`, color: bt.winRate >= 50 ? 'text-emerald-400' : 'text-red-400' },
                { label: 'Profit Factor', value: String(bt.profitFactor), color: bt.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400' },
                { label: 'Max Drawdown', value: `${bt.maxDrawdownPct}%`, color: bt.maxDrawdownPct > 10 ? 'text-red-400' : 'text-slate-200' },
                { label: 'Net Profit', value: `${bt.netProfitPct > 0 ? '+' : ''}${bt.netProfitPct}%`, color: bt.netProfitPct >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { label: 'Total Trades', value: String(bt.totalTrades), color: 'text-slate-200' },
                { label: 'Symbol', value: bt.symbol, color: 'text-slate-200' },
                { label: 'Timeframe', value: bt.timeframe, color: 'text-slate-200' },
                { label: 'parameter_set_id', value: bt.id, color: 'text-slate-500 font-mono text-xs' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg border border-slate-800 bg-card p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-base font-bold mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Equity curve placeholder */}
            <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="backtest-equity-curve">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Equity Curve (Mock)</h3>
              <div className="h-40 rounded-md bg-slate-800/40 flex items-end gap-1 p-3 overflow-hidden">
                {[100, 102, 101, 104, 103, 107, 109, 108, 111, 110, 114, 118, 116, 120, 122].map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-blue-600/60 rounded-sm"
                    style={{ height: `${((v - 98) / 26) * 100}%` }}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-2">Visual mock only — not generated from real trade data</p>
            </div>
          </>
        )}

        {/* Trade list */}
        {bt.trades && bt.trades.length > 0 && (
          <div className="rounded-lg border border-slate-800 overflow-hidden" data-testid="backtest-trades-table">
            <div className="px-4 py-3 bg-slate-800/60">
              <h3 className="text-sm font-semibold text-slate-300">Sample Trades</h3>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-800/30">
                <tr>
                  <th className="text-left px-4 py-2 text-slate-500">Entry</th>
                  <th className="text-left px-4 py-2 text-slate-500">Exit</th>
                  <th className="text-left px-4 py-2 text-slate-500">Dir</th>
                  <th className="text-right px-4 py-2 text-slate-500">Entry Price</th>
                  <th className="text-right px-4 py-2 text-slate-500">Exit Price</th>
                  <th className="text-right px-4 py-2 text-slate-500">P&L %</th>
                  <th className="text-left px-4 py-2 text-slate-500">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {bt.trades.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/20" data-testid={`backtest-trade-${t.id}`}>
                    <td className="px-4 py-2 text-slate-400 font-mono">{new Date(t.entryTime).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-slate-400 font-mono">{new Date(t.exitTime).toLocaleDateString()}</td>
                    <td className="px-4 py-2"><DirectionBadge direction={t.direction} /></td>
                    <td className="px-4 py-2 text-right text-slate-300">{t.entryPrice}</td>
                    <td className="px-4 py-2 text-right text-slate-300">{t.exitPrice}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${t.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.pnlPct > 0 ? '+' : ''}{t.pnlPct}%
                    </td>
                    <td className="px-4 py-2">
                      <span className={`font-semibold ${t.outcome === 'WIN' ? 'text-emerald-400' : t.outcome === 'LOSS' ? 'text-red-400' : 'text-slate-400'}`}>
                        {t.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
