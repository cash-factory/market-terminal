import {TOOL_DEFINITIONS,type ToolGroup} from "./toolDefinitions";
import type {DrawingTool} from "./types";

/** The second navigation layer reflects what the tools *do*, not arbitrary icon rows. */
export type ToolSection={name:string;purpose:string;tools:readonly DrawingTool[]};
export const TOOL_SECTIONS:Record<ToolGroup,readonly ToolSection[]>={
 Lines:[
  {name:"Lines & angles",purpose:"Connect or project time-price anchors",
    tools:["trendline","trend-angle","info-line","ray","extended-line"]},
  {name:"Price & time references",purpose:"Single-anchor levels and guide lines",
    tools:["horizontal-line","horizontal-ray","vertical-line","cross-line"]},
  {name:"Channels & pitchforks",purpose:"Parallel, fitted, and median studies",
    tools:["channel","regression-channel","pitchfork"]},
 ],
 Fibonacci:[
  {name:"Price ratios",purpose:"Two- and three-point price projections",
    tools:["fibonacci","fib-extension"]},
  {name:"Time & proportion",purpose:"Time spacing and scaled circular guides",
    tools:["fib-timezone","fib-circles"]},
  {name:"Geometric studies",purpose:"Scale-dependent construction",
    tools:["gann-box"]},
 ],
 Patterns:[
  {name:"Harmonic pivots",purpose:"User-defined sequential swing points",
    tools:["pattern-abcd","pattern-xabcd"]},
  {name:"Wave & time",purpose:"Manual wave counts and repeated bar intervals",
    tools:["elliott-impulse","cyclic-lines"]},
 ],
 Measurement:[
  {name:"Distance & duration",purpose:"Quantify observed price and time changes",
    tools:["measure","price-range","date-range","date-price-range"]},
  {name:"Position illustrations",purpose:"Entry, protective stop, and target scenarios",
    tools:["long-position","short-position"]},
 ],
 Shapes:[
  {name:"Regions",purpose:"Highlight bounded price/time areas",
    tools:["rectangle","ellipse","triangle"]},
  {name:"Emphasis",purpose:"Directional and translucent freehand markup",
    tools:["arrow","highlighter","brush"]},
 ],
 Annotations:[
  {name:"Anchored notes",purpose:"Short context, price notes, and editable observations",
    tools:["text","price-note","callout"]},
 ],
 "Icons & Markers":[
  {name:"Directional marks",purpose:"Small symbols anchored at a precise bar and price",
    tools:["arrow-marker"]},
 ]
};
export const TOOL_SECTION_BY_ID=new Map<DrawingTool,ToolSection>();
for(const categories of Object.values(TOOL_SECTIONS)){
  for(const section of categories){
    for(const id of section.tools)TOOL_SECTION_BY_ID.set(id,section);
  }
}
/** Strict catalog integrity: no fake tool tiles or unlayered tools. */
export function taxonomicIntegrity():{missing:DrawingTool[];duplicates:DrawingTool[]}{
  const seen=new Set<DrawingTool>(),duplicates:DrawingTool[]=[];
  for(const categories of Object.values(TOOL_SECTIONS)){
    for(const section of categories){
      for(const id of section.tools){
        if(seen.has(id))duplicates.push(id);
        seen.add(id);
      }
    }
  }
  return {missing:TOOL_DEFINITIONS.map(x=>x.id).filter(id=>!seen.has(id)),duplicates};
}
