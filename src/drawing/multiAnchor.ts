import type { ChartAnchor, Drawing, DrawingTool } from "./types";

export const MULTI_POINT_COUNTS: Partial<Record<DrawingTool,3|4|5|6>>={
  "pitchfork":3,"fib-extension":3,"triangle":3,
  "pattern-abcd":4,"pattern-xabcd":5,"elliott-impulse":6,
};

export function requiresMultiPoint(tool:DrawingTool):boolean{
  return tool in MULTI_POINT_COUNTS;
}
export function multiPointCount(tool:DrawingTool):number{
  return MULTI_POINT_COUNTS[tool]??2;
}
export function isCompleteMultiPointDrawing(drawing:Drawing):boolean{
  const expected=MULTI_POINT_COUNTS[drawing.tool];
  if(!expected)return true;
  if(!Array.isArray(drawing.points)||drawing.points.length!==expected||
     !drawing.points[0]||!drawing.points[1])return false;
  return drawing.points[0].time===drawing.start.time&&
    drawing.points[0].price===drawing.start.price&&
    drawing.points[1].time===drawing.end.time&&
    drawing.points[1].price===drawing.end.price;
}

export function addMultiPointAnchor(
  anchors:readonly ChartAnchor[],next:ChartAnchor,required:number
):{points:ChartAnchor[];complete:boolean}{
  if(!Number.isSafeInteger(required)||required<3||required>6||
     anchors.length<2||anchors.length>=required)
    throw new Error("Invalid multi-anchor drawing stage.");
  const points=[...anchors,next];
  return {points,complete:points.length===required};
}

export const FIB_EXTENSION_LEVELS=[0,.382,.618,1,1.272,1.618,2,2.618] as const;
export const FIB_TIME_SEQUENCE=[0,1,2,3,5,8,13,21,34] as const;

export function fibExtensionPrices(a:number,b:number,c:number):number[]{
  if(![a,b,c].every(Number.isFinite))return [];
  return FIB_EXTENSION_LEVELS.map(level=>c+(b-a)*level);
}
export function patternPriceRatios(points:readonly ChartAnchor[]):{
  legs:number[];ratio:number|null
}{
  const legs=points.slice(1).map((point,index)=>Math.abs(point.price-points[index].price));
  return {legs,ratio:legs.length>=3&&legs[0]>0?legs[2]/legs[0]:null};
}
