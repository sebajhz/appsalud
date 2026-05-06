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
