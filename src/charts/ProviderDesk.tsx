import {useEffect,useRef,useState} from "react";
import {ExternalLink,Maximize2,Minimize2,PenLine,Info} from "lucide-react";
import {availableInstruments,externalProviders,symbols,type SymbolId} from "../market";

const fullChartUrl=(ticker:string)=>
  "https://www.tradingview.com/chart/?symbol="+encodeURIComponent(ticker);

function ProviderChart({ticker,dark}:{ticker:string;dark:boolean}) {
  const host=useRef<HTMLDivElement>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(!host.current)return;
    setFailed(false);
    const container=document.createElement("div");
    container.className="tradingview-widget-container";
    const widget=document.createElement("div");
    widget.className="tradingview-widget-container__widget";
    container.append(widget);
    host.current.append(container);
    const script=document.createElement("script");
    script.src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async=true;
    // The chart and its drawing toolbar are hosted by TradingView. They
    // share exactly the same sourced candle geometry; do not layer our
    // independent Lightweight Charts drawings over an inaccessible iframe.
    script.textContent=JSON.stringify({
      autosize:true,symbol:ticker,interval:"60",timezone:"Etc/UTC",
      theme:dark?"dark":"light",style:"1",locale:"en",allow_symbol_change:false,
      hide_side_toolbar:false,hide_top_toolbar:false,
      save_image:true,withdateranges:true,show_popup_button:true,
      popup_width:"1440",popup_height:"900"
    });
    script.onerror=()=>setFailed(true);
    container.append(script);
    return ()=>{script.onerror=null;container.remove()};
  },[ticker,dark]);

  return <>
    {failed&&<p role="alert" className="provider-drawing-error">
      The chart provider could not load. Open the chart on TradingView to draw directly.
    </p>}
    <div className="provider-chart" ref={host} aria-label="Provider chart with drawing toolbar"/>
    <a className="provider-credit" href={fullChartUrl(ticker)}
      target="_blank" rel="noopener noreferrer">{ticker} chart on TradingView <ExternalLink size={12} aria-hidden="true"/></a>
  </>;
}

export function ProviderDesk({symbol,dark,onSelect}:{symbol:SymbolId;dark:boolean;onSelect:(id:SymbolId)=>void}) {
  const [choices,setChoices]=useState<Partial<Record<SymbolId,string>>>({});
  const [drawingFocus,setDrawingFocus]=useState(false);
  const [showGuide,setShowGuide]=useState(false);
  const providers=externalProviders[symbol]??[];
  const ticker=choices[symbol]??providers[0]?.[1];

  useEffect(()=>{
    if(!drawingFocus)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){setDrawingFocus(false);setShowGuide(false);}
    };
    window.addEventListener("keydown",onKeyDown);
    return ()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",onKeyDown);};
  },[drawingFocus]);

  return <main className={"provider-desk"+(drawingFocus?" provider-drawing-focus":"")}>
    <div className="provider-desk-navigation">
      <nav aria-label="Chart instruments">{availableInstruments.map(id=>
        <button key={id} aria-pressed={symbol===id} onClick={()=>onSelect(id)}>{symbols[id].label}</button>)}</nav>
      <header>
        <h1>{symbols[symbol].label}</h1>
        <label>Price provider <select aria-label="Chart provider" value={ticker??""}
          onChange={e=>setChoices(old=>({...old,[symbol]:e.target.value}))}>
          {providers.map(([name,id])=><option key={id} value={id}>{name.split(" · ")[0]}</option>)}
        </select></label>
      </header>
    </div>

    <section className="provider-drawing-tools" aria-label="Drawing workspace controls">
      <div className="provider-drawing-heading">
        <span className="provider-drawing-glyph"><PenLine size={18} aria-hidden="true"/></span>
        <div><strong>Drawing tools</strong><small>Trendlines · Fibonacci · shapes · annotations</small></div>
      </div>
      <div className="provider-drawing-actions">
        <button type="button" className="provider-draw-primary"
          aria-label={drawingFocus?"Exit drawing workspace":"Open drawing workspace"}
          aria-pressed={drawingFocus} onClick={()=>setDrawingFocus(value=>!value)}>
          {drawingFocus?<Minimize2 size={16}/>:<Maximize2 size={16}/>}
          {drawingFocus?"Return to dashboard":"Draw on chart"}
        </button>
        <button type="button" className="provider-draw-help"
          aria-expanded={showGuide} aria-controls="provider-drawing-guide"
          onClick={()=>setShowGuide(value=>!value)}><Info size={15}/> How it works</button>
        {ticker&&<a className="provider-draw-external" href={fullChartUrl(ticker)}
          target="_blank" rel="noopener noreferrer">
          Save drawings on TradingView <ExternalLink size={14}/></a>}
      </div>
    </section>

    {showGuide&&<div id="provider-drawing-guide" className="provider-drawing-guide">
      <strong>Drawing on verified market prices</strong>
      <p>Choose <b>Draw on chart</b>, then use the drawing toolbar on the left of the embedded
      TradingView chart. Select a tool and place its points on the candles. The chart provider
      controls the drawing, including its coordinates, edits and undo.</p>
      <p><b>Saving:</b> An embedded TradingView drawing is not stored in your
      Market Terminal workspace. For persistent drawings, open the full TradingView chart
      and sign in to save your layout. Switching providers or reloading this embedded chart
      may discard annotations.</p>
    </div>}
    {ticker&&<ProviderChart key={ticker+String(dark)} ticker={ticker} dark={dark}/>}
  </main>;
}
