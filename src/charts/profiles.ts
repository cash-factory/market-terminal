import type { Workspace } from "../workspace";
import type { Frame, SymbolId } from "../market";
import { parseChartDisplayStyle } from "./display";
import { parseStudies } from "../indicators/studies";
import { parseStudyParameters } from "../indicators/parameters";
import { parseCustomStudies } from "../indicators/formula";

export type ProfileSettings = Pick<Workspace,
  "symbol"|"frame"|"priceSource"|"chartLayout"|"chartDisplayStyle"|
  "secondarySymbol"|"tertiarySymbol"|"quaternarySymbol"|
  "secondaryFrame"|"tertiaryFrame"|"quaternaryFrame"|
  "secondarySource"|"tertiarySource"|"quaternarySource"|
  "linkCrosshairs"|"linkTimeRanges"|"showSma"|"studies"|
  "studyParameters"|"customStudies"|"magnetEnabled">;
export type ChartProfile = {
  id: string;
  name: string;
  createdAtMs: number;
  settings: ProfileSettings;
};
const symbolIds: readonly SymbolId[]=["EURUSD","BTCUSDT","AAPL","US100"];
const frames: readonly Frame[]=["1m","5m","15m","1h","4h","1d"];
function record(value:unknown):value is Record<string,unknown>{
  return value!==null && typeof value==="object"&&!Array.isArray(value);
}
function sym(value:unknown):SymbolId|null{
  return symbolIds.includes(value as SymbolId)?value as SymbolId:null;
}
function frame(value:unknown):Frame|null{
  return frames.includes(value as Frame)?value as Frame:null;
}
function source(value:unknown,symbol:SymbolId):"demo"|"binance"{
  return value==="binance"&&symbol==="BTCUSDT"?"binance":"demo";
}

/** Profile data is separately validated and cannot write arbitrary workspace fields. */
export function parseProfileSettings(value:unknown):ProfileSettings|null{
  if(!record(value))return null;
  const primary=sym(value.symbol),secondary=sym(value.secondarySymbol),
    tertiary=sym(value.tertiarySymbol),fourth=sym(value.quaternarySymbol);
  const mainFrame=frame(value.frame),secondFrame=frame(value.secondaryFrame),
    thirdFrame=frame(value.tertiaryFrame),fourthFrame=frame(value.quaternaryFrame);
  if(!primary||!secondary||!tertiary||!fourth||
    !mainFrame||!secondFrame||!thirdFrame||!fourthFrame)return null;
  if(value.chartLayout!=="single"&&value.chartLayout!=="dual"&&value.chartLayout!=="quad")
    return null;
  return {
    symbol:primary,frame:mainFrame,priceSource:source(value.priceSource,primary),
    chartLayout:value.chartLayout,
    chartDisplayStyle:parseChartDisplayStyle(value.chartDisplayStyle),
    secondarySymbol:secondary,tertiarySymbol:tertiary,quaternarySymbol:fourth,
    secondaryFrame:secondFrame,tertiaryFrame:thirdFrame,quaternaryFrame:fourthFrame,
    secondarySource:source(value.secondarySource,secondary),
    tertiarySource:source(value.tertiarySource,tertiary),
    quaternarySource:source(value.quaternarySource,fourth),
    linkCrosshairs:value.linkCrosshairs===true,
    linkTimeRanges:value.linkTimeRanges===true,
    showSma:value.showSma===true,
    magnetEnabled:value.magnetEnabled===true,
    studies:parseStudies(value.studies),
    studyParameters:parseStudyParameters(value.studyParameters),
    customStudies:parseCustomStudies(value.customStudies)
  };
}
export function captureProfileSettings(w:Workspace):ProfileSettings{
  const settings:ProfileSettings={
    symbol:w.symbol,frame:w.frame,priceSource:w.priceSource,
    chartLayout:w.chartLayout,chartDisplayStyle:w.chartDisplayStyle,
    secondarySymbol:w.secondarySymbol,tertiarySymbol:w.tertiarySymbol,
    quaternarySymbol:w.quaternarySymbol,
    secondaryFrame:w.secondaryFrame,tertiaryFrame:w.tertiaryFrame,
    quaternaryFrame:w.quaternaryFrame,
    secondarySource:w.secondarySource,tertiarySource:w.tertiarySource,
    quaternarySource:w.quaternarySource,
    linkCrosshairs:w.linkCrosshairs,linkTimeRanges:w.linkTimeRanges,
    showSma:w.showSma,magnetEnabled:w.magnetEnabled,
    studies:{...w.studies},
    studyParameters:{...w.studyParameters},
    customStudies:w.customStudies.map(study=>({...study}))
  };
  return settings;
}
export function createChartProfile(
  id:string,name:string,w:Workspace,atMs:number
):ChartProfile{
  if(!id.startsWith("profile:")||id.length>128)
    throw new Error("Invalid chart profile ID.");
  if(!name.trim()||name.trim().length>80)
    throw new Error("Give the chart setup a name of 1–80 characters.");
  if(!Number.isSafeInteger(atMs)||atMs<0)
    throw new Error("Invalid chart profile timestamp.");
  return {id,name:name.trim(),createdAtMs:atMs,settings:captureProfileSettings(w)};
}
export function parseChartProfiles(value:unknown):ChartProfile[]{
  if(!Array.isArray(value))return [];
  const ids=new Set<string>(),profiles:ChartProfile[]=[];
  for(const entry of value){
    if(!record(entry) || typeof entry.id!=="string" ||
      !entry.id.startsWith("profile:")||entry.id.length>128||ids.has(entry.id)||
      typeof entry.name!=="string"||!entry.name.trim()||entry.name.length>80||
      typeof entry.createdAtMs!=="number"||!Number.isSafeInteger(entry.createdAtMs)||
      entry.createdAtMs<0)continue;
    const settings=parseProfileSettings(entry.settings);
    if(!settings)continue;
    ids.add(entry.id);
    profiles.push({id:entry.id,name:entry.name.trim(),createdAtMs:entry.createdAtMs,settings});
  }
  return profiles;
}
/** Restores only chart-related settings; intentionally leaves journal/risk,
 * saved drawings, alerts, chart profile library, user preferences untouched. */
export function applyChartProfile(w:Workspace,profile:ChartProfile):Workspace{
  const settings=parseProfileSettings(profile.settings);
  if(!settings)throw new Error("Chart profile has invalid settings.");
  return {...w,...settings};
}
export function profileSubtitle(p:ChartProfile):string{
  const s=p.settings;
  return (s.chartLayout==="single"?"1":s.chartLayout==="dual"?"2":"4")+
    " charts · "+s.chartDisplayStyle+" · "+s.frame;
}
