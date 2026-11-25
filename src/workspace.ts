import { ALL_FRAMES, type Frame, type SymbolId } from "./market";
import { clampPanelWidth } from "./layout";
import { isDrawing, type Drawing, type DrawingTool } from "./drawing/types";
import { DEFAULT_FAVORITE_TOOLS, parseFavoriteTools } from "./drawing/toolDefinitions";
import {parseToolPresets,type ToolPresets} from "./drawing/toolPresets";
export type FavoriteBarLayout={visible:boolean;orientation:"horizontal"|"vertical";collapsed:boolean;x:number;y:number};
export const DEFAULT_FAVORITE_BAR:FavoriteBarLayout={visible:true,orientation:"horizontal",collapsed:false,x:145,y:258};
export function parseFavoriteBar(value:unknown):FavoriteBarLayout{
 if(!value||typeof value!=="object"||Array.isArray(value))return {...DEFAULT_FAVORITE_BAR};
 const raw=value as Record<string,unknown>;
 return {
   visible:typeof raw.visible==="boolean"?raw.visible:DEFAULT_FAVORITE_BAR.visible,
   orientation:raw.orientation==="vertical"?"vertical":"horizontal",
   collapsed:typeof raw.collapsed==="boolean"?raw.collapsed:DEFAULT_FAVORITE_BAR.collapsed,
   x:typeof raw.x==="number"&&Number.isFinite(raw.x)&&raw.x>=0&&raw.x<=10000?raw.x:DEFAULT_FAVORITE_BAR.x,
   // Move only the original untouched preset away from the chart setup strip.
   // Preserve deliberate user-positioned layouts and all other saved properties.
   y:raw.x===145&&raw.y===175&&raw.orientation!=="vertical"
     ? DEFAULT_FAVORITE_BAR.y
     : typeof raw.y==="number"&&Number.isFinite(raw.y)&&raw.y>=0&&raw.y<=10000?raw.y:DEFAULT_FAVORITE_BAR.y
 };
}
import {parseLevel} from "./levels/model";
import { emptyRiskInputs, parseRiskInputs, type RiskPlannerInputs } from "./analysis/risk";
import { defaultStudies, parseStudies, type StudySettings } from "./indicators/studies";
import { parseChartTemplates,type ChartTemplate } from "./indicators/templates";
import { defaultStudyParameters,parseStudyParameters,type StudyParameters } from "./indicators/parameters";
import { isPriceAlert, type PriceAlert } from "./alerts/engine";
import {parseCustomStudies,type CustomStudy} from "./indicators/formula";
import {parseDecisionRecords,type DecisionRecord} from "./decisions/model";
import {parseChartDisplayStyle,type ChartDisplayStyle} from "./charts/display";
import {parseChartProfiles,type ChartProfile} from "./charts/profiles";
import {parseWatchlist,parseWatchlistFavorites,AVAILABLE_INSTRUMENTS} from "./watchlist/model";
import {parseReplayStudies,type SavedReplayStudy} from "./replay/simulation";

export type Level = {
  id:string;symbol:SymbolId;price:number;color:string;source?:"demo"|"binance";
  lineWidth?:1|2|3|4;lineStyle?:0|1|2|3;
  title?:string;axisLabelVisible?:boolean;hidden?:boolean;visibleOnFrames?:Frame[];
};
export type Workspace = {
  symbol: SymbolId;
  frame: Frame;
  priceSource: "demo" | "binance";
  chartLayout: "single" | "dual" | "quad";
  chartDisplayStyle: ChartDisplayStyle;
  comparisonOverlaySymbol: SymbolId | null;
  comparisonOverlaySource: "demo" | "binance";
  chartProfiles: ChartProfile[];
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
  customStudies: CustomStudy[];
  studyParameters: StudyParameters;
  chartTemplates: ChartTemplate[];
  alerts: PriceAlert[];
  decisions: DecisionRecord[];
  favoriteDrawingTools: DrawingTool[];
  favoriteBar:FavoriteBarLayout;
  toolPresets:ToolPresets;
  watchlist:SymbolId[];
  watchlistFavorites:SymbolId[];
  replayStudies:SavedReplayStudy[];
};
export const defaultWorkspace: Workspace = {
  symbol: "EURUSD",
  frame: "1h",
  priceSource: "demo",
  chartLayout: "single",
  chartDisplayStyle: "candles",
  comparisonOverlaySymbol: null,
  comparisonOverlaySource: "demo",
  chartProfiles: [],
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
  customStudies: [],
  studyParameters: {...defaultStudyParameters},
  chartTemplates: [],
  alerts: [],
  decisions: [],
  favoriteDrawingTools: [...DEFAULT_FAVORITE_TOOLS],
  favoriteBar:{...DEFAULT_FAVORITE_BAR},
  toolPresets:{},
  watchlist:[...AVAILABLE_INSTRUMENTS],
  watchlistFavorites:[],
  replayStudies:[],
};
const SYMBOLS = ["EURUSD", "BTCUSDT", "AAPL", "US100"] as const;
const FRAMES:readonly Frame[]=ALL_FRAMES;
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
  const watchlist=parseWatchlist(raw.watchlist);
  const levels:Level[]=Array.isArray(raw.levels)?
    raw.levels.flatMap(value=>{const parsed=parseLevel(value);return parsed?[parsed]:[];}):[];
  return {
    symbol, frame, accent, levels,
    priceSource: symbol === "BTCUSDT" && raw.priceSource === "binance" ? "binance" : "demo",
    chartLayout: raw.chartLayout === "quad" ? "quad" : raw.chartLayout === "dual" ? "dual" : "single",
    chartDisplayStyle: parseChartDisplayStyle(raw.chartDisplayStyle),
    comparisonOverlaySymbol: SYMBOLS.includes(raw.comparisonOverlaySymbol as SymbolId)
      ? raw.comparisonOverlaySymbol as SymbolId : null,
    comparisonOverlaySource: raw.comparisonOverlaySymbol==="BTCUSDT"&&raw.comparisonOverlaySource==="binance"
      ? "binance" : "demo",
    chartProfiles: parseChartProfiles(raw.chartProfiles),
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
    customStudies: parseCustomStudies(raw.customStudies),
    studyParameters: parseStudyParameters(raw.studyParameters),
    chartTemplates: parseChartTemplates(raw.chartTemplates),
    alerts: Array.isArray(raw.alerts)?raw.alerts.filter(isPriceAlert):[],
    decisions: parseDecisionRecords(raw.decisions),
    favoriteDrawingTools: parseFavoriteTools(raw.favoriteDrawingTools),
    favoriteBar:parseFavoriteBar(raw.favoriteBar),
    toolPresets:parseToolPresets(raw.toolPresets),
    watchlist,
    watchlistFavorites:parseWatchlistFavorites(raw.watchlistFavorites,watchlist),
    replayStudies:parseReplayStudies(raw.replayStudies),
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
  return JSON.stringify({ format: "market-terminal-workspace", version: 27, preferences: workspace }, null, 2);
}
