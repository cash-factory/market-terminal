import {describe,expect,it} from "vitest";
import {fitRegressionChannel} from "./regressionChannel";
const row=(time:number,close:number)=>({time,close});
describe("regression channel over observed closes",()=>{
  it("fits a perfect observed trend with zero residual deviation",()=>{
    const result=fitRegressionChannel([row(0,10),row(60,12),row(120,14),row(180,16)],0,180);
    expect(result).toMatchObject({count:4,fromTime:0,toTime:180,first:10,last:16,slopePerObservedBar:2});
    expect(result?.deviation).toBeCloseTo(0,12);
  });
  it("limits the study to selected bars, not later candles or imagined missing intervals",()=>{
    const rows=[row(0,10),row(60,12),row(300,14),row(360,20),row(420,5000)];
    const result=fitRegressionChannel(rows,0,360);
    expect(result?.count).toBe(4);
    expect(result?.toTime).toBe(360);
    expect(result?.last).toBeLessThan(30);
    expect(result?.deviation).toBeGreaterThan(0);
  });
  it("refuses too few, unsorted, or invalid observations",()=>{
    expect(fitRegressionChannel([row(0,10),row(60,12)],0,60)).toBeNull();
    expect(fitRegressionChannel([row(100,10),row(90,12),row(120,13)],0,150)).toBeNull();
    expect(fitRegressionChannel([row(0,10),row(60,-1),row(120,14)],0,120)).toBeNull();
  });
  it("provides identical fits when anchor times are reversed",()=>{
    const data=[row(0,100),row(60,107),row(120,105),row(180,115)];
    expect(fitRegressionChannel(data,0,180)).toEqual(fitRegressionChannel(data,180,0));
  });
});
