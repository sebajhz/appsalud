/**
 * Registry evaluation toggles (broker symbol strictness, etc.).
 */

export interface StrategyRegistryEvaluationSettings {
  /**
   * When the parameter set declares `brokerSymbol` and the caller passes a different non-empty broker symbol → block trade_review.
   */
  blockOnBrokerSymbolMismatch: boolean;
  /**
   * When the set declares `brokerSymbol` but the caller omits brokerSymbol → warning only (canonical still matches).
   */
  warnWhenSetBrokerSymbolButCallerBrokerMissing: boolean;
}

export function createDefaultStrategyRegistryEvaluationSettings(): StrategyRegistryEvaluationSettings {
  return {
    blockOnBrokerSymbolMismatch: true,
    warnWhenSetBrokerSymbolButCallerBrokerMissing: true,
  };
}
