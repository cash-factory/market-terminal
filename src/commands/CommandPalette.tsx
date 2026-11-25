import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, ChartCandlestick, Command, Compass, Layers3, Search, X } from "lucide-react";
import { symbols, type SymbolId } from "../market";
import { filterTerminalCommands } from "./catalog";
import "./style.css";

type Result =
  | { kind: "instrument"; key: string; symbol: SymbolId }
  | { kind: "command"; key: string; id: string; label: string; description: string; category: string };

type Props = {
  onClose: () => void;
  onOpenInstrument: (symbol: SymbolId) => void;
  onExecuteCommand: (command: string) => void;
};

const instrumentIds=Object.keys(symbols) as SymbolId[];

export function CommandPalette({onClose,onOpenInstrument,onExecuteCommand}:Props){
  const [query,setQuery]=useState("");
  const [activeIndex,setActiveIndex]=useState(0);
  const searchRef=useRef<HTMLInputElement>(null);
  const oldFocus=useRef<HTMLElement|null>(null);
  const results=useMemo(()=>{
    const q=query.trim().toLowerCase();
    const instruments:Result[]=instrumentIds.filter(symbol=>
      [symbol,symbols[symbol].label,symbols[symbol].market].join(" ").toLowerCase().includes(q)
    ).map(symbol=>({kind:"instrument",key:"symbol:"+symbol,symbol}));
    const actions:Result[]=filterTerminalCommands(query).map(item=>({
      kind:"command",key:item.id,id:item.id,label:item.label,
      description:item.description,category:item.category,
    }));
    return [...instruments,...actions];
  },[query]);
  useEffect(()=>{
    oldFocus.current=document.activeElement instanceof HTMLElement ? document.activeElement : null;
    searchRef.current?.focus();
    return ()=>{if(oldFocus.current?.isConnected)oldFocus.current.focus();};
  },[]);
  useEffect(()=>{
    document.getElementById("atlas-row-"+activeIndex)?.scrollIntoView({block:"nearest"});
  },[activeIndex,results]);
  const select=(result:Result)=>{
    if(result.kind==="instrument")onOpenInstrument(result.symbol);
    else onExecuteCommand(result.id);
    onClose();
  };
  const keyDown=(event:KeyboardEvent<HTMLInputElement>)=>{
    if(event.key==="Escape"){event.preventDefault();onClose();return;}
    if(event.key==="ArrowDown"){event.preventDefault();setActiveIndex(i=>Math.min(Math.max(0,results.length-1), i+1));}
    if(event.key==="ArrowUp"){event.preventDefault();setActiveIndex(i=>Math.max(0,i-1));}
    if(event.key==="Enter"&&results[activeIndex]){
      event.preventDefault();select(results[activeIndex]);
    }
  };
  return <div className="modal-backdrop atlas-backdrop" onMouseDown={event=>{
    if(event.target===event.currentTarget)onClose();
  }}><div className="command-dialog atlas-dialog" role="dialog" aria-modal="true" aria-label="Search instruments and tools">
    <div className="command-input atlas-input">
      <Search size={19}/>
      <input ref={searchRef} role="combobox" aria-label="Search instruments and tools"
        aria-autocomplete="list" aria-expanded="true" aria-controls="atlas-options"
        aria-activedescendant={results[activeIndex]?"atlas-row-"+activeIndex:undefined}
        value={query} placeholder="Search markets, drawings or actions…"
        onChange={event=>{setQuery(event.target.value);setActiveIndex(0);}}
        onKeyDown={keyDown}/>
      <kbd>CTRL K</kbd>
      <button onClick={onClose} aria-label="Close tool search"><X size={17}/></button>
    </div>
    <div className="atlas-meta-bar"><span>TOOL ATLAS / SEARCH YOUR WORKSTATION</span>
      <span>{results.length} {results.length===1?"result":"results"}</span></div>
    <div id="atlas-options" className="atlas-results" role="listbox" aria-label="Market instruments and commands">
      {results.map((result,index)=><div key={result.key} className="atlas-row" role="presentation">
        {index===0&&<span className="atlas-group-title">AVAILABLE RESULTS</span>}
        <button id={"atlas-row-"+index} role="option"
          aria-selected={index===activeIndex}
          className={"atlas-result"+(index===activeIndex?" keyboard-active":"")}
          onMouseEnter={()=>setActiveIndex(index)} onClick={()=>select(result)}>
          <span className={"atlas-result-icon "+(result.kind==="instrument"?"instrument":"command")}>
            {result.kind==="instrument"?<ChartCandlestick size={17}/>:
              result.category==="Draw"?<Compass size={17}/>:<Layers3 size={17}/>}</span>
          <span className="atlas-result-main">
            <strong>{result.kind==="instrument"?symbols[result.symbol].label:result.label}</strong>
            <small>{result.kind==="instrument"?symbols[result.symbol].market+(symbols[result.symbol].market.includes("PROVIDER REQUIRED")?" · No actual OHLC data configured":" · Direct public spot candles"):result.description}</small>
          </span>
          <span className="atlas-result-type">{result.kind==="instrument"?"INSTRUMENT":result.category.toUpperCase()}</span>
          <ArrowRight size={15} className="atlas-result-arrow"/>
        </button>
      </div>)}
      {!results.length&&<div className="atlas-empty"><Search size={22}/>
        <strong>No matching tools or instruments</strong>
        <span>Try “Fibonacci”, “Decision”, “RSI” or “Replay”. Unsupported tools aren't shown as available.</span>
      </div>}
    </div>
    <div className="command-hint atlas-hint"><Command size={14}/> <span>↑↓ to navigate · Enter to activate · Esc to dismiss</span>
      <span className="atlas-hint-right">Functional tools only <span aria-hidden="true">●</span></span></div>
  </div></div>;
}
