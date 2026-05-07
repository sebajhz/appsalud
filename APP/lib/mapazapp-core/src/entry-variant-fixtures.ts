/**
 * V2-08 — synthetic entry-variant scenarios (not broker truth, no profitability claim).
 */

import type { ConfirmationResult } from "./confirmation-detector";
import { ENGINE_REALITY_SYMBOL_PROFILES } from "./engine-reality-fixtures";
import type { EntrySlTpPricePlan } from "./entry-sl-tp-types";
import type { RetestResult } from "./retest-detector";
import type { EntryVariantInput } from "./entry-variant-types";
import { createDefaultEntryVariantSettingsForTests } from "./entry-variant-settings";

const profile = ENGINE_REALITY_SYMBOL_PROFILES.XAUUSD;
const settings = createDefaultEntryVariantSettingsForTests();

function baseInput(patch: Partial<EntryVariantInput>): EntryVariantInput {
  return {
    zoneBounds: { zoneLow: 100.0, zoneHigh: 100.5 },
    direction: "BUY",
    symbolProfile: profile,
    atrPrice: 0.35,
    settings,
    ...patch,
  };
}

/** Ideal: edge retest + clear confirmation + coherent plan + price not chasing. */
export function entryVariantFixtureIdealBuy(): EntryVariantInput {
  const plan: EntrySlTpPricePlan = {
    entry: 100.05,
    stopLoss: 99.65,
    takeProfit: 101.05,
    entryAreaLow: 100.0,
    entryAreaHigh: 100.5,
    bufferPrice: 0.08,
  };
  const retest: RetestResult = {
    retested: true,
    retestMode: "edge",
    touchPrice: 100.02,
    event: "RETEST_HIT",
  };
  const confirmation: ConfirmationResult = {
    confirmed: true,
    direction: "BULLISH",
    quality: "CLEAR",
    body: 0.2,
  };
  return baseInput({
    retestResult: retest,
    confirmationResult: confirmation,
    entrySlTpPlan: plan,
    currentPrice: 100.04,
  });
}

export function entryVariantFixtureMidpointBuy(): EntryVariantInput {
  const plan: EntrySlTpPricePlan = {
    entry: 100.25,
    stopLoss: 99.7,
    takeProfit: 101.2,
    entryAreaLow: 100.0,
    entryAreaHigh: 100.5,
    bufferPrice: 0.08,
  };
  return baseInput({
    retestResult: {
      retested: true,
      retestMode: "midpoint",
      touchPrice: 100.26,
      event: "RETEST_HIT",
    },
    confirmationResult: {
      confirmed: true,
      direction: "BULLISH",
      quality: "CLEAR",
      body: 0.18,
    },
    entrySlTpPlan: plan,
    currentPrice: 100.28,
  });
}

export function entryVariantFixturePartialObserveBuy(): EntryVariantInput {
  const plan: EntrySlTpPricePlan = {
    entry: 100.1,
    stopLoss: 99.72,
    takeProfit: 101.0,
    entryAreaLow: 100.0,
    entryAreaHigh: 100.5,
    bufferPrice: 0.08,
  };
  return baseInput({
    retestResult: {
      retested: true,
      retestMode: "full_zone",
      touchPrice: 100.12,
      event: "RETEST_HIT",
    },
    confirmationResult: {
      confirmed: true,
      direction: "BULLISH",
      quality: "MARGINAL",
      body: 0.09,
    },
    entrySlTpPlan: plan,
    currentPrice: 100.14,
  });
}

export function entryVariantFixtureDeepAcceptedBuy(): EntryVariantInput {
  const plan: EntrySlTpPricePlan = {
    entry: 100.38,
    stopLoss: 99.75,
    takeProfit: 101.25,
    entryAreaLow: 100.0,
    entryAreaHigh: 100.5,
    bufferPrice: 0.08,
  };
  return baseInput({
    retestResult: {
      retested: true,
      retestMode: "full_zone",
      touchPrice: 100.44,
      event: "RETEST_HIT",
    },
    confirmationResult: {
      confirmed: true,
      direction: "BULLISH",
      quality: "MARGINAL",
      body: 0.11,
    },
    entrySlTpPlan: plan,
    currentPrice: 100.42,
  });
}

