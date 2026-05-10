/**
 * B1.2.1 — Dashboard / mock copy safety (evidence-only posture).
 * Scans stable exports + selected source files; does not render React.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mockAlerts } from "../mock/alerts";
import { EVIDENCE_PANEL_DISCLAIMERS, parameterGridRecommendationCopy } from "./engineEvidenceUi";
import { createMockBacktestCampaignDataSource } from "./mockBacktestCampaignDataSource";
import { createMockManualCampaignDataSource } from "./mockManualCampaignDataSource";
import { createMockParameterGridDataSource } from "./mockParameterGridDataSource";
import { createMockWalkForwardDataSource } from "./mockWalkForwardDataSource";
import { parameterSetBadgeLabel } from "./strategyRegistryUi";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** `src/` root for this package */
const srcRoot = join(__dirname, "..");

function readSrcMaybe(relFromSrc: string): string | null {
  const p = join(srcRoot, relFromSrc);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8");
}

/** Files required for copy scans (existence checked per test). */
const SOURCES_SCANNED = [
  "services/engineEvidenceUi.ts",
  "services/mockBacktestCampaignDataSource.ts",
  "services/mockParameterGridDataSource.ts",
  "services/mockWalkForwardDataSource.ts",
  "services/mockManualCampaignDataSource.ts",
  "services/strategyRegistryUi.ts",
  "mock/alerts.ts",
  "pages/BacktestsPage.tsx",
  "pages/ParameterSetsPage.tsx",
  "pages/ZonesPage.tsx",
  "components/StatusBadge.tsx",
] as const;

const HIGH_RISK_PHRASES: RegExp[] = [
  /ready to trade/i,
  /ready for trading/i,
  /live trading/i,
  /real trading/i,
  /send order/i,
  /send orders/i,
  /execute trade/i,
  /execute order/i,
  /execution enabled/i,
  /auto[- ]?approval enabled/i,
  /auto[- ]?execute/i,
  /profitability proven/i,
  /proven profitable/i,
  /guaranteed/i,
  /señal aprobada/i,
  /aprobado para operar/i,
  /listo para operar/i,
  /listo para trading/i,
  /trading real/i,
  /enviar orden/i,
  /ejecutar orden/i,
  /rentabilidad probada/i,
];

const ALERT_SIMPLE_FORBIDDEN: RegExp[] = [
  /ready to trade/i,
  /ready for trading/i,
  /now active/i,
  /approved[\s\S]{0,120}active/i,
  /approved[\s\S]{0,120}trading/i,
  /\bexecute\b/i,
  /send order/i,
  /live trading/i,
  /real trading/i,
];

function assertNoHighRiskPhrases(label: string, text: string): void {
  for (const re of HIGH_RISK_PHRASES) {
    expect(re.test(text), `${label}: forbidden phrase ${re} in:\n${text.slice(0, 400)}`).toBe(false);
  }
}

function summaryNoteSafety(note: string): void {
  assertNoHighRiskPhrases("summaryNote", note);
  if (/\bapproved\b/i.test(note)) {
    expect(
      /never\s+marks[\s\S]{0,80}\bapproved\b|mock|legacy|not\s+approval|no\s+approval/i.test(note),
      `summaryNote uses "approved" only in negated/mock context: ${note}`,
    ).toBe(true);
  }
}

