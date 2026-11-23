import {describe,expect,it} from "vitest";
import {TOOL_DEFINITIONS,ONE_ANCHOR_TOOLS,filterDrawingTools} from "./toolDefinitions";
import {isDrawing,translateDrawing,type Drawing,type DrawingTool} from "./types";
import {requiresMultiPoint,multiPointCount} from "./multiAnchor";
import {validateDrawingSettings,isDrawingVisibleAtFrame} from "./drawingSettings";
import {applyToolPreset,presetFromDrawing} from "./toolPresets";
import {defaultPositionSettings} from "../analysis/positionMetrics";
import {defaultPositionTarget} from "../analysis/positionDrawing";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";

const fixture=(tool:DrawingTool):Drawing=>{
 const start={time:1700000000,price:100};
 const end=ONE_ANCHOR_TOOLS.has(tool)?start:
   {time:1700003600,price:tool==="short-position"?105:95};
 const count=requiresMultiPoint(tool)?multiPointCount(tool):0;
 const points=count?Array.from({length:count},(_,i)=>i===0?start:i===1?end:
   {time:end.time+i*3600,price:90+i*3}):
   tool==="brush"||tool==="highlighter"?[start,end]:undefined;
 const target=tool==="long-position"||tool==="short-position"?
   {time:end.time,price:defaultPositionTarget(tool,start.price,end.price)!}:undefined;
 return {id:"contract:"+tool,symbol:"EURUSD",source:"demo",tool,start,end,
   color:"#6688aa",locked:false,
   ...(points?{points}:{}),
   ...(tool==="channel"?{control:{time:end.time+3600,price:102}}:{}),
   ...(target?{target,positionSettings:defaultPositionSettings("EURUSD")}:{}),
 };
};
describe("all implemented drawing tools share safe lifecycle contracts",()=>{
 it("every selectable drawing tool has a valid identity, geometry, persistence and editable settings",()=>{
   const ids=TOOL_DEFINITIONS.map(def=>def.id);
   expect(new Set(ids).size).toBe(ids.length);
   const drawings=ids.map(tool=>{
     const d=fixture(tool);
     expect(isDrawing(d),tool+" must have valid anchors").toBe(true);
     expect(filterDrawingTools(TOOL_DEFINITIONS.find(t=>t.id===tool)!.label)
       .some(t=>t.id===tool),tool+" must be searchable").toBe(true);
     expect(isDrawingVisibleAtFrame(d,"1h")).toBe(true);
     expect(isDrawingVisibleAtFrame({...d,visibleOnFrames:["5m"]},"1h")).toBe(false);
     const edited=validateDrawingSettings(d,{...d,color:"#7799bb",strokeWidth:3,showLabels:false});
     expect(edited.color).toBe("#7799bb");
     expect(()=>validateDrawingSettings(d,{...edited,symbol:"BTCUSDT"})).toThrow(/provenance/);
     const moved=translateDrawing(d,{time:d.start.time+7200,price:d.start.price+10},
       {time:d.end.time+7200,price:d.end.price+10});
     expect(isDrawing(moved),tool+" translated geometry must remain valid").toBe(true);
     if(d.target)expect(moved.target?.price).toBe(d.target.price+10);
     if(d.control)expect(moved.control?.time).toBe(d.control.time+7200);
     if(d.points)expect(moved.points?.[0].time).toBe(d.points[0].time+7200);
     const preset=presetFromDrawing(edited);
     expect(preset).not.toHaveProperty("start");
     expect(preset).not.toHaveProperty("source");
     expect(applyToolPreset(d,preset).strokeWidth).toBe(3);
     return d;
   });
   const ws={...defaultWorkspace,drawings};
   expect(parseWorkspace(JSON.parse(serializeWorkspace(ws))).drawings).toEqual(drawings);
 });
 it("position assumptions are validated and independently cloned by tool presets",()=>{
   const long=fixture("long-position"),short=fixture("short-position");
   expect(isDrawing({...long,positionSettings:{...long.positionSettings!,feeBps:-1}})).toBe(false);
   expect(isDrawing({...long,positionSettings:{...long.positionSettings!,leverage:Infinity}})).toBe(false);
   expect(isDrawing({...short,positionSettings:long.positionSettings})).toBe(true);
   expect(isDrawing({...fixture("trendline"),positionSettings:long.positionSettings})).toBe(false);
   const preset=presetFromDrawing(long);
   const a=applyToolPreset({...long,id:"a"},preset);
   const b=applyToolPreset({...long,id:"b"},preset);
   a.positionSettings!.feeBps=42;
   expect(b.positionSettings!.feeBps).toBe(0);
 });
});
