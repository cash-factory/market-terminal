import type { SymbolId } from "../market";

export type DrawingTool = "trendline" | "rectangle" | "fibonacci";
export type ChartAnchor = { time: number; price: number };
export type Drawing = {
  id: string;
  symbol: SymbolId;
  source?: "demo" | "binance";
  tool: DrawingTool;
  start: ChartAnchor;
  end: ChartAnchor;
  color: string;
  locked: boolean;
  hidden?: boolean;
};

const validSymbols = new Set<SymbolId>(["EURUSD", "BTCUSDT", "AAPL", "US100"]);
const validTools = new Set<DrawingTool>(["trendline", "rectangle", "fibonacci"]);
export function isDrawing(input: unknown): input is Drawing {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const d = input as Partial<Drawing>;
  const anchor = (p: unknown): p is ChartAnchor => {
    if (!p || typeof p !== "object") return false;
    const a = p as Partial<ChartAnchor>;
    return Number.isSafeInteger(a.time) && a.time! >= 0 && typeof a.price === "number" && Number.isFinite(a.price) && a.price > 0;
  };
  return typeof d.id === "string" && d.id.length > 0 &&
    validSymbols.has(d.symbol as SymbolId) && validTools.has(d.tool as DrawingTool) &&
    anchor(d.start) && anchor(d.end) &&
    (d.source === undefined || d.source === "demo" || d.source === "binance") && typeof d.color === "string" &&
    /^#[a-f0-9]{6}$/i.test(d.color) && typeof d.locked === "boolean" &&
    (d.hidden === undefined || typeof d.hidden === "boolean");
}

export function translateDrawing(
  drawing: Drawing,
  start: ChartAnchor,
  end: ChartAnchor
): Drawing {
  return { ...drawing, start, end };
}

export const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

export function fibonacciPrices(a: number, b: number): number[] {
  return FIBONACCI_LEVELS.map(level => a + (b - a) * level);
}
