import { useMemo } from 'react';
import type { AccountId } from '@workspace/mapazapp-core';
import { Layout, useViewMode, useActiveAccount } from '@/components/Layout';
import {
  BridgeStateBadge,
  OperationalStatusBadge,
  ZoneStateBadge,
  DirectionBadge,
  TradeReviewStatusBadge,
} from '@/components/StatusBadge';
import { mockBridgeTerminals } from '@/mock/bridgeStatus';
import { mockAccountSnapshots } from '@/mock/account';
import { mockZones } from '@/mock/zones';
import { mockRiskByAccount } from '@/mock/risk';
import { Link } from 'wouter';
import { AlertTriangle, CheckCircle, Activity, DollarSign } from 'lucide-react';
import { createMockDashboardDataSource } from '@/services/mockTradeReviewDataSource';
import {
  buildTradeReviewExplanation,
  explanationMainReasonLines,
} from '@/services/tradeReviewExplanation';

function HomeContent() {
  const { isTechnical } = useViewMode();
  const { activeAccountId } = useActiveAccount();
  const dashboard = useMemo(() => createMockDashboardDataSource(), []);

  const account =
    dashboard.getAccountSnapshot(activeAccountId as AccountId) ??
    mockAccountSnapshots[activeAccountId] ??
    mockAccountSnapshots['ACC_THE5ERS_100K_PHASE1_A'];
  const risk     = mockRiskByAccount[activeAccountId]    ?? mockRiskByAccount['ACC_THE5ERS_100K_PHASE1_A'];
  const terminal = mockBridgeTerminals.find(t => t.accountId === activeAccountId) ?? mockBridgeTerminals[0];

  const accountGuardEval = dashboard.getAccountGuardEvaluation(activeAccountId as AccountId);
  const reviewPlans = dashboard.getTradeReviewPlansForAccount(activeAccountId as AccountId);
  const activeZones    = mockZones.filter(z => ['WATCHING', 'RETESTING', 'CONFIRMED', 'TRADE_READY'].includes(z.state));
  const coreTradeReadyPlans = reviewPlans.filter((r) => r.evaluation.plan.status === 'TRADE_READY');
  const recentAlerts   = dashboard.getAlertsForAccount(activeAccountId as AccountId).slice(0, 4);
  const dailyPnLPositive = account.dailyPnL >= 0;

  return (
    <div className="space-y-6">
      {/* Simple summary banner */}
      {!isTechnical && (
        <div className="rounded-lg border border-blue-800 bg-blue-950/40 px-5 py-4" data-testid="simple-summary-banner">
          <p className="text-sm font-medium text-blue-100">
            {coreTradeReadyPlans.length > 0
              ? `${coreTradeReadyPlans.map((r) => r.zone.symbol).join(', ')} — ${coreTradeReadyPlans.length === 1 ? 'one setup passes' : 'several setups pass'} core review checks for manual review (not execution).`
              : 'No setups are core review-ready right now. Keep watching.'}
          </p>
          <p className="text-xs text-blue-400 mt-1">
            {risk.tradingAllowed ? 'Risk is OK — trading is allowed.' : 'Trading is currently blocked by Risk Guard.'}
            {' '}Bridge is {terminal.state === 'BRIDGE_OK' ? 'connected and receiving data' : 'in a degraded state — check MT5 Bridge page'}.
          </p>
          {(!accountGuardEval.allowTradeReview || accountGuardEval.warningReasons.length > 0) && (
            <p className={`text-xs mt-2 ${accountGuardEval.allowTradeReview ? 'text-amber-300/90' : 'text-rose-300/90'}`} data-testid="home-account-guard-hint">
              Core account guard (review eligibility): {accountGuardEval.simpleSummary}
              {accountGuardEval.warningReasons.length > 0 && accountGuardEval.allowTradeReview && (
                <span className="block text-amber-400/80 mt-0.5">
                  {accountGuardEval.warningReasons[0]?.messageSimple}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Status row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-800 bg-card p-4" data-testid="card-bridge-status">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Bridge</span>
            <Activity className="w-4 h-4 text-slate-600" />
          </div>
          <BridgeStateBadge state={terminal.state} />
          {isTechnical && (
            <p className="text-xs text-slate-500 mt-2 font-mono">
              terminal: {terminal.terminalId} · last: {new Date(terminal.lastUpdate).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-card p-4" data-testid="card-risk-status">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Risk Guard</span>
            <CheckCircle className="w-4 h-4 text-slate-600" />
          </div>
          <OperationalStatusBadge status={risk.operationalStatus} />
          {isTechnical && (
            <p className="text-xs text-slate-500 mt-2 font-mono">
              daily_dd: {risk.dailyLossUsedPercent}% / {risk.dailyLossLimitPercent}%
            </p>
          )}
          {!isTechnical && (
            <p className="text-xs text-slate-500 mt-2">
              {risk.tradingAllowed ? 'Trading is allowed' : 'Trading is blocked'}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-card p-4" data-testid="card-active-zones">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Active Zones</span>
          </div>
          <p className="text-2xl font-bold text-white">{activeZones.length}</p>
          <p className="text-xs text-emerald-400 mt-1">{coreTradeReadyPlans.length} review-ready (core)</p>
          {isTechnical && (
            <p className="text-xs text-slate-500 mt-1 font-mono">total_zones: {mockZones.length}</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-card p-4" data-testid="card-daily-pnl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Daily P&L</span>
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <p className={`text-2xl font-bold ${dailyPnLPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {dailyPnLPositive ? '+' : ''}{account.dailyPnL.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{account.currency} · {account.challenge}</p>
          {isTechnical && (
            <p className="text-xs text-slate-500 mt-1 font-mono">equity: {account.equity.toFixed(2)}</p>
          )}
        </div>
      </div>

      {/* Account Snapshot */}
      <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="card-account-snapshot">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Account Snapshot</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">{isTechnical ? 'balance' : 'Balance'}</p>
            <p className="text-lg font-bold text-white mt-1">${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{isTechnical ? 'equity' : 'Equity'}</p>
            <p className="text-lg font-bold text-white mt-1">${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{isTechnical ? 'daily_drawdown_pct' : 'Daily Drawdown'}</p>
            <p className={`text-lg font-bold mt-1 ${account.dailyDrawdownPct > 1.5 ? 'text-amber-400' : 'text-slate-200'}`}>
              {account.dailyDrawdownPct}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{isTechnical ? 'open_trades' : 'Open Trades'}</p>
            <p className="text-lg font-bold text-white mt-1">{account.openTrades}</p>
          </div>
        </div>
        {isTechnical && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs font-mono text-slate-500">
              account_id: {account.accountId} · broker: {account.broker} · max_drawdown_pct: {account.maxDrawdownPct}%
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trade-Ready Zones */}
        <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="card-trade-ready-zones">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-300">Review-ready (core)</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Manual review only — no orders in this version.</p>
            </div>
            <Link href="/zones" className="text-xs text-blue-400 hover:text-blue-300" data-testid="link-view-all-zones">View all</Link>
          </div>
          {coreTradeReadyPlans.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No setups pass core review gates for this account right now</p>
          ) : (
            <div className="space-y-3">
              {coreTradeReadyPlans.map((row) => {
                const explanation = buildTradeReviewExplanation(row.evaluation);
                const reasonLines = explanationMainReasonLines(explanation, 2);
                return (
                <Link
                  key={row.zone.id}
                  href={`/zones/${row.zone.id}`}
                  className="block rounded-md border border-slate-700 bg-slate-800/50 p-3 hover:border-slate-600 transition-colors"
                  data-testid={`trade-ready-zone-${row.zone.id}`}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-white">{row.zone.symbol}</span>
                    <DirectionBadge direction={row.zone.direction} />
                    <ZoneStateBadge state={row.zone.state} />
                    <TradeReviewStatusBadge status={row.evaluation.plan.status} />
                    <span className="ml-auto text-xs text-slate-400">
                      Score: <span className="text-emerald-400 font-bold">{row.zone.score}</span>
                    </span>
                  </div>
                  {!isTechnical ? (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-300 line-clamp-2">{explanation.simpleSummary}</p>
                      {explanation.status === "TRADE_READY" && (
                        <p className="text-[10px] text-amber-400/90 font-medium">Manual review only — no auto execution.</p>
                      )}
                      {reasonLines.length > 0 && (
                        <ul className="text-[10px] text-slate-500 list-disc list-inside space-y-0.5">
                          {reasonLines.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-slate-500">
                      zone_id: {row.zone.id} · core_status: {row.evaluation.plan.status} · rr:{" "}
                      {row.evaluation.plan.metrics?.rr?.toFixed(2) ?? "—"} · gates:{" "}
                      {row.evaluation.failedHardGates.length ? row.evaluation.failedHardGates.join(",") : "none"}
                    </p>
                  )}
                </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="card-recent-alerts">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Recent Alerts</h2>
            <Link href="/alerts" className="text-xs text-blue-400 hover:text-blue-300" data-testid="link-view-all-alerts">View all</Link>
          </div>
          <div className="space-y-2">
            {recentAlerts.map(alert => (
              <div
                key={alert.id}
                className={`rounded-md p-3 border text-xs ${
                  alert.severity === 'CRITICAL' ? 'border-red-800 bg-red-950/30' :
                  alert.severity === 'WARNING'  ? 'border-amber-800 bg-amber-950/30' :
                  'border-slate-700 bg-slate-800/30'
                } ${alert.acknowledged ? 'opacity-50' : ''}`}
                data-testid={`recent-alert-${alert.id}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  {alert.severity === 'CRITICAL' && <AlertTriangle className="w-3 h-3 text-red-400" />}
                  {alert.severity === 'WARNING'  && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                  <span className="text-slate-400">{alert.source}</span>
                  {alert.accountDisplayName && (
                    <span className="text-slate-600 text-xs">{alert.accountDisplayName}</span>
                  )}
                  {alert.acknowledged && <span className="ml-auto text-slate-600">ack'd</span>}
                </div>
                <p className="text-slate-300">{isTechnical ? alert.message : alert.simpleMessage}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drawdown meters */}
      <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="card-drawdown-meters">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">
          {isTechnical ? 'Drawdown Metrics' : 'Risk Levels'}
        </h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">{isTechnical ? 'daily_loss_used_pct' : 'Daily Loss'}</span>
              <span className="text-slate-300">{risk.dailyLossUsedPercent}% / {risk.dailyLossLimitPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${(risk.dailyLossUsedPercent / risk.dailyLossLimitPercent) * 100}%` }}
                data-testid="daily-drawdown-bar"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">{isTechnical ? 'max_loss_used_pct' : 'Total Drawdown'}</span>
              <span className="text-slate-300">
                ${risk.maxLossUsedAmount.toLocaleString()} / ${risk.maxLossLimitAmount.toLocaleString()}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${(risk.maxLossUsedAmount / risk.maxLossLimitAmount) * 100}%` }}
                data-testid="total-drawdown-bar"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Layout title="Home / Daily State" supportsViewToggle>
      <HomeContent />
    </Layout>
  );
}
