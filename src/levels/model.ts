import {ALL_FRAMES,type Frame,type SymbolId} from "../market";
import type {Level} from "../workspace";

const SYMBOLS=["EURUSD","BTCUSDT","AAPL","US100"] as const;
export const LEVEL_LINE_STYLES=[
  {value:0,label:"Solid"},{value:1,label:"Dotted"},
  {value:2,label:"Dashed"},{value:3,label:"Long dashes"}
] as const;

export function parseLevel(input:unknown):Level|null{
  if(!input||typeof input!=="object"||Array.isArray(input))return null;
  const row=input as Record<string,unknown>;
  if(typeof row.id!=="string"||!row.id.trim()||row.id.length>128||
    !SYMBOLS.includes(row.symbol as SymbolId)||
    typeof row.price!=="number"||!Number.isFinite(row.price)||row.price<=0)return null;
  const frames=Array.isArray(row.visibleOnFrames)&&
    row.visibleOnFrames.length<=ALL_FRAMES.length&&
    row.visibleOnFrames.every(frame=>ALL_FRAMES.includes(frame as Frame))&&
    new Set(row.visibleOnFrames).size===row.visibleOnFrames.length?
      row.visibleOnFrames as Frame[]:undefined;
  return {
    id:row.id,symbol:row.symbol as SymbolId,price:row.price,
    color:typeof row.color==="string"&&/^#[0-9a-f]{6}$/i.test(row.color)?
      row.color:"#8d94fa",
    ...(row.source==="demo"||row.source==="binance"?{source:row.source}:{}),
    ...(Number.isInteger(row.lineWidth)&&Number(row.lineWidth)>=1&&Number(row.lineWidth)<=4?
      {lineWidth:row.lineWidth as 1|2|3|4}:{}),
    ...(Number.isInteger(row.lineStyle)&&Number(row.lineStyle)>=0&&Number(row.lineStyle)<=3?
      {lineStyle:row.lineStyle as 0|1|2|3}:{}),
    ...(typeof row.title==="string"&&row.title.length<=40?{title:row.title}:{}),
    ...(typeof row.axisLabelVisible==="boolean"?{axisLabelVisible:row.axisLabelVisible}:{}),
    ...(typeof row.hidden==="boolean"?{hidden:row.hidden}:{}),
    ...(frames?{visibleOnFrames:[...frames]}:{})
  };
}
export function isValidLevel(value:unknown):value is Level{
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const raw=value as Record<string,unknown>;
  if(!Object.keys(raw).every(key=>[
    "id","symbol","price","color","source","lineWidth","lineStyle","title",
    "axisLabelVisible","hidden","visibleOnFrames"
  ].includes(key)))return false;
  const parsed=parseLevel(value);
  if(!parsed)return false;
  const props=Object.keys(raw);
  return props.length===Object.keys(parsed).length&&props.every(key=>
    JSON.stringify(raw[key])===JSON.stringify((parsed as unknown as Record<string,unknown>)[key]));
}
export function levelVisibleAtFrame(level:Level,frame:Frame):boolean{
  return level.hidden!==true&&
    (level.visibleOnFrames===undefined||level.visibleOnFrames.includes(frame));
}
