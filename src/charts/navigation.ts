import type {CandlestickData,UTCTimestamp} from "lightweight-charts";
import type {Frame,SymbolId} from "../market";

/** The requested instant is UTC, not browser-local time. Invalid calendar dates are rejected. */
export function parseUtcChartDate(input:string):number|null{
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input))return null;
  const timestamp=Date.parse(input+"Z");
  return Number.isFinite(timestamp)&&new Date(timestamp).toISOString().slice(0,16)===input
    ?timestamp/1000:null;
}
/** Nearest observed candle only: never interpolate a timestamp through a market closure. */
export function nearestObservedBar(candles:readonly CandlestickData<UTCTimestamp>[],unix:number):number|null{
  if(!candles.length||!Number.isFinite(unix))return null;
  let lo=0,hi=candles.length-1;
  while(lo<hi){
    const mid=Math.floor((lo+hi)/2);
    if(Number(candles[mid].time)<unix)lo=mid+1;else hi=mid;
  }
  if(lo===0)return 0;
  const earlier=lo-1;
  return Math.abs(Number(candles[earlier].time)-unix)<=Math.abs(Number(candles[lo].time)-unix)
    ?earlier:lo;
}
/** Export the supplied observed bars; replay callers pass only bars visible at the replay cursor. */
export function ohlcCsv(candles:readonly CandlestickData<UTCTimestamp>[],
  symbol:SymbolId,source:"demo"|"binance",frame:Frame):string{
  const rows=["time_utc,symbol,source,frame,open,high,low,close"];
  for(const bar of candles){
    const time=new Date(Number(bar.time)*1000).toISOString();
    rows.push([time,symbol,source,frame,bar.open,bar.high,bar.low,bar.close].join(","));
  }
  return rows.join("\n")+"\n";
}
