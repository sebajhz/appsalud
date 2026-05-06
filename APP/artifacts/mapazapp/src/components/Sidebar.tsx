import { Link, useLocation } from 'wouter';
import {
  Home, Map, Shield, Building2, FlaskConical, BookOpen,
  Brain, Bell, Settings, Activity, ChevronRight, Layers, Radar, Eye, ClipboardList,
} from 'lucide-react';
import { mockAlerts } from '@/mock/alerts';
import { useActiveAccount } from './Layout';

const navItems = [
  { path: '/',          label: 'Home',           icon: Home },
  { path: '/zones',     label: 'Market / Zones', icon: Map },
  { path: '/scanner',   label: 'Scanner (sim)', icon: Radar },
  { path: '/forward-monitor', label: 'Forward Monitor', icon: Eye },
  { path: '/assisted-execution', label: 'Assisted Execution', icon: ClipboardList },
  { path: '/risk',      label: 'Risk Guard',     icon: Shield },
  { path: '/propfirm',  label: 'Prop Firm Guard',icon: Building2 },
  { path: '/backtests', label: 'Backtests',      icon: FlaskConical },
  { path: '/parameter-sets', label: 'Strategy & sets', icon: Layers },
  { path: '/journal',   label: 'Journal',        icon: BookOpen },
  { path: '/psychology',label: 'Psychology',     icon: Brain },
  { path: '/alerts',    label: 'Alerts',         icon: Bell },
  { path: '/config',    label: 'Configuration',  icon: Settings },
  { path: '/bridge',    label: 'MT5 Bridge',     icon: Activity },
];

export function Sidebar() {
  const [location] = useLocation();
  const { activeAccount } = useActiveAccount();
  const unacknowledgedCount = mockAlerts.filter(a => !a.acknowledged).length;

  const modeLabel =
    activeAccount.mode === 'challenge' ? 'Challenge' :
    activeAccount.mode === 'funded'    ? 'Funded'    :
    activeAccount.mode === 'demo'      ? 'Demo'      : 'Personal';

  const statusDot =
    activeAccount.status === 'active'     ? 'bg-emerald-500' :
    activeAccount.status === 'watch_only' ? 'bg-amber-500'   : 'bg-slate-600';

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-slate-800 bg-[hsl(224,71%,3%)] h-screen sticky top-0" data-testid="sidebar">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">Mapazapp</span>
        </div>
        <p className="text-slate-500 text-xs mt-1">Trading Guard v1.0</p>
      </div>

      {/* Active account context */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/40" data-testid="sidebar-account-context">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
          <p className="text-xs font-semibold text-slate-200 truncate">{activeAccount.displayName}</p>
        </div>
        <p className="text-xs text-slate-500 ml-4">
          {activeAccount.firmName} · {modeLabel}
        </p>
        <p className="text-xs text-slate-600 ml-4 font-mono">
          MT5 {activeAccount.accountLogin}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto" data-testid="sidebar-nav">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location === path || (path !== '/' && location.startsWith(path));
          return (
            <Link
              key={path}
              href={path}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative group ${
                isActive
                  ? 'text-white bg-blue-900/40 border-r-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              data-testid={`nav-${label.toLowerCase().replace(/[^a-z]/g, '-')}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {label === 'Alerts' && unacknowledgedCount > 0 && (
                <span className="bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold" data-testid="alerts-unread-count">
                  {unacknowledgedCount}
                </span>
              )}
              {isActive && <ChevronRight className="w-3 h-3 shrink-0 text-blue-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800">
        <p className="text-slate-600 text-xs">MOCK DATA — No live MT5</p>
        <p className="text-slate-700 text-xs">All data is simulated</p>
      </div>
    </aside>
  );
}
