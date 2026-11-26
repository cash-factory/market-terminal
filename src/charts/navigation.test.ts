import {describe,expect,it} from "vitest";
import type {CandlestickData,UTCTimestamp} from "lightweight-charts";
import {nearestObservedBar,ohlcCsv,parseUtcChartDate} from "./navigation";
const candle=(time:number,close=2):CandlestickData<UTCTimestamp>=>({
  time:time as UTCTimestamp,open:1,high:3,low:0.5,close
});
describe("UTC chart navigation and provenance export",()=>{
  it("rejects invalid civil dates and parses UTC independent of browser locale",()=>{
    expect(parseUtcChartDate("2026-11-23T03:15")).toBe(Date.UTC(2026,10,23,3,15)/1000);
    expect(parseUtcChartDate("2026-02-30T03:15")).toBeNull();
    expect(parseUtcChartDate("23/11/2026")).toBeNull();
  });
  it("finds nearest observed bar without fabricating weekend candles",()=>{
    const series=[candle(100),candle(200),candle(1200),candle(1300)];
    expect(nearestObservedBar(series,250)).toBe(1);
    expect(nearestObservedBar(series,1150)).toBe(2);
    expect(nearestObservedBar(series,-100)).toBe(0);
    expect(nearestObservedBar(series,99999)).toBe(3);
    expect(nearestObservedBar([],100)).toBeNull();
    expect(nearestObservedBar(series,NaN)).toBeNull();
  });
  it("exports exactly the available replay prefix with immutable source fields",()=>{
    const candles=[candle(100),candle(200),candle(300)];
    const csv=ohlcCsv(candles.slice(0,2),"EURUSD","demo","1m");
    expect(csv).toContain("time_utc,symbol,source,frame,open,high,low,close");
    expect(csv.split("\n")).toHaveLength(4);
    expect(csv).toContain("EURUSD,demo,1m");
    expect(csv).not.toContain("1970-01-01T00:05:00.000Z");
  });
});