export function entryVariantFixtureLateChaseBuy(): EntryVariantInput {
  const plan: EntrySlTpPricePlan = {
    entry: 100.05,
    stopLoss: 99.6,
    takeProfit: 101.4,
    entryAreaLow: 100.0,
    entryAreaHigh: 100.5,
    bufferPrice: 0.08,
  };
  return baseInput({
    retestResult: {
      retested: true,
      retestMode: "edge",
      touchPrice: 100.02,
      event: "RETEST_HIT",
    },
    confirmationResult: {
      confirmed: true,
      direction: "BULLISH",
      quality: "CLEAR",
      body: 0.2,
    },
    entrySlTpPlan: plan,
    currentPrice: 100.35,
  });
}

export function entryVariantFixtureMissedBuy(): EntryVariantInput {
  const plan: EntrySlTpPricePlan = {
    entry: 100.05,
    stopLoss: 99.65,
    takeProfit: 101.2,
    entryAreaLow: 100.0,
    entryAreaHigh: 100.5,
    bufferPrice: 0.08,
  };
  return baseInput({
    retestResult: {
      retested: true,
      retestMode: "edge",
      touchPrice: 100.02,
      event: "RETEST_HIT",
    },
    confirmationResult: {
      confirmed: true,
      direction: "BULLISH",
      quality: "CLEAR",
      body: 0.2,
    },
    entrySlTpPlan: plan,
    currentPrice: 100.78,
  });
}

export function entryVariantFixtureInvalidBuy(): EntryVariantInput {
  const plan: EntrySlTpPricePlan = {
    entry: 100.1,
    stopLoss: 99.7,
    takeProfit: 101.0,
    entryAreaLow: 100.0,
    entryAreaHigh: 100.5,
    bufferPrice: 0.08,
  };
  return baseInput({
    zoneBounds: { zoneLow: 100.0, zoneHigh: 100.5 },
    retestResult: {
      retested: true,
      retestMode: "edge",
      touchPrice: 99.5,
      event: "RETEST_HIT",
    },
    confirmationResult: {
      confirmed: false,
      direction: "NONE",
      quality: "NONE",
      body: 0.02,
    },
    entrySlTpPlan: plan,
    currentPrice: 99.48,
  });
}

export function entryVariantFixtureSellMirror(): EntryVariantInput {
  const plan: EntrySlTpPricePlan = {
    entry: 200.35,
    stopLoss: 200.85,
    takeProfit: 199.2,
    entryAreaLow: 200.0,
    entryAreaHigh: 200.5,
    bufferPrice: 0.08,
  };
  return baseInput({
    zoneBounds: { zoneLow: 200.0, zoneHigh: 200.5 },
    direction: "SELL",
    retestResult: {
      retested: true,
      retestMode: "edge",
      touchPrice: 200.42,
      event: "RETEST_HIT",
    },
    confirmationResult: {
      confirmed: true,
      direction: "BEARISH",
      quality: "CLEAR",
      body: 0.22,
    },
    entrySlTpPlan: plan,
    currentPrice: 200.38,
    atrPrice: 0.4,
  });
}

export function entryVariantFixtureHighSpreadAcceptedBuy(): EntryVariantInput {
  const hiSpreadProfile = {
    ...profile,
    spreadPrice: 0.55,
    spreadPoints: 55,
  };
  const plan: EntrySlTpPricePlan = {
    entry: 100.12,
    stopLoss: 99.7,
    takeProfit: 101.05,
    entryAreaLow: 100.0,
    entryAreaHigh: 100.5,
    bufferPrice: 0.08,
  };
  return baseInput({
    symbolProfile: hiSpreadProfile,
    spreadPrice: 0.55,
    atrPrice: 0.32,
    retestResult: {
      retested: true,
      retestMode: "full_zone",
      touchPrice: 100.14,
      event: "RETEST_HIT",
    },
    confirmationResult: {
      confirmed: true,
      direction: "BULLISH",
      quality: "MARGINAL",
      body: 0.1,
    },
    entrySlTpPlan: plan,
    currentPrice: 100.15,
  });
}
