import {FIBONACCI_LEVELS,type Drawing,type ToolLevel,type MeasurementParts} from "./types";
import {FIB_EXTENSION_LEVELS} from "./multiAnchor";

export const CIRCLE_RATIOS=[.236,.382,.5,.618,.786,1,1.272,1.618] as const;
export const FORK_RATIOS=[.5,1,1.5,2] as const;
export const MEASUREMENT_DEFAULTS:MeasurementParts={
  price:true,percent:true,bars:true,elapsed:true
};

export function effectiveLevels(drawing:Drawing):ToolLevel[]{
  if(drawing.fibLevels)return drawing.fibLevels;
  const ratios=drawing.tool==="fib-extension"?FIB_EXTENSION_LEVELS:
    drawing.tool==="fib-circles"?CIRCLE_RATIOS:FIBONACCI_LEVELS;
  return [...ratios].map(ratio=>({ratio,visible:true,color:drawing.color}));
}

export function effectiveForkRatios(drawing:Drawing):number[]{
  return drawing.forkLevels??[1];
}

export function measurementSegments(
 drawing:Drawing, observedBars:number,elapsed:string,precision:number
):{kind:keyof MeasurementParts;label:string}[]{
  const selected=drawing.showMeasurements??MEASUREMENT_DEFAULTS;
  const change=drawing.end.price-drawing.start.price;
  const sign=change>0?"+":"";
  const parts:{kind:keyof MeasurementParts;label:string}[]=[
    {kind:"price",label:sign+change.toFixed(precision)},
    {kind:"percent",label:sign+(change/drawing.start.price*100).toFixed(2)+"%"},
    {kind:"bars",label:observedBars+" observed bars"},
    {kind:"elapsed",label:elapsed}
  ];
  return parts.filter(item=>selected[item.kind]);
}

export function formatFibLabel(
 ratio:number,price:number,precision:number,mode:Drawing["labelMode"]
):string{
  const percent=(ratio*100).toFixed(1)+"%";
  if(mode==="ratio")return percent;
  if(mode==="price")return price.toFixed(precision);
  return percent+" · "+price.toFixed(precision);
}
