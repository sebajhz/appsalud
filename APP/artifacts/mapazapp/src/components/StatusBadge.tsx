import type { ZoneState, RiskState, BridgeState, AlertSeverity, BacktestStatus, OperationalStatus } from '@/mock/types';

const zoneStateConfig: Record<ZoneState, { label: string; className: string }> = {
  CREATED:      { label: 'Created',     className: 'bg-slate-700 text-slate-300' },
  WATCHING:     { label: 'Watching',    className: 'bg-blue-900 text-blue-300' },
  RETESTING:    { label: 'Retesting',   className: 'bg-violet-900 text-violet-300' },
  CONFIRMED:    { label: 'Confirmed',   className: 'bg-cyan-900 text-cyan-300' },
  TRADE_READY:  { label: 'Trade Ready', className: 'bg-emerald-900 text-emerald-300 ring-1 ring-emerald-500' },
  INVALIDATED:  { label: 'Invalidated', className: 'bg-red-900/60 text-red-400' },
  EXPIRED:      { label: 'Expired',     className: 'bg-slate-800 text-slate-500' },
  USED:         { label: 'Used',        className: 'bg-amber-900/60 text-amber-400' },
};

const riskStateConfig: Record<RiskState, { label: string; className: string }> = {
  OK:      { label: 'OK',      className: 'bg-emerald-900 text-emerald-300' },
  WARNING: { label: 'Warning', className: 'bg-amber-900 text-amber-300' },
  BLOCKED: { label: 'Blocked', className: 'bg-red-900 text-red-300' },
};

const bridgeStateConfig: Record<BridgeState, { label: string; className: string }> = {
  BRIDGE_OK:         { label: 'Bridge OK',        className: 'bg-emerald-900 text-emerald-300' },
  BRIDGE_STALE:      { label: 'Bridge Stale',     className: 'bg-amber-900 text-amber-300' },
  BRIDGE_DOWN:       { label: 'Bridge Down',      className: 'bg-red-900 text-red-300' },
  MT5_DISCONNECTED:  { label: 'MT5 Disconnected', className: 'bg-red-900 text-red-300' },
};

const alertSeverityConfig: Record<AlertSeverity, { label: string; className: string }> = {
  INFO:     { label: 'Info',     className: 'bg-blue-900 text-blue-300' },
  WARNING:  { label: 'Warning',  className: 'bg-amber-900 text-amber-300' },
  CRITICAL: { label: 'Critical', className: 'bg-red-900 text-red-300' },
};

const backtestStatusConfig: Record<BacktestStatus, { label: string; className: string }> = {
  APPROVED: { label: 'Approved', className: 'bg-emerald-900 text-emerald-300' },
  REJECTED: { label: 'Rejected', className: 'bg-red-900 text-red-300' },
  PENDING:  { label: 'Pending',  className: 'bg-slate-700 text-slate-300' },
};

const operationalStatusConfig: Record<OperationalStatus, { label: string; className: string }> = {
  TRADING_ALLOWED:           { label: 'Trading Allowed',       className: 'bg-emerald-900 text-emerald-300' },
  WATCH_ONLY:                { label: 'Watch Only',            className: 'bg-blue-900 text-blue-300' },
  BLOCKED_DAILY_DRAWDOWN:    { label: 'Blocked — Daily DD',    className: 'bg-red-900 text-red-300' },
  BLOCKED_MAX_DRAWDOWN:      { label: 'Blocked — Max DD',      className: 'bg-red-900 text-red-300' },
  BLOCKED_NEWS:              { label: 'Blocked — News',        className: 'bg-amber-900 text-amber-300' },
  BLOCKED_MAX_TRADES:        { label: 'Blocked — Max Trades',  className: 'bg-amber-900 text-amber-300' },
  BLOCKED_CONSISTENCY:       { label: 'Blocked — Consistency', className: 'bg-red-900 text-red-300' },
  BLOCKED_PSYCHOLOGY:        { label: 'Blocked — Psychology',  className: 'bg-amber-900 text-amber-300' },
  BRIDGE_DISCONNECTED:       { label: 'Bridge Disconnected',   className: 'bg-slate-700 text-slate-400' },
  NO_APPROVED_PARAMETER_SET: { label: 'No Param Set',          className: 'bg-slate-700 text-slate-400' },
};

const baseClass = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase';

export function ZoneStateBadge({ state }: { state: ZoneState }) {
  const c = zoneStateConfig[state];
  return <span className={`${baseClass} ${c.className}`} data-testid={`badge-zone-state-${state}`}>{c.label}</span>;
}

export function RiskStateBadge({ state }: { state: RiskState }) {
  const c = riskStateConfig[state];
  return <span className={`${baseClass} ${c.className}`} data-testid={`badge-risk-state-${state}`}>{c.label}</span>;
}

export function BridgeStateBadge({ state }: { state: BridgeState }) {
  const c = bridgeStateConfig[state];
  return <span className={`${baseClass} ${c.className}`} data-testid={`badge-bridge-state-${state}`}>{c.label}</span>;
}

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  const c = alertSeverityConfig[severity];
  return <span className={`${baseClass} ${c.className}`} data-testid={`badge-alert-severity-${severity}`}>{c.label}</span>;
}

export function BacktestStatusBadge({ status }: { status: BacktestStatus }) {
  const c = backtestStatusConfig[status];
  return <span className={`${baseClass} ${c.className}`} data-testid={`badge-backtest-status-${status}`}>{c.label}</span>;
}

export function OperationalStatusBadge({ status }: { status: OperationalStatus }) {
  const c = operationalStatusConfig[status];
  return <span className={`${baseClass} ${c.className}`} data-testid={`badge-op-status-${status}`}>{c.label}</span>;
}

export function DirectionBadge({ direction }: { direction: 'BUY' | 'SELL' }) {
  return (
    <span
      className={`${baseClass} ${direction === 'BUY' ? 'bg-emerald-900/70 text-emerald-300' : 'bg-red-900/70 text-red-300'}`}
      data-testid={`badge-direction-${direction}`}
    >
      {direction}
    </span>
  );
}
