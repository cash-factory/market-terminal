import {useEffect,useRef,useState} from "react";
import {availableInstruments, externalProviders, symbols, type SymbolId} from "../market";

function ProviderChart({ticker,dark}:{ticker:string;dark:boolean}) {
  const host=useRef<HTMLDivElement>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if (!host.current) return;
    const container=document.createElement("div");
    container.className="tradingview-widget-container";
    const widget=document.createElement("div");
    widget.className="tradingview-widget-container__widget";
    container.append(widget);
    host.current.append(container);
    const script=document.createElement("script");
    script.src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async=true;
    script.textContent=JSON.stringify({autosize:true,symbol:ticker,interval:"60",timezone:"Etc/UTC",
      theme:dark?"dark":"light",style:"1",locale:"en",allow_symbol_change:false,hide_side_toolbar:false});
    script.onerror=()=>setFailed(true);
    container.append(script);
    return ()=>{script.onerror=null;container.remove()};
  },[ticker,dark]);
  return <>
    {failed&&<p role="alert">The provider chart could not load. Use the TradingView link below to open it directly.</p>}
    <div className="provider-chart" ref={host}/>
    <a className="provider-credit" href={"https://www.tradingview.com/chart/?symbol="+encodeURIComponent(ticker)}
      target="_blank" rel="noopener noreferrer">{ticker} chart on TradingView</a>
  </>;
}

export function ProviderDesk({symbol,dark,onSelect}:{symbol:SymbolId;dark:boolean;onSelect:(id:SymbolId)=>void}) {
  const [choices,setChoices]=useState<Partial<Record<SymbolId,string>>>({});
  const providers=externalProviders[symbol]??[];
  const ticker=choices[symbol]??providers[0]?.[1];
  return <main className="provider-desk">
    <nav aria-label="Chart instruments">{availableInstruments.map(id=>
      <button key={id} aria-pressed={symbol===id} onClick={()=>onSelect(id)}>{symbols[id].label}</button>)}</nav>
    <header><h1>{symbols[symbol].label}</h1><label>Chart provider <select value={ticker} onChange={e=>setChoices({...choices,[symbol]:e.target.value})}>
      {providers.map(([name,id])=><option key={id} value={id}>{name.split(" · ")[0]}</option>)}</select></label></header>
    {ticker&&<ProviderChart key={ticker+dark} ticker={ticker} dark={dark}/>}
  </main>;
}
