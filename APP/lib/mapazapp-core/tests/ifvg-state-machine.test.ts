import { describe, expect, it } from "vitest";
import { nextIfvgZoneState } from "../src/ifvg-state-machine";

describe("nextIfvgZoneState (skeleton)", () => {
  it("moves NO_TRADE to WAIT_RETEST on ZONE_CREATED", () => {
    expect(nextIfvgZoneState("NO_TRADE", "ZONE_CREATED")).toBe("WAIT_RETEST");
  });

  it("moves WAIT_RETEST to WAIT_CONFIRMATION on RETEST_HIT", () => {
    expect(nextIfvgZoneState("WAIT_RETEST", "RETEST_HIT")).toBe("WAIT_CONFIRMATION");
  });

  it("moves WAIT_CONFIRMATION to TRADE_READY on CONFIRMATION_OK", () => {
    expect(nextIfvgZoneState("WAIT_CONFIRMATION", "CONFIRMATION_OK")).toBe("TRADE_READY");
  });

  it("returns null for undefined transition", () => {
    expect(nextIfvgZoneState("TRADE_READY", "ZONE_CREATED")).toBeNull();
  });
});
