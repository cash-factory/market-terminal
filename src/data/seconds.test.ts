import {describe,expect,it} from "vitest";
import {aggregateSeconds,nativeBinanceInterval} from "./seconds";
import type {Candle} from "./contracts";
const bar=(time:number,open:number,close:number,isFinal=true):Candle=>({
  openTimeMs:time,open,close,high:Math.max(open,close)+1,
  low:Math.min(open,close)-1,isFinal,volume:2,volumeType:"base"
});
describe("real second-scale price aggregation",()=>{
  it("preserves exchange OHLC, volume, candle source and interval boundary",()=>{
    const rows=[
      bar(0,100,101),bar(1000,101,104),bar(2000,104,103),
      bar(3000,103,98),bar(4000,98,99),bar(5000,99,100),
    ];
    const result=aggregateSeconds(rows,"5s");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({openTimeMs:0,open:100,high:105,low:97,close:99,volume:10,isFinal:true});
    expect(result[1]).toMatchObject({openTimeMs:5000,open:99,close:100,volume:2,isFinal:false});
  });
  it("does not fabricate missing seconds or clone prices",()=>{
    const rows=[bar(0,100,102),bar(3000,103,105),bar(9000,110,112)];
    const result=aggregateSeconds(rows,"5s");
    expect(result.map(c=>c.openTimeMs)).toEqual([0,5000]);
    expect(result[0].open).toBe(100);
    expect(result[0].close).toBe(105);
    expect(result[0].volume).toBe(4);
    expect(result[0].isFinal).toBe(false);
  });
  it("keeps one-second native data and requests one-second spot source for subminute charts",()=>{
    const rows=[bar(1000,100,102),bar(2000,102,103)];
    expect(aggregateSeconds(rows,"1s")).toEqual(rows);
    expect(nativeBinanceInterval("10s")).toBe("1s");
    expect(nativeBinanceInterval("1m")).toBe("1m");
  });
});
