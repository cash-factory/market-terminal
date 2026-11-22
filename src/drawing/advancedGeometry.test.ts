import {describe,expect,it} from "vitest";
import {cycleLinePositions,fibTimePositions,gannGrid,medianPitchfork} from "./advancedGeometry";
describe("multi-anchor visual studies are deterministic, chart-scale-qualified geometry",()=>{
  it("median fork uses exact midpoint and parallel vector",()=>{
    expect(medianPitchfork({x:0,y:0},{x:8,y:6},{x:12,y:2}))
      .toEqual({mid:{x:10,y:4},vector:{x:10,y:4},
        origins:[{x:0,y:0},{x:8,y:6},{x:12,y:2}]});
    expect(medianPitchfork({x:0,y:0},{x:-2,y:0},{x:2,y:0})).toBeNull();
  });
  it("fib time zones use observed chart x-distance and clip at viewport edge",()=>{
    expect(fibTimePositions(10,30,100,[0,1,2,3,5,8]))
      .toEqual([{level:0,x:10},{level:1,x:30},{level:2,x:50},{level:3,x:70}]);
    expect(fibTimePositions(15,15,100,[0,1])).toEqual([]);
  });
  it("repeated cycle guides remain bounded even for tiny intervals",()=>{
    expect(cycleLinePositions(10,30,80)).toEqual([10,30,50,70]);
    expect(cycleLinePositions(10,10,80)).toEqual([]);
    expect(cycleLinePositions(10,11,100000).length).toBeLessThanOrEqual(64);
  });
  it("gann grid is explicitly just proportional geometry",()=>{
    const grid=gannGrid({width:100,height:100},{x:10,y:10},{x:90,y:90});
    expect(grid?.vertical).toEqual([30,50,70]);
    expect(grid?.horizontal).toEqual([30,50,70]);
    expect(grid?.diag[0]).toEqual([{x:10,y:90},{x:90,y:10}]);
  });
});
