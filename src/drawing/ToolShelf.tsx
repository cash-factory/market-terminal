import {useEffect,useMemo,useRef,useState} from "react";
import {Check,ChevronDown,Clock3,Compass,Pin,Search,Star,X} from "lucide-react";
import type {DrawingTool} from "./types";
import {REFERENCE_BACKLOG} from "./referenceInventory";
import {filterDrawingTools,TOOL_BY_ID,TOOL_GROUPS,type ToolGroup,type ToolDefinition} from "./toolDefinitions";
import {TOOL_SECTIONS} from "./toolTaxonomy";
import {ToolGlyph,ToolGuide} from "./ToolGlyph";
import "./toolShelf.css";

type Props={
  active:DrawingTool|null;favorites:DrawingTool[];recent:DrawingTool[];disabled:boolean;
  onSelect:(tool:DrawingTool)=>void;onFavorite:(tool:DrawingTool)=>void;onClose:()=>void;
  initialGroup?:ToolGroup|null;
};
const groupLabels:Record<ToolGroup,string>={
 Lines:"Lines & channels",Fibonacci:"Fibonacci & Gann",Patterns:"Patterns & cycles",
 Measurement:"Forecast & measure",Shapes:"Shapes & emphasis",Annotations:"Notes & labels",
 "Icons & Markers":"Markers"
};
const groupNotes:Record<ToolGroup,string>={
 Lines:"References, trends, fitted channels and median constructions",
 Fibonacci:"Editable price ratios, temporal guides and proportional geometry",
 Patterns:"Manual swing structures without unverified detection claims",
 Measurement:"Observed distances and illustrative position geometry",
 Shapes:"Precise regions and transparent directional emphasis",
 Annotations:"Context anchored to actual market time and price",
 "Icons & Markers":"Compact contextual symbols"
};
export function ToolShelf({
 active,favorites,recent,disabled,onSelect,onFavorite,onClose,initialGroup=null
}:Props){
 const [query,setQuery]=useState("");
 const [group,setGroup]=useState<ToolGroup|null>(initialGroup);
 const [focused,setFocused]=useState<DrawingTool|null>(active);
 const [collapsed,setCollapsed]=useState<string[]>([]);
 const searchRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{
   const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
   searchRef.current?.focus();
   return()=>{if(previous?.isConnected)previous.focus();};
 },[]);
 useEffect(()=>{setGroup(initialGroup);setQuery("");setCollapsed([]);},[initialGroup]);
 const visible=useMemo(()=>filterDrawingTools(query,group??undefined),[query,group]);
 const favoriteTools=favorites.map(id=>TOOL_BY_ID.get(id))
   .filter((tool):tool is ToolDefinition=>Boolean(tool));
 const recentTools=recent.filter(id=>!favorites.includes(id)).slice(0,3)
   .map(id=>TOOL_BY_ID.get(id))
   .filter((tool):tool is ToolDefinition=>Boolean(tool));
 const sections=useMemo(()=>{
   const families=group?[group]:TOOL_GROUPS;
   return families.flatMap(family=>TOOL_SECTIONS[family].map(section=>({
     family,section,tools:section.tools
       .filter(id=>visible.some(tool=>tool.id===id))
       .map(id=>TOOL_BY_ID.get(id)!)
   })).filter(section=>section.tools.length>0));
 },[group,visible]);
 const focusTool=visible.some(tool=>tool.id===focused)?focused:
   visible.some(tool=>tool.id===active)?active:visible[0]?.id??null;
 const choose=(tool:DrawingTool)=>{if(!disabled){setFocused(tool);onSelect(tool);}};
 const changeCategory=(value:ToolGroup|null)=>{setGroup(value);setCollapsed([]);};
 const toggleSection=(key:string)=>setCollapsed(previous=>
   previous.includes(key)?previous.filter(id=>id!==key):[...previous,key]);
 const updateSearch=(value:string)=>{setQuery(value);if(value)changeCategory(null);};
 return <section className="advanced-tool-menu tool-shelf" role="group" aria-label="Advanced drawing tools">
   <header className="tool-shelf-head">
     <div className="tool-shelf-ident"><span className="tool-shelf-symbol"><Compass size={18}/></span>
       <div><span>CHART TOOLS</span><strong>Drawing library</strong></div></div>
     <span className="tool-shelf-count">{visible.length} tools</span>
     <button type="button" className="tool-shelf-close" onClick={onClose}
       aria-label="Close tool library"><X size={18}/></button>
   </header>
   <div className="tool-shelf-filter">
     <label className="tool-shelf-search"><Search size={15}/>
       <input ref={searchRef} type="search" aria-label="Search drawing tools"
         placeholder="Find a tool or technique…" value={query}
         onChange={event=>updateSearch(event.target.value)}
         onKeyDown={event=>{
           if(event.key==="Enter"&&visible[0]){event.preventDefault();choose(visible[0].id);}
           if(event.key==="Escape"){event.stopPropagation();onClose();}
         }}/></label>
   </div>
   <div className="tool-shelf-main">
     <nav className="tool-shelf-groups" aria-label="Drawing tool category">
       <span className="tool-shelf-nav-caption">FAMILIES</span>
       <button type="button" className={!group?"active":""} aria-pressed={!group}
         onClick={()=>changeCategory(null)}><span>All tools</span><small>{filterDrawingTools(query).length}</small></button>
       {TOOL_GROUPS.map(value=><button key={value} type="button" aria-label={value}
         className={group===value?"active":""} aria-pressed={group===value}
         onClick={()=>changeCategory(value)}>
         <span>{groupLabels[value]}</span><small>{filterDrawingTools(query,value).length}</small>
       </button>)}
     </nav>
     <div className="tool-shelf-body">
       <div className="tool-shelf-section-intro">
         <div><span>{group?"SELECTED FAMILY":"ALL DRAWING FAMILIES"}</span>
           <strong>{group?groupLabels[group]:"Tools, organized by purpose"}</strong>
           <p>{group?groupNotes[group]:"Choose a family, then a technique. Hover or focus a tool to inspect how it works."}</p></div>
       </div>
       {!query&&!group&&<div className="tool-shelf-pinned">
         <div className="tool-shelf-section-heading">
           <span><Pin size={12}/> FAVORITES</span><small>{favorites.length} pinned</small></div>
         <div className="tool-shelf-pinned-list">
           {favoriteTools.map(tool=><button className={"tool-shelf-chip"+(active===tool.id?" selected":"")}
             type="button" key={tool.id} disabled={disabled} onClick={()=>choose(tool.id)}
             onMouseEnter={()=>setFocused(tool.id)} aria-label={"Use favorite "+tool.label}>
             <ToolGlyph tool={tool.id} size={16}/>{tool.label}</button>)}
           {!favoriteTools.length&&<p>Star a tool to keep it one click away.</p>}
         </div>
         {recentTools.length>0&&<div className="tool-shelf-recents">
           <Clock3 size={12}/><span>Recent</span>{recentTools.map(tool=>
             <button type="button" key={tool.id} disabled={disabled}
               onMouseEnter={()=>setFocused(tool.id)} onClick={()=>choose(tool.id)}
               aria-label={"Reuse recent "+tool.label}>{tool.label}</button>)}
         </div>}
       </div>}
       <div className="tool-shelf-scroll">
         {sections.map(({family,section,tools})=>{
           const key=family+"/"+section.name,closed=collapsed.includes(key);
           return <section key={key} className="tool-shelf-section">
             <button type="button" className="tool-shelf-subfamily"
               aria-expanded={!closed} aria-label={"Toggle "+section.name+" subgroup"}
               onClick={()=>toggleSection(key)}>
               <span><strong>{section.name}</strong><small>{section.purpose}</small></span>
               <i>{tools.length}</i><ChevronDown size={14}/>
             </button>
             {!closed&&<div className="tool-shelf-section-tools">
               {tools.map(tool=>{
                 const pinned=favorites.includes(tool.id),activeTool=active===tool.id;
                 return <div className={"tool-shelf-row"+(activeTool?" active":"")} key={tool.id}>
                   <button type="button" className="tool-shelf-select"
                     onMouseEnter={()=>setFocused(tool.id)} onFocus={()=>setFocused(tool.id)}
                     disabled={disabled} onClick={()=>choose(tool.id)}
                     aria-label={tool.label} aria-pressed={activeTool}>
                     <span className="tool-shelf-tool-mark"><ToolGlyph tool={tool.id} size={27}/></span>
                     <span className="tool-shelf-tool-copy"><strong>{tool.label}</strong>
                       <small>{tool.description}</small></span>
                     <span className="tool-shelf-anchor-count">{tool.points===1?"1 PT":tool.points+" PTS"}</span>
                     {activeTool&&<Check size={14} className="tool-shelf-check"/>}
                   </button>
                   <button type="button" className={"tool-shelf-star"+(pinned?" pinned":"")}
                     aria-label={(pinned?"Remove ":"Add ")+tool.label+
                       (pinned?" from favorites":" to favorites")}
                     aria-pressed={pinned} title={pinned?"Unpin tool":"Pin to favorites"}
                     onClick={()=>onFavorite(tool.id)}>
                     <Star size={14} fill={pinned?"currentColor":"none"}/></button>
                 </div>;
               })}
             </div>}
           </section>;
         })}
         {visible.length===0&&<div className="tool-shelf-empty">
           <Search size={21}/><strong>No matching drawing tool</strong>
           <p>Try another term. Only implemented tools are selectable.</p>
         </div>}
         {group&&!query&&<details className="tool-shelf-backlog">
           <summary>Additional tools researched for this family
             <span>{REFERENCE_BACKLOG[group].length}</span></summary>
           <p>These names are design references, not working tools. They stay disabled until their geometry and data requirements are tested.</p>
           <div>{REFERENCE_BACKLOG[group].map(name=><span key={name}>{name} · Not yet available</span>)}</div>
         </details>}
       </div>
       {focusTool&&<ToolGuide tool={focusTool}/>}
     </div>
   </div>
   <footer className="tool-shelf-foot">
     <span><span className="tool-shelf-dot"/> {disabled?"Waiting for chart data":"Ready to draw"}</span>
     <span>Drag or click anchors · Esc to exit</span>
   </footer>
 </section>;
}
