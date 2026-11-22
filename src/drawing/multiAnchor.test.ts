import {describe,expect,it} from "vitest";
import {addMultiPointAnchor,FIB_EXTENSION_LEVELS,fibExtensionPrices,
  isCompleteMultiPointDrawing,MULTI_POINT_COUNTS,patternPriceRatios} from "./multiAnchor";
import {isDrawing,type Drawing} from "./types";

const a={time:1000,price:10},b={time:1100,price:20},c={time:1200,price:15};
const base:Drawing={
 id:"p",symbol:"EURUSD",source:"demo",tool:"pitchfork",locked:false,color:"#abcdef",
 start:a,end:b,points:[a,b,c]
};
describe("multi-anchor drawing behavior and Fibonacci math",()=>{
 it("requires the correct count and consistent endpoints before saving",()=>{
   for(const [tool,count] of Object.entries(MULTI_POINT_COUNTS)){
     const points=Array.from({length:count},(_,i)=>({time:1000+i*60,price:10+i}));
     const draft:Drawing={...base,tool:tool as Drawing["tool"],
       start:points[0],end:points[1],points};
     expect(isDrawing(draft)).toBe(true);
     expect(isCompleteMultiPointDrawing(draft)).toBe(true);
     expect(isDrawing({...draft,points:points.slice(0,-1)})).toBe(false);
     expect(isDrawing({...draft,start:{time:1,price:1}})).toBe(false);
   }
 });
 it("builds multi-click pattern stages one click at a time",()=>{
   expect(addMultiPointAnchor([a,b],c,4)).toEqual({points:[a,b,c],complete:false});
   const next={time:1300,price:25};
   expect(addMultiPointAnchor([a,b,c],next,4)).toEqual({
     points:[a,b,c,next],complete:true
   });
   expect(()=>addMultiPointAnchor([a,b,c],next,3)).toThrow();
 });
 it("projects Fibonacci extension prices from a third anchor, not the first",()=>{
   const result=fibExtensionPrices(100,140,125);
   expect(result[0]).toBe(125);
   expect(result[FIB_EXTENSION_LEVELS.indexOf(1)]).toBe(165);
   expect(result[FIB_EXTENSION_LEVELS.indexOf(1.618)]).toBeCloseTo(189.72);
 });
 it("reports price-leg ratio as a measurement, never a market prediction",()=>{
   const measure=patternPriceRatios([
     {time:0,price:100},{time:1,price:120},
     {time:2,price:112},{time:3,price:132}
   ]);
   expect(measure.ratio).toBe(1);
   expect(measure.legs).toEqual([20,8,20]);
 });
});
