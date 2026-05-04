import { Layout } from '@/components/Layout';
import { mockConfig } from '@/mock/config';
import { Info, User, Shield, BookOpen, Globe } from 'lucide-react';

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-500" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value, description, mono = false }: { label: string; value: string; description?: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-800 last:border-0">
      <div>
        <p className="text-sm text-slate-300">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <span className={`text-sm text-blue-300 bg-slate-800 px-3 py-1 rounded shrink-0 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function Toggle({ label, checked, description }: { label: string; checked: boolean; description?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-800 last:border-0">
      <div>
        <p className="text-sm text-slate-300">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div
        className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-700'}`}
        data-testid={`toggle-${label.toLowerCase().replace(/\s/g, '-')}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </div>
  );
}

const statusColors = {
  active:     'bg-emerald-500',
  watch_only: 'bg-amber-500',
  archived:   'bg-slate-600',
};

export default function ConfigPage() {
  const cfg = mockConfig;

  return (
    <Layout title="Configuration">
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-start gap-2 rounded-md border border-blue-800 bg-blue-950/30 p-3 text-xs text-blue-300" data-testid="config-mock-notice">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          Display-only view. Mapazapp is multi-account and multi-broker by design. Changes are not saved in this mock.
        </div>

        {/* Accounts */}
        <Section title="Accounts" icon={User}>
          {cfg.accounts.map(acc => (
            <div key={acc.accountId} className="rounded-md border border-slate-700 p-4 space-y-2" data-testid={`account-config-${acc.accountId}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${statusColors[acc.status]}`} />
                <span className="text-sm font-semibold text-white">{acc.displayName}</span>
                {acc.accountId === cfg.activeAccountId && (
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800">Active</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs ml-4">
                <div><span className="text-slate-500">account_id:</span> <span className="text-slate-300 font-mono">{acc.accountId}</span></div>
                <div><span className="text-slate-500">firm:</span> <span className="text-slate-300">{acc.firmName}</span></div>
                <div><span className="text-slate-500">broker:</span> <span className="text-slate-300">{acc.brokerName}</span></div>
                <div><span className="text-slate-500">login:</span> <span className="text-slate-300 font-mono">{acc.accountLogin}</span></div>
                <div><span className="text-slate-500">server:</span> <span className="text-slate-300 font-mono">{acc.accountServer}</span></div>
                <div><span className="text-slate-500">size:</span> <span className="text-slate-300">${acc.accountSize.toLocaleString()}</span></div>
                <div><span className="text-slate-500">phase:</span> <span className="text-slate-300">{acc.challengePhase}</span></div>
                <div><span className="text-slate-500">mode:</span> <span className="text-slate-300">{acc.mode}</span></div>
                <div><span className="text-slate-500">status:</span> <span className="text-slate-300">{acc.status}</span></div>
                <div><span className="text-slate-500">risk_profile:</span> <span className="text-slate-300 font-mono">{acc.riskProfileId}</span></div>
                <div><span className="text-slate-500">rules_profile:</span> <span className="text-slate-300 font-mono">{acc.rulesProfileId}</span></div>
              </div>
            </div>
          ))}
        </Section>

        {/* Risk Profiles */}
        <Section title="Risk Profiles" icon={Shield}>
          {cfg.riskProfiles.map(rp => (
            <div key={rp.id} className="rounded-md border border-slate-700 p-4 space-y-1" data-testid={`risk-profile-${rp.id}`}>
              <p className="text-sm font-semibold text-white mb-2">{rp.name} <span className="text-xs text-slate-500 font-mono ml-2">{rp.id}</span></p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <Field label="Max Daily Drawdown" value={`${rp.maxDailyDrawdownPct}%`} />
                <Field label="Max Total Drawdown" value={`${rp.maxTotalDrawdownPct}%`} />
                <Field label="Max Open Risk" value={`${rp.maxOpenRiskPct}%`} />
                <Field label="Max Trades / Day" value={String(rp.maxTradesPerDay)} />
                <Field label="Risk / Trade" value={`${rp.riskPerTradePct}%`} />
              </div>
            </div>
          ))}
        </Section>

        {/* Rules Profiles */}
        <Section title="Rules Profiles" icon={BookOpen}>
          {cfg.rulesProfiles.map(rp => (
            <div key={rp.id} className="rounded-md border border-slate-700 p-4" data-testid={`rules-profile-${rp.id}`}>
              <p className="text-sm font-semibold text-white mb-1">{rp.name} <span className="text-xs text-slate-500 font-mono ml-2">{rp.id}</span></p>
              <p className="text-xs text-slate-500 mb-3">{rp.firmName} · {rp.programName}</p>
              <div className="space-y-0">
                <Field label="Profit Target" value={`${rp.profitTargetPct}%`} />
                <Field label="Max Daily Loss" value={`${rp.maxDailyLossPct}%`} />
                <Field label="Max Total Loss" value={`${rp.maxTotalLossPct}%`} />
                <Field label="Consistency Rule" value={rp.consistencyEnabled ? 'Enabled' : 'Disabled'} />
                <Field label="Min Trading Days" value={rp.minimumTradingDaysRequired > 0 ? String(rp.minimumTradingDaysRequired) : 'None'} />
                <Field label="Profitable Days Required" value={rp.profitableDaysRequired > 0 ? String(rp.profitableDaysRequired) : 'None'} />
                <Field label="News Trading" value={rp.newsTradingAllowed ? 'Allowed' : 'Blocked'} />
                {!rp.newsTradingAllowed && (
                  <Field label="News Blackout" value={`${rp.blackoutBeforeMinutes}m before / ${rp.blackoutAfterMinutes}m after`} />
                )}
              </div>
            </div>
          ))}
        </Section>

        {/* Symbol Mapping */}
        <Section title="Symbol Mapping" icon={Globe}>
          <p className="text-xs text-slate-500 -mt-2 mb-2">
            Maps canonical symbol names to broker-specific symbols for each account.
            XAUUSD on The5ers may be XAUUSDm on PropXP.
          </p>
          <div className="rounded-md border border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-400 font-semibold">Canonical</th>
                  <th className="text-left px-3 py-2 text-slate-400 font-semibold">Broker Symbol</th>
                  <th className="text-left px-3 py-2 text-slate-400 font-semibold">Account</th>
                  <th className="text-right px-3 py-2 text-slate-400 font-semibold">Digits</th>
                  <th className="text-right px-3 py-2 text-slate-400 font-semibold">Lot Step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {cfg.symbolMappings.map((sm, i) => (
                  <tr key={i} className="hover:bg-slate-800/20">
                    <td className="px-3 py-2 font-mono text-blue-300">{sm.canonicalSymbol}</td>
                    <td className="px-3 py-2 font-mono text-slate-200">{sm.brokerSymbol}</td>
                    <td className="px-3 py-2 text-slate-400 truncate max-w-[150px]">{sm.accountId}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{sm.digits}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{sm.lotStep}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Toggle label="Bridge Down" checked={cfg.notifications.bridgeDown} description="Alert when MT5 bridge connection is lost" />
          <Toggle label="Zone Ready" checked={cfg.notifications.zoneReady} description="Alert when a zone reaches TRADE_READY state" />
          <Toggle label="Risk Warning" checked={cfg.notifications.riskWarning} description="Alert when drawdown exceeds warning threshold" />
          <Toggle label="Prop Firm Alert" checked={cfg.notifications.propFirmAlert} description="Alert when prop firm limits are approaching" />
        </Section>

        {/* Zone Scoring */}
        <Section title="Zone Scoring Thresholds">
          <Field label="Min Score for Watching" value={String(cfg.zoneScoring.minScoreForWatching)} description="Minimum score for a zone to enter WATCHING state" />
          <Field label="Min Score for Confirmed" value={String(cfg.zoneScoring.minScoreForConfirmed)} description="Minimum score for a zone to be CONFIRMED" />
          <Field label="Min Score for Trade Ready" value={String(cfg.zoneScoring.minScoreForTradeReady)} description="Minimum score required for TRADE_READY status" />
        </Section>
      </div>
    </Layout>
  );
}
