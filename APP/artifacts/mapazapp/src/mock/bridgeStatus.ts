import type { BridgeTerminal } from './types';

export const mockBridgeTerminals: BridgeTerminal[] = [
  {
    terminalId: 'TERMINAL_A',
    accountId: 'ACC_THE5ERS_100K_PHASE1_A',
    accountLogin: '123456',
    accountServer: 'The5ers-Server',
    brokerName: 'The5ers MT5',
    state: 'BRIDGE_OK',
    lastUpdate: new Date(Date.now() - 3000).toISOString(),
    symbolsEnabled: ['XAUUSD', 'EURUSD', 'GBPUSD', 'NAS100'],
    symbolTicks: [
      { symbol: 'XAUUSD', lastTick: new Date(Date.now() - 2500).toISOString(), freshness: 'FRESH' },
      { symbol: 'EURUSD', lastTick: new Date(Date.now() - 3100).toISOString(), freshness: 'FRESH' },
      { symbol: 'GBPUSD', lastTick: new Date(Date.now() - 4800).toISOString(), freshness: 'FRESH' },
      { symbol: 'NAS100', lastTick: new Date(Date.now() - 12000).toISOString(), freshness: 'STALE' },
    ],
    connectionLog: [
      { timestamp: new Date(Date.now() - 600000).toISOString(), message: 'MT5 terminal connected — account 123456', level: 'INFO' },
      { timestamp: new Date(Date.now() - 590000).toISOString(), message: 'Bridge handshake OK — The5ers-Server', level: 'INFO' },
      { timestamp: new Date(Date.now() - 540000).toISOString(), message: 'NAS100 tick gap detected (8.2s)', level: 'WARN' },
      { timestamp: new Date(Date.now() - 530000).toISOString(), message: 'NAS100 tick resumed', level: 'INFO' },
      { timestamp: new Date(Date.now() - 180000).toISOString(), message: 'XAUUSD zone scanner cycle complete — 3 zones updated', level: 'INFO' },
      { timestamp: new Date(Date.now() - 60000).toISOString(), message: 'All symbols fresh — bridge healthy', level: 'INFO' },
    ],
  },
  {
    terminalId: 'TERMINAL_B',
    accountId: 'ACC_PROPXP_50K_PHASE1',
    accountLogin: '789012',
    accountServer: 'PropXP-Server',
    brokerName: 'PropXP MT5',
    state: 'BRIDGE_STALE',
    lastUpdate: new Date(Date.now() - 125000).toISOString(),
    staleSince: new Date(Date.now() - 120000).toISOString(),
    symbolsEnabled: ['XAUUSDm', 'EURUSDm'],
    symbolTicks: [
      { symbol: 'XAUUSDm', lastTick: new Date(Date.now() - 125000).toISOString(), freshness: 'MISSING' },
      { symbol: 'EURUSDm', lastTick: new Date(Date.now() - 125000).toISOString(), freshness: 'MISSING' },
    ],
    connectionLog: [
      { timestamp: new Date(Date.now() - 3600000).toISOString(), message: 'MT5 terminal connected — account 789012', level: 'INFO' },
      { timestamp: new Date(Date.now() - 3590000).toISOString(), message: 'Bridge handshake OK — PropXP-Server', level: 'INFO' },
      { timestamp: new Date(Date.now() - 125000).toISOString(), message: 'Tick gap detected — XAUUSDm and EURUSDm missing', level: 'WARN' },
      { timestamp: new Date(Date.now() - 120000).toISOString(), message: 'Bridge entered STALE state — no recovery yet', level: 'ERROR' },
    ],
  },
];

// Legacy single-terminal export
export const mockBridgeStatus = mockBridgeTerminals[0];
