import {isDrawing,type ChartAnchor,type Drawing,type DrawingTool} from "./types";
import {TOOL_BY_ID,ONE_ANCHOR_TOOLS} from "./toolDefinitions";
import {multiPointCount,requiresMultiPoint} from "./multiAnchor";

const FIELDS=[
  "color","strokeWidth","dash","opacity","fillOpacity","showMidline",
  "showLabels","visibleOnFrames","fibLevels","forkLevels","labelMode",
  "gridDivisions","regressionDeviation","markerDirection","fontSize","showMeasurements","projection"
] as const;
export type ToolPreset=Partial<Pick<Drawing,typeof FIELDS[number]>>;
export type ToolPresets=Partial<Record<DrawingTool,ToolPreset>>;

const clonePreset=(preset:ToolPreset):ToolPreset=>({
  ...preset,
  ...(preset.fibLevels?{fibLevels:preset.fibLevels.map(item=>({...item}))}:{}),
  ...(preset.forkLevels?{forkLevels:[...preset.forkLevels]}:{}),
  ...(preset.visibleOnFrames?{visibleOnFrames:[...preset.visibleOnFrames]}:{}),
  ...(preset.showMeasurements?{showMeasurements:{...preset.showMeasurements}}:{})
});

export function presetFromDrawing(drawing:Drawing):ToolPreset{
  const subset:Record<string,unknown>={};
  for(const key of FIELDS){
    if(drawing[key]!==undefined)subset[key]=drawing[key];
  }
  return clonePreset(subset as ToolPreset);
}
function validPreset(tool:DrawingTool,input:unknown):ToolPreset|null{
  if(!input||typeof input!=="object"||Array.isArray(input))return null;
  const raw=input as Record<string,unknown>;
  if(Object.keys(raw).some(key=>!FIELDS.includes(key as typeof FIELDS[number])))
    return null;
  const start:ChartAnchor={time:1700000000,price:100};
  const end:ChartAnchor=ONE_ANCHOR_TOOLS.has(tool)?start:{time:1700000300,price:102};
  const count=requiresMultiPoint(tool)?multiPointCount(tool):0;
  const points=count?Array.from({length:count},(_,i)=>i===0?start:i===1?end:
    {time:1700000300+i*300,price:100+i}):undefined;
  const sample:Drawing={
    id:"validation",symbol:"EURUSD",source:"demo",tool,color:"#8899aa",locked:false,
    start,end,...(tool==="channel"?{control:{time:1700000500,price:104}}:{}),
    ...(points?{points}:{}),
    ...raw
  } as Drawing;
  if(!isDrawing(sample))return null;
  return clonePreset(Object.fromEntries(Object.keys(raw).map(key=>[key,sample[key as keyof ToolPreset]])) as ToolPreset);
}

export function parseToolPresets(input:unknown):ToolPresets{
  if(!input||typeof input!=="object"||Array.isArray(input))return {};
  const raw=input as Record<string,unknown>;
  const out:ToolPresets={};
  for(const [key,value] of Object.entries(raw).slice(0,100)){
    if(!TOOL_BY_ID.has(key as DrawingTool))continue;
    const preset=validPreset(key as DrawingTool,value);
    if(preset)out[key as DrawingTool]=preset;
  }
  return out;
}
export function applyToolPreset(drawing:Drawing,preset?:ToolPreset):Drawing{
  if(!preset)return drawing;
  const next:Drawing={...drawing,...clonePreset(preset)};
  return isDrawing(next)?next:drawing;
}
