import { Layout, useViewMode, useActiveAccount } from '@/components/Layout';
import { mockPropFirmByAccount } from '@/mock/propfirm';
import { AlertTriangle, CheckCircle, TrendingUp, Shield, Calendar } from 'lucide-react';

const statusConfig = {
  ON_TRACK: { label: 'On Track', className: 'bg-emerald-900 text-emerald-300' },
  AT_RISK:  { label: 'At Risk',  className: 'bg-amber-900 text-amber-300' },
  BREACHED: { label: 'Breached', className: 'bg-red-900 text-red-300' },
};

const consistencyConfig = {
  COMPLIANT: { label: 'Compliant', className: 'text-emerald-400' },
  AT_RISK:   { label: 'At Risk',   className: 'text-amber-400' },
  VIOLATED:  { label: 'Violated',  className: 'text-red-400' },
};

function ProgressBar({ pct, color = 'bg-blue-500' }: { pct: number; color?: string }) {
  return (
    <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function PropFirmContent() {
  const { isTechnical } = useViewMode();
  const { activeAccountId, activeAccount } = useActiveAccount();
  const pf = mockPropFirmByAccount[activeAccountId] ?? mockPropFirmByAccount['ACC_THE5ERS_100K_PHASE1_A'];
  const sc = statusConfig[pf.status];

  const profitProgress    = (pf.profitAchievedPercent / pf.profitTargetPercent) * 100;
  const dailyLossProgress = (pf.dailyDrawdownRule > 0) ? 0 : 0; // rule threshold, not current usage — shown as reference
  const daysProgress      = pf.minimumTradingDaysRequired > 0
    ? (pf.currentTradingDays / pf.minimumTradingDaysRequired) * 100
    : 100;
  const profitDaysProgress = pf.profitableDaysRequired > 0
    ? (pf.currentProfitableDays / pf.profitableDaysRequired) * 100
    : 100;
  const consistencyProgress = pf.consistencyEnabled && pf.totalProfitForPhase > 0
    ? (pf.bestDayProfit / pf.totalProfitForPhase) * 100
    : 0;

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Header */}
      <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="propfirm-status-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">{pf.firmName} — {pf.challengePhase}</h2>
            <p className="text-sm text-slate-400">{pf.programName} · Account ${pf.accountSize.toLocaleString()}</p>
            <p className="text-xs text-slate-500 font-mono mt-1">{activeAccount.displayName} · MT5 {activeAccount.accountLogin}</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-semibold uppercase shrink-0 ${sc.className}`}>
            {sc.label}
          </span>
        </div>
        {!isTechnical && (
          <p className="text-sm text-slate-400 mt-3">
            {pf.currentTradingDays} trading day{pf.currentTradingDays !== 1 ? 's' : ''} completed.
            Profit achieved: {pf.profitAchievedPercent.toFixed(2)}% of {pf.profitTargetPercent}% target
            (${pf.profitAchievedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}).
          </p>
        )}
      </div>

      {/* Profit progress */}
      <div className="rounded-lg border border-slate-800 bg-card p-5 space-y-3" data-testid="propfirm-profit-card">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-300">
            {isTechnical ? 'profit_target' : 'Profit Target'}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-slate-500">{isTechnical ? 'profit_achieved_amount' : 'Profit Achieved'}</p>
            <p className="text-emerald-400 font-bold text-base mt-0.5">
              ${pf.profitAchievedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-slate-500 mt-0.5">{pf.profitAchievedPercent.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-slate-500">{isTechnical ? 'profit_target_amount' : 'Profit Target'}</p>
            <p className="text-slate-200 font-bold text-base mt-0.5">
              ${pf.profitTargetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-slate-500 mt-0.5">{pf.profitTargetPercent}%</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-500">Progress to target</span>
            <span className="font-mono text-slate-300">{profitProgress.toFixed(1)}%</span>
          </div>
          <ProgressBar pct={profitProgress} color="bg-blue-500" />
        </div>
      </div>

      {/* Drawdown rules */}
      <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="propfirm-drawdown-card">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-300">
            {isTechnical ? 'drawdown_rules' : 'Drawdown Rules'}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="rounded-md border border-slate-700 p-3">
            <p className="text-slate-500">{isTechnical ? 'daily_drawdown_rule' : 'Daily Loss Limit'}</p>
            <p className="text-slate-200 font-bold text-xl mt-1">{pf.dailyDrawdownRule}%</p>
            <p className="text-slate-600 mt-1">${((pf.accountSize * pf.dailyDrawdownRule) / 100).toLocaleString()} max</p>
          </div>
          <div className="rounded-md border border-slate-700 p-3">
            <p className="text-slate-500">{isTechnical ? 'max_drawdown_rule' : 'Max Drawdown Limit'}</p>
            <p className="text-slate-200 font-bold text-xl mt-1">{pf.maxDrawdownRule}%</p>
            <p className="text-slate-600 mt-1">${((pf.accountSize * pf.maxDrawdownRule) / 100).toLocaleString()} max</p>
          </div>
        </div>
      </div>

      {/* Trading days */}
      <div className="rounded-lg border border-slate-800 bg-card p-5 space-y-4" data-testid="propfirm-days-card">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-300">
            {isTechnical ? 'trading_day_requirements' : 'Trading Days'}
          </h3>
        </div>

        {/* Trading days */}
        <div data-testid="propfirm-meter-trading-days">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">{isTechnical ? 'current_trading_days / minimum_required' : 'Days Traded'}</span>
            <span className="text-slate-300 font-mono">
              {pf.currentTradingDays} / {pf.minimumTradingDaysRequired > 0 ? pf.minimumTradingDaysRequired : '∞'}
            </span>
          </div>
          <ProgressBar pct={daysProgress} color="bg-violet-500" />
          {pf.minimumTradingDaysRequired === 0 && (
            <p className="text-xs text-slate-600 mt-1">No minimum trading days required for this program.</p>
          )}
        </div>

        {/* Profitable days */}
        {pf.profitableDaysRequired > 0 && (
          <div data-testid="propfirm-meter-profitable-days">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">{isTechnical ? 'current_profitable_days / profitable_days_required' : 'Profitable Days'}</span>
              <span className="text-slate-300 font-mono">{pf.currentProfitableDays} / {pf.profitableDaysRequired}</span>
            </div>
            <ProgressBar pct={profitDaysProgress} color="bg-emerald-500" />
          </div>
        )}
      </div>

      {/* Consistency rule */}
      {pf.consistencyEnabled && (
        <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="propfirm-consistency-card">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            {isTechnical ? 'consistency_rule' : 'Consistency Rule'}
          </h3>
          <div className="grid grid-cols-3 gap-4 text-xs mb-4">
            <div>
              <p className="text-slate-500">{isTechnical ? 'best_day_profit' : 'Best Day Profit'}</p>
              <p className="text-slate-200 font-bold text-sm mt-0.5">${pf.bestDayProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-slate-500">{isTechnical ? 'total_profit_for_phase' : 'Total Profit'}</p>
              <p className="text-slate-200 font-bold text-sm mt-0.5">${pf.totalProfitForPhase.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-slate-500">{isTechnical ? 'consistency_status' : 'Status'}</p>
              <p className={`font-bold text-sm mt-0.5 ${consistencyConfig[pf.consistencyStatus].className}`}>
                {consistencyConfig[pf.consistencyStatus].label}
              </p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500">Best day / total profit ratio</span>
              <span className="font-mono text-slate-300">{consistencyProgress.toFixed(1)}%</span>
            </div>
            <ProgressBar pct={consistencyProgress} color={consistencyProgress > 50 ? 'bg-red-500' : 'bg-emerald-500'} />
            <p className="text-xs text-slate-600 mt-1">Best day must not exceed 50% of total profit.</p>
          </div>
        </div>
      )}

      {/* News trading rule */}
      <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="propfirm-news-card">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          {isTechnical ? 'news_trading_rule' : 'News Trading'}
        </h3>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-slate-500">{isTechnical ? 'news_trading_allowed' : 'News Trading'}</p>
            <p className={`font-bold text-sm mt-0.5 ${pf.newsTradingAllowed ? 'text-emerald-400' : 'text-red-400'}`}>
              {pf.newsTradingAllowed ? 'Allowed' : 'Blocked'}
            </p>
          </div>
          {!pf.newsTradingAllowed && (
            <>
              <div>
                <p className="text-slate-500">{isTechnical ? 'blackout_before_minutes' : 'Before Event'}</p>
                <p className="text-slate-200 font-bold text-sm mt-0.5">{pf.blackoutBeforeMinutes} min</p>
              </div>
              <div>
                <p className="text-slate-500">{isTechnical ? 'blackout_after_minutes' : 'After Event'}</p>
                <p className="text-slate-200 font-bold text-sm mt-0.5">{pf.blackoutAfterMinutes} min</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Warnings */}
      <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="propfirm-warnings-card">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          {isTechnical ? 'warnings' : 'Reminders'}
        </h3>
        {pf.warnings.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            No active warnings.
          </div>
        ) : (
          <div className="space-y-2">
            {pf.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border border-amber-800 bg-amber-950/30 p-3" data-testid={`propfirm-warning-${i}`}>
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-200">{w}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Technical raw */}
      {isTechnical && (
        <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="propfirm-technical-card">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Raw Fields</h3>
          <div className="space-y-1.5 font-mono text-xs">
            {[
              ['account_id', pf.accountId],
              ['firm_name', pf.firmName],
              ['program_name', pf.programName],
              ['challenge_phase', pf.challengePhase],
              ['account_size', String(pf.accountSize)],
              ['profit_target_amount', String(pf.profitTargetAmount)],
              ['profit_target_percent', `${pf.profitTargetPercent}%`],
              ['profit_achieved_amount', String(pf.profitAchievedAmount)],
              ['profit_achieved_percent', `${pf.profitAchievedPercent}%`],
              ['daily_drawdown_rule', `${pf.dailyDrawdownRule}%`],
              ['max_drawdown_rule', `${pf.maxDrawdownRule}%`],
              ['consistency_enabled', String(pf.consistencyEnabled)],
              ['best_day_profit', String(pf.bestDayProfit)],
              ['minimum_trading_days_required', String(pf.minimumTradingDaysRequired)],
              ['current_trading_days', String(pf.currentTradingDays)],
              ['profitable_days_required', String(pf.profitableDaysRequired)],
              ['current_profitable_days', String(pf.currentProfitableDays)],
              ['news_trading_allowed', String(pf.newsTradingAllowed)],
              ['status', pf.status],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <span className="text-slate-500 w-52 shrink-0">{k}:</span>
                <span className="text-slate-200">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PropFirmPage() {
  return (
    <Layout title="Prop Firm Guard" supportsViewToggle>
      <PropFirmContent />
    </Layout>
  );
}
