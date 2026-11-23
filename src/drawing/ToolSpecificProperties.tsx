import {useState} from "react";
import {Plus,RotateCcw,Trash2,X} from "lucide-react";
import type {Drawing,ToolLevel,MeasurementParts} from "./types";
import {TOOL_BY_ID} from "./toolDefinitions";
import {FORK_RATIOS,MEASUREMENT_DEFAULTS,effectiveLevels} from "./toolProperties";

type Props={drawing:Drawing;onChange:(drawing:Drawing)=>void};

const checkbox=(text:string,checked:boolean,update:(checked:boolean)=>void,note:string)=>{
  return <label className="tool-special-checkbox"><input type="checkbox" checked={checked}
    onChange={e=>update(e.target.checked)}/>
    <span><strong>{text}</strong><small>{note}</small></span></label>;
};

export function ToolSpecificProperties({drawing,onChange}:Props){
  const [newRatio,setNewRatio]=useState(".886");
  const [levelError,setLevelError]=useState("");
  const [newTimeLevel,setNewTimeLevel]=useState("55");
  const [timeLevelError,setTimeLevelError]=useState("");
  const title=TOOL_BY_ID.get(drawing.tool)?.label??drawing.tool;
  const update=(patch:Partial<Drawing>)=>onChange({...drawing,...patch});
  const isFib=["fibonacci","fib-extension","fib-circles"].includes(drawing.tool);
  const metrics=["measure","info-line","date-range","price-range","date-price-range"].includes(drawing.tool);
  const isProjection=["trendline","ray","extended-line","info-line"].includes(drawing.tool);
  const addLevel=()=>{
    const ratio=Number(newRatio);
    const levels=effectiveLevels(drawing);
    if(newRatio.trim()===""||!Number.isFinite(ratio)||ratio< -3||ratio>8){
      setLevelError("Enter a ratio from -3 to 8.");return;
    }
    if(levels.length>=16){setLevelError("Maximum 16 levels per drawing.");return;}
    if(levels.some(level=>Math.abs(level.ratio-ratio)<.000001)){
      setLevelError("That ratio already exists.");return;
    }
    update({fibLevels:[...levels,{ratio,visible:true,color:drawing.color}].sort((a,b)=>a.ratio-b.ratio)});
    setLevelError("");
  };
  const setLevel=(i:number,patch:Partial<ToolLevel>)=>{
    update({fibLevels:effectiveLevels(drawing).map((item,index)=>index===i?{...item,...patch}:item)});
  };
  return <section className="tool-specific-properties" aria-label={"Tool settings for "+title}>
    <header className="tool-specific-head"><strong>{title} controls</strong>
      <span>INDEPENDENT SETTINGS</span></header>
    {isFib&&<>
      <p className="tool-special-explain">Configure each analytical ratio independently. Levels and their colors stay attached to this drawing, not every Fibonacci tool.</p>
      <div className="tool-level-heading"><span>Enabled</span><span>Ratio</span><span>Color</span><span>Remove</span></div>
      <div className="tool-level-list">
        {effectiveLevels(drawing).map((level,index)=><div className="tool-level-item" key={index}>
          <input aria-label={"Show level "+index} type="checkbox" checked={level.visible}
            onChange={e=>setLevel(index,{visible:e.target.checked})}/>
          <input type="number" step=".001" min="-3" max="8"
            aria-label={"Level "+index+" ratio"} value={level.ratio}
            onChange={e=>{const ratio=Number(e.target.value);if(e.target.value.trim()!==""&&Number.isFinite(ratio)&&ratio>=-3&&ratio<=8)setLevel(index,{ratio});}}/>
          <input type="color" aria-label={"Level "+index+" color"} value={level.color}
            onChange={e=>setLevel(index,{color:e.target.value})}/>
          <button type="button" disabled={effectiveLevels(drawing).length===1}
            aria-label={"Remove level "+index}
            onClick={()=>update({fibLevels:effectiveLevels(drawing).filter((_,i)=>i!==index)})}><Trash2 size={14}/></button>
        </div>)}
      </div>
      <div className="tool-level-add"><label>New ratio
        <input type="number" step=".001" min="-3" max="8" value={newRatio}
          aria-label="New Fibonacci ratio" onChange={e=>{setNewRatio(e.target.value);setLevelError("");}}/>
      </label><button type="button" disabled={effectiveLevels(drawing).length>=16}
        aria-label="Add Fibonacci level" onClick={addLevel}><Plus size={14}/> Add level</button></div>
      {levelError&&<p className="tool-level-error" role="alert">{levelError}</p>}
      <label className="tool-special-field">Level labels
        <select aria-label="Fibonacci level label mode" value={drawing.labelMode??"ratio"}
          onChange={e=>update({labelMode:e.target.value as Drawing["labelMode"]})}>
          <option value="ratio">Ratio / percentage</option>
          <option value="price">Projected price only</option>
          <option value="both">Ratio and price</option>
        </select>
      </label>
      <button type="button" className="tool-special-reset"
        onClick={()=>update({fibLevels:undefined,labelMode:undefined})}>
        <RotateCcw size={13}/> Restore this tool’s default levels
      </button>
    </>}
    {drawing.tool==="fib-timezone"&&<>
      <p className="tool-special-explain">Each level multiplies the time spacing between your two anchors, based on chart bar positions. You decide which Fibonacci indices appear; no date or price is predicted.</p>
      <div className="time-guide-list" aria-label="Fibonacci time guide levels">
        {(drawing.timeLevels??[0,1,2,3,5,8,13,21,34]).map(level=>
          <span key={level} className="time-guide-chip">{level}
            <button type="button" aria-label={"Remove time guide "+level}
              disabled={(drawing.timeLevels??[0,1,2,3,5,8,13,21,34]).length===1}
              onClick={()=>update({timeLevels:(drawing.timeLevels??[0,1,2,3,5,8,13,21,34])
                .filter(value=>value!==level)})}><X size={12}/></button>
          </span>)}
      </div>
      <div className="tool-level-add"><label>Time multiplier (0–55)
        <input aria-label="New time guide level" type="number" min="0" max="55"
          step="1" value={newTimeLevel}
          onChange={e=>{setNewTimeLevel(e.target.value);setTimeLevelError("");}}/>
      </label><button type="button" aria-label="Add time guide"
        disabled={(drawing.timeLevels??[0,1,2,3,5,8,13,21,34]).length>=16}
        onClick={()=>{
          const level=Number(newTimeLevel),list=drawing.timeLevels??[0,1,2,3,5,8,13,21,34];
          if(newTimeLevel.trim()===""||!Number.isInteger(level)||level<0||level>55||list.includes(level)){
            setTimeLevelError("Use a unique whole-number time multiplier between 0 and 55.");return;
          }
          update({timeLevels:[...list,level].sort((a,b)=>a-b)});setTimeLevelError("");
        }}><Plus size={14}/> Add guide</button></div>
      {timeLevelError&&<p className="tool-level-error" role="alert">{timeLevelError}</p>}
      <button type="button" className="tool-special-reset"
        onClick={()=>update({timeLevels:undefined})}><RotateCcw size={13}/> Restore standard Fibonacci time sequence</button>
    </>}
    {drawing.tool==="cyclic-lines"&&<>
      <p className="tool-special-explain">Use the time spacing between the two anchors as a repeating observed-bar hypothesis. Choose how many guide lines to plot; the calculation never creates future candles.</p>
      <label className="tool-special-field">Maximum cycle markers
        <select aria-label="Cycle marker count" value={drawing.cycleCount??12}
          onChange={e=>update({cycleCount:Number(e.target.value)})}>
          {[2,3,4,6,8,12,16,24].map(count=><option key={count} value={count}>{count} markers</option>)}
        </select>
      </label>
    </>}
    {drawing.tool==="pitchfork"&&<>
      <p className="tool-special-explain">Choose outer median-line distances independently. A ratio of 1 follows the two manually placed outer pivots; additional pairs are parallel projections in the current chart scale.</p>
      <div className="tool-fork-options">{FORK_RATIOS.map(ratio=>
        checkbox(ratio.toFixed(2)+"× rails",
          (drawing.forkLevels??[1]).includes(ratio),
          checked=>{
            const values=drawing.forkLevels??[1];
            update({forkLevels:checked?[...values,ratio].sort((a,b)=>a-b):
              values.filter(item=>item!==ratio)});
          },"Parallel offsets on both sides of the median"))}
      </div>
    </>}
    {drawing.tool==="gann-box"&&<>
      <p className="tool-special-explain">A proportional price/time grid depends on the chart's visible pixel scales; it does not establish a universal 1×1 market angle.</p>
      <label className="tool-special-field">Grid subdivisions
        <select aria-label="Gann grid subdivisions" value={drawing.gridDivisions??4}
          onChange={e=>update({gridDivisions:Number(e.target.value)})}>
          {Array.from({length:11},(_,i)=>i+2).map(n=><option key={n} value={n}>{n} divisions</option>)}
        </select>
      </label>
    </>}
    {drawing.tool==="regression-channel"&&<>
      <p className="tool-special-explain">Fits observed candle closes within the selected time range. Outer rails use adjustable residual standard deviations.</p>
      <label className="tool-special-field">Residual-deviation multiplier
        <input type="range" min=".5" max="4" step=".25"
          aria-label="Regression deviation multiplier" value={drawing.regressionDeviation??2}
          onChange={e=>update({regressionDeviation:Number(e.target.value)})}/>
        <small>{(drawing.regressionDeviation??2).toFixed(2)} σ on each side</small>
      </label>
      {checkbox("Central fit line",drawing.showMidline??true,
        checked=>update({showMidline:checked}),"Toggle the least-squares center line independently of the bands")}
      <p className="tool-special-caveat">Recalculates with the loaded candle data. Missing candles are not invented.</p>
    </>}
    {drawing.tool==="trend-angle"&&<>
      <p className="tool-special-explain">An angle relative to the displayed horizontal time axis. Because chart zoom and price-scale compression change the angle, it is not an invariant market measurement.</p>
      {checkbox("Horizontal angle guide",drawing.showMidline??true,
        checked=>update({showMidline:checked}),"Show or hide the dashed zero-degree reference")}
    </>}
    {drawing.tool==="highlighter"&&<>
      <p className="tool-special-explain">A freehand translucent stroke. Drag on the chart to trace emphasis; width and transparency stay independent per stroke.</p>
      <label className="tool-special-field">Marker tip width
        <input type="range" min="1" max="32" step="1" aria-label="Highlighter tip width"
          value={drawing.strokeWidth??16}
          onChange={e=>update({strokeWidth:Number(e.target.value)})}/>
        <small>{drawing.strokeWidth??16}px</small>
      </label>
    </>}
    {isProjection&&<label className="tool-special-field">Line projection
      <select aria-label="Line projection" value={drawing.projection??(
        drawing.tool==="ray"?"right":drawing.tool==="extended-line"?"both":"segment")}
        onChange={e=>update({projection:e.target.value as Drawing["projection"]})}>
        <option value="segment">Between two anchors</option>
        <option value="right">Extend toward second anchor</option>
        <option value="left">Extend before first anchor</option>
        <option value="both">Extend both directions</option>
      </select></label>}
    {drawing.tool==="channel"&&
      checkbox("Central reference",drawing.showMidline??true,
        checked=>update({showMidline:checked}),"Plot a dashed middle rail between channel boundaries")}
    {metrics&&<>
      <p className="tool-special-explain">Select which quantities this drawing reports. Changes are calculated from the anchors and observed chart candles.</p>
      <div className="tool-fork-options">
        {(["price","percent","bars","elapsed"] as const).map(key=>
          checkbox(({price:"Absolute price",percent:"Percentage movement",bars:"Observed intervals",elapsed:"Elapsed UTC time"} as const)[key],
            (drawing.showMeasurements??MEASUREMENT_DEFAULTS)[key],
            checked=>update({showMeasurements:{...(drawing.showMeasurements??MEASUREMENT_DEFAULTS),[key]:checked}}),
            key==="bars"?"Only candle intervals present in the current feed":""))}
      </div>
    </>}
    {drawing.tool==="arrow-marker"&&<label className="tool-special-field">Marker direction
      <select aria-label="Marker direction" value={drawing.markerDirection??"up"}
        onChange={e=>update({markerDirection:e.target.value as Drawing["markerDirection"]})}>
        <option value="up">Up</option><option value="right">Right</option>
        <option value="down">Down</option><option value="left">Left</option>
      </select></label>}
    {["text","callout","price-note"].includes(drawing.tool)&&<label className="tool-special-field">Annotation font size
      <input type="range" min="9" max="28" step="1"
        aria-label="Annotation font size" value={drawing.fontSize??11}
        onChange={e=>update({fontSize:Number(e.target.value)})}/>
      <small>{drawing.fontSize??11}px</small>
    </label>}
    {["long-position","short-position"].includes(drawing.tool)&&
      <p className="tool-special-explain">Use the Position tab to configure risk-based sizing, contract units, fees, slippage, currency conversion, leverage and chart labels. Use Coordinates for entry, stop and target.</p>}
    {!isFib&&!metrics&&!isProjection&&!["pitchfork","gann-box","channel","arrow-marker","text","callout","price-note","long-position","short-position","regression-channel","trend-angle","highlighter","fib-timezone","cyclic-lines"].includes(drawing.tool)&&
      <p className="tool-special-explain">Edit the anchors on the Coordinates tab; use the appearance controls above to set an independent style. This {title.toLowerCase()} stays bound to the original market and data source.</p>}
  </section>;
}
