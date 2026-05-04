import { useMemo } from 'react';
import type { AccountId } from '@workspace/mapazapp-core';
import { Layout, useViewMode, useActiveAccount } from '@/components/Layout';
import { OperationalStatusBadge } from '@/components/StatusBadge';
import { mockRiskByAccount } from '@/mock/risk';
import { createMockDashboardDataSource } from '@/services/mockTradeReviewDataSource';
import { CheckCircle, XCircle, AlertTriangle, TrendingDown, Activity } from 'lucide-react';

function ProgressBar({ pct, testId }: { pct: number; testId?: string }) {
  const color = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-3 rounded-full bg-slate-800 overflow-hidden" data-testid={testId}>
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function MoneyRow({ label, amount, pct, color = 'text-slate-200' }: { label: string; amount: number; pct?: number; color?: string }) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800 last:border-0">
      <span className="text-slate-400">{label}</span>
      <div className="text-right">
        <span className={`font-mono font-semibold ${color}`}>${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        {pct !== undefined && <span className="text-slate-500 ml-2">({pct.toFixed(2)}%)</span>}
      </div>
    </div>
  );
}

function RiskContent() {
  const { isTechnical } = useViewMode();
  const { activeAccountId, activeAccount } = useActiveAccount();
  const dashboard = useMemo(() => createMockDashboardDataSource(), []);
  const accountGuardEval = dashboard.getAccountGuardEvaluation(activeAccountId as AccountId);
  const risk = mockRiskByAccount[activeAccountId] ?? mockRiskByAccount['ACC_THE5ERS_100K_PHASE1_A'];

  const dailyUsedPct = (risk.dailyLossUsedPercent / risk.dailyLossLimitPercent) * 100;
  const maxUsedPct   = (risk.maxLossUsedAmount   / risk.maxLossLimitAmount)   * 100;
  const tradesPct    = (risk.tradesTakenToday    / risk.maxTradesPerDay)     * 100;

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Account identity + status */}
      <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="risk-status-card">
        <div className="flex items-start gap-3">
          {risk.tradingAllowed ? (
            <CheckCircle className="w-6 h-6 text-emerald-400 mt-0.5 shrink-0" />
          ) : (
            <XCircle className="w-6 h-6 text-red-400 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-lg font-bold text-white">Risk Guard</span>
              <OperationalStatusBadge status={risk.operationalStatus} />
            </div>
            <p className="text-xs text-slate-400 font-mono">{activeAccount.displayName} · MT5 {activeAccount.accountLogin}</p>
            {!isTechnical && (
              <p className="text-sm text-slate-400 mt-2">
                {risk.tradingAllowed
                  ? 'Trading is allowed. All limits are within acceptable bounds.'
                  : 'Trading is currently blocked. Review the reason below.'}
              </p>
            )}
          </div>
        </div>

        {risk.reason && (
          <div className="rounded-md bg-red-950/40 border border-red-800 p-3 text-sm text-red-300 mt-3">
            {risk.reason}
          </div>
        )}

        {isTechnical && (
          <div className="mt-3 pt-3 border-t border-slate-800 font-mono text-xs space-y-1">
            <div className="flex gap-3"><span className="text-slate-500 w-36">account_id:</span><span className="text-slate-300">{risk.accountId}</span></div>
            <div className="flex gap-3"><span className="text-slate-500 w-36">operational_status:</span><span className="text-slate-300">{risk.operationalStatus}</span></div>
            <div className="flex gap-3"><span className="text-slate-500 w-36">trading_allowed:</span><span className={risk.tradingAllowed ? 'text-emerald-400' : 'text-red-400'}>{String(risk.tradingAllowed)}</span></div>
            <div className="pt-2 text-slate-500">account_guard_eval (core, headline)</div>
            <div className="flex gap-3"><span className="text-slate-500 w-44">guard_status:</span><span className="text-slate-300">{accountGuardEval.status}</span></div>
            <div className="flex gap-3"><span className="text-slate-500 w-44">allow_trade_review:</span><span className={accountGuardEval.allowTradeReview ? 'text-emerald-400' : 'text-red-400'}>{String(accountGuardEval.allowTradeReview)}</span></div>
            <div className="flex gap-3"><span className="text-slate-500 w-44">blocking_codes:</span><span className="text-slate-300">{accountGuardEval.blockingReasons.map((b) => b.code).join(', ') || '—'}</span></div>
            <div className="flex gap-3"><span className="text-slate-500 w-44">warning_codes:</span><span className="text-slate-300">{accountGuardEval.warningReasons.map((w) => w.code).join(', ') || '—'}</span></div>
          </div>
        )}
      </div>

      {/* Balance & equity */}
      <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="risk-balance-card">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          {isTechnical ? 'account_snapshot' : 'Account Balances'}
        </h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          {[
            { label: isTechnical ? 'balance' : 'Balance', value: `$${risk.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
            { label: isTechnical ? 'equity' : 'Equity', value: `$${risk.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
            { label: isTechnical ? 'daily_start_balance' : 'Day Start Balance', value: `$${risk.dailyStartBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
            { label: isTechnical ? 'daily_start_equity' : 'Day Start Equity', value: `$${risk.dailyStartEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-slate-500">{label}</p>
              <p className="text-slate-200 font-semibold font-mono mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily drawdown */}
      <div className="rounded-lg border border-slate-800 bg-card p-5 space-y-3" data-testid="risk-daily-dd-card">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-300">
            {isTechnical ? 'daily_loss_limits' : 'Daily Drawdown'}
          </h3>
        </div>

        <MoneyRow label={isTechnical ? 'daily_loss_limit_amount' : 'Daily Limit'} amount={risk.dailyLossLimitAmount} pct={risk.dailyLossLimitPercent} />
        <MoneyRow label={isTechnical ? 'daily_loss_used_amount' : 'Used Today'} amount={risk.dailyLossUsedAmount} pct={risk.dailyLossUsedPercent} color="text-amber-400" />
        <MoneyRow label={isTechnical ? 'daily_loss_remaining_amount' : 'Remaining'} amount={risk.dailyLossRemainingAmount} pct={risk.dailyLossRemainingPercent} color="text-emerald-400" />

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-500">{isTechnical ? 'daily_loss_used_pct' : '% of daily limit used'}</span>
            <span className="font-mono text-slate-300">{dailyUsedPct.toFixed(1)}%</span>
          </div>
          <ProgressBar pct={dailyUsedPct} testId="risk-meter-daily-drawdown" />
        </div>
      </div>

      {/* Max drawdown */}
      <div className="rounded-lg border border-slate-800 bg-card p-5 space-y-3" data-testid="risk-max-dd-card">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-300">
            {isTechnical ? 'max_loss_limits' : 'Max Drawdown'}
          </h3>
        </div>

        <MoneyRow label={isTechnical ? 'max_loss_limit_amount' : 'Total Limit'} amount={risk.maxLossLimitAmount} pct={risk.maxLossLimitPercent} />
        <MoneyRow label={isTechnical ? 'max_loss_used_amount' : 'Used'} amount={risk.maxLossUsedAmount} color="text-amber-400" />
        <MoneyRow label={isTechnical ? 'max_loss_remaining_amount' : 'Remaining'} amount={risk.maxLossRemainingAmount} color="text-emerald-400" />

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-500">{isTechnical ? 'max_loss_used_pct' : '% of max drawdown used'}</span>
            <span className="font-mono text-slate-300">{maxUsedPct.toFixed(1)}%</span>
          </div>
          <ProgressBar pct={maxUsedPct} testId="risk-meter-max-drawdown" />
        </div>
      </div>

      {/* Trades & risk per trade */}
      <div className="rounded-lg border border-slate-800 bg-card p-5 space-y-3" data-testid="risk-trades-card">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-300">
            {isTechnical ? 'trade_limits' : 'Trade Limits'}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs">
          {[
            { label: isTechnical ? 'trades_taken_today' : 'Trades Today', value: String(risk.tradesTakenToday) },
            { label: isTechnical ? 'max_trades_per_day' : 'Max Per Day',  value: String(risk.maxTradesPerDay) },
            { label: isTechnical ? 'risk_per_trade_pct' : 'Risk / Trade', value: `${risk.riskPerTradePercent}%` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-slate-500">{label}</p>
              <p className="text-slate-200 font-bold text-base mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-500">{isTechnical ? 'trades_used_pct' : 'Trade slots used'}</span>
            <span className="font-mono text-slate-300">{risk.tradesTakenToday} / {risk.maxTradesPerDay}</span>
          </div>
          <ProgressBar pct={tradesPct} testId="risk-meter-trades" />
        </div>
      </div>

      {/* Violations */}
      <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="risk-violations-card">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          {isTechnical ? 'rule_violations' : 'Rule Violations'}
        </h3>
        {risk.violations.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            {isTechnical ? 'violations: []' : 'No violations — all rules are respected.'}
          </div>
        ) : (
          <div className="space-y-2">
            {risk.violations.map((v, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border border-red-800 bg-red-950/30 p-3" data-testid={`violation-${i}`}>
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-300">{v.rule}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{v.description}</p>
                  {isTechnical && <p className="text-xs font-mono text-slate-500 mt-1">triggered_at: {v.triggeredAt}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RiskPage() {
  return (
    <Layout title="Risk Guard" supportsViewToggle>
      <RiskContent />
    </Layout>
  );
}
