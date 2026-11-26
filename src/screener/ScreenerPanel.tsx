import {useMemo,useState} from "react";
import {ArrowDown,ArrowUp,BarChart3,Check,Filter,Plus,RotateCcw,Search} from "lucide-react";
import {symbols,type Frame,type SymbolId} from "../market";
import {demoScreen,screenRows,type ScreenCriteria,type ScreenSort} from "./model";
import "./screener.css";

type Props={frame:Frame;activeListName:string;onOpen:(symbol:SymbolId)=>void;
  onAddToWatchlist:(symbol:SymbolId)=>boolean};

export function ScreenerPanel({frame,activeListName,onOpen,onAddToWatchlist}:Props){
  const [criteria,setCriteria]=useState<ScreenCriteria>({
    query:"",market:"all",minChange:null,maxChange:null,sort:"change",descending:true
  });
  const [added,setAdded]=useState<SymbolId|null>(null);
  const snapshots=useMemo(()=>demoScreen(frame),[frame]);
  const visible=useMemo(()=>screenRows(snapshots,criteria),[snapshots,criteria]);
  const patch=(next:Partial<ScreenCriteria>)=>setCriteria(old=>({...old,...next}));
  const count=visible.length;
  return <main className="screener-page" aria-label="Market screener">
    <header className="screener-heading">
      <div><span className="sc-eyebrow">MARKET RESEARCH / LOCAL-FIRST</span>
        <h1>Market screener</h1><p>Build filters and move discoveries into your watchlists.
          This preview screens four <strong>synthetic</strong> instruments, not live prices.</p></div>
      <span className="sc-source"><span/> DEMONSTRATION DATA</span>
    </header>
    <section className="screener-workspace" aria-label="Screener filters">
      <div className="sc-panel-title"><Filter size={16}/><strong>Filters</strong>
        <button onClick={()=>setCriteria({query:"",market:"all",minChange:null,
          maxChange:null,sort:"change",descending:true})}><RotateCcw size={14}/> Reset</button></div>
      <div className="sc-fields">
        <label>Search symbol <span><Search size={15}/>
          <input aria-label="Search screener symbols" placeholder="Ticker or description"
            value={criteria.query} onChange={e=>patch({query:e.target.value})}/></span></label>
        <label>Asset class <select aria-label="Screener asset class" value={criteria.market}
          onChange={e=>patch({market:e.target.value})}>
          <option value="all">All markets</option><option value="FOREX">Forex</option>
          <option value="CRYPTO">Crypto</option><option value="STOCKS">Stocks</option>
          <option value="INDICES">Indices</option>
        </select></label>
        <label>Minimum 24-bar change (%) <input aria-label="Minimum percent change" type="number"
          step="0.1" placeholder="Any" value={criteria.minChange??""}
          onChange={e=>patch({minChange:e.target.value===""?null:Number(e.target.value)})}/></label>
        <label>Maximum 24-bar change (%) <input aria-label="Maximum percent change" type="number"
          step="0.1" placeholder="Any" value={criteria.maxChange??""}
          onChange={e=>patch({maxChange:e.target.value===""?null:Number(e.target.value)})}/></label>
      </div>
    </section>
    <section className="screener-workspace" aria-label="Screener results">
      <header className="sc-results-header">
        <div><strong>Results</strong><span>{count} of {snapshots.length} instruments · {frame} · simulated observations</span></div>
        <div><label>Sort by <select aria-label="Sort screener" value={criteria.sort}
          onChange={e=>patch({sort:e.target.value as ScreenSort})}>
          <option value="change">24-bar change</option><option value="range">24-bar range</option>
          <option value="symbol">Symbol</option><option value="price">Price</option>
        </select></label>
          <button aria-label="Reverse screener sort" onClick={()=>patch({descending:!criteria.descending})}>
            {criteria.descending?<ArrowDown size={15}/>:<ArrowUp size={15}/>}</button></div>
      </header>
      <div className="sc-table-wrap"><table>
        <thead><tr><th scope="col">Instrument</th><th scope="col">Source</th>
          <th scope="col">Last</th><th scope="col">24-bar move</th>
          <th scope="col">24-bar range</th><th scope="col">Actions</th></tr></thead>
        <tbody>{visible.map(row=><tr key={row.symbol}>
          <td><button className="sc-symbol" onClick={()=>onOpen(row.symbol)}>
            <strong>{symbols[row.symbol].label}</strong><span>{row.market}</span></button></td>
          <td><span className="sc-demo-cell">SYNTHETIC</span></td>
          <td className="sc-numeric">{row.last.toFixed(row.pricePrecision)}</td>
          <td className={"sc-numeric "+(row.changePct>=0?"quote-up":"quote-down")}>
            {row.changePct>=0?"+":""}{row.changePct.toFixed(2)}%</td>
          <td className="sc-numeric">{row.rangePct.toFixed(2)}%</td>
          <td><div className="sc-row-actions">
            <button onClick={()=>onOpen(row.symbol)} aria-label={"Open screener chart "+row.symbol}>
              <BarChart3 size={14}/> Chart</button>
            <button aria-label={"Add "+row.symbol+" to watchlist"} onClick={()=>{
              if(onAddToWatchlist(row.symbol))setAdded(row.symbol);else setAdded(null);
            }}>{added===row.symbol?<Check size={14}/>:<Plus size={14}/>} Watchlist</button>
          </div></td>
        </tr>)}
        {!count&&<tr><td colSpan={6} className="sc-empty">No matches. Relax a filter or reset the screen.</td></tr>}
        </tbody>
      </table></div>
      <footer className="sc-footer"><span>Destination: <strong>{activeListName}</strong></span>
        <span>Metrics computed from the latest 24 synthetic OHLC bars. No real-time market coverage or executable prices are implied.</span>
      </footer>
    </section>
  </main>;
}
