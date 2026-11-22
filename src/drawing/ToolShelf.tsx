import { useMemo, useState } from "react";
import { Check, Clock3, Compass, Pin, Search, Star, X } from "lucide-react";
import type { DrawingTool } from "./types";
import {
  filterDrawingTools, TOOL_BY_ID, TOOL_GROUPS, type ToolGroup, type ToolDefinition
} from "./toolDefinitions";
import "./toolShelf.css";

type Props={
  active:DrawingTool|null;
  favorites:DrawingTool[];
  recent:DrawingTool[];
  disabled:boolean;
  onSelect:(tool:DrawingTool)=>void;
  onFavorite:(tool:DrawingTool)=>void;
  onClose:()=>void;
};

export function ToolShelf({
  active,favorites,recent,disabled,onSelect,onFavorite,onClose
}:Props){
  const [query,setQuery]=useState("");
  const [group,setGroup]=useState<ToolGroup|null>(null);
  const visible=useMemo(()=>filterDrawingTools(query,group??undefined),[query,group]);
  const favoriteTools=favorites.map(id=>TOOL_BY_ID.get(id)).filter(
    (tool):tool is ToolDefinition=>Boolean(tool)
  );
  const recentTools=recent.filter(id=>!favorites.includes(id)).slice(0,3)
    .map(id=>TOOL_BY_ID.get(id)).filter((tool):tool is ToolDefinition=>Boolean(tool));
  const sections=group?[group]:TOOL_GROUPS.filter(value=>visible.some(tool=>tool.group===value));
  const choose=(tool:DrawingTool)=>{if(!disabled)onSelect(tool);};
  return <section className="advanced-tool-menu tool-shelf" role="group" aria-label="Advanced drawing tools">
    <header className="tool-shelf-head">
      <div className="tool-shelf-ident"><span className="tool-shelf-symbol"><Compass size={19}/></span>
        <div><span>MARKET TERMINAL / STUDY TOOLS</span><strong>Tool Library</strong></div></div>
      <button type="button" className="tool-shelf-close" onClick={onClose} aria-label="Close tool library"><X size={18}/></button>
    </header>
    <div className="tool-shelf-filter">
      <label className="tool-shelf-search"><Search size={16}/>
        <input type="search" aria-label="Search drawing tools" placeholder="Search tools and techniques…"
          value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <div className="tool-shelf-groups" role="group" aria-label="Drawing tool category">
        <button type="button" className={!group?"active":""} aria-pressed={!group}
          onClick={()=>setGroup(null)}>All tools</button>
        {TOOL_GROUPS.map(value=><button key={value} type="button"
          className={group===value?"active":""} aria-pressed={group===value}
          onClick={()=>setGroup(old=>old===value?null:value)}>{value}</button>)}
      </div>
    </div>
    {(!query&&!group)&&<div className="tool-shelf-pinned">
      <div className="tool-shelf-section-heading"><span><Pin size={13}/> YOUR FAVORITES</span>
        <small>{favorites.length}/12 pinned</small></div>
      <div className="tool-shelf-pinned-list">
        {favoriteTools.map(tool=><button className={"tool-shelf-chip"+(active===tool.id?" selected":"")}
          type="button" key={tool.id} disabled={disabled} onClick={()=>choose(tool.id)}
          aria-label={"Use favorite "+tool.label}>{tool.label}</button>)}
        {!favoriteTools.length&&<p>Star the tools you use most to keep them here.</p>}
      </div>
      {recentTools.length>0&&<div className="tool-shelf-recents">
        <Clock3 size={12}/><span>Recent</span>{recentTools.map(tool=>
          <button type="button" key={tool.id} disabled={disabled}
            onClick={()=>choose(tool.id)} aria-label={"Reuse recent "+tool.label}>
            {tool.label}</button>)}
      </div>}
    </div>}
    <div className="tool-shelf-scroll">
      <div className="tool-shelf-section-heading">
        <span>AVAILABLE TOOL CATALOG</span><small>{visible.length} ready</small>
      </div>
      {sections.map(section=><div key={section} className="tool-shelf-section">
        <h3>{section}</h3>
        {visible.filter(tool=>tool.group===section).map(tool=>{
          const pinned=favorites.includes(tool.id);
          const activeTool=active===tool.id;
          return <div className={"tool-shelf-row"+(activeTool?" active":"")} key={tool.id}>
            <button type="button" className="tool-shelf-select"
              disabled={disabled} onClick={()=>choose(tool.id)}
              title={tool.description} aria-pressed={activeTool}>
              <span className="tool-shelf-tool-mark">{tool.points===1?"1":tool.points===2?"2":"3"}</span>
              <span className="tool-shelf-tool-copy"><strong>{tool.label}</strong>
                <small>{tool.description}</small></span>
              {activeTool&&<Check size={15} className="tool-shelf-check"/>}
            </button>
            <button type="button" className={"tool-shelf-star"+(pinned?" pinned":"")}
              aria-label={(pinned?"Remove ":"Add ")+tool.label+(pinned?" from favorites":" to favorites")}
              aria-pressed={pinned} title={pinned?"Unpin tool":"Pin to favorites"}
              onClick={()=>onFavorite(tool.id)}>
              <Star size={16} fill={pinned?"currentColor":"none"}/></button>
          </div>;
        })}
      </div>)}
      {visible.length===0&&<div className="tool-shelf-empty">
        <Search size={22}/><strong>No implemented tools found</strong>
        <p>Search another technique. Unimplemented drawing families are not selectable.</p>
      </div>}
    </div>
    <footer className="tool-shelf-foot">
      <span><span className="tool-shelf-dot"/> {disabled?"Awaiting candles":"Ready to place on chart"}</span>
      <span>Pick → draw → edit · Esc cancels</span>
    </footer>
  </section>;
}
