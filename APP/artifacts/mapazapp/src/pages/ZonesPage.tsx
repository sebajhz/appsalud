import { useMemo, useState } from 'react';
import type { AccountId } from '@workspace/mapazapp-core';
import { Layout, useActiveAccount, useViewMode } from '@/components/Layout';
import { ZoneStateBadge, DirectionBadge, TradeReviewStatusBadge } from '@/components/StatusBadge';
import { mockZones } from '@/mock/zones';
import { Link } from 'wouter';
import type { ZoneState, ZoneDirection } from '@/mock/types';
import { createMockDashboardDataSource } from '@/services/mockTradeReviewDataSource';
import { primaryReviewMessage } from '@/services/tradeReviewUi';

function ZonesContent() {
  const { isTechnical } = useViewMode();
  const { activeAccountId } = useActiveAccount();
  const dashboard = useMemo(() => createMockDashboardDataSource(), []);
  const reviewByZoneId = useMemo(() => {
    const m = new Map<string, ReturnType<typeof dashboard.getTradeReviewPlansForAccount>[0]>();
    for (const row of dashboard.getTradeReviewPlansForAccount(activeAccountId as AccountId)) {
      m.set(row.zone.id, row);
    }
    return m;
  }, [dashboard, activeAccountId]);
  const [filterSymbol, setFilterSymbol] = useState('ALL');
  const [filterState, setFilterState] = useState<ZoneState | 'ALL'>('ALL');
  const [filterDirection, setFilterDirection] = useState<ZoneDirection | 'ALL'>('ALL');

  const symbols = ['ALL', ...Array.from(new Set(mockZones.map(z => z.symbol)))];

  const filtered = mockZones.filter(z => {
    if (filterSymbol !== 'ALL' && z.symbol !== filterSymbol) return false;
    if (filterState !== 'ALL' && z.state !== filterState) return false;
    if (filterDirection !== 'ALL' && z.direction !== filterDirection) return false;
    return true;
  });

  const stateOptions: (ZoneState | 'ALL')[] = ['ALL', 'TRADE_READY', 'CONFIRMED', 'WATCHING', 'RETESTING', 'CREATED', 'INVALIDATED', 'EXPIRED', 'USED'];

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3" data-testid="zones-filters">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Symbol</label>
          <select
            value={filterSymbol}
            onChange={e => setFilterSymbol(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1.5"
            data-testid="filter-symbol"
          >
            {symbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">State</label>
          <select
            value={filterState}
            onChange={e => setFilterState(e.target.value as ZoneState | 'ALL')}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1.5"
            data-testid="filter-state"
          >
            {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Direction</label>
          <select
            value={filterDirection}
            onChange={e => setFilterDirection(e.target.value as ZoneDirection | 'ALL')}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1.5"
            data-testid="filter-direction"
          >
            <option value="ALL">ALL</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>
        <span className="ml-auto text-xs text-slate-500 self-center">{filtered.length} zones</span>
      </div>

      {/* Zone grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((zone) => {
          const row = reviewByZoneId.get(zone.id);
          const planStatus = row?.evaluation.plan.status;
          return (
          <Link
            key={zone.id}
            href={`/zones/${zone.id}`}
            className={`block rounded-lg border bg-card p-4 hover:border-slate-600 transition-colors ${
              zone.state === 'TRADE_READY' ? 'border-emerald-800' :
              zone.state === 'CONFIRMED' ? 'border-cyan-900' :
              zone.state === 'INVALIDATED' || zone.state === 'EXPIRED' ? 'border-slate-800 opacity-60' :
              'border-slate-800'
            }`}
            data-testid={`zone-card-${zone.id}`}
          >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-white">{zone.symbol}</span>
                  <DirectionBadge direction={zone.direction} />
                  <ZoneStateBadge state={zone.state} />
                  {planStatus && <TradeReviewStatusBadge status={planStatus} />}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="text-lg font-bold text-white">{zone.score}</span>
                  <p className="text-xs text-slate-500">score</p>
                </div>
              </div>

              {!isTechnical ? (
                <div className="space-y-1">
                  <p className="text-sm text-slate-400">{zone.simpleDescription}</p>
                  {row && (
                    <p className="text-xs text-slate-500 border-t border-slate-800/80 pt-2 mt-2">
                      Core review: <span className="text-slate-300">{primaryReviewMessage(row)}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-xs font-mono space-y-1 text-slate-500">
                  <p>zone_id: <span className="text-slate-300">{zone.id}</span></p>
                  <p>strategy_id: <span className="text-slate-300">{zone.strategy_id}</span> · ps_id: <span className="text-slate-300">{zone.parameter_set_id}</span></p>
                  <p>ifvg_type: <span className="text-slate-300">{zone.ifvgType}</span></p>
                  <p>entry: <span className="text-slate-300">{zone.entryPrice}</span> · invalidation: <span className="text-red-400">{zone.invalidationPrice}</span> · tp: <span className="text-emerald-400">{zone.takeProfitPrice}</span></p>
                  <p>R:R: <span className="text-slate-300">{zone.riskRewardRatio}</span></p>
                  {row && (
                    <>
                      <p>
                        core_plan_status: <span className="text-slate-300">{row.evaluation.plan.status}</span> · rr_calc:{" "}
                        <span className="text-slate-300">{row.evaluation.plan.metrics?.rr?.toFixed(3) ?? "—"}</span>
                      </p>
                      <p>
                        reasons:{" "}
                        <span className="text-slate-300">
                          {row.evaluation.plan.reasons.map((r) => r.code).join(", ") || "—"}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              )}

              {!isTechnical && zone.state !== 'INVALIDATED' && zone.state !== 'EXPIRED' && (
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span>Entry: <span className="text-slate-300">{zone.entryPrice}</span></span>
                  <span>R:R: <span className="text-slate-300">{zone.riskRewardRatio}</span></span>
                </div>
              )}
          </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500" data-testid="zones-empty">
          No zones match the current filters.
        </div>
      )}
    </div>
  );
}

export default function ZonesPage() {
  return (
    <Layout title="Market / Zones" supportsViewToggle>
      <ZonesContent />
    </Layout>
  );
}
