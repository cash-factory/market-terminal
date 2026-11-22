import type {CandlestickData,UTCTimestamp} from "lightweight-charts";

type Bar=CandlestickData<UTCTimestamp>;
/** Maps a source crosshair timestamp to the closest *observed* target bar.
 * The caller never invents a target timestamp from continuous-wall-clock assumptions.
 */
export function nearestCrosshairBar(bars:readonly Bar[],timestamp:number):Bar|null{
  if(!Number.isFinite(timestamp)||!bars.length)return null;
  const first=Number(bars[0].time),last=Number(bars[bars.length-1].time);
  if(timestamp<first||timestamp>last)return null;
  let lo=0,hi=bars.length-1;
  while(lo<hi){
    const mid=(lo+hi)>>1;
    if(Number(bars[mid].time)<timestamp)lo=mid+1;else hi=mid;
  }
  if(lo>0 && Math.abs(Number(bars[lo-1].time)-timestamp)
    <=Math.abs(Number(bars[lo].time)-timestamp))lo--;
  return bars[lo];
}
