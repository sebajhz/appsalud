import { useState, createContext, useContext } from 'react';
import { Sidebar } from './Sidebar';
import { mockConfig } from '@/mock/config';
import type { AccountConfig } from '@/mock/types';
import { ChevronDown } from 'lucide-react';

// ─── View context ─────────────────────────────────────────────────────────────

interface ViewContextType {
  isTechnical: boolean;
  setIsTechnical: (v: boolean) => void;
}

const ViewContext = createContext<ViewContextType>({ isTechnical: false, setIsTechnical: () => {} });

export function useViewMode() {
  return useContext(ViewContext);
}

// ─── Account context ──────────────────────────────────────────────────────────

interface AccountContextType {
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  activeAccount: AccountConfig;
}

const AccountContext = createContext<AccountContextType>({
  activeAccountId: mockConfig.activeAccountId,
  setActiveAccountId: () => {},
  activeAccount: mockConfig.accounts[0],
});

export function useActiveAccount() {
  return useContext(AccountContext);
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  supportsViewToggle?: boolean;
}

export function Layout({ children, title, supportsViewToggle = false }: LayoutProps) {
  const [isTechnical, setIsTechnical] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState(mockConfig.activeAccountId);

  const activeAccount =
    mockConfig.accounts.find(a => a.accountId === activeAccountId) ?? mockConfig.accounts[0];

  const statusColor =
    activeAccount.status === 'active'     ? 'bg-emerald-500' :
    activeAccount.status === 'watch_only' ? 'bg-amber-500' :
                                            'bg-slate-600';

  return (
    <AccountContext.Provider value={{ activeAccountId, setActiveAccountId, activeAccount }}>
      <ViewContext.Provider value={{ isTechnical, setIsTechnical }}>
        <div className="flex min-h-screen bg-background text-foreground">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">

            {/* Top bar */}
            <header className="h-12 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 bg-[hsl(224,71%,3%)] sticky top-0 z-10" data-testid="topbar">
              <h1 className="text-sm font-semibold text-slate-200">{title}</h1>

              <div className="flex items-center gap-3">
                {/* Account selector */}
                <div className="relative flex items-center" data-testid="account-selector">
                  <div className={`w-1.5 h-1.5 rounded-full ${statusColor} mr-2 shrink-0`} />
                  <select
                    value={activeAccountId}
                    onChange={e => setActiveAccountId(e.target.value)}
                    className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-3 py-1.5 pr-7 focus:outline-none focus:border-blue-600 cursor-pointer hover:border-slate-600 transition-colors"
                    data-testid="account-selector-select"
                  >
                    {mockConfig.accounts.map(acc => (
                      <option key={acc.accountId} value={acc.accountId}>
                        {acc.displayName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 w-3 h-3 text-slate-500 pointer-events-none" />
                </div>

                {/* View toggle */}
                {supportsViewToggle && (
                  <div className="flex items-center rounded-md border border-slate-700 overflow-hidden text-xs" data-testid="view-toggle">
                    <button
                      onClick={() => setIsTechnical(false)}
                      className={`px-3 py-1.5 transition-colors ${!isTechnical ? 'bg-blue-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                      data-testid="view-toggle-simple"
                    >
                      Simple
                    </button>
                    <button
                      onClick={() => setIsTechnical(true)}
                      className={`px-3 py-1.5 transition-colors ${isTechnical ? 'bg-blue-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                      data-testid="view-toggle-technical"
                    >
                      Technical
                    </button>
                  </div>
                )}

                <div className="text-xs text-slate-600 font-mono">MOCK</div>
              </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-auto p-6" data-testid="main-content">
              {children}
            </main>
          </div>
        </div>
      </ViewContext.Provider>
    </AccountContext.Provider>
  );
}
