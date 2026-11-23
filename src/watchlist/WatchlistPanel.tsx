import {ArrowDown,ArrowUp,Plus,Star,Trash2} from "lucide-react";
import {symbols,type SymbolId} from "../market";
import {AVAILABLE_INSTRUMENTS,addWatchlistInstrument,moveWatchlistInstrument,orderedWatchlist} from "./model";
import "./watchlist.css";

type Props={
  items:SymbolId[];
  favorites:SymbolId[];
  selected:SymbolId;
  onOpen:(symbol:SymbolId)=>void;
  onChange:(items:SymbolId[],favorites:SymbolId[])=>void;
};
export function WatchlistPanel({items,favorites,selected,onOpen,onChange}:Props){
 const ordered=orderedWatchlist(items,favorites),available=AVAILABLE_INSTRUMENTS.filter(id=>!items.includes(id));
 return <section className="peak-watchlist" aria-label="Saved analyst watchlist">
  <header className="peak-watchlist-header">
    <div><strong>Watchlist</strong><small>{items.length} instruments · stored on this device</small></div>
    {available.length>0&&<label className="peak-watchlist-add"><Plus size={14}/>
      <select aria-label="Add watchlist instrument" value="" onChange={event=>{
        const symbol=event.target.value as SymbolId;
        if(available.includes(symbol))onChange(addWatchlistInstrument(items,symbol),favorites);
      }}><option value="">Add</option>{available.map(id=><option key={id} value={id}>{symbols[id].label}</option>)}</select>
    </label>}
  </header>
  {ordered.length===0&&<p className="peak-watchlist-empty">Your list is empty. Add an available instrument to resume chart analysis.</p>}
  <div className="peak-watchlist-rows">
    {ordered.map((id,i)=><div className={"peak-watchlist-row"+(id===selected?" is-current":"")} key={id}>
      <button type="button" className="peak-watchlist-open" onClick={()=>onOpen(id)} aria-current={id===selected?"true":undefined}>
        <strong>{symbols[id].label}</strong><small>{symbols[id].market.split(" · ")[0]}</small>
      </button>
      <div className="peak-watchlist-controls">
        <button type="button" className={favorites.includes(id)?"is-favorite":""}
          title={favorites.includes(id)?"Unpin favorite":"Pin favorite"} aria-label={(favorites.includes(id)?"Unpin ":"Pin ")+symbols[id].label}
          aria-pressed={favorites.includes(id)}
          onClick={()=>onChange(items,favorites.includes(id)?favorites.filter(f=>f!==id):[...favorites,id])}>
          <Star size={14} fill={favorites.includes(id)?"currentColor":"none"}/></button>
        <button type="button" title="Move up" aria-label={"Move "+symbols[id].label+" up"} disabled={i===0||favorites.includes(ordered[i-1])!==favorites.includes(id)}
          onClick={()=>onChange(moveWatchlistInstrument(items,favorites,id,-1),favorites)}><ArrowUp size={13}/></button>
        <button type="button" title="Move down" aria-label={"Move "+symbols[id].label+" down"} disabled={i===ordered.length-1||favorites.includes(ordered[i+1])!==favorites.includes(id)}
          onClick={()=>onChange(moveWatchlistInstrument(items,favorites,id,1),favorites)}><ArrowDown size={13}/></button>
        <button type="button" title="Remove from watchlist" aria-label={"Remove "+symbols[id].label+" from watchlist"}
          onClick={()=>onChange(items.filter(item=>item!==id),favorites.filter(item=>item!==id))}><Trash2 size={13}/></button>
      </div>
    </div>)}
  </div>
  <p className="peak-watchlist-caveat">Available symbols are limited to configured data sources. Other market prices are not silently invented.</p>
 </section>;
}
