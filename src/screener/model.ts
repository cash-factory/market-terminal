import {demoCandles,symbols,type Frame,type SymbolId} from "../market";

export type ScreenRow={symbol:SymbolId;market:string;last:number;changePct:number;
  rangePct:number;pricePrecision:number;bars:number;source:"demo"};
export type ScreenSort="symbol"|"price"|"change"|"range";
export type ScreenCriteria={query:string;market:string;minChange:number|null;
  maxChange:number|null;sort:ScreenSort;descending:boolean};
const marketOf=(id:SymbolId)=>symbols[id].market.split(" · ")[0];
/** Market snapshots are explicitly synthetic; never substitute these for live quotes. */
export function demoScreen(frame:Frame):ScreenRow[]{
  return (Object.keys(symbols) as SymbolId[]).map(symbol=>{
    const candles=demoCandles(symbol,frame);
    const window=candles.slice(-24),last=window.at(-1)!.close;
    const reference=window[0].open;
    const highest=Math.max(...window.map(c=>c.high));
    const lowest=Math.min(...window.map(c=>c.low));
    return {symbol,market:marketOf(symbol),last,changePct:(last/reference-1)*100,
      rangePct:(highest-lowest)/reference*100,pricePrecision:symbols[symbol].precision,
      bars:window.length,source:"demo" as const};
  });
}
export function screenRows(rows:readonly ScreenRow[],criteria:ScreenCriteria):ScreenRow[]{
  const query=criteria.query.trim().toLowerCase();
  return rows.filter(row=>
    (!query||[row.symbol,symbols[row.symbol].label,row.market].join(" ").toLowerCase().includes(query))&&
    (criteria.market==="all"||row.market===criteria.market)&&
    (criteria.minChange===null||row.changePct>=criteria.minChange)&&
    (criteria.maxChange===null||row.changePct<=criteria.maxChange)
  ).sort((a,b)=>{
    const delta=criteria.sort==="symbol"?a.symbol.localeCompare(b.symbol):
      criteria.sort==="price"?a.last-b.last:
      criteria.sort==="range"?a.rangePct-b.rangePct:a.changePct-b.changePct;
    return (criteria.descending?-1:1)*(delta||a.symbol.localeCompare(b.symbol));
  });
}
