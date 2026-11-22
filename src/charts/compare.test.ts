import {describe,expect,it} from "vitest";
import type {CandlestickData,UTCTimestamp} from "lightweight-charts";
import {rebaseComparison,comparePercentChange} from "./compare";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";
const bars=(times:number[],closes:number[]):CandlestickData<UTCTimestamp>[]=>
  times.map((t,i)=>({time:t as UTCTimestamp,open:closes[i],high:closes[i],
    low:closes[i],close:closes[i]}));
describe("source-aware comparison overlay",()=>{
  it("rebases comparison closings to the first observed common timestamp",()=>{
    const first=bars([1000,1060,1120],[100,110,120]);
    const other=bars([1000,1060,1120],[20,22,18]);
    const result=rebaseComparison(first,other);
    expect(result.map(d=>d.value)).toEqual([100,110,90]);
    expect(comparePercentChange(result)).toBeCloseTo(-10);
  });
  it("never manufactures weekend, holiday or unmatched UTC bars",()=>{
    const first=bars([1000,1060,9000,9060],[100,110,120,130]);
    const other=bars([1000,5000,9000],[25,30,50]);
    const result=rebaseComparison(first,other);
    expect(result).toEqual([{time:1000,value:100},{time:9000,value:200}]);
    expect(result.some(d=>Number(d.time)===1060)).toBe(false);
    expect(rebaseComparison(first,bars([9999],[44]))).toEqual([]);
    expect(comparePercentChange([])).toBeNull();
  });
  it("prevents zero-price baselines and invalid future extrapolation",()=>{
    expect(rebaseComparison(bars([1,2],[10,11]),bars([1,2],[0,22]))).toEqual([]);
    expect(rebaseComparison([],bars([1],[10]))).toEqual([]);
  });
  it("persists comparison source only when venue provides it, including profiles",()=>{
    const w={...defaultWorkspace,comparisonOverlaySymbol:"BTCUSDT" as const,
      comparisonOverlaySource:"binance" as const};
    expect(parseWorkspace(JSON.parse(serializeWorkspace(w)))).toEqual(w);
    expect(parseWorkspace({comparisonOverlaySymbol:"AAPL",comparisonOverlaySource:"binance"}))
      .toMatchObject({comparisonOverlaySymbol:"AAPL",comparisonOverlaySource:"demo"});
    expect(parseWorkspace({comparisonOverlaySymbol:"UNKNOWN",comparisonOverlaySource:"binance"}))
      .toMatchObject({comparisonOverlaySymbol:null,comparisonOverlaySource:"demo"});
  });
});
