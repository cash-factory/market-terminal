import { ALL_FRAMES, type SymbolId, type Frame } from "../market";
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
  | "cyclic-lines" | "callout" | "price-note" | "arrow-marker" | "date-price-range"
  | "trend-angle" | "regression-channel" | "highlighter";
export type ToolLevel={ratio:number;visible:boolean;color:string};
export type MeasurementParts={price:boolean;percent:boolean;bars:boolean;elapsed:boolean};
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
  evidenceSide?: "supports" | "challenges" | "unclassified";
  showLabels?: boolean;
  visibleOnFrames?: Frame[];
  fibLevels?:ToolLevel[];
  forkLevels?:number[];
  labelMode?:"ratio"|"price"|"both";
  gridDivisions?:number;
  regressionDeviation?:number;
  timeLevels?:number[];
  cycleCount?:number;
  markerDirection?:"up"|"down"|"left"|"right";
  fontSize?:number;
  showMeasurements?:MeasurementParts;
  projection?:"segment"|"left"|"right"|"both";
};

const validSymbols = new Set<SymbolId>(["EURUSD", "BTCUSDT", "AAPL", "US100"]);
const validFrames = new Set<Frame>(ALL_FRAMES);
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
    (d.strokeWidth === undefined || (typeof d.strokeWidth === "number" && Number.isFinite(d.strokeWidth) && d.strokeWidth >= 1 && d.strokeWidth <= (d.tool==="highlighter"?32:8))) &&
    (d.dash === undefined || d.dash === "solid" || d.dash === "dashed" || d.dash === "dotted") &&
    (d.opacity === undefined || (typeof d.opacity === "number" && Number.isFinite(d.opacity) && d.opacity >= .1 && d.opacity <= 1)) &&
    (d.fillOpacity === undefined || (typeof d.fillOpacity === "number" && Number.isFinite(d.fillOpacity) && d.fillOpacity >= 0 && d.fillOpacity <= .8)) &&
    (d.showMidline === undefined || typeof d.showMidline === "boolean") &&
    (d.evidenceSide===undefined || (d.tool==="callout"&&
      (d.evidenceSide==="supports"||d.evidenceSide==="challenges"||d.evidenceSide==="unclassified"))) &&
    (d.showLabels === undefined || typeof d.showLabels === "boolean") &&
    (d.fibLevels===undefined || (["fibonacci","fib-extension","fib-circles"].includes(d.tool as string)&&
      Array.isArray(d.fibLevels)&&d.fibLevels.length>0&&d.fibLevels.length<=16&&
      d.fibLevels.every(level=>level&&typeof level==="object"&&
        Number.isFinite(level.ratio)&&level.ratio>=-3&&level.ratio<=8&&
        typeof level.visible==="boolean"&&typeof level.color==="string"&&/^#[a-f0-9]{6}$/i.test(level.color)))) &&
    (d.forkLevels===undefined || (d.tool==="pitchfork"&&Array.isArray(d.forkLevels)&&
      d.forkLevels.length<=8&&new Set(d.forkLevels).size===d.forkLevels.length&&
      d.forkLevels.every(r=>typeof r==="number"&&Number.isFinite(r)&&r>=.125&&r<=4))) &&
    (d.labelMode===undefined || (["fibonacci","fib-extension","fib-circles"].includes(d.tool as string)&&
      ["ratio","price","both"].includes(d.labelMode))) &&
    (d.gridDivisions===undefined || (d.tool==="gann-box"&&Number.isInteger(d.gridDivisions)&&
      d.gridDivisions>=2&&d.gridDivisions<=12)) &&
    (d.regressionDeviation===undefined || (d.tool==="regression-channel"&&
      typeof d.regressionDeviation==="number"&&Number.isFinite(d.regressionDeviation)&&
      d.regressionDeviation>=0.5&&d.regressionDeviation<=4)) &&
    (d.timeLevels===undefined || (d.tool==="fib-timezone"&&
      Array.isArray(d.timeLevels)&&d.timeLevels.length>=1&&d.timeLevels.length<=16&&
      new Set(d.timeLevels).size===d.timeLevels.length&&
      d.timeLevels.every(level=>Number.isInteger(level)&&level>=0&&level<=55))) &&
    (d.cycleCount===undefined || (d.tool==="cyclic-lines"&&
      Number.isInteger(d.cycleCount)&&d.cycleCount>=2&&d.cycleCount<=24)) &&
    (d.markerDirection===undefined || (d.tool==="arrow-marker"&&
      ["up","down","left","right"].includes(d.markerDirection))) &&
    (d.fontSize===undefined || (["text","callout","price-note"].includes(d.tool as string)&&
      Number.isInteger(d.fontSize)&&d.fontSize>=9&&d.fontSize<=28)) &&
    (d.showMeasurements===undefined || (["measure","info-line","price-range","date-range","date-price-range"].includes(d.tool as string)&&
      d.showMeasurements!==null&&typeof d.showMeasurements==="object"&&
      ["price","percent","bars","elapsed"].every(key=>
        typeof d.showMeasurements?.[key as keyof MeasurementParts]==="boolean"))) &&
    (d.projection===undefined || (["trendline","ray","extended-line","info-line"].includes(d.tool as string)&&
      ["segment","left","right","both"].includes(d.projection))) &&
    (d.visibleOnFrames === undefined ||
      (Array.isArray(d.visibleOnFrames) && d.visibleOnFrames.length <= ALL_FRAMES.length &&
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
