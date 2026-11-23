import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  Activity, ArrowDownToLine, Bell, BookOpen, ChartCandlestick, Check,
  ChevronLeft, ChevronRight, Command, Compass, Download, Home, Layers,
  Menu, Moon, MousePointer2, Plus, RotateCcw, Search, Settings2, Sun, Maximize2, Minimize2,
  Trash2, Upload, X, TrendingUp, Square, Ruler, Undo2, Redo2, RefreshCw, WifiOff, PanelRightClose, PanelRightOpen, Lock, Unlock, Eye, EyeOff, Copy, Repeat2, Film, Magnet, MoveUpRight, ArrowUpRight, Columns2, Grid2X2, Shapes, Pencil, ArrowUp, ArrowDown, Link2, Unlink2
} from "lucide-react";
import { ChartCanvas,type ChartSurface,type ChartRange } from "./ChartCanvas";
import { MarketBoard } from "./charts/MarketBoard";
import { InstrumentHeader, type CandleInspector } from "./charts/InstrumentHeader";
import {ChartErrorBoundary} from "./charts/ChartErrorBoundary";
import {chartStyles,type ChartDisplayStyle} from "./charts/display";
import {TimeframePicker} from "./charts/TimeframePicker";
import {PriceLevelPropertiesDialog} from "./levels/PriceLevelPropertiesDialog";
import {isValidLevel,levelVisibleAtFrame} from "./levels/model";
import {ChartProfileMenu} from "./charts/ChartProfileMenu";
import {applyChartProfile,createChartProfile} from "./charts/profiles";
import { nearestCrosshairBar } from "./charts/sync";
import type { Drawing, DrawingTool } from "./drawing/types";
import { ToolShelf } from "./drawing/ToolShelf";
import { StudioDrawingRail } from "./drawing/StudioDrawingRail";
import {FavoriteToolbar} from "./drawing/FavoriteToolbar";
import type { ToolGroup } from "./drawing/toolDefinitions";
import { DrawingSettingsDialog } from "./drawing/DrawingSettingsDialog";
import { validateDrawingSettings } from "./drawing/drawingSettings";
import {applyToolPreset,presetFromDrawing} from "./drawing/toolPresets";
import { TOOL_BY_ID } from "./drawing/toolDefinitions";
import {groupDrawings,ungroupDrawings,styleDrawings,moveDrawingLayers,updateDrawingAndGroup,type DrawingStylePatch} from "./drawing/manage";
import {ALL_FRAMES, frameSeconds, symbols, type Frame, type SymbolId} from "./market";
import { usePriceFeed } from "./data/usePriceFeed";
import {referenceMarketHours,priceMetadata} from "./data/sessionReference";
import { panelWidthAfterDrag, panelWidthAfterKey } from "./layout";
import {calculatePosition,defaultPositionTarget} from "./analysis/positionDrawing";
import { AlertsCenter } from "./alerts/AlertsCenter";
import { ReplayControls } from "./replay/ReplayControls";
import { ReplayLab } from "./replay/ReplayLab";
import { drawingVisibleInReplay } from "./replay/visibility";
import { WatchlistPanel } from "./watchlist/WatchlistPanel";
import { RiskPlanner } from "./analysis/RiskPlanner";
import { beginReplay,stepReplay,seekReplay,toggleReplayPlayback,setReplaySpeed,visibleReplayCandles,type ReplayState,type ReplaySpeed } from "./replay/model";
import { evaluatePriceAlerts, createPriceAlert, type PriceAlert } from "./alerts/engine";
import { ChartContextLens } from "./context/ChartContextLens";
import { defaultStudies, studyLabels, type StudySettings } from "./indicators/studies";
import { BUILTIN_TEMPLATES, captureChartTemplate, selectTemplate } from "./indicators/templates";
import {defaultStudyParameters,studyParameterBounds,studyParameterKeys,updateStudyParameter} from "./indicators/parameters";
import {createCustomStudy} from "./indicators/formula";
import { defaultWorkspace, loadWorkspace, parseWorkspace, serializeWorkspace, type Workspace, type Level } from "./workspace";
import { CommandPalette } from "./commands/CommandPalette";

type Page = "home" | "terminal" | "sizing" | "alerts" | "library" | "settings";
type Notice = { id: number; message: string; kind: "success" | "info" | "error" };
const frames: Frame[] = ALL_FRAMES;
const studyKeys=Object.keys(defaultStudies) as (keyof StudySettings)[];
const menu: { id: Page; label: string; Icon: typeof Home }[] = [
  { id: "home", label: "Overview", Icon: Home },
  { id: "terminal", label: "Chart workspace", Icon: ChartCandlestick },
  { id: "sizing", label: "Position sizing", Icon: Ruler },
  { id: "alerts", label: "Price Alerts", Icon: Bell },
  { id: "library", label: "Workspace", Icon: Layers },
  { id: "settings", label: "Preferences", Icon: Settings2 },
];
const marketList = Object.keys(symbols) as SymbolId[];
const titles: Record<Page, string> = {
  home: "Market overview", terminal: "Chart workspace", sizing: "Position sizing", alerts:"Price alerts", library: "My workspace", settings: "Preferences"
};

const studio = !new URLSearchParams(window.location.search).has("classic");

