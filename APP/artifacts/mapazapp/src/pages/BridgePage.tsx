import { Layout, useActiveAccount } from '@/components/Layout';
import { BridgeStateBadge } from '@/components/StatusBadge';
import { mockBridgeTerminals } from '@/mock/bridgeStatus';
import { CheckCircle, AlertTriangle, XCircle, Wifi, Monitor } from 'lucide-react';

const freshnessConfig = {
  FRESH:   { label: 'Fresh',   className: 'text-emerald-400', icon: CheckCircle },
  STALE:   { label: 'Stale',   className: 'text-amber-400',   icon: AlertTriangle },
  MISSING: { label: 'Missing', className: 'text-red-400',     icon: XCircle },
};

const logLevelConfig = {
  INFO:  'text-slate-400',
  WARN:  'text-amber-400',
  ERROR: 'text-red-400',
};

export default function BridgePage() {
  const { activeAccountId } = useActiveAccount();

  return (
    <Layout title="MT5 Bridge Health">
      <div className="space-y-6">

        {/* Terminal overview grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="bridge-terminals-grid">
          {mockBridgeTerminals.map(terminal => {
            const isActive = terminal.accountId === activeAccountId;
            const freshCount = terminal.symbolTicks.filter(t => t.freshness === 'FRESH').length;
            return (
              <div
                key={terminal.terminalId}
                className={`rounded-lg border bg-card p-5 ${isActive ? 'border-blue-700' : 'border-slate-800'}`}
                data-testid={`terminal-card-${terminal.terminalId}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Monitor className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-600'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{terminal.terminalId}</span>
                        {isActive && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800">Active</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{terminal.brokerName}</p>
                    </div>
                  </div>
                  <BridgeStateBadge state={terminal.state} />
                </div>

                <div className="space-y-1.5 text-xs mb-3">
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-24">Account</span>
                    <span className="text-slate-300 truncate">{terminal.accountId}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-24">Login</span>
                    <span className="text-slate-300 font-mono">{terminal.accountLogin}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-24">Server</span>
                    <span className="text-slate-300 font-mono">{terminal.accountServer}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-24">Last Update</span>
                    <span className="text-slate-300 font-mono">{new Date(terminal.lastUpdate).toLocaleTimeString()}</span>
                  </div>
                  {terminal.staleSince && (
                    <div className="flex gap-2">
                      <span className="text-slate-500 w-24">Stale Since</span>
                      <span className="text-red-400 font-mono">{new Date(terminal.staleSince).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>

                {/* Symbol ticks summary */}
                <div className="border-t border-slate-800 pt-3">
                  <p className="text-xs text-slate-500 mb-2">
                    Symbols: {freshCount}/{terminal.symbolTicks.length} fresh
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {terminal.symbolTicks.map(tick => {
                      const fc = freshnessConfig[tick.freshness];
                      return (
                        <span
                          key={tick.symbol}
                          className={`text-xs font-mono px-2 py-0.5 rounded bg-slate-800 ${fc.className}`}
                          title={`${tick.symbol}: ${tick.freshness} — last tick ${new Date(tick.lastTick).toLocaleTimeString()}`}
                        >
                          {tick.symbol}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail view for each terminal */}
        {mockBridgeTerminals.map(terminal => (
          <div key={`detail-${terminal.terminalId}`} className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Wifi className={`w-4 h-4 ${terminal.state === 'BRIDGE_OK' ? 'text-emerald-400' : 'text-amber-400'}`} />
              {terminal.terminalId} — {terminal.brokerName} Detail
            </h2>

            {/* Symbol tick freshness */}
            <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid={`bridge-symbol-ticks-${terminal.terminalId}`}>
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Symbol Tick Freshness</h3>
              <div className="space-y-3">
                {terminal.symbolTicks.map(tick => {
                  const fc = freshnessConfig[tick.freshness];
                  const FIcon = fc.icon;
                  return (
                    <div key={tick.symbol} className="flex items-center gap-3" data-testid={`symbol-tick-${terminal.terminalId}-${tick.symbol}`}>
                      <FIcon className={`w-4 h-4 shrink-0 ${fc.className}`} />
                      <span className="text-sm font-semibold text-white w-24">{tick.symbol}</span>
                      <span className={`text-xs ${fc.className}`}>{fc.label}</span>
                      <span className="text-xs font-mono text-slate-500 ml-auto">
                        last: {new Date(tick.lastTick).toLocaleTimeString()}
                      </span>
                      <span className="text-xs font-mono text-slate-600">
                        {Math.round((Date.now() - new Date(tick.lastTick).getTime()) / 1000)}s ago
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connection log */}
            <div className="rounded-lg border border-slate-800 bg-card p-5" data-testid={`bridge-log-${terminal.terminalId}`}>
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Connection Log</h3>
              <div className="space-y-1.5 font-mono text-xs">
                {terminal.connectionLog.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3" data-testid={`log-entry-${terminal.terminalId}-${i}`}>
                    <span className="text-slate-600 shrink-0 w-20">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span className={`shrink-0 w-12 ${logLevelConfig[entry.level]}`}>[{entry.level}]</span>
                    <span className="text-slate-300">{entry.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
