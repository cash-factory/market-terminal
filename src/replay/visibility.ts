import type {Drawing} from "../drawing/types";
/** A historical replay must not display a multi-anchor drawing with unseen future anchors. */
export function drawingVisibleInReplay(drawing:Drawing,lastObservedTime:number):boolean{
 const anchors=[drawing.start,drawing.end,...(drawing.points??[]),
    ...(drawing.control?[drawing.control]:[]),...(drawing.target?[drawing.target]:[])];
 return Number.isFinite(lastObservedTime)&&anchors.every(point=>point.time<=lastObservedTime);
}
