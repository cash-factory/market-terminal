import {availableInstruments, ENABLE_TEST_FIXTURES, type SymbolId} from "../market";

export const AVAILABLE_INSTRUMENTS=availableInstruments;
export const DEFAULT_WATCHLIST:SymbolId[]=ENABLE_TEST_FIXTURES
  ? ["EURUSD","BTCUSDT","AAPL","US100"]
  : [...availableInstruments];
const valid=new Set<string>(AVAILABLE_INSTRUMENTS);

/** An empty list is a valid, intentionally cleared watchlist. */
export function parseWatchlist(value:unknown):SymbolId[]{
  if(!Array.isArray(value))return [...DEFAULT_WATCHLIST];
  const result:SymbolId[]=[];
  for(const item of value)if(typeof item==="string"&&valid.has(item)&&!result.includes(item as SymbolId))
    result.push(item as SymbolId);
  return result;
}
export function parseWatchlistFavorites(value:unknown,watchlist:readonly SymbolId[]):SymbolId[]{
  if(!Array.isArray(value))return [];
  return [...new Set(value.filter((item):item is SymbolId=>
    typeof item==="string"&&valid.has(item)&&watchlist.includes(item as SymbolId)))];
}
export function orderedWatchlist(items:readonly SymbolId[],favorites:readonly SymbolId[]):SymbolId[]{
  const pinned=new Set(favorites);
  return [...items.filter(item=>pinned.has(item)),...items.filter(item=>!pinned.has(item))];
}
export function addWatchlistInstrument(items:readonly SymbolId[],symbol:SymbolId):SymbolId[]{
  return valid.has(symbol)&&!items.includes(symbol)?[...items,symbol]:[...items];
}
export function moveWatchlistInstrument(
  items:readonly SymbolId[], favorites:readonly SymbolId[], symbol:SymbolId,offset:-1|1
):SymbolId[]{
  const ordered=orderedWatchlist(items,favorites);
  const i=ordered.indexOf(symbol),target=i+offset;
  if(i<0||target<0||target>=ordered.length||favorites.includes(symbol)!==favorites.includes(ordered[target]))
    return [...items];
  [ordered[i],ordered[target]]=[ordered[target],ordered[i]];
  return ordered;
}
