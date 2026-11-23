import type {ChartPoint} from "./geometry";
import {isDrawing,type ChartAnchor,type Drawing} from "./types";

/**
 * Translate *every* anchor in screen space, then recover its market coordinates.
 *
 * Time axes have discontinuities at weekends / missing candles, and price scales
 * may be nonlinear. Applying the first anchor's time/price delta to the rest
 * distorts multi-point patterns and brush strokes. Projecting each anchor and
 * moving it by the same pixel delta preserves the shape while dragging.
 *
 * The caller must supply an unsnapped inverse projection: OHLC magnets belong
 * on individual handle placement, not on whole-object moves.
 *
 * Fail atomically when an anchor cannot be projected or recovered. Never save
 * a partly translated object with invalid timestamps or prices.
 */
export function translateDrawingOnChart(
  drawing:Drawing,
  delta:ChartPoint,
  project:(anchor:ChartAnchor)=>ChartPoint|null,
  recover:(point:ChartPoint)=>ChartAnchor|null
):Drawing|null {
  if(drawing.locked||!Number.isFinite(delta.x)||!Number.isFinite(delta.y))return null;
  const shift=(anchor:ChartAnchor):ChartAnchor|null=>{
    const point=project(anchor);
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
    return recover({x:point.x+delta.x,y:point.y+delta.y});
  };
  const start=shift(drawing.start),end=shift(drawing.end);
  if(!start||!end)return null;
  let points:ChartAnchor[]|undefined;
  if(drawing.points){
    points=[];
    for(const anchor of drawing.points){
      const shifted=shift(anchor);
      if(!shifted)return null;
      points.push(shifted);
    }
  }
  const control=drawing.control?shift(drawing.control):undefined;
  if(drawing.control&&!control)return null;
  const target=drawing.target?shift(drawing.target):undefined;
  if(drawing.target&&!target)return null;
  const updated:Drawing={
    ...drawing,start,end,
    ...(points?{points}:{ }),
    ...(control?{control}:{ }),
    ...(target?{target}:{ })
  };
  return isDrawing(updated)?updated:null;
}
