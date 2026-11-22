import type {CandlestickData,UTCTimestamp} from "lightweight-charts";

export type ChartDisplayStyle="candles"|"ohlc-bars"|"line"|"area"|"heikin-ashi";
export const chartStyles:ReadonlyArray<{id:ChartDisplayStyle;label:string;description:string}>=[
  {id:"candles",label:"Candlesticks",description:"Raw observed OHLC candlesticks"},
  {id:"ohlc-bars",label:"OHLC Bars",description:"Raw observed OHLC bar glyphs"},
  {id:"line",label:"Close Line",description:"Connect observed closing prices"},
  {id:"area",label:"Area",description:"Filled close-price line"},
  {id:"heikin-ashi",label:"Heikin Ashi",description:"Derived smoothed OHLC; not raw execution prices"}
];
const validIds=new Set(chartStyles.map(s=>s.id));
export function parseChartDisplayStyle(value:unknown):ChartDisplayStyle{
  return typeof value==="string"&&validIds.has(value as ChartDisplayStyle)?
    value as ChartDisplayStyle:"candles";
}
/** Heikin-Ashi is a chart transformation, not a broker or market price feed. */
export function heikinAshi(
  candles:readonly CandlestickData<UTCTimestamp>[]
):CandlestickData<UTCTimestamp>[]{
  let previousOpen=0,previousClose=0;
  return candles.map((bar,index)=>{
    const close=(bar.open+bar.high+bar.low+bar.close)/4;
    const open=index===0?(bar.open+bar.close)/2:(previousOpen+previousClose)/2;
    const high=Math.max(bar.high,open,close);
    const low=Math.min(bar.low,open,close);
    previousOpen=open;previousClose=close;
    return {time:bar.time,open,high,low,close};
  });
}
export function closeLineData(candles:readonly CandlestickData<UTCTimestamp>[]){
  return candles.map(bar=>({time:bar.time,value:bar.close}));
}
