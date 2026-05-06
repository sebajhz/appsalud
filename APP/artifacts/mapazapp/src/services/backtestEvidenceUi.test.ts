import { describe, expect, it } from "vitest";
import { backtestEvidenceSimpleLines, backtestEvidenceStatusHeadline } from "./backtestEvidenceUi";

describe("backtestEvidenceUi", () => {
  it("surfaces needs_more_forward copy", () => {
    const lines = backtestEvidenceSimpleLines("needs_more_forward");
    expect(lines.some((l) => l.toLowerCase().includes("forward"))).toBe(true);
    expect(lines.some((l) => l.includes("canAutoApply"))).toBe(true);
  });

  it("surfaces candidate_for_alerts copy", () => {
    const lines = backtestEvidenceSimpleLines("candidate_for_alerts");
    expect(lines.some((l) => l.includes("candidate"))).toBe(true);
  });

  it("headline prefixes status", () => {
    expect(backtestEvidenceStatusHeadline("candidate_for_trade_review")).toContain("candidate_for_trade_review");
  });
});
