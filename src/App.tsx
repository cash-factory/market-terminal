import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { Activity, ArrowDownToLine, ChartCandlestick, CircleHelp, Layers, Moon, Plus, RotateCcw, Sun, Trash2 } from "lucide-react";
import { demoCandles, frameSeconds, sma, symbols, type Frame, type SymbolId } from "./market";

type Level={id:string;symbol:SymbolId;price:number;color:string};
type Preferences={symbol:SymbolId;frame:Frame;dark:boolean;showSma:boolean;levels:Level[]};
const initial:Preferences={symbol:"EURUSD",frame:"1h",dark:true,showSma:true,levels:[]};
function readPrefs():Preferences {try{const data=JSON.parse(localStorage.getItem("market-terminal-workspace")||"null");return data?{...initial,...data}:initial;}catch{return initial;}}
const frames:Frame[]=["1m","5m","15m","1h","4h","1d"];
export default function App(){
 const [prefs,setPrefs]=useState<Preferences>(readPrefs);
 const [draft,setDraft]=useState("");
 const [notice,setNotice]=useState("Local-first demo workspace");
 const holder=useRef<HTMLDivElement>(null),chart=useRef<IChartApi|null>(null),series=useRef<ISeriesApi<"Candlestick">|null>(null);
 const update=(patch:Partial<Preferences>)=>setPrefs(s=>({...s,...patch}));
 const candles=demoCandles(prefs.symbol,prefs.frame);
 const last=candles[candles.length-1].close;
 useEffect(()=>{localStorage.setItem("market-terminal-workspace",JSON.stringify(prefs));},[prefs]);
 useEffect(()=>{
  if(!holder.current)return;
  const c=createChart(holder.current,{autoSize:true,layout:{background:{color:prefs.dark?"#101620":"#fff"},textColor:prefs.dark?"#95a5ba":"#637080"},grid:{vertLines:{color:prefs.dark?"#1e2937":"#e9eef4"},horzLines:{color:prefs.dark?"#1e2937":"#e9eef4"}},timeScale:{borderColor:prefs.dark?"#303c4d":"#d8e0e9"},rightPriceScale:{borderColor:prefs.dark?"#303c4d":"#d8e0e9"}});
  chart.current=c;
  const s=c.addSeries(CandlestickSeries,{upColor:"#25b795",downColor:"#e56b79",borderVisible:false,wickUpColor:"#25b795",wickDownColor:"#e56b79",priceFormat:{type:"price",precision:symbols[prefs.symbol].precision,minMove:Math.pow(10,-symbols[prefs.symbol].precision)}});
  series.current=s;s.setData(candles);
  if(prefs.showSma){const line=c.addSeries(LineSeries,{color:"#e8b15a",lineWidth:2,priceLineVisible:false,lastValueVisible:false});line.setData(sma(candles,20));}
  for(const level of prefs.levels.filter(l=>l.symbol===prefs.symbol)){s.createPriceLine({price:level.price,color:level.color,lineWidth:1,lineStyle:2,axisLabelVisible:true,title:"LEVEL"});}
  c.timeScale().fitContent();
  return()=>{chart.current=null;series.current=null;c.remove();};
 },[prefs.symbol,prefs.frame,prefs.dark,prefs.showSma,prefs.levels]);
 const addLevel=()=>{const price=Number(draft||last);if(!Number.isFinite(price)||price<=0){setNotice("Enter a valid positive price.");return;}setPrefs(p=>({...p,levels:[...p.levels,{id:crypto.randomUUID(),symbol:p.symbol,price,color:"#8d94fa"}]}));setDraft("");setNotice("Horizontal level saved locally.");};
 const exportWorkspace=()=>{const blob=new Blob([JSON.stringify({format:"market-terminal-workspace",version:1,preferences:prefs},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="market-terminal-workspace.json";a.click();URL.revokeObjectURL(a.href);setNotice("Workspace exported.");};
 return <div className={prefs.dark?"shell dark":"shell light"}>
  <header className="topbar"><div className="brand"><span className="brand-icon"><ChartCandlestick size={20}/></span><div><b>MARKET TERMINAL</b><small>FREEDOM-FIRST WORKSTATION</small></div></div><div className="top-actions"><span className="status"><i/> LOCAL DEMO</span><button title="Toggle theme" onClick={()=>update({dark:!prefs.dark})}>{prefs.dark?<Sun size={17}/>:<Moon size={17}/>}</button><button title="Export workspace" onClick={exportWorkspace}><ArrowDownToLine size={17}/></button></div></header>
  <div className="workspace"><aside className="rail"><button className="selected" title="Charts"><ChartCandlestick size={19}/></button><button title="Analysis" onClick={()=>setNotice("Custom indicators and drawing engine are planned for the next milestone.")}><Activity size={19}/></button><button title="Layouts" onClick={()=>setNotice("Your workspace is saved in this browser automatically.")}><Layers size={19}/></button><button title="About prototype" onClick={()=>setNotice("Demo prices are synthetic, not live or executable market quotes.")}><CircleHelp size={19}/></button></aside>
  <main><div className="toolbar"><label className="symbol"><span>INSTRUMENT</span><select value={prefs.symbol} onChange={e=>update({symbol:e.target.value as SymbolId})}>{Object.entries(symbols).map(([id,s])=><option key={id} value={id}>{s.label}</option>)}</select></label><div className="timeframes">{frames.map(f=><button key={f} className={prefs.frame===f?"active":""} onClick={()=>update({frame:f})}>{f}</button>)}</div><button className={prefs.showSma?"tool active":"tool"} onClick={()=>update({showSma:!prefs.showSma})}>SMA 20</button></div>
   <div className="chart-heading"><div><small>{symbols[prefs.symbol].market}</small><h1>{symbols[prefs.symbol].label}</h1><p>Synthetic demonstration data · {frameSeconds[prefs.frame]/60} minute candle interval</p></div><div className="quote"><small>DEMO CLOSE</small><strong>{last.toLocaleString(undefined,{minimumFractionDigits:symbols[prefs.symbol].precision,maximumFractionDigits:symbols[prefs.symbol].precision})}</strong></div></div>
   <div className="chart" ref={holder}/>
   <div className="bottom"><span><i/> Workspace autosaved locally</span><span>NO PAYWALLS · NO ARTIFICIAL DRAWING LIMITS</span></div>
  </main>
  <aside className="sidebar"><div className="panel-title"><b>Watchlist</b><span>4 MARKETS</span></div><div className="watchlist">{(Object.keys(symbols) as SymbolId[]).map(id=><button key={id} className={id===prefs.symbol?"chosen":""} onClick={()=>update({symbol:id})}><span>{symbols[id].label}<small>{symbols[id].market.split(" · ")[0]}</small></span><span>↗</span></button>)}</div><div className="panel-title border-top"><b>Horizontal levels</b><span>{prefs.levels.filter(l=>l.symbol===prefs.symbol).length}</span></div><div className="level-form"><input aria-label="Level price" type="number" min="0" step="any" placeholder={last.toFixed(symbols[prefs.symbol].precision)} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addLevel()}/><button aria-label="Add level" title="Add horizontal level" onClick={addLevel}><Plus size={16}/></button></div><div className="levels">{prefs.levels.filter(l=>l.symbol===prefs.symbol).map(l=><div className="level" key={l.id}><span>{l.price.toFixed(symbols[prefs.symbol].precision)}</span><button title="Remove level" onClick={()=>setPrefs(p=>({...p,levels:p.levels.filter(x=>x.id!==l.id)}))}><Trash2 size={14}/></button></div>)}</div><div className="side-note">Levels are stored without a count limit. A full interactive drawing toolkit comes next.</div><div className="spacer"/><button className="reset" onClick={()=>{setPrefs(initial);setNotice("Workspace reset.");}}><RotateCcw size={14}/> Reset workspace</button></aside></div>
  <footer role="status">{notice}</footer>
 </div>;
}
