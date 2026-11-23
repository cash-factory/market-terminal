import {useEffect,useRef,useState,type DragEvent,type PointerEvent} from "react";
import {ChevronDown,ChevronLeft,ChevronRight,Grip,LayoutList,Settings2,Star,X} from "lucide-react";
import type {DrawingTool} from "./types";
import {TOOL_BY_ID} from "./toolDefinitions";
import {ToolGlyph} from "./ToolGlyph";
import type {FavoriteBarLayout} from "../workspace";
import {moveFavorite} from "./favorites";
import "./favoriteToolbar.css";

type Props={favorites:DrawingTool[];active:DrawingTool|null;disabled:boolean;layout:FavoriteBarLayout;
 onLayout:(layout:FavoriteBarLayout)=>void;onSelect:(tool:DrawingTool)=>void;onUnpin:(tool:DrawingTool)=>void;
 onReorder:(next:DrawingTool[])=>void;onBrowse:()=>void};
type Position={x:number;y:number};
export function FavoriteToolbar({favorites,active,disabled,layout,onLayout,onSelect,onUnpin,onReorder,onBrowse}:Props){
 const bar=useRef<HTMLDivElement>(null);
 const drag=useRef<{id:number;x:number;y:number;origin:Position}|null>(null);
 const itemDrag=useRef<DrawingTool|null>(null);
 const [position,setPosition]=useState<Position>({x:layout.x,y:layout.y});
 const [editing,setEditing]=useState(false);
 const [moving,setMoving]=useState(false);
 const clamp=(x:number,y:number):Position=>{
   const rect=bar.current?.getBoundingClientRect();
   return {x:Math.max(8,Math.min(x,Math.max(8,window.innerWidth-(rect?.width??250)-8))),
     y:Math.max(8,Math.min(y,Math.max(8,window.innerHeight-(rect?.height??42)-8)))};
 };
 useEffect(()=>setPosition({x:layout.x,y:layout.y}),[layout.x,layout.y]);
 useEffect(()=>{
   const fit=()=>setPosition(old=>{const next=clamp(old.x,old.y);
     return next.x===old.x&&next.y===old.y?old:next;});
   fit();window.addEventListener("resize",fit);return()=>window.removeEventListener("resize",fit);
 },[layout.orientation,layout.collapsed,favorites.length,editing]);
 const start=(e:PointerEvent<HTMLButtonElement>)=>{
   if(e.button!==0)return;e.preventDefault();
   drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,origin:position};
   e.currentTarget.setPointerCapture(e.pointerId);setMoving(true);
 };
 const move=(e:PointerEvent<HTMLButtonElement>)=>{
   const d=drag.current;if(!d||d.id!==e.pointerId)return;
   setPosition(clamp(d.origin.x+e.clientX-d.x,d.origin.y+e.clientY-d.y));
 };
 const stop=(e:PointerEvent<HTMLButtonElement>)=>{
   const d=drag.current;if(!d||d.id!==e.pointerId)return;
   const next=clamp(d.origin.x+e.clientX-d.x,d.origin.y+e.clientY-d.y);
   drag.current=null;setMoving(false);setPosition(next);
   if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
   onLayout({...layout,...next});
 };
 const nudge=(dx:number,dy:number)=>{const next=clamp(position.x+dx,position.y+dy);
   setPosition(next);onLayout({...layout,...next});};
 const reorder=(from:DrawingTool,to:DrawingTool)=>{
   const next=moveFavorite(favorites,from,to);if(next!==favorites)onReorder(next);
 };
 const drop=(e:DragEvent<HTMLButtonElement>,to:DrawingTool)=>{
   e.preventDefault();if(itemDrag.current)reorder(itemDrag.current,to);itemDrag.current=null;
 };
 if(!layout.visible)return null;
 return <div ref={bar} className={"favorite-toolbar"+(layout.orientation==="vertical"?" vertical":"")+
   (layout.collapsed?" collapsed":"")+(moving?" moving":"")}
   role="toolbar" aria-label="Floating favorite drawing tools" style={{left:position.x,top:position.y}}>
   <div className="favorite-toolbar-head">
     <button type="button" className="favorite-toolbar-grip" aria-label="Move favorites toolbar"
       title="Drag to reposition, or use arrow keys; Shift moves faster"
       onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}
       onKeyDown={e=>{const step=e.shiftKey?64:16;
         const delta:{[key:string]:[number,number]}={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
         if(delta[e.key]){e.preventDefault();nudge(...delta[e.key]);}
       }}><Grip size={15}/></button>
     <span className="favorite-toolbar-title"><Star size={12} fill="currentColor"/>{favorites.length}</span>
     <button type="button" aria-label={layout.collapsed?"Expand favorites toolbar":"Collapse favorites toolbar"}
       onClick={()=>onLayout({...layout,collapsed:!layout.collapsed})}><ChevronDown size={15}/></button>
   </div>
   {!layout.collapsed&&<>
     <div className="favorite-toolbar-items" role="group" aria-label="Pinned drawing tools">
       {favorites.map((tool,index)=><div className="favorite-toolbar-item" key={tool}>
         <button type="button" draggable={!editing} disabled={disabled}
           className={"favorite-toolbar-tool"+(active===tool?" active":"")}
           aria-label={"Favorite "+(TOOL_BY_ID.get(tool)?.label??tool)}
           aria-pressed={active===tool} title={(TOOL_BY_ID.get(tool)?.label??tool)+" · drag to reorder"}
           onClick={()=>onSelect(tool)}
           onDragStart={e=>{itemDrag.current=tool;e.dataTransfer.effectAllowed="move";}}
           onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move";}}
           onDrop={e=>drop(e,tool)} onDragEnd={()=>{itemDrag.current=null;}}
           onKeyDown={e=>{
             if(!e.altKey)return;
             if((e.key==="ArrowLeft"||e.key==="ArrowUp")&&index>0){e.preventDefault();reorder(tool,favorites[index-1]);}
             if((e.key==="ArrowRight"||e.key==="ArrowDown")&&index<favorites.length-1){e.preventDefault();reorder(tool,favorites[index+1]);}
           }}><ToolGlyph tool={tool} size={19}/></button>
         {editing&&<div className="favorite-toolbar-item-actions">
           <button type="button" disabled={index===0} aria-label={"Move "+(TOOL_BY_ID.get(tool)?.label??tool)+" earlier"}
             onClick={()=>reorder(tool,favorites[index-1])}><ChevronLeft size={12}/></button>
           <button type="button" disabled={index===favorites.length-1}
             aria-label={"Move "+(TOOL_BY_ID.get(tool)?.label??tool)+" later"}
             onClick={()=>reorder(tool,favorites[index+1])}><ChevronRight size={12}/></button>
           <button type="button" aria-label={"Unpin "+(TOOL_BY_ID.get(tool)?.label??tool)}
             onClick={()=>onUnpin(tool)}><X size={12}/></button>
         </div>}
       </div>)}
       {!favorites.length&&<button type="button" className="favorite-toolbar-empty"
         onClick={onBrowse}>Pin tools from the drawing library</button>}
     </div>
     <div className="favorite-toolbar-actions">
       <button type="button" aria-label="Edit favorites toolbar" aria-pressed={editing}
         title="Reorder and remove favorites" onClick={()=>setEditing(v=>!v)}><Settings2 size={15}/></button>
       <button type="button" aria-label="Change favorites toolbar orientation"
         title="Horizontal or vertical" onClick={()=>onLayout({...layout,orientation:layout.orientation==="horizontal"?"vertical":"horizontal"})}>
         <LayoutList size={15}/></button>
       <button type="button" aria-label="Hide favorites toolbar"
         title="Reopen from the drawing rail" onClick={()=>onLayout({...layout,visible:false})}><X size={15}/></button>
     </div>
   </>}
 </div>;
}
