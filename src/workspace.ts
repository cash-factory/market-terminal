import type { Frame, SymbolId } from "./market";
import { clampPanelWidth } from "./layout";
import { isDrawing, type Drawing } from "./drawing/types";
import { emptyRiskInputs, parseRiskInputs, type RiskPlannerInputs } from "./analysis/risk";
import { defaultStudies, parseStudies, type StudySettings } from "./indicators/studies";
import { parseChartTemplates,type ChartTemplate } from "./indicators/templates";
import { defaultStudyParameters,parseStudyParameters,type StudyParameters } from "./indicators/parameters";
import { isPriceAlert, type PriceAlert } from "./alerts/engine";
import {parseChartDisplayStyle,type ChartDisplayStyle} from "./charts/display";

export type Level = { id: string; symbol: SymbolId; price: number; color: string; source?: "demo" | "binance" };
export type Workspace = {
  symbol: SymbolId;
  frame: Frame;
  priceSource: "demo" | "binance";
  chartLayout: "single" | "dual" | "quad";
  chartDisplayStyle: ChartDisplayStyle;
  secondarySymbol: SymbolId;
  tertiarySymbol: SymbolId;
  quaternarySymbol: SymbolId;
  secondaryFrame: Frame;
  tertiaryFrame: Frame;
  quaternaryFrame: Frame;
  secondarySource: "demo" | "binance";
  tertiarySource: "demo" | "binance";
  quaternarySource: "demo" | "binance";
  linkCrosshairs: boolean;
  linkTimeRanges: boolean;
  dark: boolean;
  showSma: boolean;
  levels: Level[];
  drawings: Drawing[];
  accent: "violet" | "teal" | "amber";
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
  keepDrawingToolActive: boolean;
  magnetEnabled: boolean;
  riskPlanner: RiskPlannerInputs;
  studies: StudySettings;
  studyParameters: StudyParameters;
  chartTemplates: ChartTemplate[];
  alerts: PriceAlert[];
};
export const defaultWorkspace: Workspace = {
  symbol: "EURUSD",
  frame: "1h",
  priceSource: "demo",
  chartLayout: "single",
  chartDisplayStyle: "candles",
  secondarySymbol: "BTCUSDT",
  tertiarySymbol: "AAPL",
  quaternarySymbol: "US100",
  secondaryFrame: "1h",
  tertiaryFrame: "1h",
  quaternaryFrame: "1h",
  secondarySource: "demo",
  tertiarySource: "demo",
  quaternarySource: "demo",
  linkCrosshairs: false,
  linkTimeRanges: false,
  dark: true,
  showSma: true,
  levels: [],
  drawings: [],
  accent: "violet",
  sidebarOpen: true,
  rightPanelOpen: true,
  rightPanelWidth: 270,
  keepDrawingToolActive: false,
  magnetEnabled: false,
  riskPlanner: {...emptyRiskInputs},
  studies: {...defaultStudies},
  studyParameters: {...defaultStudyParameters},
  chartTemplates: [],
  alerts: [],
};
const SYMBOLS = ["EURUSD", "BTCUSDT", "AAPL", "US100"] as const;
const FRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
const ACCENTS = ["violet", "teal", "amber"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export function parseWorkspace(value: unknown): Workspace {
  if (!isRecord(value)) throw new Error("The workspace file must contain an object.");
  const raw = isRecord(value.preferences) ? value.preferences : value;
  const symbol = SYMBOLS.includes(raw.symbol as SymbolId) ? raw.symbol as SymbolId : defaultWorkspace.symbol;
  const frame = FRAMES.includes(raw.frame as Frame) ? raw.frame as Frame : defaultWorkspace.frame;
  const accent = ACCENTS.includes(raw.accent as Workspace["accent"]) ? raw.accent as Workspace["accent"] : defaultWorkspace.accent;
  const levels: Level[] = [];
  if (Array.isArray(raw.levels)) {
    for (const level of raw.levels) {
      if (!isRecord(level) || typeof level.price !== "number" || !Number.isFinite(level.price) || level.price <= 0 ||
          typeof level.id !== "string" || !SYMBOLS.includes(level.symbol as SymbolId)) continue;
      levels.push({ id: level.id, symbol: level.symbol as SymbolId, price: level.price,
        color: typeof level.color === "string" && /^#[0-9a-fA-F]{6}$/.test(level.color) ? level.color : "#8d94fa",
        ...(level.source === "binance" || level.source === "demo" ? { source: level.source } : {}) });
    }
  }
  return {
    symbol, frame, accent, levels,
    priceSource: symbol === "BTCUSDT" && raw.priceSource === "binance" ? "binance" : "demo",
    chartLayout: raw.chartLayout === "quad" ? "quad" : raw.chartLayout === "dual" ? "dual" : "single",
    chartDisplayStyle: parseChartDisplayStyle(raw.chartDisplayStyle),
    secondarySymbol: SYMBOLS.includes(raw.secondarySymbol as SymbolId) ? raw.secondarySymbol as SymbolId : "BTCUSDT",
    tertiarySymbol: SYMBOLS.includes(raw.tertiarySymbol as SymbolId) ? raw.tertiarySymbol as SymbolId : "AAPL",
    quaternarySymbol: SYMBOLS.includes(raw.quaternarySymbol as SymbolId) ? raw.quaternarySymbol as SymbolId : "US100",
    secondaryFrame: FRAMES.includes(raw.secondaryFrame as Frame) ? raw.secondaryFrame as Frame : frame,
    tertiaryFrame: FRAMES.includes(raw.tertiaryFrame as Frame) ? raw.tertiaryFrame as Frame : frame,
    quaternaryFrame: FRAMES.includes(raw.quaternaryFrame as Frame) ? raw.quaternaryFrame as Frame : frame,
    secondarySource: raw.secondarySymbol === "BTCUSDT" && raw.secondarySource === "binance" ? "binance" : "demo",
    tertiarySource: raw.tertiarySymbol === "BTCUSDT" && raw.tertiarySource === "binance" ? "binance" : "demo",
    quaternarySource: raw.quaternarySymbol === "BTCUSDT" && raw.quaternarySource === "binance" ? "binance" : "demo",
    linkCrosshairs: typeof raw.linkCrosshairs === "boolean" ? raw.linkCrosshairs : false,
    linkTimeRanges: typeof raw.linkTimeRanges === "boolean" ? raw.linkTimeRanges : false,
    drawings: Array.isArray(raw.drawings) ? raw.drawings.filter(isDrawing) : [],
    dark: typeof raw.dark === "boolean" ? raw.dark : true,
    showSma: typeof raw.showSma === "boolean" ? raw.showSma : true,
    sidebarOpen: typeof raw.sidebarOpen === "boolean" ? raw.sidebarOpen : true,
    rightPanelOpen: typeof raw.rightPanelOpen === "boolean" ? raw.rightPanelOpen : true,
    rightPanelWidth: typeof raw.rightPanelWidth === "number" ? clampPanelWidth(raw.rightPanelWidth) : 270,
    keepDrawingToolActive: typeof raw.keepDrawingToolActive === "boolean" ? raw.keepDrawingToolActive : false,
    magnetEnabled: typeof raw.magnetEnabled === "boolean" ? raw.magnetEnabled : false,
    riskPlanner: parseRiskInputs(raw.riskPlanner),
    studies: parseStudies(raw.studies),
    studyParameters: parseStudyParameters(raw.studyParameters),
    chartTemplates: parseChartTemplates(raw.chartTemplates),
    alerts: Array.isArray(raw.alerts)?raw.alerts.filter(isPriceAlert):[],
  };
}
export function loadWorkspace(): Workspace {
  try {
    const stored = localStorage.getItem("market-terminal-workspace");
    return stored ? parseWorkspace(JSON.parse(stored)) : defaultWorkspace;
  } catch {
    return defaultWorkspace;
  }
}
export function serializeWorkspace(workspace: Workspace): string {
  return JSON.stringify({ format: "market-terminal-workspace", version: 18, preferences: workspace }, null, 2);
}
