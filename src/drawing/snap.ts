import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import type { ChartAnchor } from "./types";
import type { ChartPoint } from "./geometry";

/** A deterministic OHLC magnet. Never move the anchor unless BOTH axes are
 * within a pixel tolerance of the same historical candle's OHLC point.
 * This is source-independent: use only the candles currently visible to a chart.
 */
export type SnapResult = {
  anchor: ChartAnchor;
  snapped: boolean;
  field: "open" | "high" | "low" | "close" | null;
};
type Bar = CandlestickData<UTCTimestamp>;

export function nearestCandleIndex(candles: readonly Bar[], timestamp: number): number {
  if (!candles.length || !Number.isFinite(timestamp)) return -1;
  let left = 0, right = candles.length - 1;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (Number(candles[middle].time) < timestamp) left = middle + 1;
    else right = middle;
  }
  if (left > 0 && Math.abs(Number(candles[left-1].time)-timestamp) <
    Math.abs(Number(candles[left].time)-timestamp)) return left - 1;
  return left;
}
export function snapAnchorToOhlc(
  anchor: ChartAnchor,
  point: ChartPoint,
  candles: readonly Bar[],
  timeToX: (time: number) => number | null,
  priceToY: (price: number) => number | null,
  tolerancePx = 14
): SnapResult {
  const none: SnapResult = {anchor, snapped:false, field:null};
  if (!Number.isFinite(tolerancePx) || tolerancePx <= 0 || !candles.length) return none;
  const center = nearestCandleIndex(candles, anchor.time);
  if (center < 0) return none;
  const bar = candles[center];
  const x = timeToX(Number(bar.time));
  if (x === null || !Number.isFinite(x) || Math.abs(point.x-x) > tolerancePx) return none;

  const fields = ["open","high","low","close"] as const;
  let best: SnapResult = none;
  let closest = tolerancePx;
  for (const field of fields) {
    const price = bar[field];
    const y = priceToY(price);
    if (y === null || !Number.isFinite(y)) continue;
    const distance = Math.hypot(point.x-x,point.y-y);
    if (distance <= closest) {
      closest = distance;
      best = {anchor:{time:Number(bar.time),price},snapped:true,field};
    }
  }
  return best;
}

/** End of a ray projected from A through B and out to the chart boundary.
 * The ray begins at A and never extends in the reverse direction.
 */
export function rayEndpoint(
  a:ChartPoint,b:ChartPoint,width:number,height:number
):ChartPoint {
  const dx=b.x-a.x,dy=b.y-a.y;
  const candidates:number[]=[];
  if (dx>1e-6) candidates.push((width-a.x)/dx);
  if (dx< -1e-6) candidates.push((0-a.x)/dx);
  if (dy>1e-6) candidates.push((height-a.y)/dy);
  if (dy< -1e-6) candidates.push((0-a.y)/dy);
  const positive=candidates.filter(t=>Number.isFinite(t)&&t>=1);
  const t=positive.length?Math.min(...positive):1;
  return {x:a.x+dx*t,y:a.y+dy*t};
}
export function measurement(start:ChartAnchor,end:ChartAnchor,stepSeconds:number){
  const delta=end.price-start.price;
  return {
    change:delta,
    percent:delta/start.price*100,
    bars:stepSeconds>0?Math.round(Math.abs(end.time-start.time)/stepSeconds):0
  };
}
