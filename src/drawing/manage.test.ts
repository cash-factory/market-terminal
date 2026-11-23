import {describe,expect,it} from "vitest";
import {groupDrawings,ungroupDrawings,updateDrawingAndGroup,styleDrawings,moveDrawingLayers} from "./manage";
import {isDrawing,type Drawing} from "./types";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";

const d=(id:string,source:"demo"|"binance"="demo",symbol:"EURUSD"|"BTCUSDT"="EURUSD"):Drawing=>({
 id,symbol,source,tool:"trendline",start:{time:1000,price:10},end:{time:1060,price:12},
 locked:false,color:"#123456"
});
describe("chart drawing editor: groups, style and layering",()=>{
 it("groups only matching markets and sources",()=>{
   const all=[d("one"),d("two"),d("three","binance","BTCUSDT")];
   const grouped=groupDrawings(all,["one","two"],"group:test");
   expect(grouped.slice(0,2).every(d=>d.groupId==="group:test")).toBe(true);
   expect(grouped[2].groupId).toBeUndefined();
   expect(()=>groupDrawings(all,["one"],"g")).toThrow(/two/);
   expect(()=>groupDrawings(all,["one","three"],"g")).toThrow(/same/);
   expect(ungroupDrawings(grouped,["one","two"]).map(d=>d.groupId)).toEqual([undefined,undefined,undefined]);
 });
 it("moves every member when one group member is dragged, but not when endpoint resized",()=>{
   const grouped=groupDrawings([d("a"),d("b"),d("c")],["a","b"],"g");
   const move={...grouped[0],start:{time:1060,price:13},end:{time:1120,price:15}};
   const moved=updateDrawingAndGroup(grouped,move,"move");
   expect(moved[1].start).toEqual({time:1060,price:13});
   expect(moved[1].end).toEqual({time:1120,price:15});
   expect(moved[2]).toEqual(grouped[2]);
   const resized=updateDrawingAndGroup(grouped,move,"end");
   expect(resized[1]).toEqual(grouped[1]);
 });
 it("never moves locked group members or corrupts market coordinates",()=>{
   const grouped=groupDrawings([
     d("a"),
     {...d("b"),start:{time:450,price:0.5},end:{time:510,price:0.8}},
     d("c")
   ],["a","b"],"g");
   const invalidShift={...grouped[0],start:{time:100,price:9},end:{time:160,price:11}};
   expect(isDrawing(invalidShift)).toBe(true);
   expect(()=>updateDrawingAndGroup(grouped,invalidShift,"move")).toThrow(/Group move cancelled/);
   expect(grouped[0].start).toEqual({time:1000,price:10});
   expect(grouped[1].start).toEqual({time:450,price:0.5});
   const locked=grouped.map(d=>d.id==="b"?{...d,locked:true}:d);
   expect(()=>updateDrawingAndGroup(locked,{
     ...locked[0],start:{time:1030,price:11},end:{time:1090,price:13}
   },"move")).toThrow(/Unlock every member/);
   expect(()=>updateDrawingAndGroup(locked,{
     ...locked[1],start:{time:600,price:1}
   },"end")).toThrow(/Unlock the drawing/);
 });
 it("rejects invalid anchor edits and cross-source identity changes atomically",()=>{
   const items=[d("a"),d("b")];
   expect(()=>updateDrawingAndGroup(items,{
     ...items[0],end:{time:-20,price:12}
   },"end")).toThrow(/outside valid time/);
   expect(()=>updateDrawingAndGroup(items,{
     ...items[0],source:"binance"
   },"move")).toThrow(/identity or market source/);
   expect(()=>updateDrawingAndGroup(items,{
     ...items[0],end:{time:1040,price:0}
   },"end")).toThrow(/outside valid time/);
   expect(items.map(d=>d.end.price)).toEqual([12,12]);
 });
 it("applies all group projections as one edit without time-gap distortion",()=>{
   const grouped=groupDrawings([d("a"),{...d("b"),
     start:{time:2000,price:5},end:{time:2060,price:7}}],["a","b"],"g");
   const selected={...grouped[0],start:{time:1030,price:11},end:{time:1090,price:13}};
   // On a discontinuous time axis the second member can move 2,000 seconds
   // while the first moves 30; both represent an equal visual translation.
   const peer={...grouped[1],start:{time:4000,price:6},end:{time:4060,price:8}};
   const result=updateDrawingAndGroup(grouped,selected,"move",[peer]);
   expect(result[0]).toEqual(selected);
   expect(result[1]).toEqual(peer);
   expect(()=>updateDrawingAndGroup(grouped,selected,"move",[]))
     .toThrow(/not all member projections/);
   expect(()=>updateDrawingAndGroup(grouped,selected,"move",[
     {...peer,end:{time:-1,price:8}}
   ])).toThrow(/invalid or mismatched/);
   expect(grouped[1].start.time).toBe(2000);
 });
 it("styles multiple selected objects and changes their visual z-order",()=>{
   const initial=[d("a"),d("b"),d("c"),d("d")];
   const styled=styleDrawings(initial,["b","c"],{
     color:"#abcdef",strokeWidth:4,dash:"dashed",opacity:.7
   });
   expect(styled[1]).toMatchObject({color:"#abcdef",strokeWidth:4,dash:"dashed",opacity:.7});
   expect(styled[2].dash).toBe("dashed");
   expect(initial[1].dash).toBeUndefined();
   expect(moveDrawingLayers(initial,["b","c"],"forward").map(d=>d.id)).toEqual(["a","d","b","c"]);
   expect(moveDrawingLayers(initial,["b","c"],"backward").map(d=>d.id)).toEqual(["b","c","a","d"]);
 });
 it("validates and roundtrips styling, preserves legacy objects",()=>{
   const styled:Drawing={...d("s"),groupId:"g",strokeWidth:6,dash:"dotted",opacity:.4};
   expect(isDrawing(styled)).toBe(true);
   for(const invalid of [{strokeWidth:100},{dash:"missing"},{opacity:2},{groupId:""}])
     expect(isDrawing({...styled,...invalid})).toBe(false);
   const state={...defaultWorkspace,drawings:[styled]};
   expect(parseWorkspace(JSON.parse(serializeWorkspace(state)))).toEqual(state);
   expect(parseWorkspace({drawings:[d("simple")]}).drawings).toHaveLength(1);
 });
});
