import {useMemo,useState} from "react";
import {ArrowDown,ArrowUp,Check,ChevronDown,Copy,Edit3,FolderPlus,ListPlus,
  Plus,Search,Star,Trash2,X} from "lucide-react";
import {demoCandles,symbols,type Frame,type SymbolId} from "../market";
import {
  activeWatchlist,addSymbol,containsSymbol,createSection,createWatchlist,
  deleteSection,deleteWatchlist,duplicateWatchlist,moveSymbol,removeSymbol,
  renameSection,renameWatchlist,reorderSymbol,selectWatchlist,setSymbolNote,
  toggleStar,type WatchlistsState
} from "./model";
import "./watchlist.css";

type Props={state:WatchlistsState;frame:Frame;selected:SymbolId;
  onChange:(next:WatchlistsState)=>void;onOpen:(symbol:SymbolId)=>void;
  onFeedback:(message:string)=>void};
type SortMode="manual"|"name"|"change";

export function WatchlistPanel({state,frame,selected,onChange,onOpen,onFeedback}:Props){
  const list=activeWatchlist(state);
  const [manage,setManage]=useState(false);
  const [newName,setNewName]=useState("");
  const [renameValue,setRenameValue]=useState("");
  const [newSection,setNewSection]=useState("");
  const [renamingSection,setRenamingSection]=useState<string|null>(null);
  const [sectionName,setSectionName]=useState("");
  const [query,setQuery]=useState("");
  const [pendingSymbol,setPendingSymbol]=useState<SymbolId|null>(null);
  const [editingNote,setEditingNote]=useState<SymbolId|null>(null);
  const [sortMode,setSortMode]=useState<SortMode>("manual");

  const values=useMemo(()=>Object.fromEntries((Object.keys(symbols) as SymbolId[]).map(symbol=>{
    const candles=demoCandles(symbol,frame).slice(-24);
    const last=candles.at(-1)!.close;
    return [symbol,{last,change:(last/candles[0].open-1)*100}];
  })) as Record<SymbolId,{last:number;change:number}>,[frame]);
  const available=(Object.keys(symbols) as SymbolId[]).filter(symbol=>!containsSymbol(list,symbol));
  const nextSymbol=available.includes(pendingSymbol as SymbolId)?pendingSymbol:available[0]??null;
  const change=(next:WatchlistsState,message:string)=>{
    onChange(next);onFeedback(message);
  };
  const create=()=>{
    change(createWatchlist(state,newName),"Watchlist created and saved locally.");
    setNewName("");setManage(false);
  };
  const sortEntries=(entries:typeof list.sections[number]["entries"])=>{
    const rows=[...entries];
    if(sortMode==="name")rows.sort((a,b)=>a.symbol.localeCompare(b.symbol));
    if(sortMode==="change")rows.sort((a,b)=>values[b.symbol].change-values[a.symbol].change);
    return rows.filter(entry=>[entry.symbol,symbols[entry.symbol].label,entry.note]
      .join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  };
  return <section className="wl-root" aria-label="Watchlist workspace">
    <header className="wl-heading">
      <div><strong>Watchlists</strong><span>Synthetic quotes · {frame} · 24 bars</span></div>
      <button type="button" aria-label="Manage watchlists" aria-expanded={manage} title="Manage watchlists"
        onClick={()=>{setManage(v=>!v);setRenameValue(list.name);}}><Edit3 size={15}/></button>
    </header>
    <div className="wl-selector">
      <label className="wl-select">
        <span className="sr-only">Active watchlist</span>
        <select aria-label="Active watchlist" value={list.id}
          onChange={event=>onChange(selectWatchlist(state,event.target.value))}>
          {state.lists.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
        </select><ChevronDown size={14}/>
      </label>
      <button type="button" aria-label="Duplicate watchlist" title="Duplicate list" onClick={()=>
        change(duplicateWatchlist(state),"Watchlist duplicated.")}><Copy size={15}/></button>
    </div>
    {manage&&<div className="wl-manager" aria-label="Watchlist manager">
      <label>Rename list
        <div className="wl-input-action"><input value={renameValue} maxLength={80}
          aria-label="Rename watchlist" onChange={e=>setRenameValue(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&renameValue.trim()){
            change(renameWatchlist(state,renameValue),"Watchlist renamed.");}}}/>
          <button type="button" disabled={!renameValue.trim()} aria-label="Save watchlist name" onClick={()=>
            change(renameWatchlist(state,renameValue),"Watchlist renamed.")}><Check size={15}/></button>
        </div>
      </label>
      <label>New list
        <div className="wl-input-action"><input value={newName} maxLength={80}
          aria-label="New watchlist name" placeholder="e.g. Breakout setups"
          onKeyDown={e=>{if(e.key==="Enter")create();}}
          onChange={e=>setNewName(e.target.value)}/>
          <button type="button" aria-label="Create watchlist" onClick={create}><Plus size={16}/></button>
        </div>
      </label>
      <button type="button" className="wl-danger-action" disabled={state.lists.length<2}
        onClick={()=>{if(window.confirm("Delete this watchlist? The other lists will be kept.")){
          change(deleteWatchlist(state),"Watchlist deleted.");setManage(false);
        }}}><Trash2 size={13}/> Delete current list</button>
    </div>}
    <label className="wl-search"><Search size={14}/>
      <input value={query} onChange={e=>setQuery(e.target.value)}
        aria-label="Filter watchlist" placeholder="Find a symbol or note"/>
      {query&&<button aria-label="Clear watchlist filter" onClick={()=>setQuery("")}><X size={13}/></button>}
    </label>
    <div className="wl-toolbar">
      <span>{list.sections.reduce((count,part)=>count+part.entries.length,0)} symbols</span>
      <label>Order <select aria-label="Sort watchlist" value={sortMode}
        onChange={e=>setSortMode(e.target.value as SortMode)}>
        <option value="manual">Custom</option>
        <option value="name">Name</option>
        <option value="change">24-bar move</option>
      </select></label>
    </div>
    <div className="wl-sections">
      {list.sections.map(section=>{
        const rows=sortEntries(section.entries);
        return <section className="wl-section" key={section.id} aria-label={"Watchlist section "+section.name}>
          <div className="wl-section-head">
            {renamingSection===section.id?
              <input autoFocus aria-label={"Rename section "+section.name} maxLength={80}
                value={sectionName} onChange={e=>setSectionName(e.target.value)}
                onKeyDown={e=>{
                  if(e.key==="Enter"&&sectionName.trim()){
                    change(renameSection(state,section.id,sectionName),"Section renamed.");setRenamingSection(null);
                  }else if(e.key==="Escape")setRenamingSection(null);
                }}/>:
              <button type="button" className="wl-section-name" title="Rename section" onClick={()=>{
                setRenamingSection(section.id);setSectionName(section.name);
              }}>{section.name}<span>{section.entries.length}</span></button>}
            {renamingSection===section.id&&<button aria-label={"Save section "+section.name}
              onClick={()=>{change(renameSection(state,section.id,sectionName),"Section renamed.");
                setRenamingSection(null);}}><Check size={13}/></button>}
            {list.sections.length>1&&<button type="button" className="wl-section-delete"
              aria-label={"Remove section "+section.name} title="Remove section; keep its symbols"
              onClick={()=>change(deleteSection(state,section.id),"Section removed. Its symbols were kept.")}>
              <X size={13}/></button>}
          </div>
          {rows.map(entry=>{
            const quote=values[entry.symbol],precision=symbols[entry.symbol].precision;
            return <div key={entry.symbol} className={"wl-item"+(entry.symbol===selected?" is-selected":"")}>
              <div className="wl-item-primary">
                <button className="wl-star" type="button"
                  aria-label={(entry.starred?"Unstar ":"Star ")+entry.symbol} aria-pressed={entry.starred}
                  title="Mark as favorite"
                  onClick={()=>change(toggleStar(state,entry.symbol),"Watchlist favorite updated.")}>
                  <Star size={14} fill={entry.starred?"currentColor":"none"}/>
                </button>
                <button type="button" className="wl-open" aria-label={"Open "+entry.symbol+" chart"}
                  onClick={()=>onOpen(entry.symbol)}><strong>{symbols[entry.symbol].label}</strong>
                  <small>{symbols[entry.symbol].market.split(" · ")[0]} · DEMO</small></button>
                <div className="wl-quote"><strong>{quote.last.toFixed(precision)}</strong>
                  <span className={quote.change>=0?"quote-up":"quote-down"}>{quote.change>=0?"+":""}{quote.change.toFixed(2)}%</span></div>
              </div>
              <div className="wl-item-actions">
                <button type="button" aria-label={"Edit note for "+entry.symbol}
                  aria-expanded={editingNote===entry.symbol} title="Note"
                  onClick={()=>setEditingNote(editingNote===entry.symbol?null:entry.symbol)}>
                  <Edit3 size={12}/><span>{entry.note?"Note ·":"Note"}</span></button>
                {sortMode==="manual"&&<>
                  <button aria-label={"Move "+entry.symbol+" up"} title="Move up"
                    onClick={()=>onChange(reorderSymbol(state,entry.symbol,-1))}><ArrowUp size={13}/></button>
                  <button aria-label={"Move "+entry.symbol+" down"} title="Move down"
                    onClick={()=>onChange(reorderSymbol(state,entry.symbol,1))}><ArrowDown size={13}/></button>
                </>}
                {list.sections.length>1&&<select className="wl-move" value={section.id}
                  aria-label={"Section for "+entry.symbol}
                  onChange={e=>change(moveSymbol(state,entry.symbol,e.target.value),"Symbol moved to section.")}>
                  {list.sections.map(part=><option value={part.id} key={part.id}>{part.name}</option>)}
                </select>}
                <button className="wl-remove" title="Remove from list"
                  aria-label={"Remove "+entry.symbol+" from watchlist"}
                  onClick={()=>change(removeSymbol(state,entry.symbol),"Symbol removed from this watchlist.")}>
                  <X size={13}/></button>
              </div>
              {editingNote===entry.symbol&&<textarea rows={2} maxLength={600}
                aria-label={"Watchlist note "+entry.symbol}
                placeholder="Your own observation (stored on this device)"
                value={entry.note} onChange={e=>onChange(setSymbolNote(state,entry.symbol,e.target.value))}/>}
            </div>;
          })}
          {!rows.length&&<p className="wl-empty">{query?"No matches in this section.":"No instruments in this section."}</p>}
        </section>;
      })}
    </div>
    <div className="wl-add">
      <label>Add instrument <select aria-label="Instrument to add" value={nextSymbol??""}
        disabled={!nextSymbol} onChange={e=>setPendingSymbol(e.target.value as SymbolId)}>
        {!nextSymbol&&<option value="">All available symbols added</option>}
        {available.map(id=><option key={id} value={id}>{symbols[id].label}</option>)}
      </select></label>
      <button aria-label="Add instrument to watchlist" disabled={!nextSymbol} type="button"
        onClick={()=>{if(nextSymbol)change(addSymbol(state,nextSymbol),"Instrument added to watchlist.");}}>
        <ListPlus size={15}/> Add</button>
    </div>
    <div className="wl-section-create">
      <input value={newSection} maxLength={80} aria-label="New section name"
        placeholder="New section" onChange={e=>setNewSection(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter"){change(createSection(state,newSection),"Section created.");setNewSection("");}}}/>
      <button aria-label="Add watchlist section" title="Add section" onClick={()=>{
        change(createSection(state,newSection),"Section created.");setNewSection("");
      }}><FolderPlus size={15}/></button>
    </div>
    <p className="wl-disclaimer">Watchlist lists and notes persist locally. All prices here are synthetic illustrations, never exchange quotes.</p>
  </section>;
}
