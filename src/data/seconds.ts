import type { Candle } from "./contracts";
import {INTERVAL_MS,normalizeCandles} from "./contracts";

/**
 * Aggregate observed one-second venue klines into requested UTC seconds buckets.
 * Never repeat or interpolate a missing second. Candle open/close are from the
 * first/last observed one-second candles within each bucket.
 * Partial active buckets remain provisional until their final second arrives.
 */
export function aggregateSeconds(
  rows:readonly Candle[],frame:"1s"|"5s"|"10s"|"15s"|"30s"|"45s"
):Candle[]{
  const valid=normalizeCandles(rows);
  if(frame==="1s")return valid;
  const duration=INTERVAL_MS[frame];
  const groups=new Map<number,Candle>();
  for(const row of valid){
    // Refuse to misrepresent minute candles as second bars.
    if(row.openTimeMs%1_000!==0)continue;
    const bucket=Math.floor(row.openTimeMs/duration)*duration;
    const old=groups.get(bucket);
    if(!old){
      groups.set(bucket,{...row,openTimeMs:bucket,
        isFinal:row.isFinal && row.openTimeMs+1_000===bucket+duration});
    }else{
      groups.set(bucket,{
        ...old,high:Math.max(old.high,row.high),low:Math.min(old.low,row.low),
        close:row.close,
        volume:old.volume===undefined||row.volume===undefined?undefined:old.volume+row.volume,
        isFinal:row.isFinal && row.openTimeMs+1_000===bucket+duration
      });
    }
  }
  return [...groups.values()];
}

/** Binance publishes native 1s and standard minute+ streams, not native 5/10/15/30/45s. */
export function nativeBinanceInterval(frame:string):string{
  return frame.endsWith("s")?"1s":frame;
}
