import { useMemo } from "react";
import { demoCandles, symbols, type Frame, type SymbolId } from "../market";

const instrumentNames: Record<SymbolId,string> = {
  EURUSD:"Euro / US Dollar", BTCUSDT:"Bitcoin / Tether", AAPL:"Apple Inc.", US100:"US 100 Index"
};

type Props = {
  frame:Frame;
  selected:SymbolId;
  onOpen:(symbol:SymbolId)=>void;
  compact?:boolean;
};

export function MarketBoard({frame,selected,onOpen,compact=false}:Props) {
  const instruments=useMemo(()=>(Object.keys(symbols) as SymbolId[]).map(id=>{
    const closes=demoCandles(id,frame).slice(-24).map(bar=>bar.close);
    const high=Math.max(...closes), low=Math.min(...closes);
    const change=(closes.at(-1)! / closes[0]-1)*100;
    const points=closes.map((price,i)=>[2+i*96/(closes.length-1),26-(price-low)*22/(high-low || 1)].join(",")).join(" ");
    return {id,change,points,last:closes.at(-1)!.toFixed(symbols[id].precision)};
  }),[frame]);
  return <section className={"market-board"+(compact?" compact-board":"")} aria-label="Synthetic market snapshots">
    <div className="board-caption"><strong>{compact?"Watchlist":"Market overview"}</strong><span>Synthetic · {frame} bars</span></div>
    <div className="board-labels"><span>Instrument</span><span>24 bars</span><span>Last / change</span></div>
    {instruments.map(({id,change,points,last})=><button key={id} className={"board-row"+(selected===id?" current":"")}
      onClick={()=>onOpen(id)} aria-label={"Open synthetic "+symbols[id].label}>
      <span className="board-symbol"><strong>{symbols[id].label}</strong><small>{instrumentNames[id]}</small></span>
      <svg aria-hidden="true" viewBox="0 0 100 30" preserveAspectRatio="none" className={change>=0?"gain":"loss"}>
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/>
      </svg><span className="board-quote"><b>{last}</b><small className={change>=0?"gain":"loss"}>{change>=0?"+":""}{change.toFixed(2)}%</small></span>
    </button>)}
  </section>;
}
