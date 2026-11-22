import type {CandlestickData,LineData,UTCTimestamp} from "lightweight-charts";
type Candle=CandlestickData<UTCTimestamp>;
/**
 * Compare instrument B to A using ONLY candles that share an observed UTC
 * timestamp. There is no gap-filling or invented cross-session quote.
 * Values are rebased to A's first shared close so they can appear on the
 * primary price scale; they are NOT executable prices of B.
 */
export function rebaseComparison(
  primary:readonly Candle[],
  comparison:readonly Candle[]
):LineData<UTCTimestamp>[]{
  if(!primary.length||!comparison.length)return [];
  const priceByTime=new Map<number,number>();
  for(const candle of comparison){
    if(Number.isFinite(candle.close)&&candle.close>0)
      priceByTime.set(Number(candle.time),candle.close);
  }
  const matched=primary.filter(bar=>Number.isFinite(bar.close)&&bar.close>0
    &&priceByTime.has(Number(bar.time)));
  if(matched.length<2)return [];
  const primaryBase=matched[0].close;
  const compareBase=priceByTime.get(Number(matched[0].time))!;
  return matched.map(bar=>({
    time:bar.time,
    value:primaryBase*priceByTime.get(Number(bar.time))!/compareBase
  })).filter(row=>Number.isFinite(row.value)&&row.value>0);
}
export function comparePercentChange(points:readonly LineData<UTCTimestamp>[]):number|null{
  if(points.length<2||points[0].value===0)return null;
  return (points[points.length-1].value/points[0].value-1)*100;
}
