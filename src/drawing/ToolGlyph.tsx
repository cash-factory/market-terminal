import type {DrawingTool} from "./types";
import {TOOL_BY_ID} from "./toolDefinitions";

type Props={tool:DrawingTool;size?:number;className?:string};
export function ToolGlyph({tool,size=24,className}:Props){
 const line=["trendline","info-line","ray","extended-line","trend-angle"].includes(tool);
 const reference=["horizontal-line","horizontal-ray","vertical-line","cross-line"].includes(tool);
 const fib=["fibonacci","fib-extension","fib-timezone","fib-circles","gann-box"].includes(tool);
 const pattern=["pattern-abcd","pattern-xabcd","elliott-impulse","cyclic-lines"].includes(tool);
 const measure=["measure","price-range","date-range","date-price-range"].includes(tool);
 const position=["long-position","short-position"].includes(tool);
 const note=["callout","price-note","text"].includes(tool);
 const ink=["brush","highlighter"].includes(tool);
 const color="currentColor";
 return <svg className={className} aria-hidden="true" focusable="false" width={size} height={size}
   viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
   {line&&<>
    <path d="M6 32 33 9" strokeWidth={tool==="trend-angle"?2:1.9}/>
    <circle cx="6" cy="32" r="2.5" fill="var(--panel)"/><circle cx="33" cy="9" r="2.5" fill="var(--panel)"/>
    {tool==="trend-angle"&&<><path d="M6 32h26" opacity=".45"/><path d="M17 32a11 11 0 0 0-3-7.5" opacity=".8"/></>}
    {tool==="ray"&&<path d="m29 9 5-1-1 5"/>}
    {tool==="info-line"&&<path d="M20 9v-4h13M21 37h12" opacity=".55"/>}
   </>}
   {reference&&<>
    <path d={tool==="vertical-line"?"M20 3v34":tool==="cross-line"?"M4 20h32M20 3v34":"M4 20h32"}/>
    <circle cx={tool==="horizontal-ray"?8:20} cy="20" r="2.5" fill="var(--panel)"/>
    {tool==="horizontal-ray"&&<path d="m31 16 5 4-5 4"/>}
   </>}
   {["channel","regression-channel","pitchfork"].includes(tool)&&<>
    <path d="M4 30 33 8M7 37 36 15" opacity=".8"/>
    <path d="M4 23 33 1" strokeDasharray={tool==="regression-channel"?"3 3":undefined}/>
    {tool==="pitchfork"&&<path d="M13 35 20 8 27 35" opacity=".45"/>}
    {tool==="regression-channel"&&<circle cx="19" cy="20" r="2.5" fill="var(--panel)"/>}
   </>}
   {fib&&<>
    {tool==="fib-circles"?<><circle cx="19" cy="20" r="7"/><circle cx="19" cy="20" r="15" opacity=".65"/><circle cx="19" cy="20" r="2" fill={color}/></>:
    tool==="fib-timezone"?[7,14,23,35].map(x=><path key={x} d={`M${x} 6v28`} opacity={x===7?1:.6}/>):
    tool==="gann-box"?<><rect x="5" y="5" width="30" height="30"/><path d="M5 20h30M20 5v30M5 35 35 5M5 5l30 30" opacity=".55"/></>:
    [8,15,22,29].map((y,i)=><path key={y} d={`M6 ${y}h29`} opacity={1-i*.13}/>)}
    {tool==="fib-extension"&&<path d="M6 34 20 17 31 24" opacity=".7"/>}
   </>}
   {pattern&&<><path d={tool==="cyclic-lines"?"M7 5v30M20 5v30M33 5v30":"M4 30 12 9 20 26 29 13 36 27"}/>
    {tool!=="cyclic-lines"&&[ [4,30],[12,9],[20,26],[29,13] ].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2" fill="var(--panel)"/>)}
   </>}
   {measure&&<><path d="M8 7v25M32 7v25M8 19h24M12 15l-4 4 4 4M28 15l4 4-4 4"/>
    <path d="M8 33h24" opacity=".5"/></>}
   {position&&<><path d="M4 18h32M4 7h32M4 33h32" opacity=".6"/>
    <rect x="8" y="7" width="24" height="11" fill="currentColor" fillOpacity=".09" stroke="none"/>
    <path d={tool==="long-position"?"M20 24V11m-4 4 4-4 4 4":"M20 11v17m-4-4 4 4 4-4"}/></>}
   {tool==="rectangle"&&<rect x="7" y="9" width="26" height="22" rx="1"/>}
   {tool==="ellipse"&&<ellipse cx="20" cy="20" rx="15" ry="11"/>}
   {tool==="triangle"&&<path d="M20 6 35 33H5z"/>}
   {tool==="arrow"&&<><path d="M5 33 33 7M20 7h13v13"/></>}
   {ink&&<><path d="M6 29Q14 8 21 23T35 15" strokeWidth={tool==="highlighter"?6:2.5}
     strokeOpacity={tool==="highlighter"?.4:1}/><path d="M9 34h22" opacity=".3"/></>}
   {note&&<><path d="M7 7h26v21H19l-7 6v-6H7z"/>
    {tool==="text"?<path d="M13 14h14m-7 0v9"/>:
    <path d="M12 16h16M12 21h11" opacity=".65"/>}</>}
   {tool==="arrow-marker"&&<><path d="M20 6 32 22h-7v12H15V22H8z"/>
    <path d="M10 37h20" opacity=".3"/></>}
 </svg>;
}

export function ToolGuide({tool}: {tool:DrawingTool}){
 const def=TOOL_BY_ID.get(tool);
 if(!def)return null;
 const guidance=(
   tool==="regression-channel"?"Fit only observed closes inside your chosen period; edit the deviation multiplier in Properties.":
   tool==="trend-angle"?"Place two anchors. Angle is screen-scale dependent, so zooming changes the display.":
   tool==="highlighter"?"Drag to trace a translucent annotation, then adjust ink width and opacity.":
   tool==="pitchfork"?"Drag the first two anchors, then click a third pivot. Configure extra median rails afterward.":
   tool==="fibonacci"?"Drag between two price anchors; every ratio, label and color is independently editable.":
   tool==="channel"?"Choose the first two anchors, then click to place the parallel offset.":
   tool==="gann-box"?"Mark a time/price region; adjust grid divisions. Geometry changes with chart scaling.":
   tool==="brush"?"Drag freely across the chart. The stroke is saved as actual time/price points.":
   def.points>2?`Place ${def.points} confirmed pivot anchors. You can correct each pivot after placement.`:
   def.points===1?"Click once to anchor the object to a price and time on the chart.":
   "Drag between two time/price anchors. Drag handles or use Coordinates for precise edits."
 );
 return <div className="tool-guide" aria-live="polite">
   <div className="tool-guide-visual"><ToolGlyph tool={tool} size={67}/></div>
   <div className="tool-guide-copy"><span>TOOL FOCUS · {def.points===1?"ONE ANCHOR":def.points+" ANCHORS"}</span>
     <strong>{def.label}</strong><p>{guidance}</p></div>
 </div>;
}
