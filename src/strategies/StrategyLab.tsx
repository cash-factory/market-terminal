import {useMemo,useState} from "react";
import {Activity,ArrowLeft,BarChart3,CalendarClock,ChartNoAxesCombined,Info,RotateCcw,ShieldAlert} from "lucide-react";
import type {CandlestickData,UTCTimestamp} from "lightweight-charts";
import {symbols,type Frame,type SymbolId} from "../market";
import {defaultBacktestConfig,runSmaCrossover,validateBacktestConfig,type BacktestConfig} from "./backtest";
import "./strategyLab.css";

type Props={
  symbol:SymbolId;frame:Frame;source:"demo"|"binance";status:string;
  candles:readonly CandlestickData<UTCTimestamp>[];
  onBack:()=>void;
};
const price=(n:number)=>Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:2,minimumFractionDigits:2}):"—";
const percent=(n:number)=>(n>=0?"+":"")+n.toFixed(2)+"%";
const utc=(time:number)=>new Date(time*1000).toISOString().slice(0,16).replace("T"," ")+" UTC";
const fields:[keyof BacktestConfig,string,string,string,string][]=[
  ["fast","Fast SMA","2","500","1"],
  ["slow","Slow SMA","3","1000","1"],
  ["startingCapital","Starting capital","1","1000000000","100"],
  ["allocationPct","Allocation (%)","0.01","100","1"],
  ["commissionBps","Commission (bps / side)","0","2000","0.5"],
  ["slippageBps","Slippage (bps / side)","0","2000","0.5"]
];
export function StrategyLab({symbol,frame,source,status,candles,onBack}:Props){
  const [config,setConfig]=useState<BacktestConfig>({...defaultBacktestConfig});
  const [showAll,setShowAll]=useState(false);
  const error=validateBacktestConfig(config);
  const result=useMemo(()=>{
    if(error)return null;
    try{return runSmaCrossover(candles,config);}catch{return null;}
  },[candles,config,error]);
  const curve=useMemo(()=>{
    const points=result?.equityCurve??[];
    if(points.length===0)return "";
    const min=Math.min(...points.map(p=>p.equity)),max=Math.max(...points.map(p=>p.equity));
    const height=Math.max(1,max-min);
    return points.map((point,index)=>{
      const x=28+index*632/Math.max(1,points.length-1);
      const y=150-(point.equity-min)/height*112;
      return (index===0?"M":"L")+x.toFixed(2)+","+y.toFixed(2);
    }).join(" ");
  },[result]);
  const onInput=(key:keyof BacktestConfig,value:string)=>setConfig(old=>({...old,[key]:value===""?NaN:Number(value)}));
  const tooShort=candles.length<config.slow+2;
  const active=result?.openPosition;
  const listed=showAll?result?.trades:result?.trades.slice(-20);
  return <main className="stlab-page" aria-label="Strategy laboratory">
    <header className="stlab-heading">
      <div className="stlab-path"><button onClick={onBack}><ArrowLeft size={14}/> Chart Studio</button>
        <span>/</span><span>Research</span></div>
      <div className="stlab-hero"><div><div className="stlab-eyebrow"><Activity size={13}/> HISTORICAL RESEARCH / LOCAL SIMULATION</div>
        <h1>Strategy Laboratory</h1>
        <p>Evaluate a moving-average crossover using reproducible next-bar fills and explicit costs. This never sends broker orders.</p>
      </div><span className={"stlab-dataflag "+(source==="demo"?"demo":"external")}>
        {source==="demo"?"SYNTHETIC DATA":("BINANCE SPOT · "+status.toUpperCase())}</span></div>
    </header>
    <div className="stlab-grid">
      <aside className="stlab-inputs">
        <header><div><span className="stlab-eyebrow">01 / STRATEGY</span><h2>SMA crossover</h2></div>
          <button title="Reset parameters" aria-label="Reset strategy parameters" onClick={()=>setConfig({...defaultBacktestConfig})}>
            <RotateCcw size={15}/></button></header>
        <p>A long entry is signaled when the fast SMA crosses above the slow SMA at a candle close.
          Positions close on a downward cross. Both orders fill at the following candle's open.</p>
        <div className="stlab-input-grid">
          {fields.map(([key,label,min,max,step])=><label key={key}>{label}
            <input type="number" aria-label={label} min={min} max={max} step={step}
              value={Number.isFinite(config[key])?config[key]:""}
              onChange={event=>onInput(key,event.target.value)}/></label>)}
        </div>
        {error&&<p role="alert" className="stlab-warning">{error}</p>}
        <section className="stlab-assumptions" aria-label="Simulation assumptions">
          <strong><ShieldAlert size={14}/> Execution assumptions</strong>
          <p>Long-only, spot-style quantity; fixed percent of available cash; no leverage or shorting.
            Cash is held in the symbol's quote units. Signals use completed closes only.
            Fees and adverse slippage apply on each side. Open trades are marked at the last close.</p>
        </section>
      </aside>
      <section className="stlab-results" aria-label="Strategy test results">
        <div className="stlab-source"><span><BarChart3 size={15}/> {symbols[symbol].label} / {frame.toUpperCase()}</span>
          <span>{candles.length} observed bars · {source==="demo"?"SIMULATED INPUT":"EXCHANGE INPUT"}
            {result?.firstTime!==null&&result?.firstTime!==undefined?" · "+utc(result.firstTime):""}</span></div>
        {tooShort?<div className="stlab-empty"><CalendarClock size={22}/><strong>Not enough history yet</strong>
          <p>The slow SMA requires {config.slow+2} observed candles. Choose another interval or wait for the selected source to load.</p></div>:
          !result?<div className="stlab-empty"><ShieldAlert size={20}/><strong>Simulation unavailable</strong>
            <p>Correct the parameter validation error or confirm the OHLC series is ordered and valid.</p></div>:
          <>
            <div className="stlab-metrics">
              <div><span>Ending equity</span><strong className="stlab-value">{price(result.equity)}</strong><small>Quote units · starting {price(config.startingCapital)}</small></div>
              <div><span>Total return</span><strong className={result.returnPct>=0?"quote-up":"quote-down"}>{percent(result.returnPct)}</strong><small>Includes open unrealized P/L</small></div>
              <div><span>Max drawdown</span><strong>{result.maxDrawdownPct.toFixed(2)}%</strong><small>Close-marked peak to trough</small></div>
              <div><span>Closed trades</span><strong>{result.trades.length}</strong><small>{result.wins} winners · {result.losses} losers</small></div>
            </div>
            <div className="stlab-equity-panel">
              <div className="stlab-equity-head"><div><span className="stlab-eyebrow">02 / EQUITY HISTORY</span><h2>Simulated equity</h2></div>
                <span>Mark to market at candle close</span></div>
              <svg role="img" aria-label="Simulated equity curve" viewBox="0 0 690 180" preserveAspectRatio="none">
                <path d="M28 150 H660" stroke="currentColor" strokeOpacity=".22" strokeWidth="1" fill="none"/>
                <path d="M28 94 H660" stroke="currentColor" strokeOpacity=".16" strokeWidth="1" fill="none"/>
                <path d="M28 38 H660" stroke="currentColor" strokeOpacity=".16" strokeWidth="1" fill="none"/>
                <path d={curve} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
              </svg>
              <div className="stlab-axis"><span>{result.firstTime?utc(result.firstTime):"—"}</span>
                <span>{result.lastTime?utc(result.lastTime):"—"}</span></div>
            </div>
            <div className="stlab-execution-summary">
              <div><span>Realized net P/L</span><strong>{price(result.netRealizedPnL)}</strong></div>
              <div><span>Fees charged</span><strong>{price(result.totalFees)}</strong></div>
              <div><span>Open position</span><strong>{active?active.quantity.toFixed(5)+" units":"None"}</strong>
                {active&&<small>Unrealized, after entry fee: {price(active.unrealizedNetPnL)}</small>}</div>
            </div>
            <section className="stlab-trades" aria-label="Backtest trade ledger">
              <header><div><span className="stlab-eyebrow">03 / EXECUTION LEDGER</span><h2>Completed simulated positions</h2></div>
                <span>{result.trades.length} closed positions</span></header>
              <div className="stlab-table-scroll"><table><thead><tr><th>Entry · UTC</th><th>Exit · UTC</th>
                <th>Entry price</th><th>Exit price</th><th>Units</th><th>Net P/L</th></tr></thead>
                <tbody>{listed?.map(trade=><tr key={trade.entryTime+"-"+trade.exitTime}>
                  <td>{utc(trade.entryTime)}</td><td>{utc(trade.exitTime)}</td>
                  <td>{trade.entryPrice.toFixed(symbols[symbol].precision)}</td>
                  <td>{trade.exitPrice.toFixed(symbols[symbol].precision)}</td>
                  <td>{trade.quantity.toFixed(5)}</td>
                  <td className={trade.netPnL>=0?"quote-up":"quote-down"}>{price(trade.netPnL)}</td>
                </tr>)}
                {!result.trades.length&&<tr><td colSpan={6}>No completed trades under these conditions.</td></tr>}
                </tbody></table></div>
              {result.trades.length>20&&<button className="stlab-show-all" onClick={()=>setShowAll(v=>!v)}>
                {showAll?"Show latest 20":"Show all "+result.trades.length+" trades"}</button>}
            </section>
          </>}
        <p className="stlab-disclaimer"><Info size={15}/>
          These results are simulated using available chart history. They are not performance claims,
          trading advice, actual executions, or guarantees of fills. Real broker costs,
          liquidity, spread, session rules and live tradability are not verified.</p>
      </section>
    </div>
  </main>;
}
