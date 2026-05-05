import { describe, expect, it } from 'vitest';
import { MOCK_BRIDGE_INVALID_JSON, parseBridgeStatusJson } from '@workspace/mapazapp-core';
import { loadMockBridgeExportBundle } from './bridgeMockExportDataSource';

describe('bridgeMockExportDataSource', () => {
  it('parses core fixtures with overall ok', () => {
    const b = loadMockBridgeExportBundle();
    expect(b.status.ok).toBe(true);
    expect(b.market.ok).toBe(true);
    expect(b.account.ok).toBe(true);
    expect(b.candles.ok).toBe(true);
    expect(b.positions.ok).toBe(true);
    expect(b.orders.ok).toBe(true);
    expect(b.deals.ok).toBe(true);
    expect(b.errors.ok).toBe(true);
    expect(b.status.value?.terminalId).toBeDefined();
    expect((b.market.rows?.length ?? 0) >= 1).toBe(true);
  });

  it('surfaces BRIDGE_JSON_INVALID for invalid fixture text', () => {
    const r = parseBridgeStatusJson(MOCK_BRIDGE_INVALID_JSON);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'BRIDGE_JSON_INVALID')).toBe(true);
  });
});
