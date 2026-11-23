import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Check, Clock3, Eye, EyeOff, LayoutGrid, Lock, Paintbrush, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { symbols } from "../market";
import { TOOL_BY_ID, ONE_ANCHOR_TOOLS } from "./toolDefinitions";
import {ToolGlyph} from "./ToolGlyph";
import {ToolSpecificProperties} from "./ToolSpecificProperties";
import "./toolSpecificProperties.css";
import { type ChartAnchor, type Drawing, type DrawingTool } from "./types";
import { AVAILABLE_FRAMES, editDrawingAnchor, editPatternPoint, formatAnchorUtc, parseAnchorUtc,
  validateDrawingSettings } from "./drawingSettings";
import "./drawingSettings.css";

type Tab="style"|"coordinates"|"visibility";
type Props={
  drawing:Drawing;
  onSave:(drawing:Drawing)=>void;
  onSaveAsDefault?:(drawing:Drawing)=>void;
  onResetDefault?:(tool:DrawingTool)=>void;
  hasDefault?:boolean;
  onClose:()=>void;
};
type CoordinateInput={time:string;price:string};

function fieldsFrom(drawing:Drawing):Record<string,CoordinateInput>{
  const fields:Record<string,CoordinateInput>={};
  const entries:[string,ChartAnchor][]=ONE_ANCHOR_TOOLS.has(drawing.tool)?[["start",drawing.start]]:[["start",drawing.start],["end",drawing.end]];
  if(drawing.control)entries.push(["control",drawing.control]);
  if(drawing.target)entries.push(["target",drawing.target]);
  if(drawing.points&&drawing.points.length>=3){
    drawing.points.slice(2).forEach((point,i)=>entries.push(["vertex-"+(i+2),point]));
  }
  for(const [kind,point] of entries)fields[kind]={
    time:formatAnchorUtc(point.time),price:String(point.price)
  };
  return fields;
}

