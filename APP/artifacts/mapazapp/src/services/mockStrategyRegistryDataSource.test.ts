import { describe, expect, it } from "vitest";
import {
  classifyParameterSetBadge,
  parameterSetBadgeLabel,
  simpleParameterSetStory,
} from "./strategyRegistryUi";
import { createMockStrategyRegistryDataSource } from "./mockStrategyRegistryDataSource";
import { getMockSymbolMarketSpec } from "./mockSymbolProfiles";

const ACC5 = "ACC_THE5ERS_100K_PHASE1_A";
const ACCX = "ACC_PROPXP_50K_PHASE1";

describe("Checkpoint 9 — mock strategy registry data source", () => {
  const ds = createMockStrategyRegistryDataSource();

  it("returns strategies and parameter sets", () => {
    expect(ds.getStrategies().length).toBeGreaterThan(0);
    expect(ds.getParameterSets().length).toBeGreaterThan(0);
    expect(ds.getParameterSetsForActiveAccount(ACC5).length).toBe(ds.getParameterSets().length);
  });

  it("XAUUSD approved set allows trade review for The5ers", () => {
    const psId = "MZP_IFVG_XAUUSD_V1_SET_003";
    const spec = getMockSymbolMarketSpec(ACC5, "XAUUSD");
    const c = ds.getParameterSetCompatibility(ACC5, psId, "XAUUSD", spec?.brokerSymbol, "trade_review");
    expect(c.allowTradeReview).toBe(true);
    expect(classifyParameterSetBadge(c)).toBe("trade_review_ok");
  });

  it("EURUSD alerts-only set does not allow trade review", () => {
    const psId = "MZP_IFVG_EURUSD_V1_SET_001";
    const spec = getMockSymbolMarketSpec(ACC5, "EURUSD");
    const c = ds.getParameterSetCompatibility(ACC5, psId, "EURUSD", spec?.brokerSymbol, "trade_review");
    expect(c.allowTradeReview).toBe(false);
    expect(c.blockingReasons).toContain("PARAMETER_SET_ALERTS_ONLY");
    expect(classifyParameterSetBadge(c)).toBe("alerts_only");
  });

  it("NAS100 validated set does not allow trade review", () => {
    const psId = "MZP_IFVG_NAS100_V1_SET_001";
    const spec = getMockSymbolMarketSpec(ACC5, "NAS100");
    const c = ds.getParameterSetCompatibility(ACC5, psId, "NAS100", spec?.brokerSymbol, "trade_review");
    expect(c.allowTradeReview).toBe(false);
    expect(classifyParameterSetBadge(c)).toBe("draft_not_approved");
  });

  it("blocked account returns blocked reason", () => {
    const psId = "MZP_IFVG_EURUSD_BLOCK_TEST";
    const spec = getMockSymbolMarketSpec(ACCX, "EURUSD");
    const c = ds.getParameterSetCompatibility(ACCX, psId, "EURUSD", spec?.brokerSymbol, "trade_review");
    expect(c.allowTradeReview).toBe(false);
    expect(c.blockingReasons).toContain("PARAMETER_SET_ACCOUNT_BLOCKED");
    expect(classifyParameterSetBadge(c)).toBe("blocked_account");
  });

  it("missing set returns null from getParameterSetById", () => {
    expect(ds.getParameterSetById("NO_SUCH_SET")).toBeNull();
  });

  it("surfaces checkpoint 8 advisory for known fixture id", () => {
    const a = ds.getParameterSetBacktestAdvisory("MZP_IFVG_XAUUSD_V1_SET_003");
    expect(a).not.toBeNull();
    expect(a!.status).toBe("approved_for_trade_review");
  });
});

describe("Checkpoint 9 — strategyRegistryUi helpers", () => {
  it("simple copy mentions alerts-only behavior", () => {
    const ds = createMockStrategyRegistryDataSource();
    const spec = getMockSymbolMarketSpec(ACC5, "EURUSD");
    const c = ds.getParameterSetCompatibility(ACC5, "MZP_IFVG_EURUSD_V1_SET_001", "EURUSD", spec?.brokerSymbol, "trade_review");
    const story = simpleParameterSetStory(c);
    expect(story.toLowerCase()).toContain("alerts");
    expect(parameterSetBadgeLabel(classifyParameterSetBadge(c))).toContain("Alerts");
  });
});
