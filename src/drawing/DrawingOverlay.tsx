import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type {
  CandlestickData, IChartApi, ISeriesApi, Logical, UTCTimestamp
} from "lightweight-charts";
import { frameSeconds, symbols, type Frame } from "../market";
import {
  translateDrawing,
  type ChartAnchor, type Drawing, type DrawingTool
} from "./types";
import {
  inChartPlot, logicalFromTime, pointerDistance, timeFromLogical, type ChartPoint
} from "./geometry";
import { snapAnchorToOhlc, measurement } from "./snap";
import { horizontalReference, verticalReference,
  observedBarCount, formatElapsedDuration } from "./precision";
import { ONE_ANCHOR_TOOLS } from "./toolDefinitions";
import { isDrawingVisibleAtFrame } from "./drawingSettings";
import { addMultiPointAnchor, multiPointCount, requiresMultiPoint } from "./multiAnchor";
import { AdvancedDrawingPrimitives } from "./AdvancedDrawingPrimitives";
import {effectiveLevels,formatFibLabel,measurementSegments} from "./toolProperties";
import {projectedSegment} from "./projection";
import {calculatePosition,defaultPositionTarget,positionTargetAnchor} from "../analysis/positionDrawing";

type Projected = { a: ChartPoint; b: ChartPoint };
type Gesture = {
  kind: "create" | "move" | "start" | "end" | "control" | "target" | "vertex";
  vertexIndex?:number;
  origin: ChartPoint;
  original?: Drawing;
  first?: ChartAnchor;
};
type PendingClick = { tool: DrawingTool; first: ChartAnchor };
type PendingChannel = { first:ChartAnchor; second:ChartAnchor };

interface Props {
  chart: IChartApi;
  series: ISeriesApi<"Candlestick">;
  symbol: Drawing["symbol"];
  frame: Frame;
  candles: readonly CandlestickData<UTCTimestamp>[];
  tool: DrawingTool | null;
  drawings: Drawing[];
  color: string;
  magnetEnabled: boolean;
  onAdd: (drawing: Drawing) => void;
  onUpdate: (drawing: Drawing,editKind?:"move"|"start"|"end"|"control"|"target"|"vertex") => void;
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[]) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onOpenSettings: (id: string) => void;
}