export default function App() {
  const candleInspector=useRef<CandleInspector>(null);
  const [manageObjects,setManageObjects] = useState(false);
  const [saveFailed,setSaveFailed] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [prefs, setPrefs] = useState<Workspace>(loadWorkspace);
  const [marketClock,setMarketClock]=useState(()=>Date.now());
  useEffect(()=>{
    const handle=window.setInterval(()=>setMarketClock(Date.now()),60_000);
    return ()=>window.clearInterval(handle);
  },[]);
  const [page, setPage] = useState<Page>("terminal");
  const [focusMode,setFocusMode]=useState(false);
  const [panelTab,setPanelTab]=useState<"markets"|"objects"|"context">(prefs.drawings.length ? "objects" : "markets");
  useEffect(()=>{
    const onFocusShortcut=(event:KeyboardEvent)=>{
      const target=event.target;
      if(!(target instanceof HTMLElement) || target.closest("input,textarea,select,[contenteditable='true']"))return;
      if(event.key.toLowerCase()==="f"&&event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
        event.preventDefault();
        setPage("terminal");
        setFocusMode(current=>!current);
      }
    };
    window.addEventListener("keydown",onFocusShortcut);
    return ()=>window.removeEventListener("keydown",onFocusShortcut);
  },[]);

  const [draft, setDraft] = useState("");
  const [drawMode, setDrawMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState<DrawingTool | null>(null);
  const [selectedDrawingIds,setSelectedDrawingIds]=useState<string[]>([]);
  const linkedChartRefs=useRef<Record<string,ChartSurface>>({});
  const paneCandlesRef=useRef<Record<string,ReturnType<typeof usePriceFeed>["candles"]>>({});
  const syncingChartsRef=useRef(false);
  const drawingHistory = useRef<{ past: Drawing[][]; future: Drawing[][] }>({ past: [], future: [] });
  const [historyVersion, setHistoryVersion] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const resizeStart = useRef<{x:number; width:number} | null>(null);
  const observedPriceRef = useRef<{key:string;price:number}|null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [studyMenuOpen, setStudyMenuOpen] = useState(false);
  const [moreToolsOpen,setMoreToolsOpen]=useState(false);
  const [toolFamily,setToolFamily]=useState<ToolGroup|null>(null);
  const toolPickerRef=useRef<HTMLDivElement>(null);
  const [recentDrawingTools,setRecentDrawingTools]=useState<DrawingTool[]>([]);
  const [noteEditingId,setNoteEditingId]=useState<string|null>(null);
  const [drawingSettingsId,setDrawingSettingsId]=useState<string|null>(null);
  const [levelSettingsId,setLevelSettingsId]=useState<string|null>(null);
  const [noteDraft,setNoteDraft]=useState("");
  const [templateName,setTemplateName]=useState("");
  const [formulaName,setFormulaName]=useState("");
  const [formulaExpression,setFormulaExpression]=useState("");
  const [formulaColor,setFormulaColor]=useState("#59c8d0");
  const [replay,setReplay] = useState<ReplayState|null>(null);
  const inputFile = useRef<HTMLInputElement>(null);
  const feed = usePriceFeed(prefs.symbol, prefs.frame, prefs.priceSource);
  const sessionReference=referenceMarketHours(prefs.symbol,prefs.priceSource,marketClock);
  const instrumentPrecision=priceMetadata(prefs.symbol,prefs.priceSource);
  // Secondary panels are explicitly synthetic until licensed additional feeds
  // can be attached to each pane independently.
  const comparisonFeed = usePriceFeed(prefs.secondarySymbol,prefs.secondaryFrame,prefs.secondarySource);
  const thirdFeed = usePriceFeed(prefs.tertiarySymbol,prefs.tertiaryFrame,prefs.tertiarySource);
  const fourthFeed = usePriceFeed(prefs.quaternarySymbol,prefs.quaternaryFrame,prefs.quaternarySource);
  const overlayFeed=usePriceFeed(prefs.comparisonOverlaySymbol??"EURUSD",prefs.frame,
    prefs.comparisonOverlaySymbol?prefs.comparisonOverlaySource:"demo");
  const comparisonPanels = [
    {slot:"secondarySymbol" as const,frameSlot:"secondaryFrame" as const,sourceSlot:"secondarySource" as const,
      symbol:prefs.secondarySymbol,frame:prefs.secondaryFrame,source:prefs.secondarySource,feed:comparisonFeed,number:2},
    {slot:"tertiarySymbol" as const,frameSlot:"tertiaryFrame" as const,sourceSlot:"tertiarySource" as const,
      symbol:prefs.tertiarySymbol,frame:prefs.tertiaryFrame,source:prefs.tertiarySource,feed:thirdFeed,number:3},
    {slot:"quaternarySymbol" as const,frameSlot:"quaternaryFrame" as const,sourceSlot:"quaternarySource" as const,
      symbol:prefs.quaternarySymbol,frame:prefs.quaternaryFrame,source:prefs.quaternarySource,feed:fourthFeed,number:4}
  ];
  const currentCandles = feed.candles;
  const last = currentCandles.length ? currentCandles[currentCandles.length - 1].close : 0;
  const viewedCandles=useMemo(()=>replay?visibleReplayCandles(replay):currentCandles,[replay,currentCandles]);
  const viewedLast=viewedCandles.length?viewedCandles[viewedCandles.length-1].close:0;
  const replayTime=viewedCandles.length?Number(viewedCandles[viewedCandles.length-1].time):0;
  paneCandlesRef.current={
    primary:viewedCandles,
    secondarySymbol:comparisonFeed.candles,
    tertiarySymbol:thirdFeed.candles,
    quaternarySymbol:fourthFeed.candles
  };
  const currentLevels = useMemo(() => prefs.levels.filter(level => level.symbol === prefs.symbol && (level.source ?? "demo") === prefs.priceSource), [prefs.levels, prefs.symbol, prefs.priceSource]);
  const currentDrawings = useMemo(() => prefs.drawings.filter(drawing => drawing.symbol === prefs.symbol && (drawing.source ?? "demo") === prefs.priceSource), [prefs.drawings, prefs.symbol, prefs.priceSource]);
  const sourceStateLabel = prefs.priceSource === "demo" ? "SYNTHETIC DATA" : ({
    loading: "LOADING BINANCE", connecting: "CONNECTING", historical: "HISTORICAL",
    live: "LIVE · BINANCE SPOT", stale: "STALE FEED", error: "FEED UNAVAILABLE", synthetic: "SYNTHETIC DATA"
  })[feed.status];
  const settingsObject=drawingSettingsId?prefs.drawings.find(d=>d.id===drawingSettingsId):undefined;
  const selectedObject = selectedDrawingIds.length === 1
    ? prefs.drawings.find(drawing => drawing.id === selectedDrawingIds[0])
    : undefined;
  const activeStudyCount=studyKeys.filter(key=>prefs.studies[key]).length+(prefs.showSma?1:0)+prefs.customStudies.filter(s=>s.enabled).length;
  const activeAlertCount=prefs.alerts.filter(a=>a.triggeredAtMs===null).length;
  const quoteText = viewedLast > 0 ? viewedLast.toLocaleString(undefined, {
    minimumFractionDigits: symbols[prefs.symbol].precision,
    maximumFractionDigits: symbols[prefs.symbol].precision
  }) : "—";
  const displaySourceLabel=replay?"REPLAY · HISTORICAL SNAPSHOT":sourceStateLabel;
  const replayDrawings=useMemo(()=>replay?
    currentDrawings.filter(d=>drawingVisibleInReplay(d,replayTime)):currentDrawings,
    [replay,currentDrawings,replayTime]);
  const registerChartSurface=(id:string,surface:ChartSurface|null)=>{
    if(surface)linkedChartRefs.current[id]=surface;
    else delete linkedChartRefs.current[id];
  };
  const onChartRangeChanged=(id:string,range:ChartRange)=>{
    if(!prefs.linkTimeRanges||!range||syncingChartsRef.current)return;
    syncingChartsRef.current=true;
    try{
      for(const [otherId,surface] of Object.entries(linkedChartRefs.current)){
        if(otherId===id)continue;
        try{surface.chart.timeScale().setVisibleRange(range);}
        catch{ /* Target may have fewer history candles; do not fabricate them. */ }
      }
    }finally{syncingChartsRef.current=false;}
  };
  const onChartCrosshairChanged=(id:string,time:number|null)=>{
    if(id==="primary") candleInspector.current?.inspect(time);
    if(!prefs.linkCrosshairs||syncingChartsRef.current)return;
    syncingChartsRef.current=true;
    try{
      for(const [otherId,surface] of Object.entries(linkedChartRefs.current)){
        if(otherId===id)continue;
        const bar=time===null?null:nearestCrosshairBar(paneCandlesRef.current[otherId]??[],time);
        if(bar)surface.chart.setCrosshairPosition(bar.close,bar.time,surface.series);
        else surface.chart.clearCrosshairPosition();
      }
    }finally{syncingChartsRef.current=false;}
  };
  const update = (patch: Partial<Workspace>) => {
    // A replay snapshot is tied to one instrument, timeframe and data provider.
    // Changing any of them must never relabel old candles as a new market.
    if(replay && (
      (patch.symbol!==undefined && patch.symbol!==replay.symbol) ||
      (patch.frame!==undefined && patch.frame!==replay.frame) ||
      (patch.priceSource!==undefined && patch.priceSource!==replay.source)
    ))setReplay(null);
    setPrefs(old => ({ ...old, ...patch }));
  };
  const notify = (message: string, kind: Notice["kind"] = "success") =>
    setNotice({ id: Date.now(), message, kind });
  const openInstrument = (symbol: SymbolId) => {
    update({ symbol, priceSource: symbol === "BTCUSDT" ? prefs.priceSource : "demo" });
    setPage("terminal");
    setSearchOpen(false);
    setDrawMode(false);
    setDrawingTool(null);
    notify(symbols[symbol].label + " opened in the terminal.");
  };
  const openDemoMarket = (symbol:SymbolId) => {
    openInstrument(symbol);
    update({priceSource:"demo"});
    setReplay(null);
  };
  const addLevel = (price: number) => {
    if (!Number.isFinite(price) || price <= 0) { notify("Enter a valid positive price.", "error"); return; }
    setPrefs(old => ({
      ...old, levels: [...old.levels, {
        id: crypto.randomUUID(), symbol: old.symbol, price,
        color: old.accent === "amber" ? "#e7b05f" : old.accent === "teal" ? "#24bfa0" : "#9495fa",
        source: old.priceSource
      }]
    }));
    setDraft("");
    setDrawMode(false);
    setPanelTab("markets");
    notify("Price level added and saved locally.");
  };
  const commitDrawings = (next: Drawing[], message: string) => {
    drawingHistory.current.past.push(prefs.drawings);
    drawingHistory.current.future = [];
    setPrefs(old => ({ ...old, drawings: next }));
    setHistoryVersion(v => v + 1);
    notify(message);
  };
  const addDrawingFor = (drawing: Drawing, source: "demo"|"binance") => {
    const created=applyToolPreset({...drawing,source},prefs.toolPresets[drawing.tool]);
    commitDrawings([...prefs.drawings, created], "Drawing saved locally.");
    setPanelTab("objects");
    if (studio) setSelectedDrawingIds([drawing.id]);
    if (!prefs.keepDrawingToolActive) setDrawingTool(null);
  };
  const addDrawing = (drawing: Drawing) => addDrawingFor(drawing,prefs.priceSource);
  const addComparisonLevel = (symbol:SymbolId,source:"demo"|"binance",price:number) => {
    if(!Number.isFinite(price)||price<=0){notify("Enter a valid positive price.","error");return;}
    setPrefs(old=>({...old,levels:[...old.levels,{
      id:crypto.randomUUID(),symbol,source,price,
      color:old.accent==="amber"?"#e7b05f":old.accent==="teal"?"#24bfa0":"#9495fa"
    }]}));
    setDrawMode(false);notify("Comparison chart price level saved.");
  };
  const updateDrawing = (drawing: Drawing, editKind?:"move"|"start"|"end"|"control"|"target"|"vertex") => {
    commitDrawings(updateDrawingAndGroup(prefs.drawings,drawing,editKind),"Drawing updated.");
  };
  const removeDrawing = (id: string) => {
    if(drawingSettingsId===id)setDrawingSettingsId(null);
    commitDrawings(prefs.drawings.filter(d => d.id !== id), "Drawing removed. Use Undo to restore.");
    setSelectedDrawingIds(ids=>ids.filter(item=>item!==id));
  };
  const removeDrawings=(ids:string[])=>{
    const selection=new Set(ids);
    commitDrawings(prefs.drawings.filter(d=>!selection.has(d.id)||d.locked),
      "Selected unlocked drawings removed. Use Undo to restore.");
    setSelectedDrawingIds([]);
  };
  const groupSelectedDrawings=()=>{
    try{
      const id="group:"+crypto.randomUUID();
      commitDrawings(groupDrawings(prefs.drawings,selectedDrawingIds,id),"Drawings grouped. Drag any member to move the group.");
    }catch(error){notify(error instanceof Error?error.message:"Choose at least two drawings.","error");}
  };
  const ungroupSelectedDrawings=()=>{
    const chosen=new Set(selectedDrawingIds);
    const groupIds=new Set(prefs.drawings.filter(d=>chosen.has(d.id)).map(d=>d.groupId).filter((id):id is string=>!!id));
    const affected=prefs.drawings.filter(d=>chosen.has(d.id)||(d.groupId&&groupIds.has(d.groupId))).map(d=>d.id);
    commitDrawings(ungroupDrawings(prefs.drawings,affected),"Drawing group dissolved.");
  };
  const saveDrawingSettings=(next:Drawing)=>{
    const original=prefs.drawings.find(item=>item.id===next.id);
    if(!original)throw new Error("This drawing has been deleted. Refresh the selection.");
    const checked=validateDrawingSettings(original,next);
    commitDrawings(prefs.drawings.map(item=>item.id===checked.id?checked:item),
      "Drawing properties saved. Undo is available.");
  };
  const saveToolAsDefault=(drawing:Drawing)=>{
    const original=prefs.drawings.find(item=>item.id===drawing.id);
    if(!original){notify("Drawing no longer exists.","error");return;}
    try{
      const validated=validateDrawingSettings(original,drawing);
      const preset=presetFromDrawing(validated);
      setPrefs(old=>({...old,toolPresets:{...old.toolPresets,[validated.tool]:preset}}));
      notify("Default settings saved for "+(TOOL_BY_ID.get(validated.tool)?.label??validated.tool)+".","success");
    }catch(error){notify(error instanceof Error?error.message:"Invalid default settings.","error");}
  };
  const resetToolDefault=(tool:DrawingTool)=>{
    setPrefs(old=>{
      const next={...old.toolPresets};
      delete next[tool];
      return {...old,toolPresets:next};
    });
    notify("Tool defaults restored for "+(TOOL_BY_ID.get(tool)?.label??tool)+".","info");
  };
  const openDrawingSettings=(id:string)=>{
    const active=prefs.drawings.find(d=>d.id===id);
    if(!active){notify("Drawing not found.","error");return;}
    setSelectedDrawingIds([id]);
    setDrawingTool(null);
    setDrawMode(false);
    setDrawingSettingsId(id);
  };
  const setDrawingStyle=(patch:Partial<DrawingStylePatch>)=>{
    if(!selectedDrawingIds.length)return;
    commitDrawings(styleDrawings(prefs.drawings,selectedDrawingIds,patch),"Selected drawing style updated.");
  };
  const shiftDrawingLayers=(direction:"forward"|"backward")=>{
    if(!selectedDrawingIds.length)return;
    commitDrawings(moveDrawingLayers(prefs.drawings,selectedDrawingIds,direction),
      direction==="forward"?"Drawings moved forward.":"Drawings moved backward.");
  };
  const toggleDrawingProperty = (id: string, property: "locked" | "hidden") => {
    const active = prefs.drawings.find(d => d.id === id);
    if (!active) return;
    commitDrawings(
      prefs.drawings.map(d => d.id === id ? { ...d, [property]: !d[property] } : d),
      property === "locked"
        ? active.locked ? "Drawing unlocked." : "Drawing locked."
        : active.hidden ? "Drawing shown." : "Drawing hidden."
    );
  };
  const duplicateDrawing = (id: string) => {
    const active = prefs.drawings.find(d => d.id === id);
    if (!active) return;
    const offset = frameSeconds[prefs.frame] * 3;
    const copy: Drawing = {
      ...active, id: crypto.randomUUID(), hidden: false, locked: false, groupId: undefined,
      start: { time: active.start.time + offset, price: active.start.price * 1.001 },
      end: { time: active.end.time + offset, price: active.end.price * 1.001 },
      ...(active.points?{points:active.points.map(p=>({time:p.time+offset,price:p.price*1.001}))}:{}),
      ...(active.control?{control:{time:active.control.time+offset,price:active.control.price*1.001}}:{}),
      ...(active.target?{target:{time:active.target.time+offset,price:active.target.price*1.001}}:{})
    };
    commitDrawings([...prefs.drawings, copy], "Drawing duplicated.");
  };
  const setPositionTarget=(drawing:Drawing,price:number)=>{
    if(drawing.tool!=="long-position"&&drawing.tool!=="short-position")return;
    const calc=calculatePosition(drawing.tool,drawing.start.price,drawing.end.price,price);
    if(!calc||!calc.targetIsValid){
      notify("Target must be beyond entry in the direction of the position.","error");
      return;
    }
    commitDrawings(prefs.drawings.map(item=>item.id===drawing.id?
      {...item,target:{time:drawing.end.time,price}}:item),
      "Position target set to "+calc.multiple.toFixed(2)+"R.");
  };
  const saveAnnotation = (id:string, text:string) => {
    const active=prefs.drawings.find(d=>d.id===id&&d.tool==="text");
    if(!active){setNoteEditingId(null);return;}
    const clean=text.trim().slice(0,2000);
    if(!clean){notify("Annotation text cannot be empty.","error");return;}
    if(clean!==active.text){
      commitDrawings(prefs.drawings.map(d=>d.id===id?{...d,text:clean}:d),"Annotation text saved.");
    }
    setNoteEditingId(null);
  };
  const undoDrawing = () => {
    const prev = drawingHistory.current.past.pop();
    if (!prev) return;
    drawingHistory.current.future.push(prefs.drawings);
    setPrefs(old => ({ ...old, drawings: prev }));
    setHistoryVersion(v => v + 1);
    notify("Drawing change undone.");
  };
  const redoDrawing = () => {
    const next = drawingHistory.current.future.pop();
    if (!next) return;
    drawingHistory.current.past.push(prefs.drawings);
    setPrefs(old => ({ ...old, drawings: next }));
    setHistoryVersion(v => v + 1);
    notify("Drawing change restored.");
  };
  const chooseDrawingTool = (selected: DrawingTool) => {
    setDrawMode(false);
    const next = drawingTool === selected ? null : selected;
    setDrawingTool(next);
    setMoreToolsOpen(false);
    if(next)setRecentDrawingTools(prev=>[next,...prev.filter(item=>item!==next)].slice(0,6));
    const definition=TOOL_BY_ID.get(selected);
    notify(next
      ? (definition?.points===1?"Click once to place "+definition.label+"."
        :selected==="channel"?"Draw the base line, then click the third channel rail point."
        :definition&&definition.points>=3?"Place two anchors, then add "+
          (definition.points-2)+" more for "+definition.label+"."
        :"Drag or click two points to place "+(definition?.label??selected)+".")
      : "Drawing tool dismissed.","info");
  };
  const toggleToolFamily=(id:ToolGroup|null)=>{
    if(moreToolsOpen&&toolFamily===id){setMoreToolsOpen(false);return;}
    setToolFamily(id);setMoreToolsOpen(true);
  };
  const toggleFavoriteDrawingTool=(selected:DrawingTool)=>{
    const exists=prefs.favoriteDrawingTools.includes(selected);
    update({favoriteDrawingTools:exists
      ?prefs.favoriteDrawingTools.filter(item=>item!==selected)
      :[...prefs.favoriteDrawingTools,selected]});
    notify((exists?"Removed ":"Pinned ")+(TOOL_BY_ID.get(selected)?.label??selected)+
      (exists?" from favorites.":" to your tool favorites."));
  };
  const reorderFavoriteTools=(next:DrawingTool[])=>{
    if(next.length!==prefs.favoriteDrawingTools.length||
      next.some(tool=>!prefs.favoriteDrawingTools.includes(tool)))return;
    update({favoriteDrawingTools:next});
  };
  const startReplay=()=>{
    try{
      setReplay(beginReplay(currentCandles,prefs.symbol,prefs.frame,prefs.priceSource));
      setDrawMode(false);setDrawingTool(null);
      notify("Historical replay started from a frozen chart snapshot.","info");
    }catch(error){notify(error instanceof Error?error.message:"Not enough bars to replay.","error");}
  };
  const exitReplay=()=>{setReplay(null);notify("Returned to the active market chart.","info");};
  const runTerminalCommand=(id:string)=>{
    setSearchOpen(false);
    if(id.startsWith("page:")){
      const destination=id.slice(5) as Page;
      if(menu.some(item=>item.id===destination)){
        setPage(destination);setDrawMode(false);setDrawingTool(null);
        notify(titles[destination]+" opened.","info");
      }
      return;
    }
    if(id.startsWith("draw:")){
      setPage("terminal");
      chooseDrawingTool(id.slice(5) as DrawingTool);
      return;
    }
    if(!id.startsWith("chart:"))return;
    setPage("terminal");
    if(id.startsWith("chart:frame-")){
      const frame=id.slice("chart:frame-".length) as Frame;
      if(frames.includes(frame)){
        update({frame});notify("Switched to "+frame+" candles.","info");
      }
      return;
    }
    switch(id.slice(6)){
      case "indicators":setStudyMenuOpen(true);notify("Technical indicators opened.","info");break;
      case "setup":setSetupOpen(true);notify("Chart configuration expanded.","info");break;
      case "replay":replay?exitReplay():startReplay();break;
      case "focus":setFocusMode(current=>!current);notify("Chart focus toggled.","info");break;
      case "single":case "dual":case "quad":{
        const layout=id.slice(6) as Workspace["chartLayout"];
        update({chartLayout:layout});notify(layout+" chart layout activated.");break;
      }
      case "magnet":update({magnetEnabled:!prefs.magnetEnabled});
        notify(prefs.magnetEnabled?"OHLC magnet disabled.":"OHLC magnet enabled.");break;
      case "level":setDrawMode(true);setDrawingTool(null);
        notify("Click the chart to place a horizontal level.","info");break;
      case "watchlist":setPanelTab("markets");update({rightPanelOpen:true});
        notify("Markets panel opened.","info");break;
      case "crosshairs":update({linkCrosshairs:!prefs.linkCrosshairs});
        notify(prefs.linkCrosshairs?"Independent chart cursors enabled.":"Chart crosshairs linked.");break;
      case "timeranges":update({linkTimeRanges:!prefs.linkTimeRanges});
        notify(prefs.linkTimeRanges?"Independent time windows enabled.":"Chart time windows linked.");break;
      case "objects":setPanelTab("objects");update({rightPanelOpen:true});
        notify("Drawing inspector opened.","info");break;
      case "tools":setToolFamily(null);setMoreToolsOpen(true);notify("Drawing Tool Library opened.","info");break;
      case "context":setPanelTab("context");update({rightPanelOpen:true});
        notify("Chart Context Lens opened.","info");break;
      case "undo":undoDrawing();break;
      case "redo":redoDrawing();break;
    }
  };
  const applyChartTemplate=(id:string)=>{
    const selected=selectTemplate(id,prefs.chartTemplates);
    if(!selected){notify("Chart template was not found.","error");return;}
    update({frame:selected.frame,showSma:selected.showSma,studies:{...selected.studies},studyParameters:{...selected.parameters}});
    notify(selected.name+" chart template applied.");
  };
  const saveFullChartProfile=(name:string)=>{
    try{
      const profile=createChartProfile("profile:"+crypto.randomUUID(),name,prefs,Date.now());
      setPrefs(old=>({...old,chartProfiles:[...old.chartProfiles,profile]}));
      notify(profile.name+" chart workspace saved.");
    }catch(error){notify(error instanceof Error?error.message:"Cannot save chart workspace.","error");}
  };
  const applyFullChartProfile=(id:string)=>{
    const selected=prefs.chartProfiles.find(profile=>profile.id===id);
    if(!selected){notify("Saved chart workspace not found.","error");return;}
    setReplay(null);
    setDrawingTool(null);setDrawMode(false);setSelectedDrawingIds([]);
    setPrefs(old=>applyChartProfile(old,selected));
    notify(selected.name+" chart workspace restored.");
  };
  const deleteFullChartProfile=(id:string)=>{
    setPrefs(old=>({...old,chartProfiles:old.chartProfiles.filter(profile=>profile.id!==id)}));
    notify("Saved chart workspace deleted.");
  };
  const saveChartTemplate=()=>{
    try{
      const template=captureChartTemplate("custom:"+crypto.randomUUID(),templateName,prefs.frame,prefs.showSma,prefs.studies,prefs.studyParameters);
      setPrefs(old=>({...old,chartTemplates:[...old.chartTemplates,template]}));
      setTemplateName("");notify(template.name+" chart template saved.");
    }catch(error){notify(error instanceof Error?error.message:"Invalid template name.","error");}
  };
  const deleteChartTemplate=(id:string)=>{
    setPrefs(old=>({...old,chartTemplates:old.chartTemplates.filter(t=>t.id!==id)}));
    notify("Chart template removed.");
  };
  const saveCustomStudy=()=>{
    try{
      const study=createCustomStudy("custom:"+crypto.randomUUID(),formulaName,formulaExpression,formulaColor);
      setPrefs(old=>({...old,customStudies:[...old.customStudies,study]}));
      setFormulaName("");setFormulaExpression("");
      notify(study.name+" custom study added.");
    }catch(error){notify(error instanceof Error?error.message:"Invalid study expression.","error");}
  };
  const removeCustomStudy=(id:string)=>{
    setPrefs(old=>({...old,customStudies:old.customStudies.filter(study=>study.id!==id)}));
    notify("Custom study deleted.");
  };
  const toggleCustomStudy=(id:string,enabled:boolean)=>{
    setPrefs(old=>({...old,customStudies:old.customStudies.map(study=>
      study.id===id?{...study,enabled}:study)}));
  };
  const addAlert = (alert:PriceAlert) => {
    setPrefs(old=>({...old,alerts:[...old.alerts,alert]}));
    notify("Price alert armed for "+symbols[alert.symbol].label+".");
  };
  const armLevelAlert=(price:number)=>{
    if(replay || viewedLast<=0 || (prefs.priceSource==="binance"&&feed.status!=="live")){
      notify("Return to an active chart before arming a crossing alert.","error");return;
    }
    if(!Number.isFinite(price)||price<=0||Math.abs(price-viewedLast)<1e-10){
      notify("Choose a valid level above or below the observed close.","error");return;
    }
    const direction=price>viewedLast?"above":"below";
    if(prefs.alerts.some(a=>a.symbol===prefs.symbol&&a.source===prefs.priceSource&&
       a.direction===direction&&a.price===price&&a.triggeredAtMs===null)){
      notify("A matching price alert is already armed.","info");return;
    }
    try{
      addAlert(createPriceAlert(prefs.symbol,prefs.priceSource,direction,price,
        crypto.randomUUID(),Date.now()));
      notify("Crossing alert armed in this browser. Keep this tab open.");
    }catch(error){notify(error instanceof Error?error.message:"Cannot arm this alert.","error");}
  };
  const removeAlert = (id:string) => {
    setPrefs(old=>({...old,alerts:old.alerts.filter(a=>a.id!==id)}));
    notify("Price alert deleted.");
  };
  const clearTriggeredAlerts = () => {
    setPrefs(old=>({...old,alerts:old.alerts.filter(a=>a.triggeredAtMs===null)}));
    notify("Triggered alerts cleared.");
  };
  const saveLevelSettings=(next:Level)=>{
    const original=prefs.levels.find(item=>item.id===next.id);
    if(!original||!isValidLevel(next)||next.symbol!==original.symbol||
       (next.source??"demo")!==(original.source??"demo")){
      notify("Invalid price level or changed source identity.","error");return;
    }
    setPrefs(old=>({...old,levels:old.levels.map(level=>level.id===next.id?next:level)}));
    notify("Price level settings saved.","success");
  };
  const removeLevel = (id: string) => {
    if(levelSettingsId===id)setLevelSettingsId(null);
    setPrefs(old => ({ ...old, levels: old.levels.filter(level => level.id !== id) }));
    notify("Price level removed.");
  };
  const exportWorkspace = () => {
    const blob = new Blob([serializeWorkspace(prefs)], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "market-terminal-workspace.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Workspace exported as JSON.");
  };
  const importWorkspace = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2_000_000) { notify("Workspace file is too large (max 2 MB).", "error"); return; }
    try {
      const json: unknown = JSON.parse(await file.text());
      if (!json || typeof json !== "object" || Array.isArray(json) ||
        !("format" in json) || json.format !== "market-terminal-workspace" ||
        !("version" in json) || (json.version !== 27 && json.version !== 1 && json.version !== 2 && json.version !== 3 && json.version !== 4 && json.version !== 5 && json.version !== 6 && json.version !== 7 && json.version !== 8 && json.version !== 9 && json.version !== 10 && json.version !== 11 && json.version !== 12 && json.version !== 13 && json.version !== 14 && json.version !== 15 && json.version !== 16 && json.version !== 17 && json.version !== 18 && json.version !== 19 && json.version !== 20 && json.version !== 21 && json.version !== 22 && json.version !== 23 && json.version !== 24 && json.version !== 25 && json.version !== 26) ||
        !("preferences" in json)) throw new Error("This is not a supported Market Terminal export.");
      const workspace = parseWorkspace(json);
      setReplay(null);
      setPrefs(workspace);
      drawingHistory.current = { past: [], future: [] };
      setHistoryVersion(v => v + 1);
      setDrawMode(false);
      setDrawingTool(null);
      notify("Workspace imported successfully.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not import workspace.", "error");
    }
  };
  const onRailTabKey=(event:ReactKeyboardEvent<HTMLDivElement>)=>{
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
    const tabs=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const active=tabs.indexOf(document.activeElement as HTMLButtonElement);
    if(active<0||tabs.length!==3)return;
    event.preventDefault();
    const next=event.key==="Home"?0:event.key==="End"?2:
      (active+(event.key==="ArrowRight"?1:tabs.length-1))%tabs.length;
    setPanelTab((["markets","objects","context"] as const)[next]);
    tabs[next]?.focus();
  };
  const onResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    resizeStart.current = {x: event.clientX, width: prefs.rightPanelWidth};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onResizeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeStart.current) return;
    update({rightPanelWidth: panelWidthAfterDrag(resizeStart.current.width, resizeStart.current.x, event.clientX)});
  };
  const onResizeStop = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeStart.current) return;
    resizeStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    notify("Watchlist width saved.");
  };
  const onResizeKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
    event.preventDefault();
    update({rightPanelWidth: panelWidthAfterKey(prefs.rightPanelWidth, event.key)});
  };

  useEffect(() => {
    try {
      localStorage.setItem("market-terminal-workspace", serializeWorkspace(prefs));
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
      setNotice({ id: Date.now(), message: "Browser storage is unavailable. Export your workspace to keep changes.", kind: "error" });
    }
  }, [prefs]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(value => !value);
      }
      if (event.key === "Escape") { setSearchOpen(false); setHelpOpen(false); setDrawMode(false); setDrawingTool(null); setStudyMenuOpen(false); setMoreToolsOpen(false); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(()=>{
    if(!moreToolsOpen)return;
    const dismiss=(event:PointerEvent)=>{
      if(event.target instanceof Node&&!toolPickerRef.current?.contains(event.target))
        setMoreToolsOpen(false);
    };
    document.addEventListener("pointerdown",dismiss);
    return ()=>document.removeEventListener("pointerdown",dismiss);
  },[moreToolsOpen]);
  useEffect(() => {
    const drawingShortcuts = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      if (event.shiftKey) redoDrawing();
      else undoDrawing();
    };
    window.addEventListener("keydown", drawingShortcuts);
    return () => window.removeEventListener("keydown", drawingShortcuts);
  }, [prefs.drawings]);
  useEffect(()=>{
    if(!replay||page!=="terminal")return;
    const onReplayKey=(event:KeyboardEvent)=>{
      if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||
        (event.target instanceof HTMLElement&&event.target.closest("input,textarea,select,button,[contenteditable='true']")))return;
      if(event.key==="ArrowRight"){event.preventDefault();setReplay(s=>s?stepReplay({...s,playing:false},1):null);}
      if(event.key==="ArrowLeft"){event.preventDefault();setReplay(s=>s?stepReplay({...s,playing:false},-1):null);}
      if(event.code==="Space"){event.preventDefault();setReplay(s=>s?toggleReplayPlayback(s):null);}
    };
    window.addEventListener("keydown",onReplayKey);
    return()=>window.removeEventListener("keydown",onReplayKey);
  },[replay!==null,page]);
  useEffect(()=>{
    if(!replay?.playing)return;
    const timer=window.setInterval(()=>setReplay(current=>current?stepReplay(current,1):null),
      1000/replay.speed);
    return()=>window.clearInterval(timer);
  },[replay?.playing,replay?.speed]);
  useEffect(()=>{
    if(replay&&(replay.symbol!==prefs.symbol||replay.frame!==prefs.frame||replay.source!==prefs.priceSource))
      setReplay(null);
  },[prefs.symbol,prefs.frame,prefs.priceSource,replay]);
  useEffect(() => {
    const key=prefs.symbol+":"+prefs.priceSource+":"+prefs.frame;
    if(replay||(feed.status!=="live"&&feed.status!=="synthetic")||last<=0){
      observedPriceRef.current=null;
      return;
    }
    const prior=observedPriceRef.current;
    observedPriceRef.current={key,price:last};
    if(!prior||prior.key!==key||prior.price===last)return;
    const result=evaluatePriceAlerts(prefs.alerts,prefs.symbol,prefs.priceSource,prior.price,last,Date.now());
    if(!result.triggered.length)return;
    // Re-check against latest workspace state in case another action changed alerts.
    setPrefs(old=>{
      const current=evaluatePriceAlerts(old.alerts,old.symbol,old.priceSource,prior.price,last,Date.now());
      return current.triggered.length?{...old,alerts:current.updated}:old;
    });
    notify(result.triggered.length+" price alert"+(result.triggered.length===1?"":"s")+" triggered for "+symbols[prefs.symbol].label,"info");
  },[prefs.symbol,prefs.priceSource,prefs.frame,prefs.alerts,last,feed.status,replay]);
  useEffect(() => {
    if (!notice || notice.kind === "error") return;
    const timer = window.setTimeout(() => setNotice(current => current?.id === notice.id ? null : current), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return <div className={"app " + (studio ? "studio " : "") + (prefs.dark ? "dark" : "light") + " accent-" + prefs.accent + (focusMode && page === "terminal" ? " focus-mode" : "")}>
    <header className="topbar">
      <div className="branding">
        <span className="logo"><ChartCandlestick size={20}/></span>
        <span><strong>MARKET<span className="brand-suffix">/TERMINAL</span></strong><small>{studio ? "Analysis workstation" : "Independent trading workspace"}</small></span>
      </div>
      {studio && <nav className="studio-destinations" aria-label="Workstation pages">
        {menu.map(({id,label})=><button key={id} aria-current={id===page?"page":undefined}
          onClick={()=>{setPage(id);setDrawMode(false);setDrawingTool(null);}}>{label}</button>)}
        <button aria-label="Search tools and markets" title="Open Tool Atlas" onClick={()=>setSearchOpen(true)}><Search size={16}/></button>
        <button aria-label="Help and shortcuts" onClick={()=>setHelpOpen(true)}><BookOpen size={16}/></button>
      </nav>}
      <div className="header-center">
        <button className="search-trigger" onClick={() => setSearchOpen(true)}>
          <Search size={16}/><span>Search markets & tools</span><kbd>Ctrl K</kbd>
        </button>
      </div>
      <div className="header-actions">
        <button className="icon-button atlas-header-trigger" title="Search tools and markets" aria-label="Open Tool Atlas" onClick={()=>setSearchOpen(true)}><Search size={18}/></button>
        <span className={"demo-tag source-" + (replay?"historical":feed.status)}><span className="pulse-dot"/> {displaySourceLabel}</span>
        <button className="focus-toggle" type="button" aria-label={focusMode ? "Exit chart focus mode" : "Enter chart focus mode"}
          aria-pressed={focusMode && page === "terminal"} title="Toggle chart focus (Shift+F)"
          onClick={() => {setPage("terminal");setFocusMode(value=>!value);}}>
          {focusMode && page === "terminal" ? <Minimize2 size={15}/> : <Maximize2 size={15}/>}
          <span>{focusMode && page === "terminal" ? "Exit focus" : "Focus"}</span>
        </button>
        <button className="icon-button" title="Price alerts" aria-label="Open price alerts" onClick={() => setPage("alerts")}>
          <Bell size={18}/>{activeAlertCount>0&&<span className="alert-bell-count">{Math.min(99,activeAlertCount)}</span>}
        </button>
        <button className="icon-button" title="Switch appearance" aria-label="Switch appearance" onClick={() => {update({ dark: !prefs.dark }); notify("Appearance updated.");}}>{prefs.dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
        <span className="avatar" title="Local workspace">MT</span>
      </div>
    </header>
    <div className={"app-body " + (!prefs.sidebarOpen ? "compact" : "")}>
      <aside className="primary-sidebar" aria-label="Main navigation">
        <div className="sidebar-upper">
          <div className="sidebar-caption">{prefs.sidebarOpen ? "WORKSPACE" : "•••"}</div>
          {menu.map(({ id, label, Icon }) => <button key={id}
            className={"nav-item " + (page === id ? "active" : "")}
            title={label} aria-label={label} aria-current={page === id ? "page" : undefined}
            onClick={() => { setPage(id); setDrawMode(false); setDrawingTool(null); }}>
            <Icon size={18}/>{prefs.sidebarOpen && <span>{label}</span>}
          </button>)}
        </div>
        <div className="sidebar-lower">
          <button className="nav-item" onClick={() => setHelpOpen(true)} title="Help and shortcuts"><BookOpen size={18}/>{prefs.sidebarOpen && <span>Help & shortcuts</span>}</button>
          <button className="nav-item collapse" onClick={() => update({ sidebarOpen: !prefs.sidebarOpen })}
            title={prefs.sidebarOpen ? "Collapse navigation" : "Expand navigation"}>
            {prefs.sidebarOpen ? <ChevronLeft size={18}/> : <ChevronRight size={18}/>}
            {prefs.sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>
      <div className="main-area">
        <div className="page-topline"><span>WORKSPACE <span className="breadcrumb-slash">/</span> {titles[page].toUpperCase()}</span><span className="workspace-context"><span className="context-marker"/> {page === "terminal" ? `${symbols[prefs.symbol].label} · ${prefs.frame.toUpperCase()} · ${prefs.chartLayout.toUpperCase()} VIEW` : "BROWSER-LOCAL WORKSPACE"}</span></div>
        {studio && page === "home" && <main className="studio-overview">
          <div className="overview-heading"><div><span>Workspace</span><h1>Markets</h1></div>
            <button className="primary-button" onClick={()=>setPage("terminal")}>Resume {symbols[prefs.symbol].label}<ChevronRight size={16}/></button></div>
          <MarketBoard frame={prefs.frame} selected={prefs.symbol} onOpen={openDemoMarket}/>
          <div className="overview-links">
            <button onClick={()=>{setPage("terminal");setPanelTab("objects");}}><Shapes size={20}/><strong>Drawing tools</strong><span>{prefs.drawings.length} objects</span></button>
            <button onClick={()=>setPage("alerts")}><Bell size={20}/><strong>Price alerts</strong><span>{activeAlertCount} armed</span></button>
            <button onClick={()=>setPage("library")}><Layers size={20}/><strong>Workspace</strong><span>{prefs.drawings.length} drawings</span></button>
          </div>
        </main>}
        {!studio && page === "home" && <div className="content-page">
          <div className="hero"><div className="eyebrow">YOUR WORKSPACE AT A GLANCE</div><h1>A clear view of your markets.</h1><p>Get straight back to analysis. Your setup is saved on this device and basic tools don't have usage quotas.</p><button className="primary-button" onClick={() => setPage("terminal")}><ChartCandlestick size={17}/> Open trading terminal <ChevronRight size={16}/></button></div>
          <div className="section-head"><div><small>QUICK ACCESS</small><h2>Markets to explore</h2></div><button className="text-button" onClick={() => setSearchOpen(true)}>Browse symbols <ChevronRight size={16}/></button></div>
          <div className="market-grid">{marketList.map(symbol => <button className="market-tile" key={symbol} onClick={() => openInstrument(symbol)}><span className="market-kind">{symbols[symbol].market}</span><strong>{symbols[symbol].label}</strong><span className="market-tile-bottom">Open chart <ChevronRight size={16}/></span></button>)}</div>
          <div className="section-head"><div><small>WORKSPACE HEALTH</small><h2>Your local setup</h2></div></div>
          <div className="summary-grid"><div><span>Current timeframe</span><strong>{prefs.frame.toUpperCase()}</strong></div><div><span>Saved price levels</span><strong>{prefs.levels.length}</strong></div><div><span>Core drawing quota</span><strong>None</strong></div></div>
          <p className="data-caveat"><Activity size={16}/> Demo instruments use synthetic prices. Opt-in Binance Spot BTC/USDT is available in the terminal; forex, equities and indices are not connected to live feeds.</p>
        </div>}
        {page === "sizing" && <RiskPlanner value={prefs.riskPlanner}
          onChange={riskPlanner=>update({riskPlanner})} symbol={prefs.symbol}
          quotePrice={viewedLast} sourceLabel={displaySourceLabel}
          selectedPosition={selectedObject&&currentDrawings.some(d=>d.id===selectedObject.id)?selectedObject:undefined}/>}
        {page === "terminal" && <div className={"terminal-layout " + (prefs.rightPanelOpen ? "" : "panel-closed")}
          style={{"--right-panel-width": prefs.rightPanelWidth + "px"} as CSSProperties}>
          <section className="terminal-center">
            {studio && <InstrumentHeader key={[prefs.symbol,prefs.frame,prefs.priceSource,Boolean(replay)].join("-")} ref={candleInspector} symbol={prefs.symbol} frame={prefs.frame} candles={viewedCandles}
              source={displaySourceLabel} onSearch={()=>setSearchOpen(true)}/>}
            <div className="studio-header-slot">
            <div className="terminal-toolbar" aria-label="Chart workstation controls">
              <div className="terminal-toolbar-market" role="group" aria-label="Market and chart setup">
              <button className="symbol-button" onClick={() => setSearchOpen(true)}><span>{symbols[prefs.symbol].label}</span><Search size={15}/></button>
              <TimeframePicker value={prefs.frame} source={prefs.priceSource}
                onSelect={frame=>{update({frame});notify("Chart interval changed to "+frame+".","info");}}/>
              <span className="tool-divider"/>
              <button className={"compact-action "+(replay?"active":"")} aria-label={replay?"Exit replay":"Start replay"}
                disabled={!replay&&currentCandles.length<40}
                title={replay?"Exit historical candle replay":"Study historical candles one bar at a time"}
                onClick={replay?exitReplay:startReplay}><Film size={15}/>{replay?"Exit replay":"Replay"}</button>
              <span className="tool-divider"/>

               {studio && <button className="compact-action studio-setup" aria-expanded={setupOpen}
                aria-controls="chart-configuration" onClick={()=>setSetupOpen(value=>!value)}>
                <Settings2 size={16}/> Chart setup
              </button>}
              <div id="chart-configuration" className={studio ? "studio-configuration" : "configuration-inline"} hidden={studio && !setupOpen}>
              <div className="source-switch" role="group" aria-label="Chart price source">
                <button className={prefs.priceSource === "demo" ? "active" : ""}
                  aria-pressed={prefs.priceSource === "demo"}
                  onClick={() => { update({priceSource:"demo"}); setDrawingTool(null); setDrawMode(false); notify("Switched to synthetic demonstration prices.", "info"); }}>Demo</button>
                <button className={prefs.priceSource === "binance" ? "active" : ""}
                  disabled={prefs.symbol !== "BTCUSDT"}
                  title={prefs.symbol === "BTCUSDT" ? "Load public BTC/USDT Spot candles directly from Binance" : "Binance Spot is currently available only for BTC/USDT"}
                  aria-pressed={prefs.priceSource === "binance"}
                  onClick={() => { update({priceSource:"binance"}); setDrawingTool(null); setDrawMode(false); notify("Connecting to Binance Spot BTC/USDT…", "info"); }}>Binance Spot</button>
              </div>
              <button className={"compact-action chart-layout-toggle "+(prefs.chartLayout==="dual"?"active":"")}
                aria-label="Toggle dual-chart layout" aria-pressed={prefs.chartLayout==="dual"}
                title="Switch single and dual views (also from four-chart view)"
                onClick={()=>{
                  update({chartLayout:prefs.chartLayout==="dual"?"single":"dual"});
                  notify(prefs.chartLayout==="dual"?"Single chart workspace enabled.":"Dual-chart workspace enabled.");
                }}><Columns2 size={15}/> {prefs.chartLayout==="dual"?"Two charts":"Split chart"}</button>
              <button className={"compact-action chart-layout-toggle "+(prefs.chartLayout==="quad"?"active":"")}
                aria-label="Toggle four-chart layout" aria-pressed={prefs.chartLayout==="quad"}
                title="View four independently selectable market charts"
                onClick={()=>{
                  update({chartLayout:prefs.chartLayout==="quad"?"single":"quad"});
                  notify(prefs.chartLayout==="quad"?"Single chart enabled.":"Four-chart workspace enabled.");
                }}><Grid2X2 size={15}/> Four charts</button>
              <label className="chart-style-switch">Compare
                <select aria-label="Comparison overlay symbol"
                  value={prefs.comparisonOverlaySymbol??"none"}
                  onChange={e=>{
                    const symbol=e.target.value==="none"?null:e.target.value as SymbolId;
                    update({comparisonOverlaySymbol:symbol,
                      comparisonOverlaySource:symbol==="BTCUSDT"?prefs.comparisonOverlaySource:"demo"});
                    notify(symbol?"Comparison overlay selected. Prices are rebased for visual comparison.":"Comparison overlay hidden.");
                  }}>
                  <option value="none">No overlay</option>
                  {marketList.map(symbol=><option key={symbol} value={symbol}>{symbols[symbol].label}</option>)}
                </select>
              </label>
              {prefs.comparisonOverlaySymbol==="BTCUSDT"&&
                <label className="chart-style-switch">Compare source
                  <select aria-label="Comparison overlay price source"
                    value={prefs.comparisonOverlaySource}
                    onChange={e=>update({comparisonOverlaySource:e.target.value as "demo"|"binance"})}>
                    <option value="demo">Demo</option>
                    <option value="binance">Binance Spot</option>
                  </select>
                </label>}
              <ChartProfileMenu profiles={prefs.chartProfiles}
                onSave={saveFullChartProfile}
                onApply={applyFullChartProfile}
                onDelete={deleteFullChartProfile}/>
              <label className="chart-style-switch">Chart style
                <select aria-label="Chart display style" value={prefs.chartDisplayStyle}
                  onChange={e=>{
                    update({chartDisplayStyle:e.target.value as ChartDisplayStyle});
                    notify("Chart view switched to "+chartStyles.find(c=>c.id===e.target.value)?.label+".");
                  }}>
                  {chartStyles.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              <div className="chart-link-tools">
                <button className={"compact-action "+(prefs.linkCrosshairs?"active":"")}
                  aria-label="Link chart crosshairs" aria-pressed={prefs.linkCrosshairs}
                  title="Follow the same observed candle time across chart panes"
                  onClick={()=>{update({linkCrosshairs:!prefs.linkCrosshairs});notify(prefs.linkCrosshairs?"Crosshair linking disabled.":"Crosshair linking enabled.");}}>
                  {prefs.linkCrosshairs?<Link2 size={14}/>:<Unlink2 size={14}/>} Crosshair
                </button>
                <button className={"compact-action "+(prefs.linkTimeRanges?"active":"")}
                  aria-label="Synchronize chart time ranges" aria-pressed={prefs.linkTimeRanges}
                  title="Synchronize visible time windows when you pan or zoom"
                  onClick={()=>{update({linkTimeRanges:!prefs.linkTimeRanges});notify(prefs.linkTimeRanges?"Independent zoom enabled.":"Linked time-range navigation enabled.");}}>
                  <Link2 size={14}/> Time range
                </button>
              </div>
              </div>
              <span className="tool-divider"/>
              <button className="compact-action panel-toggle" title={prefs.rightPanelOpen ? "Hide watchlist" : "Show watchlist"}
                aria-label={prefs.rightPanelOpen ? "Hide watchlist" : "Show watchlist"}
                aria-pressed={prefs.rightPanelOpen}
                onClick={() => { update({rightPanelOpen: !prefs.rightPanelOpen}); notify(prefs.rightPanelOpen ? "Watchlist hidden." : "Watchlist opened."); }}>
                {prefs.rightPanelOpen ? <PanelRightClose size={16}/> : <PanelRightOpen size={16}/>}
                <span>{prefs.rightPanelOpen ? "Hide panel" : "Show panel"}</span>
              </button>
              <span className="tool-divider"/>
              <div className="study-picker">
                <button className={"compact-action study-trigger "+(activeStudyCount?"active":"")}
                  aria-label="Technical indicators" aria-expanded={studyMenuOpen}
                  aria-controls="study-list" onClick={()=>setStudyMenuOpen(v=>!v)}>
                  <Activity size={15}/> Indicators <span className="study-count">{activeStudyCount}</span>
                </button>
                {studyMenuOpen && <div id="study-list" className="study-list" role="group" aria-label="Technical indicator selection">
                  <div className="study-list-head"><strong>Technical studies</strong><button aria-label="Close indicator menu" onClick={()=>setStudyMenuOpen(false)}><X size={15}/></button></div>
                  <label className="study-option"><input type="checkbox" checked={prefs.showSma}
                    onChange={e=>update({showSma:e.target.checked})}/><span>SMA 20</span></label>
                  {studyKeys.map(key=><label key={key} className="study-option">
                    <input type="checkbox" checked={prefs.studies[key]}
                      onChange={e=>{
                        update({studies:{...prefs.studies,[key]:e.target.checked}});
                        notify(studyLabels[key]+(e.target.checked?" added.":" hidden."));
                      }}/>
                    <span>{studyLabels[key]}</span>
                  </label>)}
                  <div className="study-list-foot"><span>Applied to current market and timeframe</span>
                    <button onClick={()=>{
                      update({studies:{...defaultStudies},showSma:false});notify("All technical indicators hidden.");
                    }}>Clear all</button></div>
                  <div className="study-parameter-section">
                    <div className="study-parameter-head"><strong>Indicator parameters</strong>
                      <button onClick={()=>{update({studyParameters:{...defaultStudyParameters}});notify("Indicator periods reset.");}}>Reset periods</button>
                    </div>
                    <div className="study-parameter-grid">
                      {studyParameterKeys.map(key=><label key={key}>
                        <span>{studyParameterBounds[key].label}</span>
                        <input type="number" inputMode="decimal"
                          aria-label={studyParameterBounds[key].label}
                          min={studyParameterBounds[key].min}
                          max={studyParameterBounds[key].max}
                          step={studyParameterBounds[key].step}
                          value={prefs.studyParameters[key]}
                          onChange={e=>{
                            if(!e.target.value)return;
                            try{update({studyParameters:updateStudyParameter(prefs.studyParameters,key,Number(e.target.value))});}
                            catch(error){notify(error instanceof Error?error.message:"Invalid indicator period.","error");}
                          }}/>
                      </label>)}
                    </div>
                    <small>Changes update every chart in this workspace. MACD fast must be less than slow.</small>
                  </div>
                  <div className="custom-study-section">
                    <strong>Custom formula studies</strong>
                    <small>Supported: open, high, low, close, hl2, ohlc4, SMA, EMA, ABS, MIN, MAX and arithmetic.
                      No scripts or external code are executed.</small>
                    <input aria-label="Custom study name" placeholder="Study name"
                      maxLength={80} value={formulaName} onChange={e=>setFormulaName(e.target.value)}/>
                    <input aria-label="Custom study expression" placeholder="EMA(close,21) - SMA(close,50)"
                      maxLength={256} value={formulaExpression} onChange={e=>setFormulaExpression(e.target.value)}/>
                    <div className="custom-study-create">
                      <label>Line color <input type="color" aria-label="Custom study color"
                        value={formulaColor} onChange={e=>setFormulaColor(e.target.value)}/></label>
                      <button aria-label="Add custom study" onClick={saveCustomStudy}>Add formula</button>
                    </div>
                    {prefs.customStudies.length>0&&<div className="custom-study-list">
                      {prefs.customStudies.map(study=><div key={study.id}>
                        <label title={study.expression}>
                          <input type="checkbox" aria-label={"Enable custom study "+study.name}
                            checked={study.enabled} onChange={e=>toggleCustomStudy(study.id,e.target.checked)}/>
                          <span>{study.name}</span>
                        </label>
                        <button aria-label={"Delete custom study "+study.name}
                          onClick={()=>removeCustomStudy(study.id)}><Trash2 size={14}/></button>
                      </div>)}
                    </div>}
                  </div>
                  <div className="study-template-section">
                    <strong>Chart templates</strong>
                    <select aria-label="Apply chart template" value="" onChange={e=>applyChartTemplate(e.target.value)}>
                      <option value="" disabled>Choose a saved setup…</option>
                      <optgroup label="Built-in setups">
                        {BUILTIN_TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                      </optgroup>
                      {prefs.chartTemplates.length>0&&<optgroup label="Your templates">
                        {prefs.chartTemplates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                      </optgroup>}
                    </select>
                    <div className="study-template-save">
                      <input aria-label="Template name" placeholder="Name this configuration"
                        maxLength={80} value={templateName} onChange={e=>setTemplateName(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter")saveChartTemplate();}}/>
                      <button aria-label="Save study template" onClick={saveChartTemplate}>Save</button>
                    </div>
                    {prefs.chartTemplates.length>0&&<div className="study-template-list">
                      {prefs.chartTemplates.map(t=><div key={t.id}>
                        <span title={t.name}>{t.name}</span>
                        <button aria-label={"Delete template "+t.name} title="Delete study template"
                          onClick={()=>deleteChartTemplate(t.id)}><Trash2 size={14}/></button>
                      </div>)}
                    </div>}
                  </div>
                </div>}
              </div>
              </div>
              </div>
            </div>
            <div className="studio-body terminal-toolbar">
              <div className="terminal-toolbar-drawing" role="group" aria-label="Drawing and editing tools">
              {studio ? <StudioDrawingRail
                containerRef={toolPickerRef}
                active={drawingTool} opened={moreToolsOpen} category={toolFamily}
                favorites={prefs.favoriteDrawingTools} recent={recentDrawingTools}
                magnet={prefs.magnetEnabled} repeat={prefs.keepDrawingToolActive}
                canUndo={drawingHistory.current.past.length>0}
                canRedo={drawingHistory.current.future.length>0}
                disabled={!currentCandles.length}
                 favoriteBarVisible={prefs.favoriteBar.visible}
                 onToggleFavoriteBar={()=>update({favoriteBar:{...prefs.favoriteBar,visible:!prefs.favoriteBar.visible}})}
                onToggleCategory={toggleToolFamily}
                onSelect={chooseDrawingTool} onFavorite={toggleFavoriteDrawingTool}
                onCursor={()=>{setDrawingTool(null);setDrawMode(false);setMoreToolsOpen(false);notify("Cursor ready: select or edit existing chart objects.","info");}}
                onMagnet={()=>{update({magnetEnabled:!prefs.magnetEnabled});notify(prefs.magnetEnabled?"OHLC magnet disabled.":"OHLC magnet enabled.");}}
                onRepeat={()=>{update({keepDrawingToolActive:!prefs.keepDrawingToolActive});notify(prefs.keepDrawingToolActive?"Single-use drawing enabled.":"Continuous drawing enabled.");}}
                onUndo={undoDrawing} onRedo={redoDrawing}
                onObjects={()=>{setPanelTab("objects");update({rightPanelOpen:true});notify("Object inspector opened.");}}
                onClose={()=>setMoreToolsOpen(false)}/>
              : <>

              <span className="toolbar-group-label">DRAW</span>
              <button disabled={!currentCandles.length} className={"compact-action draw-toggle " + (drawMode ? "active" : "")} onClick={() => { setDrawingTool(null); setDrawMode(!drawMode); notify(!drawMode ? "Drawing armed: click the chart to place a horizontal level." : "Drawing cancelled.", "info"); }}><Plus size={15}/> Price level</button>
              <span className="tool-divider"/>
              <button disabled={!currentCandles.length} title="Drag on the chart to draw a trendline" className={"compact-action " + (drawingTool === "trendline" ? "active" : "")} onClick={() => chooseDrawingTool("trendline")}><TrendingUp size={15}/> Trendline</button>
              <button disabled={!currentCandles.length} title="Drag on the chart to draw a rectangle" className={"compact-action " + (drawingTool === "rectangle" ? "active" : "")} onClick={() => chooseDrawingTool("rectangle")}><Square size={15}/> Rectangle</button>
              <button disabled={!currentCandles.length} title="Drag on the chart to draw Fibonacci levels" className={"compact-action " + (drawingTool === "fibonacci" ? "active" : "")} onClick={() => chooseDrawingTool("fibonacci")}><Ruler size={15}/> Fibonacci</button>
              <button disabled={!currentCandles.length} title="Draw a ray from two points" className={"compact-action " + (drawingTool === "ray" ? "active" : "")}
                onClick={() => chooseDrawingTool("ray")}><MoveUpRight size={15}/> Ray</button>
              <button disabled={!currentCandles.length} title="Measure the price and percentage difference between two points" className={"compact-action " + (drawingTool === "measure" ? "active" : "")}
                onClick={() => chooseDrawingTool("measure")}><ArrowUpRight size={15}/> Measure</button>
              <div ref={toolPickerRef} className="study-picker advanced-tool-picker">
                <button className={"compact-action "+(moreToolsOpen?"active":"")}
                  aria-label="More drawing tools" title="Browse precise chart tools and your favorites" aria-expanded={moreToolsOpen}
                  onClick={()=>setMoreToolsOpen(open=>!open)}><Shapes size={15}/> Tool library</button>
                {moreToolsOpen&&<ToolShelf
                  active={drawingTool} favorites={prefs.favoriteDrawingTools}
                  recent={recentDrawingTools} disabled={!currentCandles.length}
                  onSelect={chooseDrawingTool} onFavorite={toggleFavoriteDrawingTool}
                  onClose={()=>setMoreToolsOpen(false)}/>} 
              </div>
              <button className={"compact-action magnet-toggle " + (prefs.magnetEnabled ? "active" : "")}
                aria-label="Snap to candle OHLC" aria-pressed={prefs.magnetEnabled}
                title="Magnet: snap nearby drawing anchors to candle open, high, low or close"
                onClick={()=>{
                  update({magnetEnabled:!prefs.magnetEnabled});
                  notify(prefs.magnetEnabled?"OHLC magnet disabled.":"OHLC magnet enabled.");
                }}><Magnet size={15}/> Magnet</button>
              <button className={"compact-action repeat-toggle " + (prefs.keepDrawingToolActive ? "active" : "")}
                aria-label="Keep drawing tool active" aria-pressed={prefs.keepDrawingToolActive}
                title="Keep current drawing tool active after creating a shape"
                onClick={() => {update({keepDrawingToolActive:!prefs.keepDrawingToolActive});notify(prefs.keepDrawingToolActive ? "Single-use drawing mode enabled." : "Continuous drawing enabled.");}}>
                <Repeat2 size={15}/> Repeat
              </button>
              <span className="tool-divider"/>
              <button title="Undo drawing" aria-label="Undo drawing" disabled={historyVersion < 0 || !drawingHistory.current.past.length} className="compact-action" onClick={undoDrawing}><Undo2 size={16}/></button>
              <button title="Redo drawing" aria-label="Redo drawing" disabled={!drawingHistory.current.future.length} className="compact-action" onClick={redoDrawing}><Redo2 size={16}/></button>
              </>}
              </div>
            {studio&&<FavoriteToolbar favorites={prefs.favoriteDrawingTools}
              active={drawingTool} disabled={!currentCandles.length}
              layout={prefs.favoriteBar} onLayout={favoriteBar=>update({favoriteBar})}
              onSelect={chooseDrawingTool} onUnpin={toggleFavoriteDrawingTool}
              onReorder={reorderFavoriteTools}
              onBrowse={()=>{setToolFamily(null);setMoreToolsOpen(true);}}/>}
            <div className="studio-chart-column">
            {!studio && <div className="chart-heading"><div>
              <div className="eyebrow">{replay?"HISTORICAL REPLAY · "+feed.sourceLabel:feed.sourceLabel} <span>•</span> {prefs.frame.toUpperCase()}</div>
              <h1>{studio ? <button aria-label="Choose chart instrument" onClick={()=>setSearchOpen(true)}>{symbols[prefs.symbol].label}<Search size={17}/></button> : symbols[prefs.symbol].label} <span className={"demo-pill feed-pill " + (replay?"historical":feed.status)}>{displaySourceLabel}</span></h1>
              <p>{replay?"Paused historical snapshot · Future candles hidden until you advance":prefs.priceSource === "demo" ? "Illustrative candles, not executable quotes" : "Direct Binance public Spot data · BTC/USDT, not broker CFD prices"}</p>
            </div><div className="quote"><small>{replay?"REPLAY BAR CLOSE":prefs.priceSource === "demo" ? "SIMULATED LAST" : "BINANCE SPOT LAST"}</small><strong>{quoteText}</strong></div></div>}
            <details className="market-session-reference">
              <summary>
                <span>Market hours reference</span>
                <strong>{sessionReference.summary}</strong>
                <small>Not an execution or feed status</small>
              </summary>
              <p>{sessionReference.detail}</p>
              <p>{instrumentPrecision.note}</p>
              {sessionReference.sourceUrl&&<a href={sessionReference.sourceUrl} target="_blank"
                rel="noopener noreferrer">View official Nasdaq calendar</a>}
            </details>
            {prefs.priceSource === "binance" && feed.status !== "live" && <div className={"feed-message " + feed.status} role="status">
              <WifiOff size={16}/><span>{feed.message ?? "Connecting to the exchange…"}</span>
              <button onClick={feed.retry}><RefreshCw size={14}/> Retry</button>
              <button onClick={() => update({priceSource:"demo"})}>Use demo</button>
            </div>}
            {prefs.chartDisplayStyle==="heikin-ashi"&&
              <div className="chart-display-notice" role="status">
                Heikin Ashi is a derived OHLC chart transformation, not broker-executable prices.
                Drawings and alerts still use the underlying observed OHLC, not the transformed chart values.
              </div>}
            {replay && <ReplayControls replay={replay}
              onTogglePlay={()=>setReplay(s=>s?toggleReplayPlayback(s):s)}
              onStep={()=>setReplay(s=>s?stepReplay({...s,playing:false}):s)}
              onStepBack={()=>setReplay(s=>s?stepReplay({...s,playing:false},-1):s)}
              onSeek={index=>setReplay(s=>s?seekReplay(s,index):s)}
              onSpeed={(speed:ReplaySpeed)=>setReplay(s=>s?setReplaySpeed(s,speed):s)}
              onExit={exitReplay}
            />}
            {replay && <ReplayLab key={[replay.symbol,replay.frame,replay.source,replay.snapshot[0]?.time].join(":")}
              replay={replay} onSave={study=>{
                setPrefs(old=>({...old,replayStudies:[study,...old.replayStudies.filter(item=>item.id!==study.id)].slice(0,200)}));
                notify("Replay study saved to your local workspace.");
              }}/>}
            {studio && <div className="studio-tool-state" role="status">
              {selectedObject && !drawingTool && !drawMode ? <>
                <Pencil size={14}/><strong>{selectedObject.tool}</strong>
                <label>Weight <select aria-label="Quick stroke weight" value={selectedObject.strokeWidth ?? 2}
                  onChange={event=>setDrawingStyle({strokeWidth:Number(event.target.value)})}>
                  {[1,2,3,4,5,6,7,8].map(width=><option key={width} value={width}>{width} px</option>)}
                </select></label>
                <button aria-label="Open selected drawing settings"
                  title="Edit style, exact coordinates and visibility"
                  onClick={()=>openDrawingSettings(selectedObject.id)}><Settings2 size={14}/> Properties</button>
                <button onClick={()=>setSelectedDrawingIds([])}>Done</button>
              </> : <><MousePointer2 size={14}/><strong>{drawMode ? "Price level" : drawingTool ?? "Navigate"}</strong>
              <span>{drawMode ? "Click a price on the chart" : drawingTool === "channel" ? "Place the baseline, then the parallel edge" : drawingTool === "text" ? "Click to place a note" : drawingTool === "brush" ? "Drag to sketch" : drawingTool ? (TOOL_BY_ID.get(drawingTool)?.points===1?"Click once to place":
                  (TOOL_BY_ID.get(drawingTool)?.points??2)>2?
                  "Two anchors first · "+((TOOL_BY_ID.get(drawingTool)?.points??2)-2)+" extra points":
                  "Drag or place two anchors") : "Drag to pan · Scroll to zoom"}</span>
              {(drawingTool || drawMode) && <button onClick={()=>{setDrawingTool(null);setDrawMode(false);}}>Cancel</button>}</>}
            </div>}
            {!studio && drawMode && <div className="draw-banner"><MousePointer2 size={16}/> Click on the chart to place a level <button onClick={() => setDrawMode(false)}>Cancel <X size={14}/></button></div>}
            {!studio && drawingTool && <div className="draw-banner"><MousePointer2 size={16}/> Click two points or drag to draw a {drawingTool}. After drawing, click the shape to move it or drag its handles. <button onClick={() => setDrawingTool(null)}>Cancel <X size={14}/></button></div>}
            <div className={"chart-grid chart-grid-"+(replay?"single":prefs.chartLayout)}>
              <section className="chart-grid-cell" aria-label="Primary chart">
                {!replay&&prefs.chartLayout!=="single"&&<div className="chart-cell-label"><span>01 / PRIMARY</span>
                  <strong>{symbols[prefs.symbol].label}</strong><small>{feed.sourceLabel}</small>
                </div>}
                <ChartErrorBoundary title="Primary chart"
                  resetKey={prefs.symbol+":"+prefs.frame+":"+prefs.priceSource+":"+prefs.chartDisplayStyle}>
                  <ChartCanvas chartStyle={prefs.chartDisplayStyle}
                  comparisonCandles={prefs.comparisonOverlaySymbol?overlayFeed.candles:undefined}
                  comparisonLabel={prefs.comparisonOverlaySymbol?
                    symbols[prefs.comparisonOverlaySymbol].label+" · "+overlayFeed.sourceLabel+
                    " ("+overlayFeed.status+")":undefined}
                  paneId="primary" onSurfaceReady={registerChartSurface}
                  onRangeChanged={onChartRangeChanged} onCrosshairChanged={onChartCrosshairChanged}
                  key={replay?"historical-replay":"active-chart"} symbol={prefs.symbol} frame={prefs.frame} source={prefs.priceSource} candles={viewedCandles}
                  dark={prefs.dark} showSma={prefs.showSma} studies={prefs.studies} customStudies={prefs.customStudies} parameters={prefs.studyParameters} levels={replay?[]:currentLevels} drawMode={drawMode} onPlaceLevel={addLevel}
                  drawingTool={drawingTool} drawings={replayDrawings} magnetEnabled={prefs.magnetEnabled}
                  drawingColor={prefs.accent === "amber" ? "#e9b368" : prefs.accent === "teal" ? "#32c7aa" : "#9295ff"}
                  onAddDrawing={addDrawing} onUpdateDrawing={updateDrawing} onDeleteDrawing={removeDrawing} onDeleteDrawings={removeDrawings}
                  selectedDrawingIds={selectedDrawingIds} onDrawingSelectionChange={setSelectedDrawingIds} onOpenDrawingSettings={openDrawingSettings}/>
                </ChartErrorBoundary>
              </section>
              {!replay&&comparisonPanels.slice(0,prefs.chartLayout==="quad"?3:prefs.chartLayout==="dual"?1:0)
                .map(panel=><section key={panel.slot} className="chart-grid-cell"
                  aria-label={panel.number===2?"Secondary chart":"Comparison chart "+panel.number}>
                  <div className="chart-cell-label"><span>{String(panel.number).padStart(2,"0")} / COMPARISON</span>
                    <label className="secondary-symbol-select">Symbol
                      <select aria-label={panel.number===2?"Secondary chart symbol":"Chart "+panel.number+" symbol"}
                        value={panel.symbol}
                        onChange={e=>{
                          const symbol=e.target.value as SymbolId;
                          update({[panel.slot]:symbol,
                            [panel.sourceSlot]:symbol==="BTCUSDT"?panel.source:"demo"});
                        }}>
                        {marketList.map(symbol=><option key={symbol} value={symbol}>{symbols[symbol].label}</option>)}
                      </select>
                    </label>
                    <label className="secondary-symbol-select">Frame
                      <select aria-label={"Chart "+panel.number+" timeframe"} value={panel.frame}
                        onChange={e=>update({[panel.frameSlot]:e.target.value as Frame})}>
                        {frames.map(frame=><option key={frame} value={frame}>{frame}</option>)}
                      </select>
                    </label>
                    <label className="secondary-symbol-select">Source
                      <select aria-label={"Chart "+panel.number+" price source"} value={panel.source}
                        onChange={e=>update({[panel.sourceSlot]:e.target.value as "demo"|"binance"})}>
                        <option value="demo">Demo</option>
                        <option value="binance" disabled={panel.symbol!=="BTCUSDT"}>Binance Spot</option>
                      </select>
                    </label>
                    <small>{panel.feed.sourceLabel} · {panel.feed.status.toUpperCase()}</small>
                    <button className="chart-make-primary"
                      aria-label={panel.number===2?"Make comparison chart primary":"Make chart "+panel.number+" primary"}
                      title="Swap this chart into the main workspace for complete object management"
                      onClick={()=>{
                        setPrefs(old=>({
                          ...old,symbol:old[panel.slot],[panel.slot]:old.symbol,
                          frame:old[panel.frameSlot],[panel.frameSlot]:old.frame,
                          priceSource:old[panel.sourceSlot],[panel.sourceSlot]:old.priceSource
                        }));
                        setDrawingTool(null);setDrawMode(false);setSelectedDrawingIds([]);
                        notify("Chart moved to primary with its own quote source and timeframe.");
                      }}>Make primary</button>
                  </div>
                  <ChartErrorBoundary title={"Chart "+panel.number}
                    resetKey={panel.symbol+":"+panel.frame+":"+panel.source+":"+prefs.chartDisplayStyle}>
                  <ChartCanvas chartStyle={prefs.chartDisplayStyle} paneId={panel.slot} onSurfaceReady={registerChartSurface}
                    onRangeChanged={onChartRangeChanged} onCrosshairChanged={onChartCrosshairChanged}
                    key={"comparison-"+panel.slot+"-"+panel.symbol+"-"+panel.frame+"-"+panel.source}
                    symbol={panel.symbol} frame={panel.frame}
                    source={panel.source} candles={panel.feed.candles} dark={prefs.dark}
                    showSma={prefs.showSma} studies={prefs.studies} customStudies={prefs.customStudies} parameters={prefs.studyParameters}
                    levels={prefs.levels.filter(level=>level.symbol===panel.symbol&&(level.source??"demo")===panel.source)}
                    drawMode={drawMode} onPlaceLevel={price=>addComparisonLevel(panel.symbol,panel.source,price)}
                    drawingTool={drawingTool}
                    drawings={prefs.drawings.filter(d=>d.symbol===panel.symbol&&(d.source??"demo")===panel.source)}
                    magnetEnabled={prefs.magnetEnabled}
                    drawingColor={prefs.accent==="amber"?"#e9b368":prefs.accent==="teal"?"#32c7aa":"#9295ff"}
                    onAddDrawing={drawing=>addDrawingFor(drawing,panel.source)} onUpdateDrawing={updateDrawing} onDeleteDrawing={removeDrawing} onDeleteDrawings={removeDrawings}
                    selectedDrawingIds={selectedDrawingIds} onDrawingSelectionChange={setSelectedDrawingIds} onOpenDrawingSettings={openDrawingSettings}/>
                  </ChartErrorBoundary>
                </section>)}
            </div>
            <div className="chart-footer"><span><span className="sync-point">●</span> {saveFailed?"Local save failed":"Locally saved"}</span><span>Source: {feed.sourceLabel} · {frameSeconds[prefs.frame] / 60}m candle interval · {replay?"historical replay":feed.status}{feed.lastUpdatedMs ? " · Updated " + new Date(feed.lastUpdatedMs).toLocaleTimeString() : ""}</span></div>
            </div>
            </div>
          </section>
          {prefs.rightPanelOpen && <aside className="right-panel">
            <div className="panel-resizer" role="separator" tabIndex={0} aria-label="Resize watchlist panel"
              aria-orientation="vertical" aria-valuenow={prefs.rightPanelWidth} aria-valuemin={220} aria-valuemax={460}
              title="Drag to resize watchlist, or use arrow keys"
              onPointerDown={onResizeStart} onPointerMove={onResizeMove}
              onPointerUp={onResizeStop} onPointerCancel={onResizeStop}
              onKeyDown={onResizeKey}/>
            <div className="workspace-rail-tabs context-tabs" role="tablist" aria-label="Workspace side panel" onKeyDown={onRailTabKey}>
              <button type="button" role="tab" id="rail-tab-markets" aria-controls="rail-panel-markets"
                aria-selected={panelTab==="markets"} tabIndex={panelTab==="markets"?0:-1} className={panelTab==="markets"?"active":""}
                onClick={()=>setPanelTab("markets")}><Compass size={15}/> Markets</button>
              <button type="button" role="tab" id="rail-tab-objects" aria-controls="rail-panel-objects"
                aria-selected={panelTab==="objects"} tabIndex={panelTab==="objects"?0:-1} className={panelTab==="objects"?"active":""}
                onClick={()=>setPanelTab("objects")}><Layers size={15}/> Objects <span className="rail-count">{currentDrawings.length}</span></button>
              <button type="button" role="tab" id="rail-tab-context" aria-controls="rail-panel-context"
                aria-selected={panelTab==="context"} tabIndex={panelTab==="context"?0:-1} className={panelTab==="context"?"active":""}
                onClick={()=>setPanelTab("context")}><Activity size={15}/> Context</button>
            </div>
            {panelTab==="markets"&&<div className="workspace-rail-content" id="rail-panel-markets" role="tabpanel" aria-labelledby="rail-tab-markets">
            <WatchlistPanel items={prefs.watchlist} favorites={prefs.watchlistFavorites} selected={prefs.symbol}
              onOpen={openInstrument} onChange={(watchlist,watchlistFavorites)=>{
                update({watchlist,watchlistFavorites});notify("Watchlist saved locally.");
              }}/>
            <div className="panel-head separated"><strong>Price levels</strong><span className="count">{currentLevels.length}</span></div>
            <div className="price-form"><input type="number" min="0" step="any" aria-label="Level price" placeholder={last.toFixed(symbols[prefs.symbol].precision)} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addLevel(draft.trim() ? Number(draft) : last); }}/><button aria-label="Add price level" title="Add price level" onClick={() => addLevel(draft.trim() ? Number(draft) : last)}><Plus size={17}/></button></div>
            <div className="level-list">{currentLevels.map(level =>
              <div key={level.id} className={levelVisibleAtFrame(level,prefs.frame)?"":"price-level-unshown"}>
                <span className="level-swatch" style={{ background: level.color }}/>
                <span className="price-level-row-label">
                  <strong>{level.price.toFixed(symbols[prefs.symbol].precision)}</strong>
                  {level.title&&level.title!=="LEVEL"&&<small>{level.title}</small>}
                  {!levelVisibleAtFrame(level,prefs.frame)&&<small>Hidden on {prefs.frame}</small>}
                </span>
                <button aria-label={"Edit price level "+level.price} title="Level properties"
                  onClick={()=>setLevelSettingsId(level.id)}><Settings2 size={15}/></button>
                <button aria-label={"Remove price level " + level.price} title="Remove level" onClick={() => removeLevel(level.id)}><Trash2 size={15}/></button>
              </div>)}</div>
            </div>}
            {panelTab==="objects"&&<div className="workspace-rail-content" id="rail-panel-objects" role="tabpanel" aria-labelledby="rail-tab-objects">
            <div className="panel-head"><strong>Chart drawings</strong>{studio ? <button className="manage-objects" aria-expanded={manageObjects} onClick={()=>setManageObjects(value=>!value)}>Manage</button> : <span className="count">{currentDrawings.length}</span>}</div>
            {(!studio || manageObjects) && <div className="drawing-bulk-toolbar">
              <span>{selectedDrawingIds.length} selected</span>
              <button aria-label="Select all chart drawings"
                onClick={()=>setSelectedDrawingIds(currentDrawings.map(d=>d.id))}>Select all</button>
              <button aria-label="Clear drawing selection" onClick={()=>setSelectedDrawingIds([])}>Clear</button>
              <button aria-label="Group selected drawings" disabled={selectedDrawingIds.length<2}
                onClick={groupSelectedDrawings}>Group</button>
              <button aria-label="Ungroup selected drawings" disabled={!selectedDrawingIds.length}
                onClick={ungroupSelectedDrawings}>Ungroup</button>
            </div>}
            {selectedDrawingIds.length>0&&<div className="drawing-style-toolbar">
              <label>Color <input type="color" aria-label="Selected drawing color"
                value={prefs.drawings.find(d=>selectedDrawingIds.includes(d.id))?.color??"#9495fa"}
                onChange={e=>setDrawingStyle({color:e.target.value})}/></label>
              <label>Weight <select aria-label="Selected drawing weight"
                value={prefs.drawings.find(d=>selectedDrawingIds.includes(d.id))?.strokeWidth??2}
                onChange={e=>setDrawingStyle({strokeWidth:Number(e.target.value)})}>
                {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}px</option>)}
              </select></label>
              <label>Style <select aria-label="Selected drawing line style"
                value={prefs.drawings.find(d=>selectedDrawingIds.includes(d.id))?.dash??"solid"}
                onChange={e=>setDrawingStyle({dash:e.target.value as "solid"|"dashed"|"dotted"})}>
                <option value="solid">Solid</option><option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select></label>
              <label>Opacity <input type="range" aria-label="Selected drawing opacity"
                min={.1} max={1} step={.1}
                value={prefs.drawings.find(d=>selectedDrawingIds.includes(d.id))?.opacity??1}
                onChange={e=>setDrawingStyle({opacity:Number(e.target.value)})}/></label>
              <div className="drawing-layer-actions">
                <button aria-label="Bring selected drawings forward" onClick={()=>shiftDrawingLayers("forward")}><ArrowUp size={14}/> Forward</button>
                <button aria-label="Send selected drawings backward" onClick={()=>shiftDrawingLayers("backward")}><ArrowDown size={14}/> Backward</button>
              </div>
            </div>}
            <div className="drawing-object-list">{currentDrawings.map((drawing,index) =>
              <div key={drawing.id} className={"drawing-object-row " + (drawing.hidden ? "object-hidden" : "")}>
                <input type="checkbox" className="drawing-select-checkbox"
                  aria-label={"Select drawing "+(index+1)}
                  checked={selectedDrawingIds.includes(drawing.id)}
                  onChange={e=>setSelectedDrawingIds(ids=>
                    e.target.checked?[...new Set([...ids,drawing.id])]:ids.filter(id=>id!==drawing.id))}/>
                <span className="level-swatch" style={{background:drawing.color}}/>
                <span className="drawing-object-name" title={drawing.tool}>
                  {studio ? <button className="object-select" aria-pressed={selectedDrawingIds.includes(drawing.id)}
                    onClick={()=>setSelectedDrawingIds(selectedDrawingIds.includes(drawing.id)?[]:[drawing.id])}>
                    {drawing.tool==="text"?drawing.text||"Note":drawing.tool}</button> : <>{index+1}. {drawing.tool}{drawing.tool==="text"?" · "+(drawing.text||"Note"):""}</>}
                </span>
                <div className="drawing-object-actions">
                  {drawing.tool==="text"&&<button aria-label={"Edit annotation "+(index+1)}
                    title="Edit annotation text" onClick={()=>{
                      setNoteEditingId(drawing.id);setNoteDraft(drawing.text||"Note");
                    }}><Pencil size={14}/></button>}
                  <button aria-label={"Settings for drawing "+(index+1)}
                    title="Open drawing style, coordinates and visibility"
                    onClick={()=>openDrawingSettings(drawing.id)}><Settings2 size={15}/></button>
                  <button aria-label={(drawing.hidden ? "Show " : "Hide ") + drawing.tool + " " + (index+1)}
                    title={drawing.hidden ? "Show drawing" : "Hide drawing"}
                    onClick={() => toggleDrawingProperty(drawing.id,"hidden")}>
                    {drawing.hidden ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                  <button aria-label={(drawing.locked ? "Unlock " : "Lock ") + drawing.tool + " " + (index+1)}
                    title={drawing.locked ? "Unlock drawing" : "Lock drawing"}
                    onClick={() => toggleDrawingProperty(drawing.id,"locked")}>
                    {drawing.locked ? <Lock size={15}/> : <Unlock size={15}/>}
                  </button>
                  <button aria-label={"Duplicate " + drawing.tool + " " + (index+1)}
                    title="Duplicate drawing" onClick={() => duplicateDrawing(drawing.id)}><Copy size={15}/></button>
                  <button aria-label={"Delete " + drawing.tool + " " + (index+1)}
                    title="Delete drawing" onClick={() => removeDrawing(drawing.id)}><Trash2 size={15}/></button>
                </div>
                {(drawing.tool==="long-position"||drawing.tool==="short-position")&&
                  <label className="drawing-position-target-edit">Profit target
                    <input type="number" min="0.00000001" step="any"
                      key={drawing.id+":"+(drawing.target?.price??"default")}
                      aria-label={"Position target "+(index+1)}
                      defaultValue={drawing.target?.price??
                        defaultPositionTarget(drawing.tool as "long-position"|"short-position",drawing.start.price,drawing.end.price)??""}
                      onKeyDown={event=>{if(event.key==="Enter")event.currentTarget.blur();}}
                      onBlur={event=>{
                        if(event.target.value)setPositionTarget(drawing,Number(event.target.value));
                      }}/>
                  </label>}
                {(drawing.tool==="long-position"||drawing.tool==="short-position")&&
                  <div className="drawing-position-alerts" role="group" aria-label={"Position alerts "+(index+1)}>
                    <button type="button" aria-label={"Alert at position stop "+(index+1)}
                      title="Arm an in-tab crossing alert at the stop price"
                      onClick={()=>armLevelAlert(drawing.end.price)}><Bell size={12}/> Stop alert</button>
                    <button type="button" aria-label={"Alert at position target "+(index+1)}
                      title="Arm an in-tab crossing alert at the target price"
                      disabled={!drawing.target&&!defaultPositionTarget(drawing.tool as "long-position"|"short-position",drawing.start.price,drawing.end.price)}
                      onClick={()=>armLevelAlert(drawing.target?.price??
                        defaultPositionTarget(drawing.tool as "long-position"|"short-position",drawing.start.price,drawing.end.price)??0)}>
                      <Bell size={12}/> Target alert</button>
                  </div>}
                {noteEditingId===drawing.id&&drawing.tool==="text"&&
                  <div className="drawing-note-edit">
                    <textarea aria-label="Annotation text" maxLength={2000} value={noteDraft}
                      onChange={e=>setNoteDraft(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Escape"){setNoteEditingId(null);e.stopPropagation();}}}/>
                    <button aria-label="Save annotation" onClick={()=>saveAnnotation(drawing.id,noteDraft)}>Save note</button>
                  </div>}
              </div>
            )}{currentDrawings.length === 0 && <p className="drawing-object-empty">No drawings on this chart yet. Choose a drawing tool above.</p>}</div>
            {studio && selectedObject?.tool==="trendline" && <section className="anchor-readout" aria-label="Selected trendline anchors">
              <h3>Trendline anchors</h3>
              {([["Start",selectedObject.start],["End",selectedObject.end]] as const).map(([label,point])=><div key={label}>
                <span>{label}</span><strong>{point.price.toFixed(symbols[selectedObject.symbol].precision)}</strong>
                <time dateTime={new Date(point.time*1000).toISOString()}>{new Date(point.time*1000).toISOString().slice(0,16).replace("T"," ")} UTC</time>
              </div>)}
            </section>}
            {!studio && <p className="panel-note">Drag or click two points to draw. Lock, hide or duplicate objects here. Turn on Repeat to draw continuously. Ctrl+Z and Ctrl+Shift+Z undo and redo.</p>}
            </div>}
            {panelTab==="context"&&<ChartContextLens
              symbol={prefs.symbol} frame={prefs.frame} source={prefs.priceSource}
              status={replay?"historical":feed.status} replay={Boolean(replay)}
              currentPrice={viewedLast>0?viewedLast:null}
              lastUpdatedMs={replay?replayTime*1000:feed.lastUpdatedMs}
              levels={currentLevels} drawings={currentDrawings}
              alerts={prefs.alerts} onArmAlert={armLevelAlert}
              onShowMarkets={()=>setPanelTab("markets")}
              onShowObjects={()=>setPanelTab("objects")}/>}
          </aside>}
        </div>}
        {page === "alerts" && <AlertsCenter
          alerts={prefs.alerts} symbol={prefs.symbol} source={prefs.priceSource}
          sourceLabel={feed.sourceLabel} status={feed.status} currentPrice={last}
          onAdd={addAlert} onRemove={removeAlert} onClearTriggered={clearTriggeredAlerts}
          onOpenTerminal={()=>setPage("terminal")}
        />}
        {page === "library" && <div className="content-page">
          <div className="section-head first"><div><small>LOCAL-FIRST</small><h1>My workspace</h1><p>Save, restore and manage your trading setup without a subscription.</p></div></div>
          <div className="workspace-card"><div className="workspace-icon"><Layers size={26}/></div><div className="workspace-info"><span className="eyebrow">CURRENT WORKSPACE</span><h2>Personal terminal</h2><p>{symbols[prefs.symbol].label} · {prefs.frame.toUpperCase()} · {prefs.levels.length} levels · {prefs.drawings.length} drawings</p></div><button className="primary-button" onClick={() => setPage("terminal")}>Open <ChevronRight size={16}/></button></div>
          <div className="section-head"><div><small>PORTABILITY</small><h2>Back up your work</h2></div></div>
          <div className="action-grid"><button onClick={exportWorkspace}><Download size={23}/><strong>Export workspace</strong><span>Download your chart setup, drawings and workspace settings as JSON.</span></button><button onClick={() => inputFile.current?.click()}><Upload size={23}/><strong>Import workspace</strong><span>Restore a compatible exported workspace from your device.</span></button></div>
          <input ref={inputFile} type="file" accept=".json,application/json" className="visually-hidden" onChange={importWorkspace}/>
          <section className="peak-study-archive" aria-label="Saved simulation studies">
            <div className="section-head"><div><small>HISTORICAL RESEARCH</small><h2>Saved replay studies</h2>
              <p>Completed hypothetical scenarios from frozen market snapshots. No broker orders.</p></div>
              <span className="count">{prefs.replayStudies.length}</span></div>
            {prefs.replayStudies.length===0?<p>No completed studies saved yet. Start a chart replay to test a scenario.</p>:
              <div className="peak-study-archive-list">{prefs.replayStudies.map(study=><div className="peak-study-archive-row" key={study.id}>
                <span><strong>{study.scenario.symbol} · {study.scenario.frame} · {study.scenario.side.toUpperCase()}</strong>
                  <small>{study.scenario.source==="demo"?"SYNTHETIC":"BINANCE SPOT"} · {study.status.toUpperCase()}
                    {study.ambiguous?" · ambiguous candle":""} · {new Date(study.savedAt).toLocaleDateString()}</small></span>
                <strong>{study.rMultiple===null?"—":study.rMultiple.toFixed(2)+"R"}</strong>
                <button type="button" aria-label={"Remove saved study "+study.id} title="Remove study"
                  onClick={()=>{update({replayStudies:prefs.replayStudies.filter(item=>item.id!==study.id)});notify("Replay study removed.");}}>
                  <Trash2 size={14}/></button>
              </div>)}</div>}
          </section>
        </div>}
        {page === "settings" && <div className="content-page preferences-page">
          <div className="section-head first"><div><small>PERSONALIZE</small><h1>Workspace preferences</h1><p>Make the experience yours. Changes are saved automatically in this browser.</p></div></div>
          <div className="setting-section"><h2>Appearance</h2><p>Choose how Market Terminal looks and feels.</p><div className="choice-row"><button className={prefs.dark ? "chosen" : ""} onClick={() => { update({ dark: true }); notify("Dark appearance selected."); }}><Moon size={18}/> Dark {prefs.dark && <Check size={15}/>}</button><button className={!prefs.dark ? "chosen" : ""} onClick={() => { update({ dark: false }); notify("Light appearance selected."); }}><Sun size={18}/> Light {!prefs.dark && <Check size={15}/>}</button></div></div>
          <div className="setting-section"><h2>Accent color</h2><p>Three carefully balanced palettes for the workstation.</p><div className="choice-row">{(["violet","teal","amber"] as const).map(accent => <button key={accent} className={prefs.accent === accent ? "chosen" : ""} onClick={() => { update({ accent }); notify("Accent color set to " + accent + "."); }}><span className={"accent-dot " + accent}/>{accent[0].toUpperCase() + accent.slice(1)} {prefs.accent === accent && <Check size={15}/>}</button>)}</div></div>
          <div className="setting-section"><h2>Workspace data</h2><p>Reset all browser-local preferences, drawings and saved data. Export before resetting.</p><button className="danger-button" onClick={() => { if (window.confirm("Permanently reset this browser workspace, including saved drawings and all locally retained data?")) { setPrefs(defaultWorkspace); drawingHistory.current = { past: [], future: [] }; setHistoryVersion(v => v + 1); setDrawMode(false); setDrawingTool(null); notify("Local workspace reset."); } }}><RotateCcw size={16}/> Reset local workspace</button></div>
        </div>}
      </div>
    </div>
    <footer className="statusbar"><span><span className="sync-point">●</span> MARKET TERMINAL / LOCAL-FIRST PREVIEW</span><span>Feed: {sourceStateLabel} · {saveFailed?"Local save failed":"Workspace saved locally"}</span></footer>
    {notice && <div role="status" className={"toast " + notice.kind} key={notice.id}><span>{notice.kind === "success" ? <Check size={17}/> : <Activity size={17}/>}</span><p>{notice.message}</p><button aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={16}/></button></div>}
    {levelSettingsId&&prefs.levels.some(level=>level.id===levelSettingsId)&&
      <PriceLevelPropertiesDialog
        level={prefs.levels.find(level=>level.id===levelSettingsId)!}
        onSave={saveLevelSettings} onClose={()=>setLevelSettingsId(null)}/>}
    {settingsObject&&<DrawingSettingsDialog key={settingsObject.id}
       drawing={settingsObject} onSave={saveDrawingSettings}
       onSaveAsDefault={saveToolAsDefault} onResetDefault={resetToolDefault}
       hasDefault={Boolean(prefs.toolPresets[settingsObject.tool])}
       onClose={()=>setDrawingSettingsId(null)}/>}
    {searchOpen && <CommandPalette onClose={()=>setSearchOpen(false)}
       onOpenInstrument={openInstrument} onExecuteCommand={runTerminalCommand}/>}
     {helpOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setHelpOpen(false); }}><div className="help-dialog" role="dialog" aria-modal="true" aria-label="Help and shortcuts"><button className="dialog-close" aria-label="Close help" onClick={() => setHelpOpen(false)}><X size={18}/></button><Menu size={24}/><h2>Your terminal, your rules.</h2><p>Use the left navigation to switch between overview, charting, saved workspace and preferences. Click <strong>Price level</strong> to place a horizontal level, or drag using the Trendline, Rectangle or Fibonacci tools.</p><div className="shortcut"><span>Open Tool Atlas</span><kbd>Ctrl / ⌘ + K</kbd></div><div className="shortcut"><span>Exit drawing or dismiss dialog</span><kbd>Esc</kbd></div><div className="shortcut"><span>Undo / redo drawings</span><kbd>Ctrl / ⌘ + Z · Shift + Z</kbd></div><div className="shortcut"><span>Replay backward / forward</span><kbd>← / →</kbd></div><div className="shortcut"><span>Replay play / pause</span><kbd>Space</kbd></div><div className="shortcut"><span>Save workspace</span><strong>Automatic</strong></div><div className="shortcut"><span>Drawing properties</span><strong>Select an object → Properties</strong></div><p className="help-warning">Most instruments use synthetic demo candles. BTC/USDT has an opt-in direct Binance Spot feed. This is not a broker, and YoungMoney3 linking is not available.</p><button className="primary-button" onClick={() => setHelpOpen(false)}>Start exploring <ChevronRight size={16}/></button></div></div>}
  </div>;
}
