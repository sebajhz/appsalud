import { describe, expect, it } from "vitest";
import { getCheckpoint8MockApprovalForParameterSet } from "@workspace/mapazapp-core";

describe("Checkpoint 8 — dashboard display helpers", () => {
  it("exposes advisory approval for known fixture parameter set ids", () => {
    const a = getCheckpoint8MockApprovalForParameterSet("MZP_IFVG_XAUUSD_V1_SET_003");
    expect(a).not.toBeNull();
    expect(a!.status).toBe("approved_for_trade_review");
    expect(getCheckpoint8MockApprovalForParameterSet("UNKNOWN_SET")).toBeNull();
  });
});
