import { ChevronRight, GitBranch, Layers, Magnet, MousePointer2, Repeat2,
  Ruler, Shapes, Smile, Star, TrendingUp, Type, Undo2, Redo2, Waves } from "lucide-react";
import type { RefObject } from "react";
import type { DrawingTool } from "./types";
import { type ToolGroup, TOOL_BY_ID } from "./toolDefinitions";
import { ToolShelf } from "./ToolShelf";
import "./studioRail.css";

const familyIcons={
  Lines:TrendingUp,
  Fibonacci:Waves,
  Patterns:GitBranch,
  Measurement:Ruler,
  Shapes:Shapes,
  Annotations:Type,
  "Icons & Markers":Smile
} as const;
const families:{id:ToolGroup;name:string;detail:string}[]=[
  {id:"Lines",name:"Trend & channels",detail:"Levels, trendlines and geometric projections"},
  {id:"Fibonacci",name:"Fib / Gann",detail:"Ratio overlays, time zones and geometric grids"},
  {id:"Patterns",name:"Patterns & cycles",detail:"Manual pivots, wave annotations and cycle guides"},
  {id:"Measurement",name:"Forecast & measure",detail:"Distance, position illustration and time ranges"},
  {id:"Shapes",name:"Shapes & geometry",detail:"Regions, brushes and directional markup"},
  {id:"Annotations",name:"Text & notes",detail:"Anchor your reasoning to observed chart prices"},
  {id:"Icons & Markers",name:"Markers",detail:"Compact contextual visual labels"},
];

type Props={
  containerRef:RefObject<HTMLDivElement>;
  active:DrawingTool|null;
  opened:boolean;
  category:ToolGroup|null;
  favorites:DrawingTool[];
  recent:DrawingTool[];
  magnet:boolean;
  repeat:boolean;
  canUndo:boolean;
  canRedo:boolean;
  disabled:boolean;
  favoriteBarVisible:boolean;
  onToggleFavoriteBar:()=>void;
  onToggleCategory:(category:ToolGroup|null)=>void;
  onSelect:(tool:DrawingTool)=>void;
  onFavorite:(tool:DrawingTool)=>void;
  onCursor:()=>void;
  onMagnet:()=>void;
  onRepeat:()=>void;
  onUndo:()=>void;
  onRedo:()=>void;
  onObjects:()=>void;
  onClose:()=>void;
};

export function StudioDrawingRail({
  containerRef,active,opened,category,favorites,recent,magnet,repeat,canUndo,canRedo,disabled,favoriteBarVisible,onToggleFavoriteBar,
  onToggleCategory,onSelect,onFavorite,onCursor,onMagnet,onRepeat,onUndo,onRedo,onObjects,onClose
}:Props){
  return <div ref={containerRef} className="studio-rail-root">
    <div className="studio-rail-tools" role="group" aria-label="Chart drawing categories">
      <button type="button" className={"studio-rail-select"+(!active?" active":"")}
        aria-label="Cursor and drawing selection" title="Select chart objects"
        onClick={onCursor}><MousePointer2 size={19}/><span>Cursor</span></button>
      <div className="studio-rail-rule"/>
      {families.map(({id,name,detail})=>{
        const Icon=familyIcons[id];
        const count=favorites.filter(f=>TOOL_BY_ID.get(f)?.group===id).length;
        const selected=opened&&category===id;
        return <button type="button" key={id}
          className={"studio-rail-category"+(selected?" selected":"")+
            (active&&TOOL_BY_ID.get(active)?.group===id?" armed":"")}
          aria-label={"Open "+name+" tools"} aria-expanded={selected}
          aria-description={detail} title={name+": "+detail}
          onClick={()=>onToggleCategory(id)}>
          <Icon size={19}/><ChevronRight size={10} className="studio-rail-chevron"/>
          <span>{name==="Forecast & measure"?"Measure":name==="Fibonacci"?"Fib/Gann":
            name==="Trend & channels"?"Trend":name==="Shapes & geometry"?"Shapes":
            name==="Patterns & cycles"?"Patterns":name==="Text & notes"?"Notes":name}</span>
          {count>0&&<i className="studio-rail-category-pinned" aria-hidden="true"/>}
        </button>;
      })}
      <button type="button" className={"studio-rail-library"+(opened&&category===null?" selected":"")}
        aria-label="More drawing tools" title="Browse the complete categorized Tool Library"
        aria-expanded={opened} onClick={()=>onToggleCategory(null)}>
        <Layers size={19}/><span>Tool library</span>
      </button>
      <div className="studio-rail-rule"/>
      <button type="button" className={"studio-rail-library"+(favoriteBarVisible?" armed":"")}
        aria-label={favoriteBarVisible?"Hide floating favorites toolbar":"Show floating favorites toolbar"}
        aria-pressed={favoriteBarVisible} title="Toggle the floating favorites toolbar"
        onClick={onToggleFavoriteBar}><Star size={19}/><span>Favorites</span></button>
      <div className="studio-rail-utilities" role="group" aria-label="Drawing utilities">
        <button type="button" aria-label="Snap to candle OHLC"
          aria-pressed={magnet} title="Toggle OHLC magnet" onClick={onMagnet}
          className={magnet?"active":""}><Magnet size={16}/></button>
        <button type="button" aria-label="Keep drawing tool active"
          aria-pressed={repeat} title="Repeat drawing tool" onClick={onRepeat}
          className={repeat?"active":""}><Repeat2 size={16}/></button>
        <button type="button" aria-label="Open chart object inspector"
          title="Manage chart drawings" onClick={onObjects}><Layers size={16}/></button>
        <button type="button" aria-label="Undo drawing" title="Undo drawing"
          disabled={!canUndo} onClick={onUndo}><Undo2 size={16}/></button>
        <button type="button" aria-label="Redo drawing" title="Redo drawing"
          disabled={!canRedo} onClick={onRedo}><Redo2 size={16}/></button>
      </div>
    </div>
    {opened&&<ToolShelf active={active} favorites={favorites} recent={recent} disabled={disabled}
      initialGroup={category} onSelect={onSelect} onFavorite={onFavorite} onClose={onClose}/>}
  </div>;
}
