import { describe, expect, it } from "vitest";
import { FIBONACCI_LEVELS, fibonacciPrices, isDrawing, translateDrawing, type Drawing } from "./types";
import { parseWorkspace, serializeWorkspace, defaultWorkspace } from "../workspace";

const line: Drawing = {
  id: "1", symbol: "EURUSD", tool: "trendline",
  start: { time: 1_800_000_000, price: 1.05 },
  end: { time: 1_800_003_600, price: 1.06 },
  color: "#aabbcc", locked: false
};

describe("price-time drawing data model", () => {
  it("rejects unsafe or incomplete drawing objects", () => {
    expect(isDrawing(line)).toBe(true);
    expect(isDrawing({ ...line, color: "url(javascript:bad)" })).toBe(false);
    expect(isDrawing({ ...line, start: { time: 0, price: Number.NaN } })).toBe(false);
    expect(isDrawing({ ...line, tool: "undefined-shape" })).toBe(false);
  });
  it("computes exact Fibonacci levels for either price direction", () => {
    expect(FIBONACCI_LEVELS).toHaveLength(7);
    expect(fibonacciPrices(100, 200)).toEqual([100, 123.6, 138.2, 150, 161.8, 178.6, 200]);
    expect(fibonacciPrices(200, 100)[3]).toBe(150);
  });
  it("updates both endpoints without overwriting the underlying drawing id", () => {
    const moved = translateDrawing(line, {time: 1_800_000_100, price: 1.07}, {time: 1_800_000_200, price: 1.08});
    expect(moved.id).toBe("1");
    expect(moved.start.price).toBe(1.07);
    expect(line.start.price).toBe(1.05);
  });
  it("preserves 2,000 drawings across workspace export/import without a paywall limit", () => {
    const drawings = Array.from({length: 2000}, (_, i) => ({...line,id:String(i)}));
    const state = { ...defaultWorkspace, drawings };
    const parsed = parseWorkspace(JSON.parse(serializeWorkspace(state)));
    expect(parsed.drawings).toHaveLength(drawings.length);
    expect(parsed.drawings[1999].id).toBe("1999");
  });
  it("treats older workspaces with no drawings as empty, not malformed", () => {
    expect(parseWorkspace({ levels: [] }).drawings).toEqual([]);
  });
});