export function DrawingSettingsDialog({drawing,onSave,onClose,onSaveAsDefault,onResetDefault,hasDefault=false}:Props){
  const [tab,setTab]=useState<Tab>("style");
  const [draft,setDraft]=useState<Drawing>(drawing);
  const [fields,setFields]=useState(()=>fieldsFrom(drawing));
  const [error,setError]=useState("");
  const closeRef=useRef<HTMLButtonElement>(null);
  const dialogRef=useRef<HTMLDivElement>(null);
  const originalFocus=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    originalFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    closeRef.current?.focus();
    const onEscape=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.stopImmediatePropagation();onClose();}};
    window.addEventListener("keydown",onEscape,true);
    return ()=>{
      window.removeEventListener("keydown",onEscape,true);
      if(originalFocus.current?.isConnected)originalFocus.current.focus();
    };
  },[onClose]);
  useEffect(()=>{
    setDraft(drawing);setFields(fieldsFrom(drawing));setError("");setTab("style");
  },[drawing.id]);
  const name=TOOL_BY_ID.get(drawing.tool)?.label??drawing.tool;
  const preview=useMemo(()=>({
    stroke:draft.color,strokeWidth:draft.strokeWidth??2,strokeDasharray:draft.dash==="dotted"?"2 6":
      draft.dash==="dashed"?"9 6":undefined,opacity:draft.opacity??1
  }),[draft.color,draft.strokeWidth,draft.dash,draft.opacity]);
  const setCoordinate=(key:string,field:"time"|"price",value:string)=>{
    setFields(old=>({...old,[key]:{...old[key],[field]:value}}));setError("");
  };
  const apply=()=>{
    try{
      let candidate={...draft};
      for(const [key,input] of Object.entries(fields)){
        const original=key.startsWith("vertex-")?
          drawing.points?.[Number(key.slice(7))]:
          (drawing as unknown as Record<string,unknown>)[key] as ChartAnchor|undefined;
        const time=original&&input.time===formatAnchorUtc(original.time)?
          original.time:parseAnchorUtc(input.time);
        const price=Number(input.price);
        if(time===null||time===undefined||input.price.trim()===""||!Number.isFinite(price)||price<=0)
          throw new Error("Enter valid UTC dates and positive prices for every coordinate.");
        candidate=key.startsWith("vertex-")?
          editPatternPoint(candidate,Number(key.slice(7)),{time,price}):
          editDrawingAnchor(candidate,key as "start"|"end"|"control"|"target",{time,price});
      }
      if(ONE_ANCHOR_TOOLS.has(drawing.tool))candidate.end={...candidate.start};
      onSave(validateDrawingSettings(drawing,candidate));
      onClose();
    }catch(reason){setError(reason instanceof Error?reason.message:"Settings could not be saved.");}
  };
  const trapFocus=(event:import("react").KeyboardEvent<HTMLDivElement>)=>{
    if(event.key!=="Tab")return;
    const elements=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )??[]).filter(item=>item.getClientRects().length>0);
    if(!elements.length)return;
    const first=elements[0],last=elements[elements.length-1];
    if(event.shiftKey&&(document.activeElement===first||!dialogRef.current?.contains(document.activeElement))){
      event.preventDefault();last.focus();
    }else if(!event.shiftKey&&(document.activeElement===last||!dialogRef.current?.contains(document.activeElement))){
      event.preventDefault();first.focus();
    }
  };
  return <div className="drawing-dialog-backdrop" onMouseDown={event=>{
    if(event.target===event.currentTarget)onClose();
  }}><div ref={dialogRef} onKeyDown={trapFocus} className="drawing-dialog" role="dialog" aria-modal="true"
      aria-label={"Drawing settings — "+name}>
    <div className="drawing-dialog-header">
      <div className="drawing-dialog-mark"><SlidersHorizontal size={18}/></div>
      <div className="drawing-dialog-heading">
        <span>CHART OBJECT / PROPERTIES</span>
        <h2>{name}<small> · {symbols[drawing.symbol].label}</small></h2>
      </div>
      <button type="button" ref={closeRef} aria-label="Close drawing settings"
        onClick={onClose}><X size={18}/></button>
    </div>
    <div className="drawing-dialog-tabs" role="tablist" aria-label="Drawing properties">
      {([["style","Style",Paintbrush],["coordinates","Coordinates",Clock3],
        ["visibility","Visibility",Eye]] as const).map(([id,title,Icon])=>
        <button key={id} type="button" role="tab" aria-selected={tab===id}
          className={tab===id?"active":""} onClick={()=>{setTab(id);setError("");}}>
          <Icon size={15}/>{title}
        </button>)}
    </div>
    <div className="drawing-dialog-content">
      {tab==="style"&&<div role="tabpanel" className="drawing-settings-style">
        <div className="drawing-settings-intro"><strong>Appearance & analytical controls</strong>
          <p>These settings belong to this object. Its geometry and source remain independent.</p></div>
        <div className="drawing-tool-identity"><span className="drawing-tool-identity-icon">
          <ToolGlyph tool={drawing.tool} size={28}/></span>
          <span><strong>{name}</strong><small>{TOOL_BY_ID.get(drawing.tool)?.description}</small></span></div>
        <div className="drawing-settings-preview" aria-label="Drawing style preview">
          <span>LIVE STYLE PREVIEW</span>
          <svg viewBox="0 0 320 54" role="img" aria-label="Preview line">
            <path d="M 16 38 L 304 14" fill="none" {...preview} strokeLinecap="round"/>
            <circle cx="16" cy="38" r="4" fill={draft.color}/>
            <circle cx="304" cy="14" r="4" fill={draft.color}/>
          </svg>
        </div>
        <div className="drawing-settings-fields">
          <label className="drawing-settings-color">Line / border color
            <span><input type="color" aria-label="Drawing line color"
              value={draft.color} onChange={e=>setDraft(old=>({...old,color:e.target.value}))}/>
              <code>{draft.color.toUpperCase()}</code></span>
          </label>
          <label>Line weight
            <select aria-label="Drawing line weight" value={draft.strokeWidth??2}
              onChange={e=>setDraft(old=>({...old,strokeWidth:Number(e.target.value)}))}>
              {[1,2,3,4,5,6,7,8].map(value=><option key={value} value={value}>{value} px</option>)}
            </select>
          </label>
          <label>Line pattern
            <select aria-label="Drawing line pattern" value={draft.dash??"solid"}
              onChange={e=>setDraft(old=>({...old,dash:e.target.value as Drawing["dash"]}))}>
              <option value="solid">Solid</option><option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </label>
          <label>Opacity <strong>{Math.round((draft.opacity??1)*100)}%</strong>
            <input type="range" min=".1" max="1" step=".1" aria-label="Drawing opacity"
              value={draft.opacity??1}
              onChange={e=>setDraft(old=>({...old,opacity:Number(e.target.value)}))}/>
          </label>
          {(["rectangle","ellipse","channel","measure","price-range","date-range","date-price-range","gann-box","regression-channel","triangle"].includes(drawing.tool))&&
            <label>Region fill <strong>{Math.round((draft.fillOpacity??.09)*100)}%</strong>
              <input type="range" min="0" max=".8" step=".05" aria-label="Drawing region fill"
                value={draft.fillOpacity??.09}
                onChange={e=>setDraft(old=>({...old,fillOpacity:Number(e.target.value)}))}/>
            </label>}
        </div>
        {drawing.tool==="callout"&&<label className="drawing-settings-note">
          Evidence classification
          <select aria-label="Evidence classification" value={draft.evidenceSide??"unclassified"}
            onChange={e=>setDraft(old=>({...old,
              evidenceSide:e.target.value as "supports"|"challenges"|"unclassified"}))}>
            <option value="unclassified">Observation / unclassified</option>
            <option value="supports">Evidence supporting the thesis</option>
            <option value="challenges">Evidence challenging the thesis</option>
          </select>
          <small>These labels reflect your interpretation; they do not validate a market prediction.</small>
        </label>}
        {drawing.tool==="rectangle"&&<label className="drawing-settings-toggle">
          <input type="checkbox" checked={draft.showMidline??false}
            onChange={e=>setDraft(old=>({...old,showMidline:e.target.checked}))}/>
          <span><strong>Show midpoint</strong><small>Draw a 50% reference through the highlighted zone.</small></span>
        </label>}
        {["fibonacci","measure","price-range","date-range","date-price-range","info-line","fib-extension","fib-timezone","fib-circles","gann-box","cyclic-lines","pattern-abcd","pattern-xabcd","elliott-impulse","trend-angle","regression-channel"].includes(drawing.tool)&&
          <label className="drawing-settings-toggle">
            <input type="checkbox" checked={draft.showLabels!==false}
              onChange={e=>setDraft(old=>({...old,showLabels:e.target.checked}))}/>
            <span><strong>Show labels</strong><small>Keep calculations visible next to your drawing.</small></span>
          </label>}
        {["text","callout","price-note"].includes(drawing.tool)&&<label className="drawing-settings-note">Annotation text
          <textarea aria-label="Drawing annotation text" rows={3} maxLength={2000}
            value={draft.text??""} onChange={e=>setDraft(old=>({...old,text:e.target.value}))}/>
        </label>}
        <ToolSpecificProperties drawing={draft} onChange={setDraft}/>
        {onSaveAsDefault&&<div className="tool-default-actions">
          <div><strong>Save your tool setup</strong>
            <small>Future {name.toLowerCase()} drawings inherit these controls, never the original coordinates or data source.</small>
          </div>
          <button type="button" aria-label={"Save "+name+" settings as default"}
            onClick={()=>onSaveAsDefault(draft)}><Bookmark size={14}/> Save as default</button>
          {hasDefault&&onResetDefault&&<button type="button" className="tool-default-reset"
            aria-label={"Reset "+name+" default settings"}
            onClick={()=>onResetDefault(drawing.tool)}><RotateCcw size={14}/> Reset defaults</button>}
        </div>}
      </div>}
      {tab==="coordinates"&&<div role="tabpanel" className="drawing-settings-coordinates">
        <div className="drawing-settings-intro"><strong>Precise placement</strong>
          <p>Enter UTC timestamps and valid positive prices. This updates the actual chart anchors; other market sources are unchanged.</p>
        </div>
        {Object.entries(fields).map(([name,field])=><fieldset key={name}>
          <legend>{name==="start"?"Anchor 1":name==="end"?"Anchor 2":
            name==="control"?"Control anchor":name==="target"?"Target anchor":name.startsWith("vertex-")?"Pivot "+(Number(name.slice(7))+1):"Target anchor"}</legend>
          <label>Time (UTC)
            <input type="datetime-local" step="1" aria-label={name+" UTC time"} value={field.time}
              onChange={e=>setCoordinate(name,"time",e.target.value)}/>
          </label>
          <label>Price
            <input type="number" min="0.000000000001" step="any"
              aria-label={name+" anchor price"} value={field.price}
              onChange={e=>setCoordinate(name,"price",e.target.value)}/>
          </label>
        </fieldset>)}
        <div className="drawing-settings-note-box"><LayoutGrid size={16}/>
          A coordinate adjustment moves this object only. Historical prices are not modified.</div>
      </div>}
      {tab==="visibility"&&<div role="tabpanel" className="drawing-settings-visibility">
        <div className="drawing-settings-intro"><strong>Where this drawing appears</strong>
          <p>Choose relevant chart intervals. Market source and symbol remain fixed to prevent accidental misattribution.</p>
        </div>
        <div className="drawing-settings-toggles">
          <label className="drawing-settings-toggle">
            <input type="checkbox" checked={!draft.hidden}
              onChange={e=>setDraft(old=>({...old,hidden:!e.target.checked}))}/>
            <span><strong>Visible on chart</strong><small>Temporarily hide without deleting the object.</small></span>
            {draft.hidden?<EyeOff size={18}/>:<Eye size={18}/>}
          </label>
          <label className="drawing-settings-toggle">
            <input type="checkbox" checked={draft.locked}
              onChange={e=>setDraft(old=>({...old,locked:e.target.checked}))}/>
            <span><strong>Lock position</strong><small>Prevent accidental dragging while retaining settings access.</small></span>
            <Lock size={18}/>
          </label>
        </div>
        <h3>Timeframe visibility</h3>
        <div className="drawing-settings-frame-grid">
          {AVAILABLE_FRAMES.map(frame=>{
            const visible=draft.visibleOnFrames===undefined||
              draft.visibleOnFrames.includes(frame);
            return <label key={frame}>
              <input type="checkbox" aria-label={"Visible on "+frame}
                checked={visible} onChange={e=>{
                  const current=draft.visibleOnFrames??[...AVAILABLE_FRAMES];
                  const next=e.target.checked?[...new Set([...current,frame])]:
                    current.filter(item=>item!==frame);
                  setDraft(old=>({...old,visibleOnFrames:next}));
                }}/>
              <span>{frame}</span>
            </label>;
          })}
        </div>
        <p className="drawing-settings-visibility-help">Your drawing remains saved even when hidden at the active timeframe. The object list always shows it.</p>
      </div>}
    </div>
    {error&&<div className="drawing-dialog-error" role="alert">{error}</div>}
    <footer className="drawing-dialog-footer">
      <button type="button" className="drawing-reset" onClick={()=>{
        setDraft({...drawing});setFields(fieldsFrom(drawing));setError("");
      }}><RotateCcw size={15}/> Restore</button>
      <span/>
      <button type="button" className="drawing-cancel" onClick={onClose}>Cancel</button>
      <button type="button" className="drawing-save" onClick={apply}>
        <Check size={16}/> Apply changes</button>
    </footer>
  </div></div>;
}
