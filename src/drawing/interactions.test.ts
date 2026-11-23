import {describe,expect,it} from "vitest";
import {translateDrawingOnChart} from "./interactions";
import type {ChartAnchor,Drawing} from "./types";

const base:Drawing={
  id:"object",symbol:"EURUSD",source:"demo",tool:"trendline",
  start:{time:1000,price:100},end:{time:1060,price:110},
  color:"#aabbcc",locked:false
};

describe("drawing interaction geometry",()=>{
  const project=(anchor:ChartAnchor)=>({x:(anchor.time-1000)*2,y:(200-anchor.price)*5});
  const recover=(point:{x:number;y:number}):ChartAnchor=>({
    time:Math.round(point.x/2+1000),price:200-point.y/5
  });

  it("moves each anchor, including vertices and controls, by an equal on-screen distance",()=>{
    const original:Drawing={...base,tool:"channel",control:{time:1030,price:120},
      points:[base.start,base.end,{time:1040,price:115}],target:{time:1060,price:125}};
    const moved=translateDrawingOnChart(original,{x:24,y:15},project,recover);
    expect(moved).not.toBeNull();
    for(const [before,after] of [
      [original.start,moved!.start],[original.end,moved!.end],
      [original.control!,moved!.control!],
      [original.target!,moved!.target!],
      ...original.points!.map((p,i)=>[p,moved!.points![i]])
    ] as [ChartAnchor,ChartAnchor][]) {
      const a=project(before),b=project(after);
      expect(b.x-a.x).toBeCloseTo(24);
      expect(b.y-a.y).toBeCloseTo(15);
    }
    expect(original.start).toEqual({time:1000,price:100});
  });

  it("does not distort a line when a drag crosses a market-closure time gap",()=>{
    const boundary=1060,gapEnd=260260;
    const gapProject=(anchor:ChartAnchor)=>({
      x:anchor.time<=boundary?(anchor.time-1000)/60*100:
        100+(anchor.time-boundary)/(gapEnd-boundary)*100,
      y:(200-anchor.price)*5
    });
    const gapRecover=(point:{x:number;y:number})=>({
      time:Math.round(point.x<=100?1000+point.x/100*60:
        boundary+(point.x-100)/100*(gapEnd-boundary)),
      price:200-point.y/5
    });
    const moved=translateDrawingOnChart(base,{x:100,y:0},gapProject,gapRecover);
    expect(moved).not.toBeNull();
    expect(moved!.start.time).toBe(1060);
    expect(moved!.end.time).toBe(gapEnd);
    expect(gapProject(moved!.start).x-gapProject(base.start).x).toBeCloseTo(100);
    expect(gapProject(moved!.end).x-gapProject(base.end).x).toBeCloseTo(100);
  });

  it("rejects an entire move if any point is outside the valid market domain",()=>{
    expect(translateDrawingOnChart(base,{x:0,y:550},project,recover)).toBeNull();
    expect(translateDrawingOnChart(base,{x:-5000,y:0},project,recover)).toBeNull();
    expect(translateDrawingOnChart({...base,locked:true},{x:10,y:0},project,recover)).toBeNull();
    expect(translateDrawingOnChart(base,{x:NaN,y:0},project,recover)).toBeNull();
    expect(translateDrawingOnChart({...base,target:{time:1100,price:100}},
      {x:2,y:0},p=>p.time===1100?null:project(p),recover)).toBeNull();
  });

  it("keeps multi-anchor first/second points equal to their canonical endpoints",()=>{
    const drawing:Drawing={...base,tool:"pitchfork",points:[base.start,base.end,{time:1120,price:120}]};
    const moved=translateDrawingOnChart(drawing,{x:20,y:5},project,recover);
    expect(moved?.points?.[0]).toEqual(moved?.start);
    expect(moved?.points?.[1]).toEqual(moved?.end);
  });
});
