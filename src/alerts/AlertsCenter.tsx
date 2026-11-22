import { useState, type FormEvent } from "react";
import { Activity, Bell, Check, ChevronRight, Plus, Radar, Target, Trash2, WifiOff } from "lucide-react";
import { createPriceAlert, type PriceAlert } from "./engine";
import { symbols, type SymbolId } from "../market";
import type { PriceSource, PriceStatus } from "../data/usePriceFeed";

type Props={
  alerts:PriceAlert[];
  symbol:SymbolId;
  source:PriceSource;
  sourceLabel:string;
  status:PriceStatus;
  currentPrice:number;
  onAdd:(alert:PriceAlert)=>void;
  onRemove:(id:string)=>void;
  onClearTriggered:()=>void;
  onOpenTerminal:()=>void;
};
const display=(n:number)=>n.toLocaleString(undefined,{maximumFractionDigits:6});
export function AlertsCenter({
  alerts,symbol,source,sourceLabel,status,currentPrice,onAdd,onRemove,onClearTriggered,onOpenTerminal
}:Props){
  const [threshold,setThreshold]=useState("");
  const [direction,setDirection]=useState<PriceAlert["direction"]>("above");
  const [error,setError]=useState<string|null>(null);
  const triggered=alerts.filter(a=>a.triggeredAtMs!==null);
  const armed=alerts.filter(a=>a.triggeredAtMs===null);
  const online=status==="live"||status==="synthetic";
  const make=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    try{
      const alert=createPriceAlert(symbol,source,direction,Number(threshold),
        crypto.randomUUID(),Date.now());
      onAdd(alert);setThreshold("");setError(null);
    }catch(cause){setError(cause instanceof Error?cause.message:"Invalid price threshold.");}
  };
  return <div className="content-page alert-screen">
    <div className="alert-heading">
      <div><div className="eyebrow">MARKET MONITORING / LOCAL ALERTS</div><h1>Price alerts, your way.</h1>
        <p>Track threshold crossings for your active chart. Alerts are evaluated in this browser tab while it remains open—not by a remote server.</p>
      </div>
      <span className="alert-heading-icon"><Radar size={25}/></span>
    </div>
    <div className="alert-stats">
      <div><span>ARMED ALERTS</span><strong>{armed.length}</strong></div>
      <div><span>TRIGGERED</span><strong>{triggered.length}</strong></div>
      <div><span>ACTIVE QUOTE SOURCE</span><strong className="alert-stat-source">{sourceLabel}</strong></div>
    </div>
    <div className="alert-layout">
      <section className="alert-panel" aria-label="Create a price alert">
        <div className="alert-panel-title"><div><span className="eyebrow">01 / CREATE</span><h2>New price alert</h2></div><Bell size={20}/></div>
        <div className="alert-market">
          <div><small>MONITORING INSTRUMENT</small><strong>{symbols[symbol].label}</strong></div>
          <button onClick={onOpenTerminal}>Change market <ChevronRight size={14}/></button>
        </div>
        <div className={"alert-feed-status "+(online?"connected":"disconnected")}>
          {online?<Activity size={15}/>:<WifiOff size={15}/>}
          <span>{source==="demo"?
            "Synthetic demonstration candles: not a continuously updating live feed.":
            status==="live"?
              "Binance Spot updates available while this tab stays open.":
              "Live updates unavailable ("+status+"). Alert monitoring is paused."}
          </span>
        </div>
        <form onSubmit={make}>
          <label className="alert-field">Trigger when price
            <select value={direction} onChange={event=>setDirection(event.target.value as PriceAlert["direction"])}>
              <option value="above">Crosses above</option>
              <option value="below">Crosses below</option>
            </select>
          </label>
          <label className="alert-field">Threshold price
            <input type="number" inputMode="decimal" step="any" min="0.00000001"
              placeholder={currentPrice>0?String(currentPrice):"Enter price"}
              value={threshold} onChange={event=>setThreshold(event.target.value)}/>
          </label>
          <div className="alert-current-price"><span>LAST DISPLAYED PRICE</span><strong>{currentPrice>0?display(currentPrice):"Unavailable"}</strong>
            <button type="button" disabled={currentPrice<=0} onClick={()=>setThreshold(String(currentPrice))}>Use shown</button>
          </div>
          {error&&<div role="alert" className="alert-error">{error}</div>}
          <button className="primary-button alert-create" type="submit"><Plus size={17}/> Create local alert</button>
        </form>
        <div className="alert-disclaimer"><Target size={16}/> Only active-chart updates are evaluated. Switching symbols, closing the tab, losing connectivity or sleeping the device stops monitoring until updates resume. No push notifications or order execution.</div>
      </section>
      <section className="alert-panel" aria-label="Manage price alerts">
        <div className="alert-panel-title"><div><span className="eyebrow">02 / MANAGE</span><h2>Your alerts</h2></div>
          <button className="alert-clear" disabled={!triggered.length} onClick={onClearTriggered}>Clear triggered</button>
        </div>
        {alerts.length===0?<div className="alert-empty">
          <div className="alert-empty-icon"><Bell size={27}/></div><h3>No price alerts yet</h3>
          <p>Create your first threshold alert to keep track of price changes in your open trading session.</p>
        </div>:<div className="alert-rows">{[...alerts].reverse().map(a=><div className="alert-row" key={a.id}>
          <div className={"alert-status-mark "+(a.triggeredAtMs===null?"armed":"triggered")}>{a.triggeredAtMs===null?<Bell size={16}/>:<Check size={16}/>}</div>
          <div className="alert-row-body"><strong>{symbols[a.symbol].label} · Crosses {a.direction} {display(a.price)}</strong>
            <div className="alert-row-meta">{a.source==="demo"?"SYNTHETIC":"BINANCE SPOT"} <span>·</span>
              {a.triggeredAtMs===null?"ARMED":"TRIGGERED "+new Date(a.triggeredAtMs).toLocaleString()}</div>
          </div>
          <button className="alert-remove" aria-label={"Delete alert "+a.id} title="Delete alert" onClick={()=>onRemove(a.id)}><Trash2 size={16}/></button>
        </div>)}</div>}
      </section>
    </div>
  </div>;
}
