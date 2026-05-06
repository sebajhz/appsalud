export interface MapazappApiErrorItem {
  code: string;
  message: string;
  detail?: string;
}

export interface MapazappApiResponse<T> {
  ok: boolean;
  data: T | null;
  warnings: string[];
  errors: MapazappApiErrorItem[];
  source: "mock";
  mockOnly: true;
  /** Review-only semantics for trade payloads (checkpoint 11). */
  reviewOnly?: boolean;
  executionEnabled?: boolean;
  /** Checkpoint 15 — backtest evidence payloads are advisory only. */
  advisoryOnly?: boolean;
  registryMutationAllowed?: boolean;
  canAutoApply?: boolean;
  /** Checkpoint 17 — assisted execution contract mock routes only. */
  contractOnly?: boolean;
  sendToMt5Enabled?: boolean;
  canAutoExecute?: boolean;
  requiresHumanConfirmation?: boolean;
  /** CP18 — assisted execution mock routes. */
  manualReviewRequired?: boolean;
}

export function okResponse<T>(
  data: T,
  extra?: Partial<
    Pick<
      MapazappApiResponse<T>,
      | "warnings"
      | "reviewOnly"
      | "executionEnabled"
      | "advisoryOnly"
      | "registryMutationAllowed"
      | "canAutoApply"
      | "contractOnly"
      | "sendToMt5Enabled"
      | "canAutoExecute"
      | "requiresHumanConfirmation"
      | "manualReviewRequired"
    >
  >,
): MapazappApiResponse<T> {
  return {
    ok: true,
    data,
    warnings: extra?.warnings ?? [],
    errors: [],
    source: "mock",
    mockOnly: true,
    reviewOnly: extra?.reviewOnly,
    executionEnabled: extra?.executionEnabled,
    advisoryOnly: extra?.advisoryOnly,
    registryMutationAllowed: extra?.registryMutationAllowed,
    canAutoApply: extra?.canAutoApply,
    contractOnly: extra?.contractOnly,
    sendToMt5Enabled: extra?.sendToMt5Enabled,
    canAutoExecute: extra?.canAutoExecute,
    requiresHumanConfirmation: extra?.requiresHumanConfirmation,
    manualReviewRequired: extra?.manualReviewRequired,
  };
}

export function errResponse<T = null>(
  errors: MapazappApiErrorItem[],
  warnings: string[] = [],
): MapazappApiResponse<T> {
  return {
    ok: false,
    data: null,
    warnings,
    errors,
    source: "mock",
    mockOnly: true,
  };
}
