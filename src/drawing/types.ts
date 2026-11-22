import type { SymbolId } from "../market";

export type DrawingTool = "trendline" | "rectangle" | "fibonacci" | "ray" | "measure" | "arrow" | "ellipse" | "text" | "long-position" | "short-position" | "brush";
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
  text?: string;
  points?: ChartAnchor[];
};

const validSymbols = new Set<SymbolId>(["EURUSD", "BTCUSDT", "AAPL", "US100"]);
const validTools = new Set<DrawingTool>(["trendline", "rectangle", "fibonacci", "ray", "measure", "arrow", "ellipse", "text", "long-position", "short-position", "brush"]);
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
    (d.hidden === undefined || typeof d.hidden === "boolean") &&
    (d.text === undefined || (typeof d.text === "string" && d.text.length <= 2000)) &&
    (d.points === undefined || (Array.isArray(d.points) &&
      d.points.length <= 100000 && d.points.every(anchor)));
}

export function translateDrawing(
  drawing: Drawing,
  start: ChartAnchor,
  end: ChartAnchor
): Drawing {
  const dt=start.time-drawing.start.time;
  const dp=start.price-drawing.start.price;
  return { ...drawing, start, end,
    ...(drawing.points ? {points:drawing.points.map(p=>({time:p.time+dt,price:p.price+dp}))} : {})
  };
}

export const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

export function fibonacciPrices(a: number, b: number): number[] {
  return FIBONACCI_LEVELS.map(level => a + (b - a) * level);
}
