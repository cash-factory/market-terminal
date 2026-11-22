import { describe, expect, it } from "vitest";
import { clampPanelWidth, panelWidthAfterDrag, panelWidthAfterKey, PANEL_DEFAULT_WIDTH, PANEL_MAX_WIDTH, PANEL_MIN_WIDTH } from "./layout";
import { defaultWorkspace, parseWorkspace, serializeWorkspace } from "./workspace";

describe("watchlist layout", () => {
  it("keeps numeric size bounded and handles invalid input", () => {
    expect(clampPanelWidth(-10)).toBe(PANEL_MIN_WIDTH);
    expect(clampPanelWidth(9000)).toBe(PANEL_MAX_WIDTH);
    expect(clampPanelWidth(Number.NaN)).toBe(PANEL_DEFAULT_WIDTH);
    expect(clampPanelWidth(324.5)).toBe(325);
  });
  it("resizes towards the left and supports keyboard arrows, Home and End", () => {
    expect(panelWidthAfterDrag(270, 500, 400)).toBe(370);
    expect(panelWidthAfterDrag(270, 500, 900)).toBe(PANEL_MIN_WIDTH);
    expect(panelWidthAfterKey(270, "ArrowLeft")).toBe(286);
    expect(panelWidthAfterKey(270, "ArrowRight")).toBe(254);
    expect(panelWidthAfterKey(270, "Home")).toBe(PANEL_MIN_WIDTH);
    expect(panelWidthAfterKey(270, "End")).toBe(PANEL_MAX_WIDTH);
  });
  it("round-trips visibility, width, existing market data choices and drawings", () => {
    const source = {...defaultWorkspace, symbol:"BTCUSDT" as const,
      priceSource:"binance" as const, rightPanelOpen:false, rightPanelWidth:412};
    expect(parseWorkspace(JSON.parse(serializeWorkspace(source)))).toEqual(source);
  });
  it("safely migrates earlier workspaces and clamps imported widths", () => {
    expect(parseWorkspace({rightPanelWidth:120000}).rightPanelWidth).toBe(PANEL_MAX_WIDTH);
    expect(parseWorkspace({symbol:"EURUSD"}).rightPanelOpen).toBe(true);
  });
});
