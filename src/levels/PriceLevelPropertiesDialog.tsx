import {useEffect,useRef,useState} from "react";
import {Check,Eye,EyeOff,SlidersHorizontal,X} from "lucide-react";
import {ALL_FRAMES,symbols} from "../market";
import type {Level} from "../workspace";
import {isValidLevel,LEVEL_LINE_STYLES} from "./model";
import "../drawing/drawingSettings.css";
import "./style.css";

type Props={level:Level;onSave:(next:Level)=>void;onClose:()=>void};
export function PriceLevelPropertiesDialog({level,onSave,onClose}:Props){
  const [draft,setDraft]=useState<Level>(level);
  const [price,setPrice]=useState(String(level.price));
  const [error,setError]=useState("");
  const closeButton=useRef<HTMLButtonElement>(null);
  const dialogRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    closeButton.current?.focus();
    const escape=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.stopImmediatePropagation();onClose();}
    };
    window.addEventListener("keydown",escape,true);
    return()=>{window.removeEventListener("keydown",escape,true);if(previous?.isConnected)previous.focus();};
  },[onClose]);
  const save=()=>{
    const next={...draft,price:Number(price)};
    if(price.trim()===""||!isValidLevel(next)){
      setError("Use a positive finite price and a valid level style.");return;
    }
    if(next.id!==level.id||next.symbol!==level.symbol||
      (next.source??"demo")!==(level.source??"demo")){
      setError("Price level identity and market source must remain unchanged.");return;
    }
    onSave(next);onClose();
  };
  const onKeys=(event:import("react").KeyboardEvent<HTMLDivElement>)=>{
    if(event.key!=="Tab")return;
    const items=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])'
    )??[]).filter(el=>el.getClientRects().length>0);
    if(!items.length)return;
    if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1)?.focus();}
    else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0]?.focus();}
  };
  return <div className="drawing-dialog-backdrop" onMouseDown={e=>{
    if(e.target===e.currentTarget)onClose();
  }}><div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Price level settings"
    className="drawing-dialog price-level-dialog" onKeyDown={onKeys}>
    <header className="drawing-dialog-header">
      <div className="drawing-dialog-mark"><SlidersHorizontal size={18}/></div>
      <div className="drawing-dialog-heading">
        <span>CHART / PRICE REFERENCE</span>
        <h2>Price level <small>· {symbols[draft.symbol].label}</small></h2>
      </div>
      <button type="button" ref={closeButton} aria-label="Close price level settings"
        onClick={onClose}><X size={18}/></button>
    </header>
    <div className="drawing-dialog-content">
      <div className="drawing-settings-intro"><strong>Independent level properties</strong>
        <p>Edit the price, label and visual structure of this reference without changing other levels or its source.</p></div>
      <div className="price-level-style-preview" aria-label="Price level style preview">
        <span>LIVE APPEARANCE</span>
        <svg viewBox="0 0 340 58" role="img" aria-label="Preview price level">
          <line x1="12" x2="330" y1="29" y2="29" stroke={draft.color}
            strokeWidth={draft.lineWidth??1.5}
            strokeDasharray={draft.lineStyle===1?"2 5":draft.lineStyle===2||draft.lineStyle===undefined?"8 5":
              draft.lineStyle===3?"16 6":undefined}/>
          <circle cx="12" cy="29" r="3" fill={draft.color}/>
        </svg>
      </div>
      <div className="price-level-fields">
        <label>Reference price
          <input type="number" aria-label="Reference price" min=".000000000001" step="any"
            value={price} onChange={e=>{setPrice(e.target.value);setError("");}}/>
        </label>
        <label>Label
          <input type="text" aria-label="Level label" maxLength={40}
            value={draft.title??"LEVEL"} onChange={e=>setDraft(old=>({...old,title:e.target.value}))}/>
        </label>
        <label>Line color
          <span className="price-level-color"><input type="color" aria-label="Level line color"
            value={draft.color} onChange={e=>setDraft(old=>({...old,color:e.target.value}))}/>
            <code>{draft.color.toUpperCase()}</code></span>
        </label>
        <label>Line weight
          <select aria-label="Level line weight" value={draft.lineWidth??1}
            onChange={e=>setDraft(old=>({...old,lineWidth:Number(e.target.value) as 1|2|3|4}))}>
            {[1,2,3,4].map(value=><option key={value} value={value}>{value}px</option>)}
          </select>
        </label>
        <label>Line style
          <select aria-label="Level line style" value={draft.lineStyle??2}
            onChange={e=>setDraft(old=>({...old,lineStyle:Number(e.target.value) as 0|1|2|3}))}>
            {LEVEL_LINE_STYLES.map(style=><option key={style.value} value={style.value}>{style.label}</option>)}
          </select>
        </label>
      </div>
      <div className="price-level-toggles">
        <label className="drawing-settings-toggle">
          <input type="checkbox" aria-label="Show price level on chart" checked={!draft.hidden}
            onChange={e=>setDraft(old=>({...old,hidden:!e.target.checked}))}/>
          <span><strong>Display level</strong><small>Hide the chart line without deleting the saved level.</small></span>
          {draft.hidden?<EyeOff size={16}/>:<Eye size={16}/>}
        </label>
        <label className="drawing-settings-toggle">
          <input type="checkbox" aria-label="Show level axis label"
            checked={draft.axisLabelVisible!==false}
            onChange={e=>setDraft(old=>({...old,axisLabelVisible:e.target.checked}))}/>
          <span><strong>Price-scale label</strong><small>Show the reference price alongside the chart scale.</small></span>
        </label>
      </div>
      <h3 className="price-level-frame-head">Timeframe visibility</h3>
      <p className="price-level-frame-hint">Choose where this price level appears. Other intervals keep the saved value without displaying the line.</p>
      <div className="drawing-settings-frame-grid">
        {ALL_FRAMES.map(frame=><label key={frame}>
          <input type="checkbox" aria-label={"Show level on "+frame}
            checked={draft.visibleOnFrames===undefined||draft.visibleOnFrames.includes(frame)}
            onChange={e=>{
              const current=draft.visibleOnFrames??[...ALL_FRAMES];
              const next=e.target.checked?[...new Set([...current,frame])]:
                current.filter(item=>item!==frame);
              setDraft(old=>({...old,visibleOnFrames:next}));
            }}/>
          <span>{frame}</span>
        </label>)}
      </div>
    </div>
    {error&&<div role="alert" className="drawing-dialog-error">{error}</div>}
    <footer className="drawing-dialog-footer">
      <span/>
      <button type="button" className="drawing-cancel" onClick={onClose}>Cancel</button>
      <button type="button" className="drawing-save" onClick={save}><Check size={15}/> Apply changes</button>
    </footer>
  </div></div>;
}
