import type { Frame, SymbolId } from "./market";
import { clampPanelWidth } from "./layout";
import { isDrawing, type Drawing } from "./drawing/types";
import { emptyRiskInputs, parseRiskInputs, type RiskPlannerInputs } from "./analysis/risk";
import { defaultStudies, parseStudies, type StudySettings } from "./indicators/studies";

export type Level = { id: string; symbol: SymbolId; price: number; color: string; source?: "demo" | "binance" };
export type Workspace = {
  symbol: SymbolId;
  frame: Frame;
  priceSource: "demo" | "binance";
  dark: boolean;
  showSma: boolean;
  levels: Level[];
  drawings: Drawing[];
  accent: "violet" | "teal" | "amber";
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
  keepDrawingToolActive: boolean;
  riskPlanner: RiskPlannerInputs;
  studies: StudySettings;
};
export const defaultWorkspace: Workspace = {
  symbol: "EURUSD",
  frame: "1h",
  priceSource: "demo",
  dark: true,
  showSma: true,
  levels: [],
  drawings: [],
  accent: "violet",
  sidebarOpen: true,
  rightPanelOpen: true,
  rightPanelWidth: 270,
  keepDrawingToolActive: false,
  riskPlanner: {...emptyRiskInputs},
  studies: {...defaultStudies},
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
    drawings: Array.isArray(raw.drawings) ? raw.drawings.filter(isDrawing) : [],
    dark: typeof raw.dark === "boolean" ? raw.dark : true,
    showSma: typeof raw.showSma === "boolean" ? raw.showSma : true,
    sidebarOpen: typeof raw.sidebarOpen === "boolean" ? raw.sidebarOpen : true,
    rightPanelOpen: typeof raw.rightPanelOpen === "boolean" ? raw.rightPanelOpen : true,
    rightPanelWidth: typeof raw.rightPanelWidth === "number" ? clampPanelWidth(raw.rightPanelWidth) : 270,
    keepDrawingToolActive: typeof raw.keepDrawingToolActive === "boolean" ? raw.keepDrawingToolActive : false,
    riskPlanner: parseRiskInputs(raw.riskPlanner),
    studies: parseStudies(raw.studies),
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
  return JSON.stringify({ format: "market-terminal-workspace", version: 8, preferences: workspace }, null, 2);
}
