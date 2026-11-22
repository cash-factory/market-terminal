import { isDrawing, type ChartAnchor, type Drawing } from "./types";
import type { Frame } from "../market";

export const AVAILABLE_FRAMES: Frame[]=["1m","5m","15m","1h","4h","1d"];

export type DrawingAnchorKey="start"|"end"|"control"|"target";

export function isDrawingVisibleAtFrame(drawing:Drawing,frame:Frame):boolean{
  return !drawing.hidden&&
    (drawing.visibleOnFrames===undefined||drawing.visibleOnFrames.includes(frame));
}

/** UTC is explicit: datetime-local inputs have no timezone semantics of their own. */
export function formatAnchorUtc(seconds:number):string{
  return new Date(seconds*1000).toISOString().slice(0,16);
}
export function parseAnchorUtc(value:string):number|null{
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;
  const date=Date.parse(value+":00Z");
  if(!Number.isFinite(date))return null;
  const result=Math.round(date/1000);
  return Number.isSafeInteger(result)&&result>=0&&
    formatAnchorUtc(result)===value?result:null;
}

/** Editing the first or second pattern anchor also updates the corresponding path point. */
export function editDrawingAnchor(
  drawing:Drawing,kind:DrawingAnchorKey,next:ChartAnchor
):Drawing{
  if(!Number.isSafeInteger(next.time)||next.time<0||
      !Number.isFinite(next.price)||next.price<=0)
    throw new Error("Anchor time must be valid UTC and price must be positive.");
  const points=drawing.points?.map(point=>({...point}));
  if(kind==="start"&&points?.length)points[0]=next;
  if(kind==="end"&&points&&points.length>1)points[1]=next;
  return {...drawing,[kind]:next,...(points?{points}:{})};
}

export function editPatternPoint(drawing:Drawing,index:number,next:ChartAnchor):Drawing{
  if(!drawing.points||index<0||index>=drawing.points.length||
     !Number.isSafeInteger(index))
    throw new Error("No such drawing point.");
  const points=drawing.points.map((point,i)=>i===index?next:point);
  const updated={...drawing,points,...(index===0?{start:next}:{}),
    ...(index===1?{end:next}:{})};
  if(!isDrawing(updated))throw new Error("Invalid drawing coordinate.");
  return updated;
}

export function validateDrawingSettings(original:Drawing,proposed:Drawing):Drawing{
  if(original.id!==proposed.id||original.tool!==proposed.tool||
     original.symbol!==proposed.symbol||
     (original.source??"demo")!==(proposed.source??"demo"))
    throw new Error("Object identity and market provenance cannot be changed in settings.");
  if(!isDrawing(proposed))throw new Error("Invalid drawing settings: verify style, coordinates and visibility.");
  return proposed;
}
