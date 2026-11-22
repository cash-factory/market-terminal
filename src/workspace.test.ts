import { describe, expect, it } from "vitest";
import { defaultWorkspace, parseWorkspace, serializeWorkspace } from "./workspace";

describe("workspace persistence", () => {
  it("round-trips versioned workspaces including every price level", () => {
    const sample = { ...defaultWorkspace, accent: "teal" as const, levels: [
      { id: "a", symbol: "EURUSD" as const, price: 1.12, color: "#32c7aa" },
      { id: "b", symbol: "EURUSD" as const, price: 1.13, color: "#32c7aa" },
    ] };
    expect(parseWorkspace(JSON.parse(serializeWorkspace(sample)))).toEqual(sample);
  });
  it("keeps valid levels instead of enforcing a product drawing cap", () => {
    const many = Array.from({length: 1500}, (_, i) => ({
      id: String(i), symbol: "AAPL", price: 100 + i, color: "#112233"
    }));
    expect(parseWorkspace({ levels: many }).levels).toHaveLength(many.length);
  });
  it("rejects corrupted or unsafe price levels and invalid styles", () => {
    const value = parseWorkspace({ symbol: "EURUSD", levels: [
      { id: "good", symbol: "EURUSD", price: 1.23, color: "javascript:alert(1)" },
      { id: "bad", symbol: "EURUSD", price: -100, color: "#112233" }
    ] });
    expect(value.levels).toEqual([{ id: "good", symbol: "EURUSD", price: 1.23, color: "#8d94fa" }]);
  });
  it("restores sensible defaults for partial legacy workspaces", () => {
    const value = parseWorkspace({ symbol: "BTCUSDT", frame: "5m", dark: false });
    expect(value.symbol).toBe("BTCUSDT");
    expect(value.frame).toBe("5m");
    expect(value.dark).toBe(false);
    expect(value.accent).toBe("violet");
  });
});
