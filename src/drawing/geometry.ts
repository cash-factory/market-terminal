import type { CandlestickData, UTCTimestamp } from "lightweight-charts";

type Bar = CandlestickData<UTCTimestamp>;
/**
 * A price chart spaces *observed bars* evenly even if timestamps skip weekends
 * or trading halts. Interpolate over the actual adjacent observed timestamps;
 * never assume the entire history forms a continuous wall-clock time series.
 *
 * In unsampled future/past space, use the selected timeframe as an extrapolation
 * interval; do not treat those points as verified market sessions.
 */
function stepSeconds(fallback:number,bars:readonly Bar[]):number {
  if(Number.isFinite(fallback)&&fallback>0) return fallback;
  if(bars.length>1){
    const delta=Number(bars[1].time)-Number(bars[0].time);
    if(Number.isFinite(delta)&&delta>0)return delta;
  }
  return 60;
}

export function timeFromLogical(
  logical:number,bars:readonly Bar[],fallbackStepSeconds:number
):number|null{
  if(!Number.isFinite(logical)||bars.length===0)return null;
  const step=stepSeconds(fallbackStepSeconds,bars);
  let value:number;
  if(logical<0)value=Number(bars[0].time)+logical*step;
  else if(logical>=bars.length-1){
    value=Number(bars[bars.length-1].time)+(logical-(bars.length-1))*step;
  }else{
    const left=Math.floor(logical),fraction=logical-left;
    const start=Number(bars[left].time),end=Number(bars[left+1].time);
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return null;
    value=start+(end-start)*fraction;
  }
  return Number.isSafeInteger(Math.round(value))&&value>=0?Math.round(value):null;
}

export function logicalFromTime(
  timestamp:number,bars:readonly Bar[],fallbackStepSeconds:number
):number|null{
  if(!Number.isSafeInteger(timestamp)||timestamp<0||!bars.length)return null;
  const step=stepSeconds(fallbackStepSeconds,bars);
  const first=Number(bars[0].time),last=Number(bars[bars.length-1].time);
  if(timestamp<first)return(timestamp-first)/step;
  if(timestamp>=last)return bars.length-1+(timestamp-last)/step;
  let lo=0,hi=bars.length-1;
  while(lo+1<hi){
    const mid=(lo+hi)>>>1;
    if(Number(bars[mid].time)<=timestamp)lo=mid;else hi=mid;
  }
  const a=Number(bars[lo].time),b=Number(bars[hi].time);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)return null;
  return lo+(timestamp-a)/(b-a);
}

export function intervalSeconds(bars:readonly Bar[],fallbackStepSeconds:number):number{
  return stepSeconds(fallbackStepSeconds,bars);
}

export type ChartPoint={x:number;y:number};
export function pointerDistance(from:ChartPoint,to:ChartPoint):number{
  return Math.hypot(from.x-to.x,from.y-to.y);
}
export function inChartPlot(point:ChartPoint,plotWidth:number,plotHeight:number):boolean{
  return point.x>=0&&point.x<plotWidth&&point.y>=0&&point.y<plotHeight;
}