export function DrawingOverlay({
  chart, series, symbol, frame, candles, tool, drawings, color, magnetEnabled, onAdd, onUpdate, onDelete, onDeleteMany, selectedIds, onSelectionChange, onOpenSettings
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const draftRef = useRef<Drawing | null>(null);
  const pendingRef = useRef<PendingClick | null>(null);
  const pendingChannelRef=useRef<PendingChannel|null>(null);
  const pendingMultiRef=useRef<{tool:DrawingTool;points:ChartAnchor[];required:number}|null>(null);
  const [draft, setDraftState] = useState<Drawing | null>(null);
  const candleTimes=useMemo(()=>candles.map(c=>Number(c.time)),[candles]);
  const [, setRevision] = useState(0);
  const animationFrame = useRef<number | null>(null);

  const setDraft = (next: Drawing | null) => {
    draftRef.current = next;
    setDraftState(next);
  };

  const pointFromEvent = (event: ReactPointerEvent<SVGElement>): ChartPoint => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const anchorAt = (point: ChartPoint): ChartAnchor | null => {
    const scale = chart.timeScale();
    if (!inChartPlot(point, scale.width(), svgRef.current!.clientHeight - scale.height())) return null;
    const logical = scale.coordinateToLogical(point.x);
    const price = series.coordinateToPrice(point.y);
    if (logical === null || price === null || !Number.isFinite(price) || price <= 0) return null;
    const time = timeFromLogical(logical, candles, frameSeconds[frame]);
    if (time === null) return null;
    const anchor={time,price};
    if(!magnetEnabled)return anchor;
    const snapped=snapAnchorToOhlc(anchor,point,candles,
      timestamp=>{
        const logical=logicalFromTime(timestamp,candles,frameSeconds[frame]);
        return logical===null?null:scale.logicalToCoordinate(logical as Logical);
      },
      value=>series.priceToCoordinate(value)
    );
    return snapped.anchor;
  };
  const project = (drawing: Drawing): Projected | null => {
    const scale = chart.timeScale();
    const aLogical = logicalFromTime(drawing.start.time, candles, frameSeconds[frame]);
    const bLogical = logicalFromTime(drawing.end.time, candles, frameSeconds[frame]);
    if (aLogical === null || bLogical === null) return null;
    const ax = scale.logicalToCoordinate(aLogical as Logical);
    const bx = scale.logicalToCoordinate(bLogical as Logical);
    const ay = series.priceToCoordinate(drawing.start.price);
    const by = series.priceToCoordinate(drawing.end.price);
    if ([ax, bx, ay, by].some(p => p === null || !Number.isFinite(p))) return null;
    return { a: { x: ax!, y: ay! }, b: { x: bx!, y: by! } };
  };
  const makeDrawing = (first: ChartAnchor, end: ChartAnchor, selectedTool: DrawingTool): Drawing => ({
    id: "preview", symbol, tool: selectedTool, start: first, end, color, locked: false
  });

  // Chart's time scale changes independently of React when the user pans or zooms.
  useEffect(() => {
    const refresh = () => {
      if (animationFrame.current !== null) return;
      animationFrame.current = requestAnimationFrame(() => {
        animationFrame.current = null;
        setRevision(n => n + 1);
      });
    };
    const observer = new ResizeObserver(refresh);
    if (svgRef.current) observer.observe(svgRef.current);
    chart.timeScale().subscribeVisibleLogicalRangeChange(refresh);
    chart.subscribeCrosshairMove(refresh);
    window.addEventListener("pointermove", refresh, { passive: true });
    return () => {
      observer.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(refresh);
      chart.unsubscribeCrosshairMove(refresh);
      window.removeEventListener("pointermove", refresh);
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    };
  }, [chart]);

  useEffect(() => {
    gestureRef.current = null;
    pendingRef.current = null;
    pendingChannelRef.current=null;
    pendingMultiRef.current=null;
    setDraft(null);
    if (tool) onSelectionChange([]);
  }, [symbol, tool, frame]);
  useEffect(() => {
    onSelectionChange([]);
  }, [symbol, frame]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        gestureRef.current = null;
        pendingRef.current = null;
        pendingChannelRef.current=null;
    pendingMultiRef.current=null;
        setDraft(null);
        onSelectionChange([]);
        return;
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.length) {
        const removable=selectedIds.filter(id=>drawings.some(d=>d.id===id&&!d.locked));
        if(removable.length){
          event.preventDefault();
          if(removable.length===1)onDelete(removable[0]);
          else onDeleteMany(removable);
          onSelectionChange([]);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawings, onDelete, onDeleteMany, selectedIds, onSelectionChange]);

  const capture = (event: ReactPointerEvent<SVGElement>) => {
    try { svgRef.current?.setPointerCapture(event.pointerId); } catch { /* pointer was released */ }
  };
  const beginEdit = (event: ReactPointerEvent<SVGElement>, drawing: Drawing, kind: Gesture["kind"],vertexIndex?:number) => {
    if (tool || event.button !== 0) return;
    // Preserve the browser's click/double-click sequence for selected shapes.
    // Suppress native gestures only if the pointer actually begins dragging.
    event.stopPropagation();
    const linked=drawing.groupId?
      drawings.filter(d=>d.groupId===drawing.groupId).map(d=>d.id):[drawing.id];
    if(event.shiftKey) {
      const selected=new Set(selectedIds);
      const shouldAdd=linked.some(id=>!selected.has(id));
      for(const id of linked)shouldAdd?selected.add(id):selected.delete(id);
      onSelectionChange([...selected]);
      return;
    }
    onSelectionChange(linked);
    if(drawing.locked)return;
    // Do not capture a stationary object-selection click: pointer capture
    // retargets the subsequent click to the SVG root and breaks double-click.
    // Acquire capture only once an actual drag begins.
    gestureRef.current = { kind, origin: pointFromEvent(event), original: drawing,vertexIndex };
    setDraft(null);
  };
  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    // The transparent plot hit-surface is an SVG child. Prior versions rejected
    // all clicks landing on child nodes, so ordinary chart interaction could be ignored.
    const target = event.target;
    const onPlotSurface = target === event.currentTarget ||
      (target instanceof SVGRectElement && target.dataset.drawingSurface === "true");
    if (!tool || event.button !== 0 || !onPlotSurface) return;
    const point = pointFromEvent(event);
    const anchor = anchorAt(point);
    if (!anchor) return;
    event.preventDefault();
    if(pendingMultiRef.current&&pendingMultiRef.current.tool===tool){
      const pending=pendingMultiRef.current;
      const stage=addMultiPointAnchor(pending.points,anchor,pending.required);
      if(stage.complete){
        pendingMultiRef.current=null;pendingRef.current=null;setDraft(null);
        onAdd({...makeDrawing(stage.points[0],stage.points[1],tool),
          points:stage.points,id:crypto.randomUUID()});
      }else{
        pendingMultiRef.current={...pending,points:stage.points};
        setDraft({...makeDrawing(stage.points[0],stage.points[1],tool),
          points:[...stage.points,stage.points[stage.points.length-1]]});
      }
      return;
    }
    if(tool==="channel"&&pendingChannelRef.current){
      const {first,second}=pendingChannelRef.current;
      pendingChannelRef.current=null;
    pendingMultiRef.current=null;
      pendingRef.current=null;
      setDraft(null);
      onAdd({...makeDrawing(first,second,"channel"),control:anchor,id:crypto.randomUUID()});
      return;
    }
    capture(event);
    gestureRef.current = {
      kind: "create", origin: point,
      first: pendingRef.current?.tool === tool ? pendingRef.current.first : anchor
    };
    const drawing=makeDrawing(gestureRef.current.first!, anchor, tool);
    if(tool==="brush")drawing.points=[anchor];
    if(tool==="text")drawing.text="Note";
    setDraft(drawing);
    onSelectionChange([]);
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = pointFromEvent(event);
    const active = gestureRef.current;
    if (!active) {
      if(pendingMultiRef.current&&pendingMultiRef.current.tool===tool){
        const next=anchorAt(point),pending=pendingMultiRef.current;
        if(next)setDraft({...makeDrawing(pending.points[0],pending.points[1],tool),
          points:[...pending.points,next]});
        return;
      }
      if(tool==="channel"&&pendingChannelRef.current){
        const next=anchorAt(point);
        if(next){
          const {first,second}=pendingChannelRef.current;
          setDraft({...makeDrawing(first,second,"channel"),control:next});
        }
        return;
      }
      const pending = pendingRef.current;
      if (pending && tool === pending.tool) {
        const next = anchorAt(point);
        if (next) setDraft(makeDrawing(pending.first, next, tool));
      }
      return;
    }
    if (active.kind === "create") {
      const next = anchorAt(point);
      if (next && active.first && tool) {
        if(tool==="brush"){
          const previous=draftRef.current;
          const points=previous?.points??[active.first];
          // Resample naturally at pointer-move granularity without arbitrary drawing count limits.
          if(pointerDistance(active.origin,point)>2 && points.length<100000 &&
             (points.at(-1)?.time!==next.time||points.at(-1)?.price!==next.price)){
            setDraft({...makeDrawing(active.first,next,tool),points:[...points,next]});
          }
        }else setDraft({...makeDrawing(active.first,next,tool),...(tool==="text"?{text:"Note"}:{})});
      }
      return;
    }
    if (!active.original) return;
    if(pointerDistance(active.origin,point)>=2){
      event.preventDefault();
      if(!svgRef.current?.hasPointerCapture(event.pointerId))capture(event);
    }
    const originalProjected = project(active.original);
    if (!originalProjected) return;
    const dx = point.x - active.origin.x;
    const dy = point.y - active.origin.y;
    if(active.kind==="vertex"&&active.original.points&&active.vertexIndex!==undefined){
      const index=active.vertexIndex,vertex=active.original.points[index];
      if(vertex){
        const projected=project({...active.original,start:vertex,end:vertex});
        if(projected){
          const next=anchorAt({x:projected.a.x+dx,y:projected.a.y+dy});
          if(next){
            const points=active.original.points.map((p,i)=>i===index?next:p);
            setDraft({...active.original,points,
              start:index===0?next:active.original.start,
              end:index===1?next:active.original.end});
          }
        }
      }
      return;
    }
    if(active.kind==="target"){
      const prior=active.original.target??
        (active.original.tool==="long-position"||active.original.tool==="short-position"?
          positionTargetAnchor(active.original.tool,active.original.start,active.original.end):undefined);
      if(prior){
        const projected=project({...active.original,start:prior,end:prior});
        if(projected){
          const target=anchorAt({x:projected.a.x+dx,y:projected.a.y+dy});
          if(target)setDraft({...active.original,target});
        }
      }
      return;
    }
    if(active.kind==="control"&&active.original.control){
      const controlProjected=project({...active.original,start:active.original.control,end:active.original.control});
      if(controlProjected){
        const control=anchorAt({x:controlProjected.a.x+dx,y:controlProjected.a.y+dy});
        if(control)setDraft({...active.original,control});
      }
      return;
    }
    const start = active.kind === "end" ? active.original.start :
      anchorAt({ x: originalProjected.a.x + dx, y: originalProjected.a.y + dy });
    const end = active.kind === "start" ? active.original.end :
      anchorAt({ x: originalProjected.b.x + dx, y: originalProjected.b.y + dy });
    if (start && end) {
      const changed=active.kind==="move"?translateDrawing(active.original,start,end):
        {...active.original,start,end,
          ...(active.original.points?{points:active.original.points.map((p,i)=>
            active.kind==="start"&&i===0?start:active.kind==="end"&&i===1?end:p)}:{})};
      setDraft(ONE_ANCHOR_TOOLS.has(active.original.tool)
        ? {...changed,end:changed.start} : changed);
    }
  };
  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = gestureRef.current;
    if (!active) return;
    gestureRef.current = null;
    const point = pointFromEvent(event);
    const distance = pointerDistance(active.origin, point);
    if (active.kind === "create") {
      const second = anchorAt(point);
      if (!tool || !second || !active.first) {
        setDraft(null);
        pendingRef.current = null;
        return;
      }
      if(tool==="text"){
        pendingRef.current=null;
        setDraft(null);
        onAdd({...makeDrawing(active.first,active.first,tool),text:"Note",id:crypto.randomUUID()});
      }else if(ONE_ANCHOR_TOOLS.has(tool)){
        pendingRef.current=null;
        setDraft(null);
        const note=tool==="callout"?"Observation":tool==="price-note"?"Marked price":undefined;
        onAdd({...makeDrawing(active.first,active.first,tool),
          ...(note?{text:note}:{}),id:crypto.randomUUID()});
      }else if(tool==="brush"){
        const points=draftRef.current?.points??[];
        pendingRef.current=null;
        setDraft(null);
        if(points.length>1)onAdd({...makeDrawing(points[0],points[points.length-1],tool),
          points,id:crypto.randomUUID()});
      }else if (distance >= 5 || pendingRef.current) {
        const completed = makeDrawing(active.first, second, tool);
        pendingRef.current = null;
        if (completed.start.time !== completed.end.time || completed.start.price !== completed.end.price) {
          if(tool==="channel"){
            pendingChannelRef.current={first:completed.start,second:completed.end};
            setDraft({...completed,control:completed.start});
          }else if(requiresMultiPoint(tool)){
            pendingMultiRef.current={tool,points:[completed.start,completed.end],required:multiPointCount(tool)};
            setDraft({...completed,points:[completed.start,completed.end,completed.end]});
          }else{
            setDraft(null);
            const positionTarget=(tool==="long-position"||tool==="short-position")?
              positionTargetAnchor(tool,completed.start,completed.end):undefined;
            onAdd({...completed,...(positionTarget?{target:positionTarget}:{}),
              id:crypto.randomUUID()});
          }
        }else setDraft(null);
      } else {
        // TradingView-like click once to set the first point, click again to finish.
        pendingRef.current = { tool, first: active.first };
        setDraft(makeDrawing(active.first, second, tool));
      }
    } else {
      const committed = draftRef.current;
      setDraft(null);
      if (distance >= 2 && committed && active.original) {
        onUpdate(committed,active.kind);
      }
    }
  };
  const cancel = () => {
    gestureRef.current = null;
    pendingRef.current = null;
    pendingChannelRef.current=null;
    pendingMultiRef.current=null;
    setDraft(null);
  };

  const renderDrawing = (drawing: Drawing) => {
    const position = project(drawing);
    if (!position) return null;
    const { a, b } = position;
    const plot={
      width:chart.timeScale().width(),
      height:Math.max(0,(svgRef.current?.clientHeight??0)-chart.timeScale().height())
    };
    const isPreview = drawing.id === "preview";
    const selected = selectedIds.includes(drawing.id) && !tool;
    const common = {
      stroke: drawing.color,
      strokeWidth: selected ? Math.max(2.4,drawing.strokeWidth??1.8) : drawing.strokeWidth??1.8,
      strokeDasharray: isPreview ? "5 4" : drawing.dash==="dashed" ? "7 5" : drawing.dash==="dotted" ? "2 5" : undefined,
      opacity: drawing.opacity ?? 1,
      vectorEffect: "non-scaling-stroke" as const,
    };
    return <g key={drawing.id} className={"drawing-shape " + (selected ? "is-selected" : "")}
      onPointerDown={event => { if (!isPreview) beginEdit(event, drawing, "move"); }}
      onDoubleClick={event=>{if(!isPreview){event.stopPropagation();onOpenSettings(drawing.id);}}}>
      <AdvancedDrawingPrimitives drawing={drawing} a={a} b={b} plot={plot}
        common={common} precision={symbols[symbol].precision}
        candleTimes={candleTimes}
        projectAnchor={anchor=>project({...drawing,start:anchor,end:anchor})?.a??null}
        projectPrice={price=>series.priceToCoordinate(price)}/>
      {drawing.tool==="channel"&&(()=>{
        const control=drawing.control??drawing.start;
        const projected=project({...drawing,start:control,end:control});
        if(!projected)return null;
        const dx=projected.a.x-a.x,dy=projected.a.y-a.y;
        const c={x:a.x+dx,y:a.y+dy},d={x:b.x+dx,y:b.y+dy};
        return <>
          <polygon points={[a,b,d,c].map(p=>p.x+","+p.y).join(" ")}
            fill={drawing.color} fillOpacity={drawing.fillOpacity??.08}
            stroke="none" pointerEvents="none"/>
          <path d={"M "+a.x+" "+a.y+" L "+b.x+" "+b.y+" M "+c.x+" "+c.y+" L "+d.x+" "+d.y}
            fill="none" stroke="transparent" strokeWidth={18} className="drawing-hit"/>
          <path d={"M "+a.x+" "+a.y+" L "+b.x+" "+b.y+" M "+c.x+" "+c.y+" L "+d.x+" "+d.y}
            fill="none" {...common} className="drawing-channel"/>
          {drawing.showMidline!==false&&<line x1={(a.x+c.x)/2} y1={(a.y+c.y)/2}
            x2={(b.x+d.x)/2} y2={(b.y+d.y)/2}
            stroke={drawing.color} strokeDasharray="3 6" strokeWidth={1}
            opacity={.65} pointerEvents="none" className="drawing-channel-midline"/>}
          {selected&&!drawing.locked&&drawing.control&&
            <circle cx={projected.a.x} cy={projected.a.y} r={7}
              fill="var(--panel)" stroke={drawing.color} strokeWidth={2}
              className="drawing-handle channel-control-handle"
              onPointerDown={event=>beginEdit(event,drawing,"control")}/>}
        </>;
      })()}
      {drawing.tool === "ellipse" && <ellipse
        cx={(a.x+b.x)/2} cy={(a.y+b.y)/2}
        rx={Math.max(2,Math.abs(b.x-a.x)/2)}
        ry={Math.max(2,Math.abs(b.y-a.y)/2)}
        fill={drawing.color} fillOpacity={drawing.fillOpacity??.08} {...common} className="drawing-ellipse"/>}
      {drawing.tool === "arrow" && (() => {
        const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len;
        const points=[
          [b.x,b.y],
          [b.x-ux*14-uy*6,b.y-uy*14+ux*6],
          [b.x-ux*14+uy*6,b.y-uy*14-ux*6]
        ].map(p=>p.join(",")).join(" ");
        return <>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="transparent" strokeWidth={16} className="drawing-hit"/>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            {...common} className="drawing-line"/>
          <polygon points={points} fill={drawing.color} stroke="none" className="drawing-arrow-head"/>
        </>;
      })()}
      {drawing.tool === "text" && (() => {
        const label=(drawing.text||"Note").slice(0,120);
        const fontSize=drawing.fontSize??12;
        const width=Math.max(44,Math.min(500,label.length*fontSize*.6+20));
        return <>
          <rect x={a.x} y={a.y-fontSize-13} width={width} height={fontSize+21}
            rx={5} fill="var(--panel)" fillOpacity={.96}
            stroke={drawing.color} strokeWidth={1} className="drawing-note-box"/>
          <text x={a.x+10} y={a.y-5} fill={drawing.color} fontSize={fontSize}
            fontWeight={600} pointerEvents="none">{label}</text>
        </>;
      })()}
      {drawing.tool === "brush" && (() => {
        const points=drawing.points?.length?drawing.points:[drawing.start,drawing.end];
        const xy=points.map(p=>{
          const t=logicalFromTime(p.time,candles,frameSeconds[frame]);
          if(t===null)return null;
          const x=chart.timeScale().logicalToCoordinate(t as Logical),y=series.priceToCoordinate(p.price);
          return x===null||y===null?null:{x,y};
        }).filter(p=>p!==null);
        if(xy.length<2)return null;
        const d=xy.map((p,i)=>(i?"L":"M")+p.x+" "+p.y).join(" ");
        return <>
          <path d={d} fill="none" stroke="transparent" strokeWidth={18} className="drawing-hit"/>
          <path d={d} fill="none" {...common} strokeLinecap="round" strokeLinejoin="round" className="drawing-brush"/>
        </>;
      })()}
      {(drawing.tool === "long-position" || drawing.tool === "short-position") && (() => {
        const isLong=drawing.tool==="long-position",entry=drawing.start.price,stop=drawing.end.price;
        const correct=isLong?stop<entry:stop>entry;
        const x1=Math.min(a.x,b.x),width=Math.max(40,Math.abs(a.x-b.x));
        const target=drawing.target?.price??
          defaultPositionTarget(drawing.tool as "long-position"|"short-position",entry,stop);
        const targetY=target!==null&&target!==undefined?series.priceToCoordinate(target):null;
        const position=target===null||target===undefined?null:
          calculatePosition(drawing.tool as "long-position"|"short-position",entry,stop,target);
        if(!correct||targetY===null)return <>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent"
            strokeWidth={18} className="drawing-hit"/>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            {...common} className="drawing-line"/>
          <text x={x1} y={a.y-12} fill="#e66a77"
            fontSize={11} pointerEvents="none">Move stop {isLong?"below":"above"} entry</text>
        </>;
        const riskTop=Math.min(a.y,b.y),rewardTop=Math.min(a.y,targetY);
        return <>
          <rect x={x1} y={riskTop} width={width} height={Math.abs(b.y-a.y)}
            fill="#e66a77" fillOpacity={.18} stroke="#e66a77" strokeWidth={1} className="drawing-position-risk"/>
          <rect x={x1} y={rewardTop} width={width} height={Math.abs(targetY-a.y)}
            fill="#22b98e" fillOpacity={.16} stroke="#22b98e" strokeWidth={1} className="drawing-position-reward"/>
          <line x1={x1} y1={a.y} x2={x1+width} y2={a.y} {...common} className="drawing-line"/>
          {drawing.showLabels!==false&&<text x={x1+6} y={rewardTop+14} fill="#22b98e" fontSize={11}
            pointerEvents="none">{isLong?"LONG":"SHORT"} ·
            {position&&position.targetIsValid?position.multiple.toFixed(2)+"R":"Target on wrong side"}</text>}
          {selected&&!drawing.locked&&
            <circle cx={b.x} cy={targetY} r={7}
              fill="var(--panel)" stroke="#22b98e" strokeWidth={2}
              className="drawing-handle position-target-handle"
              onPointerDown={event=>beginEdit(event,drawing,"target")}/>}

          {drawing.showLabels!==false&&<text x={x1+6} y={riskTop+Math.max(12,Math.abs(b.y-a.y)-5)}
            fill="#e66a77" fontSize={10} pointerEvents="none">Stop · risk 1R</text>}
        </>;
      })()}
      {(["extended-line","horizontal-line","horizontal-ray","vertical-line","cross-line"] as string[])
         .includes(drawing.tool) && (() => {
         const first=drawing.tool==="extended-line"?projectedSegment(a,b,plot,drawing.projection??"both"):
           drawing.tool==="horizontal-line"?horizontalReference(a,plot,false):
           drawing.tool==="horizontal-ray"?horizontalReference(a,plot,true):
           verticalReference(a,plot);
         if(!first)return null;
         const paths=[first];
         if(drawing.tool==="cross-line"){
           const horizontal=horizontalReference(a,plot,false);
           if(horizontal)paths.push(horizontal);
         }
         const d=paths.map(item=>"M "+item.start.x+" "+item.start.y+
           " L "+item.end.x+" "+item.end.y).join(" ");
         return <>
           <path d={d} fill="none" stroke="transparent" strokeWidth={16} className="drawing-hit"/>
           <path d={d} fill="none" {...common} className="drawing-line drawing-reference"/>
           {drawing.tool==="cross-line"&&<circle cx={a.x} cy={a.y} r={3.5}
             fill="var(--panel)" stroke={drawing.color} strokeWidth={1.5} pointerEvents="none"/>}
         </>;
       })()}
       {drawing.tool==="price-range" && (() => {
         const m=measurement(drawing.start,drawing.end,frameSeconds[frame]);
         const left=Math.min(a.x,b.x),top=Math.min(a.y,b.y);
         const width=Math.max(16,Math.abs(b.x-a.x)),height=Math.max(2,Math.abs(b.y-a.y));
         const label=measurementSegments(drawing,
           observedBarCount(candleTimes,drawing.start.time,drawing.end.time),
           formatElapsedDuration(Math.abs(drawing.end.time-drawing.start.time)),
           symbols[symbol].precision).map(part=>part.label).join(" · ");
         const labelToLeft=left+width>plot.width-145;
         return <>
           <rect x={left} y={top} width={width} height={height}
             fill={drawing.color} fillOpacity={drawing.fillOpacity??.10} stroke={drawing.color}
             strokeWidth={1} className="drawing-rectangle drawing-price-range"/>
           <line x1={left} x2={left+width} y1={a.y} y2={a.y} {...common} pointerEvents="none"/>
           <line x1={left} x2={left+width} y1={b.y} y2={b.y} {...common} pointerEvents="none"/>
           {drawing.showLabels!==false&&<text x={labelToLeft?left+width-6:left+width+6} y={top+height/2} fill={drawing.color}
             fontSize={11} fontWeight={700} dominantBaseline="middle" pointerEvents="none"
             textAnchor={labelToLeft?"end":"start"}>
             {label}
           </text>}
         </>;
       })()}
       {drawing.tool==="date-range" && (() => {
         const left=Math.min(a.x,b.x),width=Math.max(1,Math.abs(b.x-a.x));
         const bars=observedBarCount(candleTimes,drawing.start.time,drawing.end.time);
         const elapsed=formatElapsedDuration(Math.abs(drawing.end.time-drawing.start.time));
         const label=measurementSegments(drawing,bars,elapsed,symbols[symbol].precision)
           .map(part=>part.label).join(" · ");
         return <>
           <rect x={left} y={0} width={width} height={plot.height}
             fill={drawing.color} fillOpacity={drawing.fillOpacity??.08} pointerEvents="none"
             className="drawing-date-band"/>
           <path d={"M "+a.x+" 0 V "+plot.height+" M "+b.x+" 0 V "+plot.height}
             stroke="transparent" strokeWidth={16} fill="none" className="drawing-hit"/>
           <path d={"M "+a.x+" 0 V "+plot.height+" M "+b.x+" 0 V "+plot.height}
             fill="none" {...common} className="drawing-line"/>
           {drawing.showLabels!==false&&<text x={Math.min(Math.max(90,left+width/2),Math.max(90,plot.width-90))} y={Math.max(18,Math.min(plot.height-12,28))}
             textAnchor="middle" fontSize={11} fontWeight={650} fill={drawing.color}
             pointerEvents="none">{label}</text>}
         </>;
       })()}
      {drawing.tool === "ray" && (() => {
        const line=projectedSegment(a,b,plot,drawing.projection??"right");
        if(!line)return null;
        return <>
          <line x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y}
            stroke="transparent" strokeWidth={16} className="drawing-hit"/>
          <line x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y}
            {...common} className="drawing-line"/>
        </>;
      })()}
      {drawing.tool === "measure" && (() => {
        const m=measurement(drawing.start,drawing.end,frameSeconds[frame]);
        const left=Math.min(a.x,b.x),top=Math.min(a.y,b.y);
        const width=Math.max(1,Math.abs(b.x-a.x)),height=Math.max(1,Math.abs(b.y-a.y));
        const label=measurementSegments(drawing,
          observedBarCount(candleTimes,drawing.start.time,drawing.end.time),
          formatElapsedDuration(Math.abs(drawing.end.time-drawing.start.time)),
          symbols[symbol].precision).map(part=>part.label).join(" · ");
        return <>
          <rect x={left} y={top} width={width} height={height}
            fill={m.change>=0?"#20aa8b":"#dc6575"} fillOpacity={drawing.fillOpacity??.12}
            {...common} className="drawing-rectangle"/>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            {...common} className="drawing-line" pointerEvents="none"/>
          {drawing.showLabels!==false&&<text x={(a.x+b.x)/2} y={top+height/2}
            fill={drawing.color} fontWeight={700} fontSize={11}
            textAnchor="middle" pointerEvents="none">
            {label}
          </text>}
        </>;
      })()}
      {drawing.tool === "trendline" && (() => {
        const line=projectedSegment(a,b,plot,drawing.projection??"segment");
        if(!line)return null;
        return <>
          <line x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y}
            stroke="transparent" strokeWidth={16} className="drawing-hit"/>
          <line x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y}
            {...common} className="drawing-line"/>
        </>;
      })()}
      {drawing.tool === "rectangle" && <rect x={Math.min(a.x,b.x)} y={Math.min(a.y,b.y)}
        width={Math.max(1,Math.abs(b.x-a.x))} height={Math.max(1,Math.abs(b.y-a.y))}
        fill={drawing.color} fillOpacity={drawing.fillOpacity??.08} {...common} className="drawing-rectangle"/>}
      {drawing.tool === "fibonacci" && effectiveLevels(drawing).map((level,i)=>{
        if(!level.visible)return null;
        const price=drawing.start.price+(drawing.end.price-drawing.start.price)*level.ratio;
        const y=series.priceToCoordinate(price);
        if(y===null||y< -30||y>plot.height+30)return null;
        const x1=Math.min(a.x,b.x),x2=Math.max(a.x,b.x);
        return <g key={i}>
          <line x1={x1} x2={x2} y1={y} y2={y} stroke="transparent"
            strokeWidth={12} className="drawing-hit"/>
          <line x1={x1} x2={x2} y1={y} y2={y} {...common} stroke={level.color}
            strokeOpacity={level.ratio===0||level.ratio===1?1:.75} className="drawing-line drawing-fib-level"/>
          {drawing.showLabels!==false&&<text x={x2+6} y={y-4} fill={level.color} fontSize={10}
            pointerEvents="none">{formatFibLabel(level.ratio,price,symbols[symbol].precision,drawing.labelMode)}</text>}
        </g>;
      })}
      {drawing.tool==="rectangle"&&drawing.showMidline&&
        <line x1={Math.min(a.x,b.x)} x2={Math.max(a.x,b.x)}
          y1={(a.y+b.y)/2} y2={(a.y+b.y)/2} stroke={drawing.color}
          strokeWidth={1} strokeDasharray="5 4" opacity={drawing.opacity??1} pointerEvents="none"
          className="drawing-rectangle-midline"/>}
      {isPreview && <circle cx={a.x} cy={a.y} r={4} fill={drawing.color} pointerEvents="none" />}
      {selected&&!drawing.locked&&drawing.points&&drawing.points.length>=3&&
        drawing.points.slice(2).map((vertex,index)=>{
          const projected=project({...drawing,start:vertex,end:vertex});
          if(!projected)return null;
          return <circle key={"vertex-"+index} cx={projected.a.x} cy={projected.a.y}
            r={7} fill="var(--panel)" stroke={drawing.color} strokeWidth={2}
            className="drawing-handle pattern-vertex-handle"
            onPointerDown={event=>beginEdit(event,drawing,"vertex",index+2)}/>;
        })}
      {selected && !drawing.locked && drawing.tool!=="brush" && drawing.tool!=="text" &&
        (ONE_ANCHOR_TOOLS.has(drawing.tool)?[a]:[a,b]).map((p,i) =>
        <circle key={i} cx={p.x} cy={p.y} r={7} fill="var(--panel)"
          stroke={drawing.color} strokeWidth={2} className="drawing-handle"
          onPointerDown={event => beginEdit(event, drawing, i === 0 ? "start" : "end")}/>
      )}
    </g>;
  };

  return <svg ref={svgRef} className={"drawing-overlay " + (tool ? "armed" : "")}
    aria-label={tool ? "Draw " + tool + ": " + (requiresMultiPoint(tool)?multiPointCount(tool):ONE_ANCHOR_TOOLS.has(tool)?1:2) + " anchors required" : "Select chart drawings"}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
    onPointerCancel={cancel} onLostPointerCapture={() => { /* normal end handled by pointerup */ }}>
    {/* A real transparent SVG rect is required: empty SVG pixels are not reliably
        pointer targets in every browser. Restrict interception to chart plotting area. */}
    <rect className="drawing-plot-surface" data-drawing-surface="true"
      x={0} y={0} width="100%" height="100%"
      fill="transparent" pointerEvents={tool ? "all" : "none"}/>
    {drawings.filter(d => d.symbol === symbol && isDrawingVisibleAtFrame(d,frame)).map(d => renderDrawing(draft?.id === d.id ? draft : d))}
    {draft?.id === "preview" && renderDrawing(draft)}
    {tool&&pendingMultiRef.current&&<g className="drawing-anchor-progress" pointerEvents="none">
      <rect x={12} y={12} width={188} height={35} rx={6}
        fill="var(--panel)" fillOpacity={.96} stroke={color} strokeOpacity={.55}/>
      <text x={23} y={26} fill={color} fontSize={10} fontWeight={750}>
        {"ANCHOR "+(pendingMultiRef.current.points.length+1)+" / "+pendingMultiRef.current.required}
      </text>
      <text x={23} y={39} fill="var(--soft)" fontSize={10}>Click the next pivot to continue</text>
    </g>}
  </svg>;
}
