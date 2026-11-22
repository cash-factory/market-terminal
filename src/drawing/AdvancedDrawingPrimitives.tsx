import type { ReactNode } from "react";
import type { ChartPoint } from "./geometry";
import type { PlotSize } from "./precision";
import type { Drawing, ChartAnchor } from "./types";
import { observedBarCount,formatElapsedDuration } from "./precision";
import { medianPitchfork,fibTimePositions,cycleLinePositions,gannGrid } from "./advancedGeometry";
import { FIB_TIME_SEQUENCE,patternPriceRatios } from "./multiAnchor";
import {effectiveLevels,effectiveForkRatios,measurementSegments,formatFibLabel} from "./toolProperties";
import { rayEndpoint } from "./snap";

type Stroke={stroke:string;strokeWidth:number;strokeDasharray?:string;opacity:number;vectorEffect:"non-scaling-stroke"};
type Props={
  drawing:Drawing;
  a:ChartPoint;b:ChartPoint;
  plot:PlotSize;
  common:Stroke;
  precision:number;
  candleTimes:readonly number[];
  projectAnchor:(anchor:ChartAnchor)=>ChartPoint|null;
  projectPrice:(price:number)=>number|null;
};

const ratio=(value:number)=>(value*100).toFixed(1)+"%";
const labelsFor:Record<string,string[]>={
  "pattern-abcd":["A","B","C","D"],
  "pattern-xabcd":["X","A","B","C","D"],
  "elliott-impulse":["0","1","2","3","4","5"]
};
const safeLabel=(value:string)=>value.slice(0,140);

export const ADVANCED_PRIMITIVES=new Set<Drawing["tool"]>([
  "info-line","pitchfork","fib-extension","fib-timezone","fib-circles","gann-box",
  "triangle","pattern-abcd","pattern-xabcd","elliott-impulse","cyclic-lines",
  "callout","price-note","arrow-marker","date-price-range"
]);

