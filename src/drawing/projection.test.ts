import {describe,expect,it} from "vitest";
import {projectedSegment} from "./projection";
const plot={width:100,height:100},a={x:20,y:30},b={x:40,y:50};
describe("independent line projection geometry",()=>{
 it("keeps two endpoints for segment mode",()=>expect(projectedSegment(a,b,plot,"segment")).toEqual({start:a,end:b}));
 it("extends toward the second point on a bounded chart",()=>{
   expect(projectedSegment(a,b,plot,"right")?.end).toEqual({x:90,y:100});
 });
 it("extends backwards without swapping the original first anchor",()=>{
   expect(projectedSegment(a,b,plot,"left")?.start).toEqual({x:0,y:10});
 });
 it("rejects collapsed anchors",()=>expect(projectedSegment(a,a,plot,"both")).toBeNull());
});
