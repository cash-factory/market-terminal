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
  page("terminal","Open Chart Workspace","Return to the primary technical-analysis workstation","charts"),
  page("sizing","Position Sizing Calculator","Calculate hypothetical units and risk without broker execution","risk calculator quantity position"),
  page("home","Market Overview","Inspect source-labelled demonstration market snapshots","watchlist home"),
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
  chart("frame-1s","1 Second Timeframe","Real Binance one-second Spot candles or labelled synthetic demos","1s scalping seconds"),
  chart("frame-5s","5 Second Timeframe","Assemble observed native 1s exchange data","5s seconds"),
  chart("frame-10s","10 Second Timeframe","Observe 10-second aggregation without invented ticks","10s"),
  chart("frame-15s","15 Second Timeframe","Observe 15-second candles","15s"),
  chart("frame-30s","30 Second Timeframe","Observe 30-second candles","30s"),
  chart("frame-45s","45 Second Timeframe","Observe 45-second candles","45s"),
  chart("frame-1m","1 Minute Timeframe","Switch chart to one-minute candles","1m"),
  chart("frame-5m","5 Minute Timeframe","Switch chart to five-minute candles","5m"),
  chart("frame-15m","15 Minute Timeframe","Switch chart to fifteen-minute candles","15m"),
  chart("frame-1h","1 Hour Timeframe","Switch chart to hourly candles","1h 60m"),
  chart("frame-4h","4 Hour Timeframe","Switch chart to four-hour candles","4h"),
  chart("frame-1d","Daily Timeframe","Switch chart to daily candles","1d daily"),
  chart("objects","Chart Object Inspector","Browse and edit current drawings","drawing manager"),
  chart("tools","Drawing Tool Library","Browse tool families and pin favorite chart tools","favorites all tools"),
  chart("context","Chart Context Lens","See distance to marked levels, arm alerts and review chart research","proximity levels evidence"),
  chart("undo","Undo Drawing Edit","Restore previous drawings","revert"),
  chart("redo","Redo Drawing Edit","Reapply a drawing edit","restore"),
  draw("trendline","Trendline","Map directional lines between two price/time anchors","trend line"),
  draw("extended-line","Extended Line","Project a trendline in both directions","infinite line"),
  draw("horizontal-line","Horizontal Line","Place a full-width support or resistance level","support resistance"),
  draw("horizontal-ray","Horizontal Ray","Project a one-point price level to the right","support resistance right"),
  draw("vertical-line","Vertical Line","Mark a candle time on the chart","time marker"),
  draw("cross-line","Cross Line","Mark a time and price intersection","crosshair"),
  draw("price-range","Price Range","Measure vertical price displacement and percentage","delta ruler"),
  draw("date-range","Date Range","Measure observed bars and elapsed UTC time","duration bars"),
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
  draw("info-line","Info Line","Measure price, percent, observed bars and elapsed time","trend information delta"),
  draw("pitchfork","Median Pitchfork","Set three median-line geometry anchors","andrews pitchfork"),
  draw("fib-extension","Trend Fib Extension","Project price ratios from three points","fibonacci extension targets"),
  draw("fib-timezone","Fibonacci Time Zones","Project Fibonacci time intervals on the chart","fib times"),
  draw("fib-circles","Fibonacci Circles","Draw concentric price/time ratio rings","fib circles"),
  draw("gann-box","Gann Box","Draw a proportional price/time grid; scale sensitive","gann geometric"),
  draw("triangle","Triangle","Mark a three-corner price region","geometry polygon"),
  draw("pattern-abcd","ABCD Pattern","Mark four pivots to compare swing-leg ratios","abcd"),
  draw("pattern-xabcd","XABCD Pattern","Annotate five price/time swing points","harmonic"),
  draw("elliott-impulse","Elliott Impulse 0–5","Annotate six manually selected wave pivots","elliott wave"),
  draw("cyclic-lines","Cyclic Lines","Repeat a measured chart-bar interval","time cycle"),
  draw("callout","Evidence Callout","Attach an editable observation to a price/time anchor","annotation research"),
  draw("price-note","Price Note","Annotate an exact price and context","label price"),
  draw("arrow-marker","Arrow Marker","Mark an observed event with a directional icon","marker arrow"),
  draw("date-price-range","Date + Price Range","Measure time, price, and observed candles together","range measurement"),
];

export function filterTerminalCommands(query: string): TerminalCommand[] {
  const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return TERMINAL_COMMANDS.slice(0,11);
  return TERMINAL_COMMANDS.filter(item=>{
    const text=[item.label,item.category,item.description,item.keywords].join(" ").toLowerCase();
    return terms.every(term=>text.includes(term));
  });
}
