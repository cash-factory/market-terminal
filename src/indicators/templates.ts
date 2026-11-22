import type {Frame} from "../market";
import {defaultStudies,parseStudies,type StudySettings} from "./studies";

export type ChartTemplate = {
  id:string;
  name:string;
  frame:Frame;
  showSma:boolean;
  studies:StudySettings;
};

const frames=new Set<Frame>(["1m","5m","15m","1h","4h","1d"]);
const cloneStudies=(source:Partial<StudySettings>):StudySettings=>({
  ...defaultStudies,...source
});
export const BUILTIN_TEMPLATES:readonly ChartTemplate[]=[
  {id:"builtin:clean",name:"Clean Price Action",frame:"1h",showSma:false,studies:cloneStudies({})},
  {id:"builtin:trend",name:"Trend Structure",frame:"1h",showSma:true,
    studies:cloneStudies({ema20:true})},
  {id:"builtin:momentum",name:"Momentum & Confirmation",frame:"15m",showSma:false,
    studies:cloneStudies({rsi14:true,macd:true})},
  {id:"builtin:volatility",name:"Volatility & Range",frame:"1h",showSma:false,
    studies:cloneStudies({bollinger20:true,atr14:true})},
  {id:"builtin:full",name:"Complete Study Workspace",frame:"4h",showSma:true,
    studies:cloneStudies({ema20:true,bollinger20:true,rsi14:true,macd:true,atr14:true})}
];
export function parseChartTemplates(value:unknown):ChartTemplate[]{
  if(!Array.isArray(value))return [];
  const out:ChartTemplate[]=[];
  const seen=new Set<string>();
  for(const item of value){
    if(!item||typeof item!=="object"||Array.isArray(item))continue;
    const t=item as Record<string,unknown>;
    if(typeof t.id!=="string"||t.id.length<1||t.id.length>120||t.id.startsWith("builtin:")||seen.has(t.id))continue;
    if(typeof t.name!=="string"||t.name.trim().length<1||t.name.length>80)continue;
    if(!frames.has(t.frame as Frame)||typeof t.showSma!=="boolean")continue;
    const template:ChartTemplate={
      id:t.id,name:t.name.trim(),frame:t.frame as Frame,showSma:t.showSma,
      studies:parseStudies(t.studies)
    };
    out.push(template);seen.add(template.id);
  }
  return out;
}
export function captureChartTemplate(
  id:string,name:string,frame:Frame,showSma:boolean,studies:StudySettings
):ChartTemplate {
  if(!id||id.startsWith("builtin:")||name.trim().length<1||name.trim().length>80||!frames.has(frame))
    throw new Error("Enter a valid template name (up to 80 characters).");
  return {id,name:name.trim(),frame,showSma,studies:{...studies}};
}
export function selectTemplate(id:string,saved:readonly ChartTemplate[]):ChartTemplate|null{
  const match=[...BUILTIN_TEMPLATES,...saved].find(template=>template.id===id);
  return match??null;
}
