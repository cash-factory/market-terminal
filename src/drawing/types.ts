import type { SymbolId, Frame } from "../market";
import { TOOL_BY_ID } from "./toolDefinitions";
import { isCompleteMultiPointDrawing } from "./multiAnchor";

export type DrawingTool =
  | "trendline" | "rectangle" | "fibonacci" | "ray" | "measure"
  | "arrow" | "ellipse" | "text" | "long-position" | "short-position"
  | "brush" | "channel" | "extended-line" | "horizontal-line"
  | "horizontal-ray" | "vertical-line" | "cross-line"
  | "price-range" | "date-range" | "info-line" | "pitchfork"
  | "fib-extension" | "fib-timezone" | "fib-circles" | "gann-box"
  | "triangle" | "pattern-abcd" | "pattern-xabcd" | "elliott-impulse"
  | "cyclic-lines" | "callout" | "price-note" | "arrow-marker" | "date-price-range";
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
  control?: ChartAnchor;
  target?: ChartAnchor;
  groupId?: string;
  strokeWidth?: number;
  dash?: "solid" | "dashed" | "dotted";
  opacity?: number;
  fillOpacity?: number;
  showMidline?: boolean;
  showLabels?: boolean;
  visibleOnFrames?: Frame[];
};

const validSymbols = new Set<SymbolId>(["EURUSD", "BTCUSDT", "AAPL", "US100"]);
const validFrames = new Set<Frame>(["1m", "5m", "15m", "1h", "4h", "1d"]);
export function isDrawing(input: unknown): input is Drawing {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const d = input as Partial<Drawing>;
  const anchor = (p: unknown): p is ChartAnchor => {
    if (!p || typeof p !== "object") return false;
    const a = p as Partial<ChartAnchor>;
    return Number.isSafeInteger(a.time) && a.time! >= 0 && typeof a.price === "number" && Number.isFinite(a.price) && a.price > 0;
  };
  return typeof d.id === "string" && d.id.length > 0 &&
    validSymbols.has(d.symbol as SymbolId) && TOOL_BY_ID.has(d.tool as DrawingTool) &&
    anchor(d.start) && anchor(d.end) &&
    (d.source === undefined || d.source === "demo" || d.source === "binance") && typeof d.color === "string" &&
    /^#[a-f0-9]{6}$/i.test(d.color) && typeof d.locked === "boolean" &&
    (d.hidden === undefined || typeof d.hidden === "boolean") &&
    (d.text === undefined || (typeof d.text === "string" && d.text.length <= 2000)) &&
    (d.control === undefined || anchor(d.control)) &&
    (d.target === undefined || anchor(d.target)) &&
    (d.tool !== "channel" || anchor(d.control)) &&
    isCompleteMultiPointDrawing(d as Drawing) &&
    (d.points === undefined || (Array.isArray(d.points) &&
      d.points.length <= 100000 && d.points.every(anchor))) &&
    (d.groupId === undefined || (typeof d.groupId === "string" && d.groupId.length > 0 && d.groupId.length <= 128)) &&
    (d.strokeWidth === undefined || (typeof d.strokeWidth === "number" && Number.isFinite(d.strokeWidth) && d.strokeWidth >= 1 && d.strokeWidth <= 8)) &&
    (d.dash === undefined || d.dash === "solid" || d.dash === "dashed" || d.dash === "dotted") &&
    (d.opacity === undefined || (typeof d.opacity === "number" && Number.isFinite(d.opacity) && d.opacity >= .1 && d.opacity <= 1)) &&
    (d.fillOpacity === undefined || (typeof d.fillOpacity === "number" && Number.isFinite(d.fillOpacity) && d.fillOpacity >= 0 && d.fillOpacity <= .8)) &&
    (d.showMidline === undefined || typeof d.showMidline === "boolean") &&
    (d.showLabels === undefined || typeof d.showLabels === "boolean") &&
    (d.visibleOnFrames === undefined ||
      (Array.isArray(d.visibleOnFrames) && d.visibleOnFrames.length <= 6 &&
       new Set(d.visibleOnFrames).size === d.visibleOnFrames.length &&
       d.visibleOnFrames.every(frame=>validFrames.has(frame))));
}

export function translateDrawing(
  drawing: Drawing,
  start: ChartAnchor,
  end: ChartAnchor
): Drawing {
  const dt=start.time-drawing.start.time;
  const dp=start.price-drawing.start.price;
  return { ...drawing, start, end,
    ...(drawing.points ? {points:drawing.points.map(p=>({time:p.time+dt,price:p.price+dp}))} : {}),
    ...(drawing.control ? {control:{time:drawing.control.time+dt,price:drawing.control.price+dp}} : {}),
    ...(drawing.target ? {target:{time:drawing.target.time+dt,price:drawing.target.price+dp}} : {})
  };
}

export const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

export function fibonacciPrices(a: number, b: number): number[] {
  return FIBONACCI_LEVELS.map(level => a + (b - a) * level);
}
