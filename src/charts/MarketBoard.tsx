import {useEffect,useMemo,useState} from "react";
import {demoCandles,ENABLE_TEST_FIXTURES,REAL_SPOT_SYMBOLS,symbols,type Frame,type SymbolId,type RealSpotSymbol} from "../market";
import {fetchBinanceSpotCandles} from "../data/binance";

const names:Record<SymbolId,string>={
  EURUSD:"Euro / US Dollar · provider required",
  BTCUSDT:"Bitcoin / Tether · Binance Spot",
  ETHUSDT:"Ethereum / Tether · Binance Spot",
  SOLUSDT:"Solana / Tether · Binance Spot",
  XRPUSDT:"XRP / Tether · Binance Spot",
  BNBUSDT:"BNB / Tether · Binance Spot",
  AAPL:"Apple Inc. · provider required",
  XAUUSD:"Gold / US Dollar · provider required",
  US100:"US 100 CFD · provider required",
};
type Point={id:SymbolId;last:number;change:number;points:string;asOf:number};
type Props={frame:Frame;selected:SymbolId;onOpen:(symbol:SymbolId)=>void;compact?:boolean};
const trace=(closes:number[])=>{
  const lo=Math.min(...closes),hi=Math.max(...closes);
  return closes.map((price,i)=>[2+i*96/Math.max(1,closes.length-1),26-(price-lo)*22/(hi-lo||1)].join(",")).join(" ");
};
const display=(points:readonly {close:number;openTimeMs:number}[],id:SymbolId):Point|null=>{
  if(points.length<2)return null;
  const end=points.at(-1)!,previous=points[0];
  if(!end||!previous||previous.close<=0)return null;
  const closes=points.map(row=>row.close);
  return {id,last:end.close,change:(end.close/previous.close-1)*100,points:trace(closes),asOf:end.openTimeMs};
};

export function MarketBoard({frame,selected,onOpen,compact=false}:Props){
  const ids:readonly SymbolId[]=ENABLE_TEST_FIXTURES?["EURUSD","BTCUSDT","AAPL","US100"]:REAL_SPOT_SYMBOLS;
  const fixtures=useMemo(()=>ENABLE_TEST_FIXTURES?ids.map(id=>{
    const bars=demoCandles(id,frame).slice(-24);
    return display(bars.map(b=>({...b,openTimeMs:Number(b.time)*1000})),id);
  }).filter((p):p is Point=>p!==null):[],[frame]);
  const [quotes,setQuotes]=useState<Partial<Record<SymbolId,Point>>>({});
  const [errors,setErrors]=useState<Partial<Record<SymbolId,string>>>({});
  const [lastRefresh,setLastRefresh]=useState<number|null>(null);
  useEffect(()=>{
    if(ENABLE_TEST_FIXTURES)return;
    const abort=new AbortController();
    let mounted=true;
    const refresh=async()=>{
      const result=await Promise.all(REAL_SPOT_SYMBOLS.map(async id=>{
        try{
          // Fixed historical resolution. No claim that these are 24h live change statistics.
          const batch=await fetchBinanceSpotCandles({symbol:id,interval:"1h",limit:48,signal:abort.signal});
          const row=display(batch.candles.slice(-24),id);
          if(!row)throw new Error("No validated recent 1h candles");
          return {id,row,error:null as string|null};
        }catch(e){return {id,row:null,error:e instanceof Error?e.message:"Source unavailable"};}
      }));
      if(!mounted)return;
      const update:Partial<Record<SymbolId,Point>>={};
      const failures:Partial<Record<SymbolId,string>>={};
      for(const row of result){
        if(row.row)update[row.id]=row.row;
        else failures[row.id]=row.error??"Provider unavailable";
      }
      // Do not retain an older price as though it were the latest response.
      setQuotes(update);setErrors(failures);setLastRefresh(Date.now());
    };
    void refresh();
    const timer=window.setInterval(()=>void refresh(),90_000);
    return()=>{mounted=false;abort.abort();window.clearInterval(timer);};
  },[]);
  const points=ENABLE_TEST_FIXTURES?fixtures:ids.map(id=>quotes[id]).filter((p):p is Point=>Boolean(p));
  const byId=new Map(points.map(p=>[p.id,p]));
  return <section className={"market-board"+(compact?" compact-board":"")}
    aria-label={ENABLE_TEST_FIXTURES?"Synthetic market snapshots":"Verified market snapshots"}>
    <div className="board-caption">
      <strong>{compact?"Watchlist":"Market overview"}</strong>
      <span>{ENABLE_TEST_FIXTURES?"TEST FIXTURE · synthetic": "Binance Spot · observed 1h candles"}</span>
    </div>
    <div className="board-labels"><span>Instrument</span><span>Observed bars</span><span>Historical change</span></div>
    {ids.map(id=>{
      const point=byId.get(id);
      return <button key={id} className={"board-row"+(selected===id?" current":"")}
        onClick={()=>onOpen(id)} aria-label={"Open "+(ENABLE_TEST_FIXTURES?"synthetic ":"")+symbols[id].label}>
        <span className="board-symbol"><strong>{symbols[id].label}</strong><small>{names[id]}</small></span>
        {point?<svg aria-hidden="true" viewBox="0 0 100 30" preserveAspectRatio="none" className={point.change>=0?"gain":"loss"}>
          <polyline points={point.points} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/>
        </svg>:<span aria-label={errors[id]?"Provider unavailable":"Loading exchange candles"}>—</span>}
        <span className="board-quote">{point?<><b>{point.last.toFixed(symbols[id].precision)}</b>
          <small className={point.change>=0?"gain":"loss"}>{point.change>=0?"+":""}{point.change.toFixed(2)}%</small></>
          :<><b>—</b><small title={errors[id]??"Loading validated market candles"}>{errors[id]?"Unavailable":"Loading"}</small></>}</span>
      </button>;
    })}
    {!ENABLE_TEST_FIXTURES&&<p className="peak-watchlist-caveat">
      Venue: Binance Spot. Change is between the first and last observed 1h closes, not a live ticker return.
      {lastRefresh&&" Checked "+new Date(lastRefresh).toLocaleTimeString()+"."}
      Failed requests show no invented quotes. No broker CFDs, forex or US index prices are implied.
    </p>}
  </section>;
}
