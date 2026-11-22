import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookMarked,
  ChartNoAxesCombined, ClipboardList, Info, Layers, Plus, ShieldAlert } from "lucide-react";
import { symbols, type SymbolId, type Frame } from "../market";
import type { Level } from "../workspace";
import type { Drawing } from "../drawing/types";
import type { DecisionRecord } from "../decisions/model";
import type { PriceAlert } from "../alerts/engine";
import type { PriceSource, PriceStatus } from "../data/usePriceFeed";
import { nearestMarkedLevels } from "./model";
import "./style.css";

type Props={
  symbol:SymbolId;frame:Frame;source:PriceSource;status:PriceStatus;replay:boolean;
  currentPrice:number|null;lastUpdatedMs:number|null;
  levels:readonly Level[];drawings:readonly Drawing[];
  decisions:readonly DecisionRecord[];alerts:readonly PriceAlert[];
  onArmAlert:(price:number)=>void;
  onOpenDecisions:()=>void;
  onCapture:()=>void;
  onShowMarkets:()=>void;
  onShowObjects:()=>void;
};

const formatUtc=(timestamp:number)=>new Date(timestamp).toLocaleString(undefined,{
  timeZone:"UTC",hour:"2-digit",minute:"2-digit",month:"short",day:"numeric"
})+" UTC";

export function ChartContextLens({
  symbol,frame,source,status,replay,currentPrice,lastUpdatedMs,levels,drawings,
  decisions,alerts,onArmAlert,onOpenDecisions,onCapture,onShowMarkets,onShowObjects
}:Props) {
  const quote=currentPrice&&Number.isFinite(currentPrice)&&currentPrice>0?currentPrice:null;
  const plotted=quote===null?[]:nearestMarkedLevels(levels,quote,3);
  const relevant=decisions.filter(row=>row.symbol===symbol&&row.source===source);
  const openReviews=relevant.filter(row=>!row.reviews.length).length;
  const activeAlerts=alerts.filter(row=>row.symbol===symbol&&row.source===source&&row.triggeredAtMs===null);
  const statusLabel=replay?"REPLAY":source==="demo"?"SYNTHETIC":status.toUpperCase();
  const alertsAllowed=!replay&&(source==="demo"||status==="live");
  const sourceName=source==="demo"?"Synthetic demonstration candles":"Binance Spot BTC/USDT";
  const quoteFormat=(value:number)=>value.toLocaleString(undefined,{
    minimumFractionDigits:symbols[symbol].precision,
    maximumFractionDigits:symbols[symbol].precision
  });
  return <section id="rail-panel-context" role="tabpanel" aria-labelledby="rail-tab-context"
    className="workspace-rail-content context-lens" aria-label="Chart Context Lens">
    <header className="context-lens-header">
      <div><span>ANALYTICAL CONTEXT</span><h3>Chart context</h3></div>
      <span className={"context-lens-status context-state-"+(source==="demo"?"synthetic":replay?"historical":status)}>
        <span/> {statusLabel}
      </span>
    </header>
    <div className="context-source">
      <div className="context-source-line"><Activity size={15}/><strong>{sourceName}</strong></div>
      <div className="context-source-meta"><span>{symbols[symbol].label} / {frame.toUpperCase()}</span>
        <span>{replay?"Frozen historical replay":source==="demo"?"Illustrative data":lastUpdatedMs?"Updated "+formatUtc(lastUpdatedMs):"No recent update confirmed"}</span></div>
      {source==="binance"&&status!=="live"&&!replay&&
        <p className="context-data-caution" role="status"><ShieldAlert size={14}/>
          Exchange data is {status}. Price distances are based on the last available candle, not a verified current quote.</p>}
    </div>
    <div className="context-quote">
      <span>LAST OBSERVED CLOSE</span>
      <strong>{quote!==null?quoteFormat(quote):"—"}</strong>
      <small>{source==="demo"?"SIMULATED / NOT EXECUTABLE":replay?"HISTORICAL OBSERVATION":status==="live"?"EXCHANGE-STREAM OBSERVATION":"NOT A VERIFIED LIVE QUOTE"}</small>
    </div>
    <div className="context-section-head"><div><h4>Marked price levels</h4>
      <p>Distances from your own saved levels</p></div><span>{levels.length}</span></div>
    {plotted.length ? <div className="context-price-map" aria-label="Levels nearest observed price">
      {plotted.map(item=>{
        const direction=item.side==="above"?"above":item.side==="below"?"below":"at";
        const alreadyArmed=activeAlerts.some(alert=>alert.price===item.price&&alert.direction===direction);
        return <div className="context-level" key={item.id}>
          <span className={"context-level-direction "+item.side}>
            {item.side==="above"?<ArrowUpRight size={15}/>:
              item.side==="below"?<ArrowDownRight size={15}/>:<Activity size={15}/>}</span>
          <div className="context-level-price"><strong>{quoteFormat(item.price)}</strong>
            <small>{item.side==="at"?"At observed close":item.side==="above"?"Above observed close":"Below observed close"}</small></div>
          <span className="context-level-delta">{item.distancePercent>0?"+":""}{item.distancePercent.toFixed(2)}%</span>
          <button type="button" aria-label={"Arm alert at "+quoteFormat(item.price)}
            title={!alertsAllowed?"A current exchange stream or demonstration mode is required for a new alert":alreadyArmed?"Alert already armed":item.side==="at"?"Crossing alerts require a level above or below the last close":"Arm browser-local crossing alert"}
            disabled={!quote||!alertsAllowed||item.side==="at"||alreadyArmed}
            onClick={()=>onArmAlert(item.price)}>
            {alreadyArmed?<Bell size={15} fill="currentColor"/>:<Bell size={15}/>}
          </button>
        </div>;
      })}
    </div> : <div className="context-empty"><ChartNoAxesCombined size={21}/>
      <strong>No measured level distances yet</strong>
      <p>{quote===null?"Load a chart to use the price map.":"Mark horizontal price levels to see exactly how far each is from the last observed close."}</p>
      <button onClick={onShowMarkets} type="button"><Plus size={14}/> Add a price level</button>
    </div>}
    <div className="context-section-head context-research-head"><div><h4>Research continuity</h4>
      <p>Connect chart actions to your decisions</p></div></div>
    <div className="context-research-grid">
      <button type="button" onClick={onOpenDecisions} aria-label="Open saved Decision Desk records">
        <BookMarked size={18}/><strong>{relevant.length}</strong><span>Decision records</span>
        <small>{openReviews} await review</small>
      </button>
      <button type="button" onClick={onShowObjects} aria-label="Open saved chart objects and levels">
        <Layers size={18}/><strong>{drawings.length}</strong><span>Drawings</span>
        <small>{activeAlerts.length} alerts armed</small>
      </button>
    </div>
    <button type="button" className="context-capture-button" onClick={onCapture}>
      <ClipboardList size={16}/> Capture current thesis <ArrowRight size={15}/></button>
    <div className="context-caveat"><Info size={15}/>
      <p>Levels are user-marked, not automatically verified support or resistance. Alerts check crossings only while this browser tab is active. No orders are sent.</p>
    </div>
  </section>;
}
