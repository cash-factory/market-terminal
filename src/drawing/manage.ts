import type {Drawing} from "./types";
import {isDrawing,translateDrawing} from "./types";

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
export function updateDrawingAndGroup(drawings:readonly Drawing[],updated:Drawing,editKind?:"move"|"start"|"end"|"control"|"target"|"vertex",groupCandidates?:readonly Drawing[]):Drawing[]{
  const original=drawings.find(d=>d.id===updated.id);
  if(!original)throw new Error("This drawing no longer exists.");
  if(original.locked)throw new Error("Unlock the drawing before editing it.");
  if(updated.id!==original.id||updated.symbol!==original.symbol||
    (updated.source??"demo")!==(original.source??"demo")||updated.tool!==original.tool)
    throw new Error("A chart edit cannot change the drawing's identity or market source.");
  if(!isDrawing(updated))throw new Error("Edit was not saved: an anchor moved outside valid time or price coordinates.");
  const dt=updated.start.time-original.start.time;
  const dp=updated.start.price-original.start.price;
  const endDt=updated.end.time-original.end.time;
  const endDp=updated.end.price-original.end.price;
  const pureMove=editKind?editKind==="move":Math.abs(endDt-dt)<=1&&Math.abs(endDp-dp)<1e-8;
  if(!original.groupId||!pureMove)return drawings.map(d=>d.id===updated.id?updated:d);
  // A group is one visual object. Never move locked siblings or partially
  // commit a move that sends any anchor past time zero or below price zero.
  const peers=drawings.filter(d=>d.groupId===original.groupId);
  if(peers.some(d=>d.locked))
    throw new Error("Unlock every member of this group before moving it.");
  if(peers.some(d=>d.symbol!==original.symbol||(d.source??"demo")!==(original.source??"demo")))
    throw new Error("Cannot move a group spanning different symbols or sources.");
  if(groupCandidates!==undefined){
    // The overlay recovers each group's coordinates from the same visual delta
    // (rather than applying a fixed wall-clock time delta across session gaps).
    if(editKind!=="move")throw new Error("Group projection is only valid for whole-object moves.");
    const expected=new Set(peers.filter(d=>d.id!==original.id).map(d=>d.id));
    if(groupCandidates.length!==expected.size||new Set(groupCandidates.map(d=>d.id)).size!==expected.size||
      groupCandidates.some(d=>!expected.has(d.id)))
      throw new Error("Group move cancelled: not all member projections were supplied.");
    const candidates=new Map(groupCandidates.map(d=>[d.id,d]));
    for(const peer of peers){
      if(peer.id===original.id)continue;
      const next=candidates.get(peer.id);
      if(!next||next.tool!==peer.tool||next.symbol!==peer.symbol||
        (next.source??"demo")!==(peer.source??"demo")||
        next.groupId!==peer.groupId||!isDrawing(next))
        throw new Error("Group move cancelled: a member has invalid or mismatched coordinates.");
    }
    return drawings.map(d=>d.id===updated.id?updated:candidates.get(d.id)??d);
  }
  const changed=drawings.map(d=>{
    if(d.id===updated.id)return updated;
    if(d.groupId!==original.groupId)return d;
    return translateDrawing(d,
      {time:d.start.time+dt,price:d.start.price+dp},
      {time:d.end.time+dt,price:d.end.price+dp});
  });
  if(changed.some(d=>d.groupId===original.groupId&&!isDrawing(d)))
    throw new Error("Group move cancelled: one or more anchors would become invalid.");
  return changed;
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
