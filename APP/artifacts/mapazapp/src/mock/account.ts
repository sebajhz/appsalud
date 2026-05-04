import type { AccountSnapshot } from './types';

export const mockAccountSnapshots: Record<string, AccountSnapshot> = {
  ACC_THE5ERS_100K_PHASE1_A: {
    accountId: 'ACC_THE5ERS_100K_PHASE1_A',
    displayName: 'The5ers 100k — Phase 1 A',
    broker: 'The5ers',
    balance: 101245.80,
    equity: 101490.20,
    dailyPnL: 450.40,
    dailyDrawdownPct: 0.31,
    maxDrawdownPct: 1.24,
    openTrades: 1,
    currency: 'USD',
    challenge: 'Phase 1 - The5ers 100k',
  },
  ACC_PROPXP_50K_PHASE1: {
    accountId: 'ACC_PROPXP_50K_PHASE1',
    displayName: 'PropXP 50k — Phase 1',
    broker: 'PropXP',
    balance: 50120.00,
    equity: 50120.00,
    dailyPnL: 0.00,
    dailyDrawdownPct: 0.0,
    maxDrawdownPct: 0.24,
    openTrades: 0,
    currency: 'USD',
    challenge: 'Phase 1 - PropXP 50k',
  },
};

// Legacy single-account export for backward compatibility
export const mockAccount = mockAccountSnapshots['ACC_THE5ERS_100K_PHASE1_A'];
