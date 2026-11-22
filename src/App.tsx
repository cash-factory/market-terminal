import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  Activity, ArrowDownToLine, Bell, BookOpen, ChartCandlestick, Check,
  ChevronLeft, ChevronRight, Command, Compass, Download, Home, Layers,
  Menu, Moon, MousePointer2, Plus, RotateCcw, Search, Settings2, Sun,
  Trash2, Upload, X, TrendingUp, Square, Ruler, Undo2, Redo2, RefreshCw, WifiOff, PanelRightClose, PanelRightOpen, Lock, Unlock, Eye, EyeOff, Copy, Repeat2
} from "lucide-react";
import { ChartCanvas } from "./ChartCanvas";
import type { Drawing, DrawingTool } from "./drawing/types";
import { frameSeconds, symbols, type Frame, type SymbolId } from "./market";
import { usePriceFeed } from "./data/usePriceFeed";
import { panelWidthAfterDrag, panelWidthAfterKey } from "./layout";
import { defaultWorkspace, loadWorkspace, parseWorkspace, serializeWorkspace, type Workspace } from "./workspace";

type Page = "home" | "terminal" | "library" | "settings";
type Notice = { id: number; message: string; kind: "success" | "info" | "error" };
const frames: Frame[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
const menu: { id: Page; label: string; Icon: typeof Home }[] = [
  { id: "home", label: "Overview", Icon: Home },
  { id: "terminal", label: "Terminal", Icon: ChartCandlestick },
  { id: "library", label: "Workspace", Icon: Layers },
  { id: "settings", label: "Preferences", Icon: Settings2 },
];
const marketList = Object.keys(symbols) as SymbolId[];
const titles: Record<Page, string> = {
  home: "Market overview", terminal: "Trading terminal", library: "My workspace", settings: "Preferences"
};

export default function App() {
  const [prefs, setPrefs] = useState<Workspace>(loadWorkspace);
  const [page, setPage] = useState<Page>("terminal");
  const [draft, setDraft] = useState("");
  const [drawMode, setDrawMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState<DrawingTool | null>(null);
  const drawingHistory = useRef<{ past: Drawing[][]; future: Drawing[][] }>({ past: [], future: [] });
  const [historyVersion, setHistoryVersion] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const resizeStart = useRef<{x:number; width:number} | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const inputFile = useRef<HTMLInputElement>(null);
  const inputSearch = useRef<HTMLInputElement>(null);
  const feed = usePriceFeed(prefs.symbol, prefs.frame, prefs.priceSource);
  const currentCandles = feed.candles;
  const last = currentCandles.length ? currentCandles[currentCandles.length - 1].close : 0;
  const currentLevels = useMemo(() => prefs.levels.filter(level => level.symbol === prefs.symbol && (level.source ?? "demo") === prefs.priceSource), [prefs.levels, prefs.symbol, prefs.priceSource]);
  const currentDrawings = useMemo(() => prefs.drawings.filter(drawing => drawing.symbol === prefs.symbol && (drawing.source ?? "demo") === prefs.priceSource), [prefs.drawings, prefs.symbol, prefs.priceSource]);
  const sourceStateLabel = prefs.priceSource === "demo" ? "SYNTHETIC DATA" : ({
    loading: "LOADING BINANCE", connecting: "CONNECTING", historical: "HISTORICAL",
    live: "LIVE · BINANCE SPOT", stale: "STALE FEED", error: "FEED UNAVAILABLE", synthetic: "SYNTHETIC DATA"
  })[feed.status];
  const quoteText = last > 0 ? last.toLocaleString(undefined, {
    minimumFractionDigits: symbols[prefs.symbol].precision,
    maximumFractionDigits: symbols[prefs.symbol].precision
  }) : "—";
  const update = (patch: Partial<Workspace>) => setPrefs(old => ({ ...old, ...patch }));
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
    notify("Price level added and saved locally.");
  };
  const commitDrawings = (next: Drawing[], message: string) => {
    drawingHistory.current.past.push(prefs.drawings);
    drawingHistory.current.future = [];
    setPrefs(old => ({ ...old, drawings: next }));
    setHistoryVersion(v => v + 1);
    notify(message);
  };
  const addDrawing = (drawing: Drawing) => {
    commitDrawings([...prefs.drawings, { ...drawing, source: prefs.priceSource }], "Drawing saved locally.");
    if (!prefs.keepDrawingToolActive) setDrawingTool(null);
  };
  const updateDrawing = (drawing: Drawing) => {
    commitDrawings(prefs.drawings.map(d => d.id === drawing.id ? drawing : d), "Drawing updated.");
  };
  const removeDrawing = (id: string) => {
    commitDrawings(prefs.drawings.filter(d => d.id !== id), "Drawing removed. Use Undo to restore.");
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
      ...active, id: crypto.randomUUID(), hidden: false, locked: false,
      start: { time: active.start.time + offset, price: active.start.price * 1.001 },
      end: { time: active.end.time + offset, price: active.end.price * 1.001 }
    };
    commitDrawings([...prefs.drawings, copy], "Drawing duplicated.");
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
    notify(next ? "Drag on the chart to create a " + next + "." : "Drawing tool dismissed.", "info");
  };
  const removeLevel = (id: string) => {
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
        !("version" in json) || (json.version !== 1 && json.version !== 2 && json.version !== 3 && json.version !== 4 && json.version !== 5 && json.version !== 6) ||
        !("preferences" in json)) throw new Error("This is not a supported Market Terminal export.");
      const workspace = parseWorkspace(json);
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
  const filtered = marketList.filter(symbol => (symbol + " " + symbols[symbol].label + " " + symbols[symbol].market)
    .toLowerCase().includes(query.toLowerCase()));
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
    } catch {
      setNotice({ id: Date.now(), message: "Browser storage is unavailable. Export your workspace to keep changes.", kind: "error" });
    }
  }, [prefs]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(value => !value);
      }
      if (event.key === "Escape") { setSearchOpen(false); setHelpOpen(false); setDrawMode(false); setDrawingTool(null); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
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
  useEffect(() => { if (searchOpen) inputSearch.current?.focus(); }, [searchOpen]);
  useEffect(() => { setSearchIndex(0); }, [query, searchOpen]);
  useEffect(() => {
    if (!notice || notice.kind === "error") return;
    const timer = window.setTimeout(() => setNotice(current => current?.id === notice.id ? null : current), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return <div className={"app " + (prefs.dark ? "dark" : "light") + " accent-" + prefs.accent}>
    <header className="topbar">
      <div className="branding">
        <span className="logo"><ChartCandlestick size={20}/></span>
        <span><strong>MARKET<span className="brand-suffix">/TERMINAL</span></strong><small>Independent trading workspace</small></span>
      </div>
      <div className="header-center">
        <button className="search-trigger" onClick={() => setSearchOpen(true)}>
          <Search size={16}/><span>Search markets or commands</span><kbd>Ctrl K</kbd>
        </button>
      </div>
      <div className="header-actions">
        <span className={"demo-tag source-" + feed.status}><span className="pulse-dot"/> {sourceStateLabel}</span>
        <button className="icon-button" title="Open notifications" aria-label="Notifications" onClick={() => notify("Notifications are ready. Live market alerts will come in a later release.", "info")}><Bell size={18}/></button>
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
        <div className="page-topline"><span>WORKSPACE <span className="breadcrumb-slash">/</span> {titles[page].toUpperCase()}</span><span>LOCAL SESSION <span className="sync-point">●</span></span></div>
        {page === "home" && <div className="content-page">
          <div className="hero"><div className="eyebrow">YOUR WORKSPACE AT A GLANCE</div><h1>A clear view of your markets.</h1><p>Get straight back to analysis. Your setup is saved on this device and basic tools don't have usage quotas.</p><button className="primary-button" onClick={() => setPage("terminal")}><ChartCandlestick size={17}/> Open trading terminal <ChevronRight size={16}/></button></div>
          <div className="section-head"><div><small>QUICK ACCESS</small><h2>Markets to explore</h2></div><button className="text-button" onClick={() => setSearchOpen(true)}>Browse symbols <ChevronRight size={16}/></button></div>
          <div className="market-grid">{marketList.map(symbol => <button className="market-tile" key={symbol} onClick={() => openInstrument(symbol)}><span className="market-kind">{symbols[symbol].market}</span><strong>{symbols[symbol].label}</strong><span className="market-tile-bottom">Open chart <ChevronRight size={16}/></span></button>)}</div>
          <div className="section-head"><div><small>WORKSPACE HEALTH</small><h2>Your local setup</h2></div></div>
          <div className="summary-grid"><div><span>Current timeframe</span><strong>{prefs.frame.toUpperCase()}</strong></div><div><span>Saved price levels</span><strong>{prefs.levels.length}</strong></div><div><span>Core drawing quota</span><strong>None</strong></div></div>
          <p className="data-caveat"><Activity size={16}/> Demo instruments use synthetic prices. Opt-in Binance Spot BTC/USDT is available in the terminal; forex, equities and indices are not connected to live feeds.</p>
        </div>}
        {page === "terminal" && <div className={"terminal-layout " + (prefs.rightPanelOpen ? "" : "panel-closed")}
          style={{"--right-panel-width": prefs.rightPanelWidth + "px"} as CSSProperties}>
          <section className="terminal-center">
            <div className="terminal-toolbar">
              <button className="symbol-button" onClick={() => setSearchOpen(true)}><span>{symbols[prefs.symbol].label}</span><Search size={15}/></button>
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
              <div className="timeframes">{frames.map(frame => <button key={frame} className={frame === prefs.frame ? "active" : ""} onClick={() => update({ frame })}>{frame}</button>)}</div>
              <span className="tool-divider"/>
              <button className="compact-action panel-toggle" title={prefs.rightPanelOpen ? "Hide watchlist" : "Show watchlist"}
                aria-label={prefs.rightPanelOpen ? "Hide watchlist" : "Show watchlist"}
                aria-pressed={prefs.rightPanelOpen}
                onClick={() => { update({rightPanelOpen: !prefs.rightPanelOpen}); notify(prefs.rightPanelOpen ? "Watchlist hidden." : "Watchlist opened."); }}>
                {prefs.rightPanelOpen ? <PanelRightClose size={16}/> : <PanelRightOpen size={16}/>}
                <span>{prefs.rightPanelOpen ? "Hide panel" : "Show panel"}</span>
              </button>
              <span className="tool-divider"/>
              <button className={"compact-action " + (prefs.showSma ? "active" : "")} onClick={() => { update({ showSma: !prefs.showSma }); notify(!prefs.showSma ? "SMA 20 enabled." : "SMA 20 hidden."); }}>SMA 20</button>
              <button disabled={!currentCandles.length} className={"compact-action draw-toggle " + (drawMode ? "active" : "")} onClick={() => { setDrawingTool(null); setDrawMode(!drawMode); notify(!drawMode ? "Drawing armed: click the chart to place a horizontal level." : "Drawing cancelled.", "info"); }}><Plus size={15}/> Price level</button>
              <span className="tool-divider"/>
              <button disabled={!currentCandles.length} title="Drag on the chart to draw a trendline" className={"compact-action " + (drawingTool === "trendline" ? "active" : "")} onClick={() => chooseDrawingTool("trendline")}><TrendingUp size={15}/> Trendline</button>
              <button disabled={!currentCandles.length} title="Drag on the chart to draw a rectangle" className={"compact-action " + (drawingTool === "rectangle" ? "active" : "")} onClick={() => chooseDrawingTool("rectangle")}><Square size={15}/> Rectangle</button>
              <button disabled={!currentCandles.length} title="Drag on the chart to draw Fibonacci levels" className={"compact-action " + (drawingTool === "fibonacci" ? "active" : "")} onClick={() => chooseDrawingTool("fibonacci")}><Ruler size={15}/> Fibonacci</button>
              <button className={"compact-action repeat-toggle " + (prefs.keepDrawingToolActive ? "active" : "")}
                aria-label="Keep drawing tool active" aria-pressed={prefs.keepDrawingToolActive}
                title="Keep current drawing tool active after creating a shape"
                onClick={() => {update({keepDrawingToolActive:!prefs.keepDrawingToolActive});notify(prefs.keepDrawingToolActive ? "Single-use drawing mode enabled." : "Continuous drawing enabled.");}}>
                <Repeat2 size={15}/> Repeat
              </button>
              <span className="tool-divider"/>
              <button title="Undo drawing" aria-label="Undo drawing" disabled={historyVersion < 0 || !drawingHistory.current.past.length} className="compact-action" onClick={undoDrawing}><Undo2 size={16}/></button>
              <button title="Redo drawing" aria-label="Redo drawing" disabled={!drawingHistory.current.future.length} className="compact-action" onClick={redoDrawing}><Redo2 size={16}/></button>

            </div>
            <div className="chart-heading"><div>
              <div className="eyebrow">{feed.sourceLabel} <span>•</span> {prefs.frame.toUpperCase()}</div>
              <h1>{symbols[prefs.symbol].label} <span className={"demo-pill feed-pill " + feed.status}>{sourceStateLabel}</span></h1>
              <p>{prefs.priceSource === "demo" ? "Illustrative candles, not executable quotes" : "Direct Binance public Spot data · BTC/USDT, not broker CFD prices"}</p>
            </div><div className="quote"><small>{prefs.priceSource === "demo" ? "SIMULATED LAST" : "BINANCE SPOT LAST"}</small><strong>{quoteText}</strong></div></div>
            {prefs.priceSource === "binance" && feed.status !== "live" && <div className={"feed-message " + feed.status} role="status">
              <WifiOff size={16}/><span>{feed.message ?? "Connecting to the exchange…"}</span>
              <button onClick={feed.retry}><RefreshCw size={14}/> Retry</button>
              <button onClick={() => update({priceSource:"demo"})}>Use demo</button>
            </div>}
            {drawMode && <div className="draw-banner"><MousePointer2 size={16}/> Click on the chart to place a level <button onClick={() => setDrawMode(false)}>Cancel <X size={14}/></button></div>}
            {drawingTool && <div className="draw-banner"><MousePointer2 size={16}/> Click two points or drag to draw a {drawingTool}. After drawing, click the shape to move it or drag its handles. <button onClick={() => setDrawingTool(null)}>Cancel <X size={14}/></button></div>}
            <ChartCanvas symbol={prefs.symbol} frame={prefs.frame} source={prefs.priceSource} candles={currentCandles}
              dark={prefs.dark} showSma={prefs.showSma} levels={currentLevels} drawMode={drawMode} onPlaceLevel={addLevel}
              drawingTool={drawingTool} drawings={currentDrawings}
              drawingColor={prefs.accent === "amber" ? "#e9b368" : prefs.accent === "teal" ? "#32c7aa" : "#9295ff"}
              onAddDrawing={addDrawing} onUpdateDrawing={updateDrawing} onDeleteDrawing={removeDrawing}/>
            <div className="chart-footer"><span><span className="sync-point">●</span> Locally saved</span><span>Source: {feed.sourceLabel} · {frameSeconds[prefs.frame] / 60}m candle interval · {feed.status}{feed.lastUpdatedMs ? " · Updated " + new Date(feed.lastUpdatedMs).toLocaleTimeString() : ""}</span></div>
          </section>
          {prefs.rightPanelOpen && <aside className="right-panel">
            <div className="panel-resizer" role="separator" tabIndex={0} aria-label="Resize watchlist panel"
              aria-orientation="vertical" aria-valuenow={prefs.rightPanelWidth} aria-valuemin={220} aria-valuemax={460}
              title="Drag to resize watchlist, or use arrow keys"
              onPointerDown={onResizeStart} onPointerMove={onResizeMove}
              onPointerUp={onResizeStop} onPointerCancel={onResizeStop}
              onKeyDown={onResizeKey}/>
            <div className="panel-head"><strong>Watchlist</strong><button aria-label="Search instruments" title="Search instruments" className="mini-button" onClick={() => setSearchOpen(true)}><Search size={16}/></button></div>
            <div className="watchlist">{marketList.map(symbol => <button key={symbol} onClick={() => openInstrument(symbol)} className={symbol === prefs.symbol ? "selected" : ""}><span><b>{symbols[symbol].label}</b><small>{symbols[symbol].market.split(" · ")[0]}</small></span><ChevronRight size={15}/></button>)}</div>
            <div className="panel-head separated"><strong>Price levels</strong><span className="count">{currentLevels.length}</span></div>
            <div className="price-form"><input type="number" min="0" step="any" aria-label="Level price" placeholder={last.toFixed(symbols[prefs.symbol].precision)} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addLevel(draft.trim() ? Number(draft) : last); }}/><button aria-label="Add price level" title="Add price level" onClick={() => addLevel(draft.trim() ? Number(draft) : last)}><Plus size={17}/></button></div>
            <div className="level-list">{currentLevels.map(level => <div key={level.id}><span className="level-swatch" style={{ background: level.color }}/><span>{level.price.toFixed(symbols[prefs.symbol].precision)}</span><button aria-label={"Remove price level " + level.price} title="Remove level" onClick={() => removeLevel(level.id)}><Trash2 size={15}/></button></div>)}</div>
            <div className="panel-head separated"><strong>Chart drawings</strong><span className="count">{currentDrawings.length}</span></div>
            <div className="drawing-object-list">{currentDrawings.map((drawing,index) =>
              <div key={drawing.id} className={"drawing-object-row " + (drawing.hidden ? "object-hidden" : "")}>
                <span className="level-swatch" style={{background:drawing.color}}/>
                <span className="drawing-object-name" title={drawing.tool}>{index+1}. {drawing.tool}</span>
                <div className="drawing-object-actions">
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
              </div>
            )}{currentDrawings.length === 0 && <p className="drawing-object-empty">No drawings on this chart yet. Choose Trendline, Rectangle or Fibonacci above.</p>}</div>
            <p className="panel-note">Drag or click two points to draw. Lock, hide or duplicate objects here. Turn on Repeat to draw continuously. Ctrl+Z and Ctrl+Shift+Z undo and redo.</p>
          </aside>}
        </div>}
        {page === "library" && <div className="content-page">
          <div className="section-head first"><div><small>LOCAL-FIRST</small><h1>My workspace</h1><p>Save, restore and manage your trading setup without a subscription.</p></div></div>
          <div className="workspace-card"><div className="workspace-icon"><Layers size={26}/></div><div className="workspace-info"><span className="eyebrow">CURRENT WORKSPACE</span><h2>Personal terminal</h2><p>{symbols[prefs.symbol].label} · {prefs.frame.toUpperCase()} · {prefs.levels.length} levels · {prefs.drawings.length} drawings</p></div><button className="primary-button" onClick={() => setPage("terminal")}>Open <ChevronRight size={16}/></button></div>
          <div className="section-head"><div><small>PORTABILITY</small><h2>Back up your work</h2></div></div>
          <div className="action-grid"><button onClick={exportWorkspace}><Download size={23}/><strong>Export workspace</strong><span>Download all current preferences and drawing levels as JSON.</span></button><button onClick={() => inputFile.current?.click()}><Upload size={23}/><strong>Import workspace</strong><span>Restore a compatible exported workspace from your device.</span></button></div>
          <input ref={inputFile} type="file" accept=".json,application/json" className="visually-hidden" onChange={importWorkspace}/>
        </div>}
        {page === "settings" && <div className="content-page preferences-page">
          <div className="section-head first"><div><small>PERSONALIZE</small><h1>Workspace preferences</h1><p>Make the experience yours. Changes are saved automatically in this browser.</p></div></div>
          <div className="setting-section"><h2>Appearance</h2><p>Choose how Market Terminal looks and feels.</p><div className="choice-row"><button className={prefs.dark ? "chosen" : ""} onClick={() => { update({ dark: true }); notify("Dark appearance selected."); }}><Moon size={18}/> Dark {prefs.dark && <Check size={15}/>}</button><button className={!prefs.dark ? "chosen" : ""} onClick={() => { update({ dark: false }); notify("Light appearance selected."); }}><Sun size={18}/> Light {!prefs.dark && <Check size={15}/>}</button></div></div>
          <div className="setting-section"><h2>Accent color</h2><p>Three carefully balanced palettes for the workstation.</p><div className="choice-row">{(["violet","teal","amber"] as const).map(accent => <button key={accent} className={prefs.accent === accent ? "chosen" : ""} onClick={() => { update({ accent }); notify("Accent color set to " + accent + "."); }}><span className={"accent-dot " + accent}/>{accent[0].toUpperCase() + accent.slice(1)} {prefs.accent === accent && <Check size={15}/>}</button>)}</div></div>
          <div className="setting-section"><h2>Workspace data</h2><p>Clear your current local layout and drawing levels. Export first if you want a backup.</p><button className="danger-button" onClick={() => { if (window.confirm("Reset your local workspace and remove all saved levels?")) { setPrefs(defaultWorkspace); drawingHistory.current = { past: [], future: [] }; setHistoryVersion(v => v + 1); setDrawMode(false); setDrawingTool(null); notify("Local workspace reset."); } }}><RotateCcw size={16}/> Reset local workspace</button></div>
        </div>}
      </div>
    </div>
    <footer className="statusbar"><span><span className="sync-point">●</span> MARKET TERMINAL / LOCAL-FIRST PREVIEW</span><span>No artificial analysis limits · Data is synthetic</span></footer>
    {notice && <div role="status" className={"toast " + notice.kind} key={notice.id}><span>{notice.kind === "success" ? <Check size={17}/> : <Activity size={17}/>}</span><p>{notice.message}</p><button aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={16}/></button></div>}
    {searchOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSearchOpen(false); }}><div className="command-dialog" role="dialog" aria-modal="true" aria-label="Search instruments"><div className="command-input"><Search size={19}/><input ref={inputSearch} placeholder="Search a symbol, market or instrument…" value={query}
  role="combobox" aria-expanded="true" aria-controls="instrument-options"
  aria-activedescendant={filtered[searchIndex] ? "instrument-" + filtered[searchIndex] : undefined}
  onChange={e => setQuery(e.target.value)}
  onKeyDown={event => {
    if (event.key === "ArrowDown") { event.preventDefault(); setSearchIndex(i => Math.min(Math.max(0,filtered.length - 1),i + 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setSearchIndex(i => Math.max(0,i - 1)); }
    if (event.key === "Enter" && filtered[searchIndex]) { event.preventDefault(); openInstrument(filtered[searchIndex]); }
  }}/><button onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={17}/></button></div><div id="instrument-options" role="listbox" className="command-results"><small>INSTRUMENTS · SOURCE SELECTED IN TERMINAL</small>{filtered.length ? filtered.map((symbol,i) => <button id={"instrument-" + symbol} key={symbol} role="option" aria-selected={searchIndex === i} className={searchIndex === i ? "keyboard-active" : ""} onMouseEnter={() => setSearchIndex(i)} onClick={() => openInstrument(symbol)}><Compass size={18}/><span><strong>{symbols[symbol].label}</strong><small>{symbols[symbol].market}</small></span><ChevronRight size={16}/></button>) : <p className="empty-search">No matching demonstration instruments.</p>}</div><div className="command-hint"><Command size={14}/> Ctrl K to open · ↑↓ navigate · Enter select · Esc close</div></div></div>}
    {helpOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setHelpOpen(false); }}><div className="help-dialog" role="dialog" aria-modal="true" aria-label="Help and shortcuts"><button className="dialog-close" aria-label="Close help" onClick={() => setHelpOpen(false)}><X size={18}/></button><Menu size={24}/><h2>Your terminal, your rules.</h2><p>Use the left navigation to switch between overview, charting, saved workspace and preferences. Click <strong>Price level</strong> to place a horizontal level, or drag using the Trendline, Rectangle or Fibonacci tools.</p><div className="shortcut"><span>Open market search</span><kbd>Ctrl / ⌘ + K</kbd></div><div className="shortcut"><span>Exit drawing or dismiss dialog</span><kbd>Esc</kbd></div><div className="shortcut"><span>Undo / redo drawings</span><kbd>Ctrl / ⌘ + Z · Shift + Z</kbd></div><div className="shortcut"><span>Save workspace</span><strong>Automatic</strong></div><p className="help-warning">Market prices in this preview are entirely simulated. Live trading and YoungMoney3 linking are not available yet.</p><button className="primary-button" onClick={() => setHelpOpen(false)}>Start exploring <ChevronRight size={16}/></button></div></div>}
  </div>;
}