describe("dashboardSafetyCopy B1.2.1", () => {
  it("records scanned sources (warn-only if a path is absent — scans skip missing files)", () => {
    const missing = SOURCES_SCANNED.filter((rel) => readSrcMaybe(rel) === null);
    if (missing.length > 0) {
      console.warn("[dashboardSafetyCopy B1.2.1] missing:", missing.join(", "));
    }
    expect(SOURCES_SCANNED.length).toBeGreaterThan(0);
  });

  describe("A — positive safety language", () => {
    it("BacktestsPage.tsx reinforces evidence-only posture", () => {
      const raw = readSrcMaybe("pages/BacktestsPage.tsx");
      expect(raw).not.toBeNull();
      const t = raw!.toLowerCase();
      expect(t.includes("evidence")).toBe(true);
      expect(raw!.includes("EVIDENCE_PANEL_DISCLAIMERS.noExecution")).toBe(true);
      expect(raw!.includes("EVIDENCE_PANEL_DISCLAIMERS.noApproval")).toBe(true);
      expect(EVIDENCE_PANEL_DISCLAIMERS.noExecution.toLowerCase()).toContain("no execution");
      expect(EVIDENCE_PANEL_DISCLAIMERS.noApproval.toLowerCase()).toContain("no approval");
      expect(/mock|read-only|read only/i.test(raw!)).toBe(true);
      expect(/profitability|rentabilidad/i.test(raw!)).toBe(true);
      expect(raw!.includes("evidence of profitability")).toBe(true);
      expect(/not<\/span>\s+evidence of profitability|not evidence of profitability/i.test(raw!)).toBe(true);
      expect(/never auto-approved|no auto-approved/i.test(raw!)).toBe(true);
    });

    it("ParameterSetsPage.tsx reinforces read-only / no profitability proof", () => {
      const raw = readSrcMaybe("pages/ParameterSetsPage.tsx");
      expect(raw).not.toBeNull();
      const t = raw!.toLowerCase();
      expect(/read-only|read only|evidence/i.test(t)).toBe(true);
      expect(/no execution/i.test(raw!)).toBe(true);
      expect(/profitability|prove profitability|rentabilidad/i.test(raw!)).toBe(true);
    });

    it("engineEvidenceUi exports conservative disclaimers", () => {
      expect(EVIDENCE_PANEL_DISCLAIMERS.noExecution.toLowerCase()).toContain("no execution");
      expect(EVIDENCE_PANEL_DISCLAIMERS.noApproval.toLowerCase()).toContain("no approval");
      expect(parameterGridRecommendationCopy("completed", "needs_more_data").toLowerCase()).toContain(
        "not profitability proof",
      );
      const raw = readSrcMaybe("services/engineEvidenceUi.ts");
      expect(raw).not.toBeNull();
      expect(raw!.toLowerCase()).toContain("no profitability");
      expect(raw!.toLowerCase()).toContain("no approval");
      expect(raw!.toLowerCase()).toContain("no execution");
    });
  });

  describe("B — forbidden phrases in critical sources", () => {
    it("scanned dashboard sources omit high-risk phrases", () => {
      for (const rel of SOURCES_SCANNED) {
        const raw = readSrcMaybe(rel);
        if (!raw) continue;
        assertNoHighRiskPhrases(rel, raw);
      }
    });
  });

  describe("C — mock alerts simpleMessage", () => {
    it("mockAlerts simpleMessage stays alert-only / review-safe", () => {
      for (const a of mockAlerts) {
        const m = a.simpleMessage ?? "";
        for (const re of ALERT_SIMPLE_FORBIDDEN) {
          expect(re.test(m), `alert ${a.id}: forbidden ${re} in simpleMessage`).toBe(false);
        }
      }
    });

    it("mock/alerts.ts raw text also passes high-risk scan", () => {
      const raw = readSrcMaybe("mock/alerts.ts");
      expect(raw).not.toBeNull();
      assertNoHighRiskPhrases("mock/alerts.ts", raw!);
    });
  });

  describe("D — mock engine evidence snapshots", () => {
    it("summary notes and flags stay conservative", () => {
      const snaps = [
        createMockBacktestCampaignDataSource().getLatestMockSnapshot(),
        createMockParameterGridDataSource().getLatestMockSnapshot(),
        createMockWalkForwardDataSource().getLatestMockSnapshot(),
        createMockManualCampaignDataSource().getLatestMockSnapshot(),
      ];
      for (const s of snaps) {
        summaryNoteSafety(s.summaryNote);
        expect(s.mockOnly).toBe(true);
        expect(s.reviewOnly).toBe(true);
        expect(s.executionEnabled).toBe(false);
        expect(s.registryMutationAllowed).toBe(false);
        expect(s.autoApprovalEnabled).toBe(false);
      }
    });
  });

  describe("E — strategy registry UI", () => {
    it('parameterSetBadgeLabel("trade_review_ok") stays review-framed', () => {
      const lbl = parameterSetBadgeLabel("trade_review_ok");
      expect(/trade review|review/i.test(lbl)).toBe(true);
      expect(/\blive\b/i.test(lbl)).toBe(false);
      expect(/\bexecute\b/i.test(lbl)).toBe(false);
      expect(/ready to trade/i.test(lbl)).toBe(false);
      expect(/real trading/i.test(lbl)).toBe(false);
    });
  });

  describe("F — StatusBadge / BacktestsPage context (soft)", () => {
    it("BacktestStatusBadge ‘Approved’ remains paired with BacktestsPage disclaimers (B1.2.2 tracks Zone Trade Ready label)", () => {
      const backtests = readSrcMaybe("pages/BacktestsPage.tsx");
      const badge = readSrcMaybe("components/StatusBadge.tsx");
      expect(backtests).not.toBeNull();
      expect(badge).not.toBeNull();
      const hasApprovedBadge = /BacktestStatusBadge|APPROVED:\s*\{\s*label:\s*['`]Approved/.test(badge!);
      if (hasApprovedBadge) {
        expect(
          /no profitability|not evidence of profitability|legacy mock|never auto-approved|no execution/i.test(
            backtests!,
          ),
          "BacktestsPage should disclaim legacy Approved / profitability near mock table",
        ).toBe(true);
      }
    });
  });
});