export function AdvancedDrawingPrimitives({
  drawing,a,b,plot,common,precision,candleTimes,projectAnchor,projectPrice
}:Props):ReactNode{
  const showLabels=drawing.showLabels!==false;
  const pointAnchors=drawing.points??[drawing.start,drawing.end];
  const points=pointAnchors.map(projectAnchor).filter((point):point is ChartPoint=>point!==null);
  const tool=drawing.tool;
  if(tool==="info-line"||tool==="date-price-range"){
    const bars=observedBarCount(candleTimes,drawing.start.time,drawing.end.time);
    const elapsed=formatElapsedDuration(Math.abs(drawing.end.time-drawing.start.time));
    const segments=measurementSegments(drawing,bars,elapsed,precision).map(x=>x.label);
    const left=Math.min(a.x,b.x),top=Math.min(a.y,b.y);
    const right=Math.max(a.x,b.x),bottom=Math.max(a.y,b.y);
    return <>
      {tool==="date-price-range"&&<rect x={left} y={top} width={Math.max(1,right-left)}
        height={Math.max(1,bottom-top)} fill={drawing.color}
        fillOpacity={drawing.fillOpacity??.1} stroke={drawing.color}
        strokeWidth={1} className="drawing-date-price-box"/>}
      <path d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
        stroke="transparent" strokeWidth={17} className="drawing-hit"/>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...common} className="drawing-line"/>
      {showLabels&&<text x={Math.min(plot.width-12,Math.max(12,(a.x+b.x)/2))}
        y={Math.max(14,Math.min(plot.height-14,(a.y+b.y)/2-14))}
        textAnchor="middle" fontSize={10} fontWeight={650} fill={drawing.color}
        pointerEvents="none" className="drawing-info-caption">
        {segments.join(" · ")}
      </text>}
    </>;
  }
  if(tool==="pitchfork"){
    if(points.length<3)return null;
    const fork=medianPitchfork(points[0],points[1],points[2]);
    if(!fork)return null;
    const mid={x:(points[1].x+points[2].x)/2,y:(points[1].y+points[2].y)/2};
    const rails=[{origin:points[0],ratio:0},...effectiveForkRatios(drawing).flatMap(ratio=>[
      {origin:{x:mid.x+(points[1].x-mid.x)*ratio,
        y:mid.y+(points[1].y-mid.y)*ratio},ratio},
      {origin:{x:mid.x+(points[2].x-mid.x)*ratio,
        y:mid.y+(points[2].y-mid.y)*ratio},ratio:-ratio}
    ])];
    return <g className="drawing-pitchfork">{rails.map(({origin,ratio},i)=>{
      const endpoint=rayEndpoint(origin,{x:origin.x+fork.vector.x,y:origin.y+fork.vector.y},
        plot.width,plot.height);
      return <g key={i}>
        <line x1={origin.x} y1={origin.y} x2={endpoint.x} y2={endpoint.y}
          stroke="transparent" strokeWidth={16} className="drawing-hit"/>
        <line x1={origin.x} y1={origin.y} x2={endpoint.x} y2={endpoint.y}
          {...common} strokeOpacity={ratio===0||Math.abs(ratio)===1?1:.55}
          className="drawing-fork-rail"/>
        {showLabels&&ratio!==0&&<text x={origin.x+4} y={origin.y-6} fontSize={9}
          fill={drawing.color} pointerEvents="none">{ratio.toFixed(2)+"×"}</text>}
      </g>;
    })}
      <path d={`M ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y}`}
        fill="none" stroke={drawing.color} strokeDasharray="3 5" opacity={.45}
        pointerEvents="none"/>
    </g>;
  }
  if(tool==="fib-extension"){
    if(pointAnchors.length<3||points.length<3)return null;
    const third=pointAnchors[2];
    const lineStart=Math.min(points[2].x,plot.width);
    return <g className="drawing-fib-extension">{effectiveLevels(drawing).map((level,i)=>{
      if(!level.visible)return null;
      const price=third.price+(pointAnchors[1].price-pointAnchors[0].price)*level.ratio;
      const y=projectPrice(price);
      if(y===null||y<-20||y>plot.height+20)return null;
      return <g key={i}>
        <line x1={lineStart} x2={plot.width} y1={y} y2={y}
          stroke="transparent" strokeWidth={12} className="drawing-hit"/>
        <line x1={lineStart} x2={plot.width} y1={y} y2={y}
          {...common} stroke={level.color} strokeOpacity={level.ratio===1?1:.65}/>
        {showLabels&&<text x={Math.min(plot.width-8,lineStart+7)} y={y-5}
          textAnchor="start" fill={level.color} fontSize={9} pointerEvents="none">
          {formatFibLabel(level.ratio,price,precision,drawing.labelMode)}
        </text>}
      </g>;
    })}
    </g>;
  }
  if(tool==="fib-timezone"){
    const lines=fibTimePositions(a.x,b.x,plot.width,FIB_TIME_SEQUENCE);
    return <g className="drawing-fib-timezone">{lines.map(({level,x})=>
      <g key={level}>
        <line x1={x} x2={x} y1={0} y2={plot.height}
          stroke="transparent" strokeWidth={12} className="drawing-hit"/>
        <line x1={x} x2={x} y1={0} y2={plot.height} {...common}
          strokeOpacity={level<=2?1:.55}/>
        {showLabels&&<text x={x+3} y={18} fontSize={10} fill={drawing.color}
          pointerEvents="none">{level}</text>}
      </g>)}</g>;
  }
  if(tool==="fib-circles"){
    return <g className="drawing-fib-circles">
      {effectiveLevels(drawing).map((level,i)=>{
        if(!level.visible)return null;
        const r=Math.abs(level.ratio),rx=Math.abs(b.x-a.x)*r,ry=Math.abs(b.y-a.y)*r;
        if(rx<1||ry<1)return null;
        return <ellipse key={i} cx={a.x} cy={a.y} rx={rx} ry={ry}
          fill="none" {...common} stroke={level.color} strokeOpacity={r===1?1:.6}/>;
      })}
    </g>;
  }
  if(tool==="gann-box"){
    const grid=gannGrid(plot,a,b,drawing.gridDivisions??4);
    if(!grid)return null;
    const left=Math.min(a.x,b.x),right=Math.max(a.x,b.x);
    const top=Math.min(a.y,b.y),bottom=Math.max(a.y,b.y);
    return <g className="drawing-gann-box">
      <rect x={left} y={top} width={right-left} height={bottom-top}
        fill={drawing.color} fillOpacity={drawing.fillOpacity??.08} {...common}/>
      {grid.vertical.map((x,i)=><line key={"v"+i} x1={x} x2={x} y1={top} y2={bottom}
        {...common} strokeWidth={.8} strokeOpacity={.45} pointerEvents="none"/>)}
      {grid.horizontal.map((y,i)=><line key={"h"+i} y1={y} y2={y} x1={left} x2={right}
        {...common} strokeWidth={.8} strokeOpacity={.45} pointerEvents="none"/>)}
      {grid.diag.map(([p,q],i)=><line key={"d"+i} x1={p.x} y1={p.y} x2={q.x} y2={q.y}
        {...common} strokeDasharray="4 5" strokeOpacity={.55} pointerEvents="none"/>)}
      {showLabels&&<text x={left+6} y={Math.max(15,top+12)} fill={drawing.color}
        fontSize={9} pointerEvents="none">SCALE-DEPENDENT GEOMETRY</text>}
    </g>;
  }
  if(tool==="triangle"){
    if(points.length<3)return null;
    return <polygon points={points.slice(0,3).map(p=>p.x+","+p.y).join(" ")}
      {...common} fill={drawing.color} fillOpacity={drawing.fillOpacity??.09}
      className="drawing-triangle"/>;
  }
  if(tool==="pattern-abcd"||tool==="pattern-xabcd"||tool==="elliott-impulse"){
    if(points.length<2)return null;
    const path=points.map((p,i)=>(i?"L":"M")+" "+p.x+" "+p.y).join(" ");
    const labels=labelsFor[tool],stats=patternPriceRatios(pointAnchors);
    return <g className="drawing-pattern">
      <path d={path} fill="none" stroke="transparent" strokeWidth={17} className="drawing-hit"/>
      <path d={path} fill="none" {...common} className="drawing-pattern-path"/>
      {points.map((p,i)=><g key={i} pointerEvents="none">
        <circle cx={p.x} cy={p.y} r={3.5} fill={drawing.color}/>
        {showLabels&&<text x={p.x+8} y={p.y-9} fill={drawing.color}
          fontSize={11} fontWeight={700}>{labels[i]??""}</text>}
      </g>)}
      {showLabels&&tool==="pattern-abcd"&&stats.ratio!==null&&points.length>=4&&
        <text x={points[points.length-1].x+8} y={points[points.length-1].y+14}
          fill={drawing.color} fontSize={10} pointerEvents="none">
          {"CD / AB: "+stats.ratio.toFixed(2)+"×"}
        </text>}
    </g>;
  }
  if(tool==="cyclic-lines"){
    const xs=cycleLinePositions(a.x,b.x,plot.width);
    return <g className="drawing-cyclic-lines">{xs.map((x,i)=><g key={i}>
      <line x1={x} x2={x} y1={0} y2={plot.height}
        stroke="transparent" strokeWidth={11} className="drawing-hit"/>
      <line x1={x} x2={x} y1={0} y2={plot.height}
        {...common} strokeOpacity={i===0?1:.5}/>
      {showLabels&&<text x={x+3} y={18} fill={drawing.color} fontSize={9}
        pointerEvents="none">{i}</text>}
    </g>)}</g>;
  }
  if(tool==="callout"||tool==="price-note"){
    const text=safeLabel(drawing.text??(tool==="callout"?"Observation": "Marked price"));
    const classification=tool==="callout"&&drawing.evidenceSide==="supports"?"[SUPPORTS] ":
      tool==="callout"&&drawing.evidenceSide==="challenges"?"[CHALLENGES] ":"";
    const label=tool==="price-note"?drawing.start.price.toFixed(precision)+" · "+text:
      classification+text;
    const fontSize=drawing.fontSize??11;
    const w=Math.min(390,Math.max(95,label.length*fontSize*.62+24));
    const left=Math.min(Math.max(4,a.x+13),Math.max(4,plot.width-w-5));
    const top=Math.max(4,Math.min(plot.height-50,a.y-45));
    return <g className={"drawing-"+tool}>
      <line x1={a.x} y1={a.y} x2={left+6} y2={top+29}
        stroke={drawing.color} strokeWidth={1.3} pointerEvents="none"/>
      <circle cx={a.x} cy={a.y} r={3} fill={drawing.color}/>
      <rect x={left} y={top} width={w} height={Math.max(31,fontSize+19)} rx={5}
        fill="var(--panel)" stroke={drawing.color} strokeWidth={1.2}/>
      <text x={left+9} y={top+fontSize+8} fill={drawing.color} fontSize={fontSize}
        fontWeight={650} pointerEvents="none">{label}</text>
    </g>;
  }
  if(tool==="arrow-marker"){
    const degrees=({up:0,right:90,down:180,left:270} as const)[drawing.markerDirection??"up"];
    return <g className="drawing-arrow-marker"
      transform={`translate(${a.x} ${a.y}) rotate(${degrees})`}>
      <path d="M 0 -25 L -10 -12 H -5 V 0 H 5 V -12 H 10 Z"
        fill={drawing.color} stroke="var(--panel)" strokeWidth={1.2}/>
      <circle r={3} fill="var(--panel)" stroke={drawing.color} strokeWidth={1}/>
    </g>;
  }
  return null;
}
