import {describe,expect,it} from "vitest";
import {editDrawingAnchor,editPatternPoint,formatAnchorUtc,isDrawingVisibleAtFrame,
  parseAnchorUtc,validateDrawingSettings} from "./drawingSettings";
import {isDrawing,type Drawing} from "./types";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";

const drawing:Drawing={
 id:"origin",tool:"trendline",symbol:"EURUSD",source:"demo",locked:false,color:"#458da9",
 start:{time:1800000001,price:1.1234},end:{time:1800003601,price:1.15}
};

describe("per-object properties and market safety",()=>{
 it("preserves UTC interpretation and rejects malformed datetime-local input",()=>{
   expect(formatAnchorUtc(1800000001)).toMatch(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$/);
   expect(parseAnchorUtc("2026-11-22T17:20")).toBeGreaterThan(0);
   expect(parseAnchorUtc("2026-02-31T15:30")).toBeNull();
   expect(parseAnchorUtc("2026-11-22T99:00")).toBeNull();
 });
 it("updates precise coordinates without changing instrument provenance",()=>{
   const changed=editDrawingAnchor(drawing,"start",{time:1800000601,price:1.25});
   expect(changed.start.price).toBe(1.25);
   expect(changed.end).toEqual(drawing.end);
   expect(validateDrawingSettings(drawing,changed)).toEqual(changed);
   expect(()=>validateDrawingSettings(drawing,{...changed,source:"binance"})).toThrow();
   expect(()=>validateDrawingSettings(drawing,{...changed,id:"changed"})).toThrow();
 });
 it("respects visible frame choices without destroying saved objects",()=>{
   const edited:Drawing={...drawing,visibleOnFrames:["1h","4h"],fillOpacity:.15,
     showLabels:false,strokeWidth:3};
   expect(isDrawing(edited)).toBe(true);
   expect(isDrawingVisibleAtFrame(edited,"1h")).toBe(true);
   expect(isDrawingVisibleAtFrame(edited,"5m")).toBe(false);
   expect(isDrawingVisibleAtFrame({...edited,hidden:true},"1h")).toBe(false);
   const roundtrip=parseWorkspace(JSON.parse(serializeWorkspace({...defaultWorkspace,drawings:[edited]})));
   expect(roundtrip.drawings[0]).toEqual(edited);
   expect(isDrawing({...edited,visibleOnFrames:["1h","1h"]})).toBe(false);
   expect(isDrawing({...edited,fillOpacity:2})).toBe(false);
 });
 it("edits one vertex without changing other manually selected pivots",()=>{
   const points=[drawing.start,drawing.end,{time:1800007201,price:1.20},{time:1800010801,price:1.13}];
   const pattern:Drawing={...drawing,tool:"pattern-abcd",points};
   expect(isDrawing(pattern)).toBe(true);
   const edited=editPatternPoint(pattern,2,{time:1800007401,price:1.2});
   expect(edited.points?.[2].time).toBe(1800007401);
   expect(edited.points?.[0]).toEqual(points[0]);
   expect(edited.points?.[1]).toEqual(points[1]);
   expect(()=>editPatternPoint(pattern,7,drawing.start)).toThrow();
 });
});
