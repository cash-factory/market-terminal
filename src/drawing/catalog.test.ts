import {describe,expect,it} from "vitest";
import {isDrawing,translateDrawing,type Drawing,type DrawingTool} from "./types";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";

const base:Drawing={
  id:"a",symbol:"EURUSD",source:"demo",tool:"trendline",locked:false,
  color:"#abcdee",start:{time:1800000000,price:1.1},end:{time:1800000060,price:1.2}
};
describe("additional drawing types and safe storage",()=>{
  it("accepts arrows, ellipses, annotations, position tools and brush",()=>{
    const names:DrawingTool[]=["arrow","ellipse","text","long-position","short-position","brush"];
    for(const tool of names)expect(isDrawing({...base,tool})).toBe(true);
    expect(isDrawing({...base,tool:"unknown"})).toBe(false);
  });
  it("validates annotation text and every freehand point before loading",()=>{
    expect(isDrawing({...base,tool:"text",text:"Strategy note"})).toBe(true);
    expect(isDrawing({...base,text:undefined})).toBe(true);
    expect(isDrawing({...base,text:7})).toBe(false);
    expect(isDrawing({...base,tool:"brush",points:[base.start,base.end]})).toBe(true);
    expect(isDrawing({...base,points:[base.start,{time:3,price:0}]})).toBe(false);
  });
  it("translates freehand paths along with anchors during dragging",()=>{
    const initial:Drawing={...base,tool:"brush",points:[
      base.start,{time:1800000030,price:1.15},base.end
    ]};
    const result=translateDrawing(initial,{time:1800000120,price:2.1},{time:1800000180,price:2.2});
    expect(result.points).toEqual([
      {time:1800000120,price:2.1},
      {time:1800000150,price:2.15},
      {time:1800000180,price:2.2}
    ]);
    expect(initial.points?.[0]).toEqual(base.start);
  });
  it("validates independently adjustable time markers and new analytical drawing variants",()=>{
    const newTools:DrawingTool[]=["trend-angle","regression-channel","highlighter"];
    for(const tool of newTools)expect(isDrawing({...base,tool})).toBe(true);
    expect(isDrawing({...base,tool:"regression-channel",regressionDeviation:2.5})).toBe(true);
    expect(isDrawing({...base,tool:"regression-channel",regressionDeviation:5})).toBe(false);
    expect(isDrawing({...base,tool:"trendline",regressionDeviation:2})).toBe(false);
    expect(isDrawing({...base,tool:"fib-timezone",timeLevels:[0,1,2,3,5,8]})).toBe(true);
    expect(isDrawing({...base,tool:"fib-timezone",timeLevels:[1,1]})).toBe(false);
    expect(isDrawing({...base,tool:"fib-timezone",timeLevels:[-1,5]})).toBe(false);
    expect(isDrawing({...base,tool:"cyclic-lines",cycleCount:16})).toBe(true);
    expect(isDrawing({...base,tool:"cyclic-lines",cycleCount:25})).toBe(false);
    expect(isDrawing({...base,tool:"fibonacci",timeLevels:[1,2]})).toBe(false);
  });
  it("roundtrips extended drawing objects and keeps legacy workspace data",()=>{
    const docs:Drawing[]=[{...base,tool:"text",text:"Entry zone"},
      {...base,id:"b",tool:"brush",points:[base.start,base.end]}];
    const state={...defaultWorkspace,drawings:docs};
    expect(parseWorkspace(JSON.parse(serializeWorkspace(state)))).toEqual(state);
    expect(parseWorkspace({drawings:[docs[0],{...docs[1],points:[{time:1,price:-1}]}]}).drawings)
      .toHaveLength(1);
  });
});
