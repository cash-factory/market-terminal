import type {Drawing} from "./types";
import {translateDrawing} from "./types";

export function groupDrawings(drawings:readonly Drawing[],ids:readonly string[],groupId:string):Drawing[]{
  if(!groupId||ids.length<2)throw new Error("Select at least two drawings to group.");
  const selection=new Set(ids);
  const chosen=drawings.filter(d=>selection.has(d.id));
  if(chosen.length<2)throw new Error("Select at least two drawings to group.");
  const first=chosen[0],source=first.source??"demo";
  if(chosen.some(d=>d.symbol!==first.symbol||(d.source??"demo")!==source))
    throw new Error("Only drawings on the same symbol and quote source can be grouped.");
  return drawings.map(d=>selection.has(d.id)?{...d,groupId}:d);
}
export function ungroupDrawings(drawings:readonly Drawing[],ids:readonly string[]):Drawing[]{
  const selection=new Set(ids);
  return drawings.map(d=>selection.has(d.id)?{...d,groupId:undefined}:d);
}
export function updateDrawingAndGroup(drawings:readonly Drawing[],updated:Drawing,editKind?:"move"|"start"|"end"):Drawing[]{
  const original=drawings.find(d=>d.id===updated.id);
  if(!original)return [...drawings];
  const dt=updated.start.time-original.start.time;
  const dp=updated.start.price-original.start.price;
  const endDt=updated.end.time-original.end.time;
  const endDp=updated.end.price-original.end.price;
  const pureMove=editKind?editKind==="move":Math.abs(endDt-dt)<=1&&Math.abs(endDp-dp)<1e-8;
  if(!original.groupId||!pureMove) return drawings.map(d=>d.id===updated.id?updated:d);
  return drawings.map(d=>{
    if(d.id===updated.id)return updated;
    if(d.groupId!==original.groupId)return d;
    return translateDrawing(d,
      {time:d.start.time+dt,price:d.start.price+dp},
      {time:d.end.time+dt,price:d.end.price+dp});
  });
}
export type DrawingStylePatch=Pick<Drawing,"color"|"strokeWidth"|"dash"|"opacity">;
export function styleDrawings(
  drawings:readonly Drawing[],ids:readonly string[],patch:Partial<DrawingStylePatch>
):Drawing[]{
  const select=new Set(ids);
  return drawings.map(d=>select.has(d.id)?{...d,...patch}:d);
}
/** Move selected objects a single step as a block in visual stacking order.
 * Drawing SVG order is bottom -> top, and list order is saved in the workspace.
 */
export function moveDrawingLayers(
  drawings:readonly Drawing[],ids:readonly string[],direction:"forward"|"backward"
):Drawing[]{
  const next=[...drawings],selected=new Set(ids);
  if(direction==="forward"){
    for(let i=next.length-2;i>=0;i--){
      if(selected.has(next[i].id)&&!selected.has(next[i+1].id)){
        [next[i],next[i+1]]=[next[i+1],next[i]];
      }
    }
  }else{
    for(let i=1;i<next.length;i++){
      if(selected.has(next[i].id)&&!selected.has(next[i-1].id)){
        [next[i],next[i-1]]=[next[i-1],next[i]];
      }
    }
  }
  return next;
}
