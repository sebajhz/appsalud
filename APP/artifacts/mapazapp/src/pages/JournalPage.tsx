import { useState } from 'react';
import { Layout, useActiveAccount } from '@/components/Layout';
import { DirectionBadge } from '@/components/StatusBadge';
import { mockJournalTrades } from '@/mock/journal';
import { mockConfig } from '@/mock/config';
import { AlertTriangle } from 'lucide-react';

const outcomeConfig = {
  WIN:       { label: 'Win',       className: 'text-emerald-400' },
  LOSS:      { label: 'Loss',      className: 'text-red-400' },
  BREAKEVEN: { label: 'Breakeven', className: 'text-slate-400' },
};

const emotionConfig = {
  CALM:       { label: 'Calm',      className: 'bg-slate-700 text-slate-300' },
  RUSHED:     { label: 'Rushed',    className: 'bg-amber-900/70 text-amber-300' },
  FEARFUL:    { label: 'Fearful',   className: 'bg-orange-900/70 text-orange-300' },
  CONFIDENT:  { label: 'Confident', className: 'bg-blue-900/70 text-blue-300' },
  IMPULSIVE:  { label: 'Impulsive', className: 'bg-red-900/70 text-red-300' },
};

const complianceConfig = {
  COMPLIANT:        { label: 'Compliant',       className: 'text-emerald-400' },
  MINOR_DEVIATION:  { label: 'Minor Deviation', className: 'text-amber-400' },
  MAJOR_DEVIATION:  { label: 'Major Deviation', className: 'text-red-400' },
};

export default function JournalPage() {
  const { activeAccountId } = useActiveAccount();
  const [filterAccountId, setFilterAccountId] = useState<string>('ALL');

  const filteredTrades = filterAccountId === 'ALL'
    ? mockJournalTrades
    : mockJournalTrades.filter(t => t.accountId === filterAccountId);

  const wins     = filteredTrades.filter(t => t.outcome === 'WIN').length;
  const losses   = filteredTrades.filter(t => t.outcome === 'LOSS').length;
  const impulse  = filteredTrades.filter(t => t.isImpulseTrade).length;
  const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnlUsd, 0);
  const avgR     = filteredTrades.length > 0
    ? filteredTrades.reduce((sum, t) => sum + t.resultR, 0) / filteredTrades.length
    : 0;

  return (
    <Layout title="Journal">
      <div className="space-y-5">
        {/* Account filter */}
        <div className="flex items-center gap-3" data-testid="journal-account-filter">
          <span className="text-xs text-slate-500">Filter by account:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterAccountId('ALL')}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${filterAccountId === 'ALL' ? 'bg-blue-700 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
              data-testid="filter-all-accounts"
            >
              All Accounts
            </button>
            {mockConfig.accounts.map(acc => (
              <button
                key={acc.accountId}
                onClick={() => setFilterAccountId(acc.accountId)}
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${filterAccountId === acc.accountId ? 'bg-blue-700 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
                data-testid={`filter-account-${acc.accountId}`}
              >
                {acc.displayName}
              </button>
            ))}
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Trades',  value: String(filteredTrades.length),        color: 'text-white' },
            { label: 'Wins / Losses', value: `${wins} / ${losses}`,                color: 'text-white' },
            { label: 'Impulse Trades',value: String(impulse),                       color: impulse > 0 ? 'text-amber-400' : 'text-emerald-400' },
            { label: 'Total P&L',     value: `$${totalPnL.toFixed(2)}`,             color: totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400' },
            { label: 'Avg R',         value: `${avgR >= 0 ? '+' : ''}${avgR.toFixed(2)}R`, color: avgR >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-slate-800 bg-card p-4" data-testid={`journal-summary-${label.toLowerCase().replace(/\s/g, '-')}`}>
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-slate-800 overflow-x-auto" data-testid="journal-table">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Symbol</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Dir</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Entry</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Exit</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">P&L $</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">R</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Outcome</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Emotion</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTrades.map(trade => {
                const oc = outcomeConfig[trade.outcome];
                const ec = emotionConfig[trade.emotionalState];
                const cc = complianceConfig[trade.ruleCompliance];
                const isActive = trade.accountId === activeAccountId;
                return (
                  <tr
                    key={trade.id}
                    className={`hover:bg-slate-800/30 transition-colors ${trade.isImpulseTrade ? 'bg-amber-950/10' : ''}`}
                    data-testid={`journal-trade-${trade.id}`}
                  >
                    <td className="px-3 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                      {new Date(trade.date).toLocaleDateString()}
                      {trade.isImpulseTrade && (
                        <span className="ml-1" title="Impulse trade">
                          <AlertTriangle className="inline w-3 h-3 text-amber-400" />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs truncate max-w-[120px] block ${isActive ? 'text-blue-300' : 'text-slate-500'}`}>
                        {trade.accountDisplayName}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-white">{trade.symbol}</td>
                    <td className="px-3 py-3"><DirectionBadge direction={trade.direction} /></td>
                    <td className="px-3 py-3 text-right text-slate-300 font-mono text-xs">{trade.entryPrice}</td>
                    <td className="px-3 py-3 text-right text-slate-300 font-mono text-xs">{trade.exitPrice}</td>
                    <td className={`px-3 py-3 text-right font-bold text-sm ${oc.className}`}>
                      {trade.pnlUsd > 0 ? '+' : ''}{trade.pnlUsd.toFixed(2)}
                    </td>
                    <td className={`px-3 py-3 text-right font-bold text-xs ${trade.resultR >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.resultR >= 0 ? '+' : ''}{trade.resultR}R
                    </td>
                    <td className={`px-3 py-3 font-semibold text-sm ${oc.className}`}>{oc.label}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ec.className}`}>
                        {ec.label}
                      </span>
                    </td>
                    <td className={`px-3 py-3 text-xs font-semibold ${cc.className}`}>{cc.label}</td>
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
