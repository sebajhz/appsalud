import { useMemo } from 'react';
import type { AccountId } from '@workspace/mapazapp-core';
import { Layout, useActiveAccount, useViewMode } from '@/components/Layout';
import { ZoneStateBadge, DirectionBadge, TradeReviewStatusBadge } from '@/components/StatusBadge';
import { mockZones } from '@/mock/zones';
import { Link, useParams } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { createMockDashboardDataSource } from '@/services/mockTradeReviewDataSource';
import { primaryReviewMessage, simpleLanguageForReviewStatus } from '@/services/tradeReviewUi';

function ZoneDetailContent({ id }: { id: string }) {
  const { isTechnical } = useViewMode();
  const { activeAccountId } = useActiveAccount();
  const dashboard = useMemo(() => createMockDashboardDataSource(), []);
  const reviewRow = dashboard.getTradeReviewPlanByZoneId(activeAccountId as AccountId, id);
  const plan = reviewRow?.evaluation.plan;

  const zone = mockZones.find(z => z.id === id);

  if (!zone) {
    return (
      <div className="text-center py-12" data-testid="zone-not-found">
        <p className="text-slate-400">Zone not found: <span className="font-mono text-slate-300">{id}</span></p>
        <Link href="/zones" className="text-blue-400 text-sm mt-2 inline-block" data-testid="link-back-zones">Back to zones</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <Link href="/zones" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 w-fit" data-testid="back-to-zones">
        <ArrowLeft className="w-3 h-3" /> Back to zones
      </Link>

      {/* Header */}
      <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="zone-detail-header">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <h2 className="text-xl font-bold text-white">{zone.symbol}</h2>
          <DirectionBadge direction={zone.direction} />
          <ZoneStateBadge state={zone.state} />
          {plan && <TradeReviewStatusBadge status={plan.status} />}
        </div>
        <p className="text-sm text-slate-400">{zone.simpleDescription}</p>
        {plan && !isTechnical && (
          <p className="text-xs text-slate-500 mt-2 border-t border-slate-800 pt-2">
            {simpleLanguageForReviewStatus(plan.status)} {reviewRow ? primaryReviewMessage(reviewRow) : ''}
          </p>
        )}
      </div>

      {/* Simple view */}
      {!isTechnical && (
        <div className="rounded-lg border border-slate-800 bg-card p-5 space-y-4" data-testid="zone-simple-view">
          <h3 className="text-sm font-semibold text-slate-300">Zone Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Entry Price</p>
              <p className="text-base font-bold text-white mt-0.5">{zone.entryPrice}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Invalidation (mock)</p>
              <p className="text-base font-bold text-red-400 mt-0.5">{zone.invalidationPrice}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Take Profit</p>
              <p className="text-base font-bold text-emerald-400 mt-0.5">{zone.takeProfitPrice}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Risk/Reward</p>
              <p className="text-base font-bold text-white mt-0.5">{zone.riskRewardRatio}:1</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Confidence Score</p>
              <p className="text-base font-bold text-white mt-0.5">{zone.score} / 100</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Direction</p>
              <p className={`text-base font-bold mt-0.5 ${zone.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                {zone.direction === 'BUY' ? 'Potential buy' : 'Potential sell'}
              </p>
            </div>
          </div>
          {zone.notes && (
            <div className="pt-3 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-300">{zone.notes}</p>
            </div>
          )}
          <div className="pt-3 border-t border-slate-800 text-xs text-slate-500">
            <p>Created: {new Date(zone.createdAt).toLocaleString()}</p>
            <p>Updated: {new Date(zone.updatedAt).toLocaleString()}</p>
            {zone.expiresAt && <p>Expires: {new Date(zone.expiresAt).toLocaleString()}</p>}
          </div>
          {plan && (
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Core review (no execution)</h4>
              <p className="text-xs text-slate-500">
                Reference entry: <span className="text-slate-200">{plan.referenceEntryPrice}</span> · Band:{" "}
                {plan.entryAreaLow} – {plan.entryAreaHigh}
              </p>
              <p className="text-xs text-slate-500">
                SL / TP (review model):{" "}
                <span className="text-red-300">{plan.stopLoss ?? "—"}</span> /{" "}
                <span className="text-emerald-300">{plan.takeProfit ?? "—"}</span> · R:R{" "}
                {plan.metrics ? plan.metrics.rr.toFixed(2) : "—"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Technical view */}
      {isTechnical && (
        <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid="zone-technical-view">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Technical Data</h3>
          <div className="space-y-2 font-mono text-xs">
            {[
              ['zone_id', zone.id],
              ['strategy_id', zone.strategy_id],
              ['parameter_set_id', zone.parameter_set_id],
              ['symbol', zone.symbol],
              ['direction', zone.direction],
              ['state', zone.state],
              ['score', String(zone.score)],
              ['ifvg_type', zone.ifvgType],
              ['entry_price', String(zone.entryPrice)],
              ['invalidation_price', String(zone.invalidationPrice)],
              ['take_profit_price', String(zone.takeProfitPrice)],
              ['risk_reward_ratio', String(zone.riskRewardRatio)],
              ['created_at', zone.createdAt],
              ['updated_at', zone.updatedAt],
              ['expires_at', zone.expiresAt ?? 'null'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <span className="text-slate-500 w-40 shrink-0">{k}:</span>
                <span className="text-slate-200">{v}</span>
              </div>
            ))}
            {zone.notes && (
              <div className="flex gap-3">
                <span className="text-slate-500 w-40 shrink-0">notes:</span>
                <span className="text-slate-200">{zone.notes}</span>
              </div>
            )}
            {plan && (
              <>
                <div className="pt-3 border-t border-slate-800 text-slate-400 font-semibold">core_trade_review</div>
                {[
                  ['account_id', plan.accountId ?? '—'],
                  ['core_status', plan.status],
                  ['reference_entry', String(plan.referenceEntryPrice)],
                  ['entry_area_low', String(plan.entryAreaLow)],
                  ['entry_area_high', String(plan.entryAreaHigh)],
                  ['stop_loss_review', plan.stopLoss != null ? String(plan.stopLoss) : 'null'],
                  ['take_profit_review', plan.takeProfit != null ? String(plan.takeProfit) : 'null'],
                  ['rr_calc', plan.metrics ? String(plan.metrics.rr) : 'null'],
                  ['risk_price', plan.metrics ? String(plan.metrics.riskPrice) : 'null'],
                  ['reward_price', plan.metrics ? String(plan.metrics.rewardPrice) : 'null'],
                  ['failed_hard_gates', plan.failedHardGates.join(', ') || 'none'],
                  ['reason_codes', plan.reasons.map((r) => r.code).join(', ')],
                  ['no_trade_codes', plan.noTradeReasons.map((r) => r.code).join(', ') || 'none'],
                  ['review_ready', String(plan.reviewReady)],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3">
                    <span className="text-slate-500 w-44 shrink-0">{k}:</span>
                    <span className="text-slate-200">{v}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ZoneDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <Layout title="Zone Detail" supportsViewToggle>
      <ZoneDetailContent id={params.id} />
    </Layout>
  );
}
