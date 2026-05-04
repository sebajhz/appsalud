import { useState } from 'react';
import { Layout, useActiveAccount } from '@/components/Layout';
import { AlertSeverityBadge } from '@/components/StatusBadge';
import { mockAlerts } from '@/mock/alerts';
import type { Alert } from '@/mock/types';
import { CheckCircle, AlertTriangle, Info, Globe } from 'lucide-react';

export default function AlertsPage() {
  const { activeAccountId } = useActiveAccount();
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filterAccountId, setFilterAccountId] = useState<string>('ALL');

  const acknowledge = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const acknowledgeAll = () => {
    setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })));
  };

  const filteredAlerts = filterAccountId === 'ALL'
    ? alerts
    : filterAccountId === 'GLOBAL'
      ? alerts.filter(a => a.accountId === null)
      : alerts.filter(a => a.accountId === filterAccountId);

  const unacked = filteredAlerts.filter(a => !a.acknowledged).length;

  return (
    <Layout title="Alerts">
      <div className="space-y-5">

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap" data-testid="alerts-filter">
          {[
            { id: 'ALL',    label: 'All' },
            { id: activeAccountId, label: 'Active Account' },
            { id: 'GLOBAL', label: 'Global' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterAccountId(f.id)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${filterAccountId === f.id ? 'bg-blue-700 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
              data-testid={`alerts-filter-${f.id}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {unacked > 0 ? `${unacked} unacknowledged alert${unacked > 1 ? 's' : ''}` : 'All alerts acknowledged'}
          </p>
          {unacked > 0 && (
            <button
              onClick={acknowledgeAll}
              className="text-xs text-blue-400 hover:text-blue-300 border border-blue-800 rounded px-3 py-1.5 hover:border-blue-700 transition-colors"
              data-testid="button-acknowledge-all"
            >
              Acknowledge all
            </button>
          )}
        </div>

        <div className="space-y-3">
          {filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`rounded-lg border p-4 transition-opacity ${
                alert.severity === 'CRITICAL' ? 'border-red-800 bg-red-950/20' :
                alert.severity === 'WARNING'  ? 'border-amber-800 bg-amber-950/20' :
                'border-slate-800 bg-card'
              } ${alert.acknowledged ? 'opacity-50' : ''}`}
              data-testid={`alert-item-${alert.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {alert.severity === 'CRITICAL' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                  {alert.severity === 'WARNING'  && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {alert.severity === 'INFO'     && <Info className="w-4 h-4 text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <AlertSeverityBadge severity={alert.severity} />
                    <span className="text-xs text-slate-500">{alert.source}</span>

                    {/* Account context badge */}
                    {alert.accountDisplayName ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {alert.accountDisplayName}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Global
                      </span>
                    )}

                    <span className="text-xs text-slate-600 ml-auto">{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-200 mb-1">{alert.message}</p>
                  <p className="text-xs text-slate-400 italic">{alert.simpleMessage}</p>
                </div>
                <div className="shrink-0">
                  {alert.acknowledged ? (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <CheckCircle className="w-3.5 h-3.5" /> Ack'd
                    </span>
                  ) : (
                    <button
                      onClick={() => acknowledge(alert.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 rounded px-2 py-1 hover:border-blue-700 transition-colors"
                      data-testid={`button-acknowledge-${alert.id}`}
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
