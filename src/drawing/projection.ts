import type {ChartPoint} from "./geometry";
import type {PlotSize} from "./precision";
import {clippedExtendedLine} from "./precision";
import {rayEndpoint} from "./snap";
export type ProjectionMode="segment"|"left"|"right"|"both";
export function projectedSegment(a:ChartPoint,b:ChartPoint,plot:PlotSize,mode:ProjectionMode):{
  start:ChartPoint;end:ChartPoint
}|null{
  if(![a.x,a.y,b.x,b.y,plot.width,plot.height].every(Number.isFinite))return null;
  if(Math.hypot(b.x-a.x,b.y-a.y)<.01)return null;
  if(mode==="both")return clippedExtendedLine(a,b,plot);
  if(mode==="right")return {start:a,end:rayEndpoint(a,b,plot.width,plot.height)};
  if(mode==="left")return {start:rayEndpoint(b,a,plot.width,plot.height),end:b};
  return {start:a,end:b};
}
