import {describe,expect,it} from "vitest";
import type {CandlestickData,UTCTimestamp} from "lightweight-charts";
import {measurement,nearestCandleIndex,rayEndpoint,snapAnchorToOhlc} from "./snap";
import {isDrawing,type Drawing} from "./types";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";

const bars: CandlestickData<UTCTimestamp>[]=[
 {time:1000 as UTCTimestamp,open:100,high:105,low:95,close:101},
 {time:1060 as UTCTimestamp,open:101,high:106,low:96,close:104},
 {time:1120 as UTCTimestamp,open:104,high:107,low:102,close:103},
];
describe("OHLC drawing magnet",()=>{
 it("finds nearest timestamp without scanning every bar",()=>{
   expect(nearestCandleIndex(bars,1062)).toBe(1);
   expect(nearestCandleIndex(bars,1091)).toBe(2);
   expect(nearestCandleIndex(bars,900)).toBe(0);
   expect(nearestCandleIndex([],1000)).toBe(-1);
 });
 it("snaps ONLY near the actual candle OHLC point, preserving exact price/time",()=>{
   const snap=snapAnchorToOhlc(
     {time:1062,price:105.5},{x:59,y:94},
     bars,time=>(time-1000)*1,price=>200-price,14
   );
   expect(snap).toEqual({
     snapped:true,field:"high",anchor:{time:1060,price:106}
   });
   const far=snapAnchorToOhlc(
     {time:1062,price:88},{x:59,y:146},bars,time=>(time-1000),price=>200-price,14
   );
   expect(far.snapped).toBe(false);
   expect(far.anchor.time).toBe(1062);
 });
 it("chooses the visually closest OHLC candle when calendar gaps compress on screen",()=>{
   const plotX=new Map([[1000,0],[1060,10],[1120,20]]);
   const result=snapAnchorToOhlc(
     {time:1060,price:107},{x:20,y:93},bars,
     time=>plotX.get(time)??null,price=>200-price,12
   );
   expect(result).toEqual({
     anchor:{time:1120,price:107},snapped:true,field:"high"
   });
 });
 it("handles missing projections, empty data and invalid distances",()=>{
   expect(snapAnchorToOhlc({time:1000,price:100},{x:0,y:0},[],()=>0,()=>0).snapped).toBe(false);
   expect(snapAnchorToOhlc({time:1000,price:100},{x:0,y:0},bars,()=>null,()=>0).snapped).toBe(false);
   expect(snapAnchorToOhlc({time:1000,price:100},{x:0,y:0},bars,()=>0,()=>0,-3).snapped).toBe(false);
 });
 it("extends rays only forward and measures directional price changes",()=>{
   expect(rayEndpoint({x:20,y:20},{x:40,y:40},100,80)).toEqual({x:80,y:80});
   expect(rayEndpoint({x:80,y:70},{x:60,y:70},100,80)).toEqual({x:0,y:70});
   expect(measurement({time:1000,price:100},{time:1120,price:110},60)).toEqual({
     change:10,percent:10,bars:2
   });
 });
 it("round-trips new ray and measure tool objects and magnet preference",()=>{
   const object:Drawing={
     id:"ray-1",symbol:"AAPL",source:"demo",tool:"ray",
     color:"#aabbcc",locked:false,start:{time:1000,price:100},end:{time:1060,price:102}
   };
   expect(isDrawing(object)).toBe(true);
   expect(isDrawing({...object,tool:"measure"})).toBe(true);
   expect(isDrawing({...object,tool:"bad-tool"})).toBe(false);
   const state={...defaultWorkspace,magnetEnabled:true,drawings:[object]};
   expect(parseWorkspace(JSON.parse(serializeWorkspace(state)))).toEqual(state);
   expect(parseWorkspace({}).magnetEnabled).toBe(false);
 });
});
