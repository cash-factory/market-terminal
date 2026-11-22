import type {ChartAnchor} from "../drawing/types";

export type PositionDirection="long-position"|"short-position";
export function defaultPositionTarget(
  direction:PositionDirection,entry:number,stop:number
):number|null{
  if(!Number.isFinite(entry)||!Number.isFinite(stop)||entry<=0||stop<=0||
    (direction==="long-position"?stop>=entry:stop<=entry))return null;
  return entry+(entry-stop)*2;
}
export function calculatePosition(
  direction:PositionDirection,
  entry:number,stop:number,target:number
):{
  riskDistance:number;rewardDistance:number;multiple:number;
  targetIsValid:boolean
}|null{
  if(![entry,stop,target].every(n=>Number.isFinite(n)&&n>0))return null;
  const riskDistance=direction==="long-position"?entry-stop:stop-entry;
  if(riskDistance<=0)return null;
  const rewardDistance=direction==="long-position"?target-entry:entry-target;
  const multiple=rewardDistance/riskDistance;
  return {riskDistance,rewardDistance,multiple,targetIsValid:multiple>0};
}
export function positionTargetAnchor(
  direction:PositionDirection,start:ChartAnchor,end:ChartAnchor
):ChartAnchor|undefined{
  const price=defaultPositionTarget(direction,start.price,end.price);
  return price===null||price<=0?undefined:{time:end.time,price};
}
