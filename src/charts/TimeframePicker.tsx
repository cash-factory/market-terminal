import {useEffect,useRef,useState} from "react";
import {ChevronDown,Clock3,Search,X} from "lucide-react";
import {ALL_FRAMES,SECOND_FRAMES,MINUTE_FRAMES,type Frame} from "../market";
import "./timeframePicker.css";

type Props={value:Frame;source:"demo"|"binance";onSelect:(frame:Frame)=>void};
const quick:Frame[]=["1m","5m","1h"];
const sections=[
  {title:"SECONDS",subtitle:"Native 1s exchange candles or clearly synthetic preview",list:SECOND_FRAMES},
  {title:"MINUTES · HOURS · DAYS",subtitle:"Source-native standard resolutions",list:MINUTE_FRAMES}
] as const;

export function TimeframePicker({value,source,onSelect}:Props){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const ref=useRef<HTMLDivElement>(null);
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    if(!open)return;
    input.current?.focus();
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.stopPropagation();setOpen(false);}};
    const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!ref.current?.contains(event.target))setOpen(false);};
    window.addEventListener("keydown",onKey);document.addEventListener("pointerdown",outside);
    return()=>{window.removeEventListener("keydown",onKey);document.removeEventListener("pointerdown",outside);};
  },[open]);
  const choose=(frame:Frame)=>{
    onSelect(frame);setOpen(false);setQuery("");
  };
  const filtered=(items:readonly Frame[])=>items.filter(t=>t.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="interval-picker" ref={ref}>
    <div className="interval-quick" role="group" aria-label="Quick chart intervals">
      {quick.map(frame=><button key={frame} type="button" aria-pressed={value===frame}
        className={value===frame?"active":""} onClick={()=>choose(frame)}>{frame}</button>)}
    </div>
    <button type="button" className={"interval-trigger "+(open||!quick.includes(value)?"active":"")}
      aria-label="Chart interval" aria-expanded={open} aria-haspopup="dialog"
      onClick={()=>setOpen(v=>!v)}><Clock3 size={14}/>
      <strong>{value}</strong><ChevronDown size={13}/></button>
    {open&&<section className="interval-popover" role="dialog" aria-label="Chart interval selector">
      <header><div><span>CHART RESOLUTION</span><strong>Timeframes</strong></div>
        <button type="button" aria-label="Close interval selector" onClick={()=>setOpen(false)}><X size={16}/></button></header>
      <label className="interval-search"><Search size={14}/>
        <input ref={input} type="search" value={query} onChange={e=>setQuery(e.target.value)}
          aria-label="Find interval" placeholder="Find 1s, 15s, 4h…"/></label>
      <div className="interval-groups">
        {sections.map(section=>{
          const choices=filtered(section.list);
          if(!choices.length)return null;
          return <div className="interval-section" key={section.title}>
            <div className="interval-section-title"><strong>{section.title}</strong><small>{choices.length} intervals</small></div>
            <div className="interval-grid">{choices.map(frame=><button key={frame}
              type="button" aria-label={"Select "+frame+" timeframe"} aria-pressed={frame===value}
              className={frame===value?"active":""} onClick={()=>choose(frame)}>
              <span>{frame}</span>{frame===value&&<i aria-hidden="true"/>}</button>)}</div>
          </div>;
        })}
        {!ALL_FRAMES.some(frame=>frame.includes(query.trim().toLowerCase()))&&
          <p className="interval-no-match">No interval found. Choose an available resolution.</p>}
      </div>
      <footer><span className="interval-feed-dot"/>
        {source==="binance"?"Binance Spot: seconds assembled from observed native 1s candles; missing seconds are never interpolated.": "No production price feed selected. Synthetic prices exist only in automated test fixtures."}
      </footer>
    </section>}
  </div>;
}
