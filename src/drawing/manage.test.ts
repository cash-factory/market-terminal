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
