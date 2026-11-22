import type { DrawingTool } from "../drawing/types";

export type TerminalCommand = {
  id: string;
  label: string;
  category: "Navigate" | "Chart" | "Draw" | "Workflow";
  description: string;
  keywords: string;
};

const page = (id:string,label:string,description:string,keywords=""):TerminalCommand =>
  ({id:"page:"+id,label,category:"Navigate",description,keywords});
const chart = (id:string,label:string,description:string,keywords=""):TerminalCommand =>
  ({id:"chart:"+id,label,category:"Chart",description,keywords});
const draw = (id:DrawingTool,label:string,description:string,keywords=""):TerminalCommand =>
  ({id:"draw:"+id,label,category:"Draw",description,keywords});

/**
 * This catalog only advertises implemented application actions. A discoverable
 * command is not a promise of a broker connection or an unimplemented study.
 */
export const TERMINAL_COMMANDS: TerminalCommand[] = [
  page("terminal","Open Chart Studio","Return to the primary chart workstation","charts"),
  page("decisions","Decision Desk","Capture original hypotheses and append reviews","trading journal notes psychology"),
  page("home","Market Overview","Inspect source-labelled demonstration market snapshots","watchlist home"),
  page("risk","Risk Planner","Work through illustrative risk scenarios","position calculator"),
  page("alerts","Price Alerts","Create and manage browser-local price alerts","notify"),
  page("library","My Workspace","Import, export and manage local chart workspace data","backup"),
  page("settings","Preferences","Change appearance and workspace controls","theme"),
  chart("indicators","Technical Indicators","Open the study selector and parameter controls","RSI MACD ATR EMA SMA Bollinger"),
  chart("setup","Chart Configuration","Choose chart type, source, pane layout and profiles","source timeframe"),
  chart("replay","Historical Replay","Study prior candles without future-chart leakage","bar replay"),
  chart("focus","Toggle Focus Mode","Distraction-free chart analysis","zen"),
  chart("single","Single Chart Layout","Maximize one chart panel","one"),
  chart("dual","Two-Chart Layout","Compare two independent markets","split"),
  chart("quad","Four-Chart Layout","Monitor four market panes","multi split"),
  chart("magnet","Toggle OHLC Magnet","Snap drawing anchors to observed prices","snap candle"),
  chart("level","Horizontal Price Level","Arm click-to-place support and resistance levels","horizontal line"),
  chart("watchlist","Markets Panel","Open the watchlist and price level inspector","panel markets"),
  chart("crosshairs","Link Chart Crosshairs","Sync observed candle inspection across panes","linked cursor"),
  chart("timeranges","Link Time Windows","Sync chart pan and zoom across panes","link range"),
  chart("frame-1m","1 Minute Timeframe","Switch chart to one-minute candles","1m"),
  chart("frame-5m","5 Minute Timeframe","Switch chart to five-minute candles","5m"),
  chart("frame-15m","15 Minute Timeframe","Switch chart to fifteen-minute candles","15m"),
  chart("frame-1h","1 Hour Timeframe","Switch chart to hourly candles","1h 60m"),
  chart("frame-4h","4 Hour Timeframe","Switch chart to four-hour candles","4h"),
  chart("frame-1d","Daily Timeframe","Switch chart to daily candles","1d daily"),
  chart("objects","Chart Object Inspector","Browse and edit current drawings","drawing manager"),
  chart("undo","Undo Drawing Edit","Restore previous drawings","revert"),
  chart("redo","Redo Drawing Edit","Reapply a drawing edit","restore"),
  draw("trendline","Trendline","Map directional lines between two price/time anchors","trend line"),
  draw("ray","Ray","Extend a line forward from two anchors","line"),
  draw("channel","Parallel Channel","Map a three-point price channel","trend rail"),
  draw("fibonacci","Fibonacci Levels","Place a retracement study on the chart","fib retracement"),
  draw("rectangle","Rectangle / Zone","Highlight a price region","supply demand zone"),
  draw("ellipse","Ellipse","Highlight a rounded price region","circle shape"),
  draw("arrow","Directional Arrow","Annotate price movement direction","marker"),
  draw("brush","Freehand Brush","Sketch on the price chart","pencil sketch"),
  draw("text","Text Annotation","Attach a note to a chart anchor","comment label"),
  draw("measure","Price/Time Measure","Measure a move across prices and bars","ruler range"),
  draw("long-position","Long Position Illustration","Visualize entry, stop and target","buy risk reward"),
  draw("short-position","Short Position Illustration","Visualize entry, stop and target","sell risk reward"),
];

export function filterTerminalCommands(query: string): TerminalCommand[] {
  const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return TERMINAL_COMMANDS.slice(0,11);
  return TERMINAL_COMMANDS.filter(item=>{
    const text=[item.label,item.category,item.description,item.keywords].join(" ").toLowerCase();
    return terms.every(term=>text.includes(term));
  });
}
