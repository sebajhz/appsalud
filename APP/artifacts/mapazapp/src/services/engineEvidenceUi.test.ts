import { describe, expect, it } from "vitest";
import {
  EVIDENCE_PANEL_DISCLAIMERS,
  evidenceRecommendationLabel,
  evidenceRecommendationTone,
  parameterGridRecommendationCopy,
  walkForwardRiskLabel,
} from "./engineEvidenceUi";

describe("engineEvidenceUi", () => {
  it("uses conservative recommendation labels", () => {
    expect(evidenceRecommendationLabel("promising_but_unproven")).toContain("unproven");
    expect(evidenceRecommendationLabel("needs_more_data")).toContain("more data");
    expect(evidenceRecommendationLabel("overfit_risk")).toContain("Overfit");
    expect(evidenceRecommendationLabel("rejected")).toContain("Rejected");
    expect(evidenceRecommendationLabel("candidate_for_more_testing")).toContain("more testing");
  });

  it("never uses forbidden hype words in built-in labels", () => {
    const banned = [/profitable/i, /\bapproved\b/i, /ready to trade/i, /\bsafe\b/i];
    const labels = [
      evidenceRecommendationLabel("candidate_for_more_testing"),
      walkForwardRiskLabel("low"),
      parameterGridRecommendationCopy("completed", "needs_more_data"),
      EVIDENCE_PANEL_DISCLAIMERS.noApproval,
    ];
    for (const label of labels) {
      for (const r of banned) {
        expect(r.test(label)).toBe(false);
      }
    }
  });

  it("maps tones for styling without implying approval", () => {
    expect(evidenceRecommendationTone("rejected")).toBe("negative");
    expect(evidenceRecommendationTone("candidate_for_more_testing")).toBe("soft_positive");
    expect(evidenceRecommendationTone("needs_more_data")).toBe("caution");
  });

  it("disclaimers mention no execution and no approval", () => {
    expect(EVIDENCE_PANEL_DISCLAIMERS.noExecution.toLowerCase()).toContain("no execution");
    expect(EVIDENCE_PANEL_DISCLAIMERS.noApproval.toLowerCase()).toContain("no approval");
  });
});
