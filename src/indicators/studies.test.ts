import { describe,expect,it } from "vitest";
import type { CandlestickData,UTCTimestamp } from "lightweight-charts";
import {
  atr,bollingerBands,ema,emaSeries,macd,movingAverage,
  parseStudies,rsi,defaultStudies
} from "./studies";

const make=(closes:number[]):CandlestickData<UTCTimestamp>[]=>closes.map((close,i)=>({
  time:(1800000000+i*60) as UTCTimestamp,
  open:close,high:close+2,low:close-2,close
}));

describe("source-independent technical studies",()=>{
  it("computes an SMA and seeded EMA with explicit warm-up periods",()=>{
    const rows=make([1,2,3,4,5]);
    expect(movingAverage(rows,3).map(x=>x.value)).toEqual([2,3,4]);
    expect(ema(rows,3).map(x=>x.value)).toEqual([2,3,4]);
    expect(emaSeries([],3)).toEqual([]);
    expect(ema(rows,8)).toEqual([]);
  });
  it("computes population-volatility Bollinger bands around a fixed window",()=>{
    const bands=bollingerBands(make([1,2,3,4]),3,2);
    expect(bands.middle.map(x=>x.value)).toEqual([2,3]);
    expect(bands.upper[0].value).toBeCloseTo(2+2*Math.sqrt(2/3),9);
    expect(bands.lower[0].value).toBeCloseTo(2-2*Math.sqrt(2/3),9);
    expect(bands.upper[1].value).toBeCloseTo(3+2*Math.sqrt(2/3),9);
  });
  it("uses Wilder RSI smoothing with sensible flat/rising/falling cases",()=>{
    expect(rsi(make([10,10,10,10]),2).map(x=>x.value)).toEqual([50,50]);
    expect(rsi(make([10,11,12,13,14]),2).map(x=>x.value)).toEqual([100,100,100]);
    expect(rsi(make([15,14,13,12]),2).map(x=>x.value)).toEqual([0,0]);
    expect(rsi(make([1,2]),14)).toEqual([]);
  });
  it("calculates a correctly aligned MACD signal and histogram",()=>{
    const bars=make(Array.from({length:48},()=>100));
    const out=macd(bars,12,26,9);
    expect(out.macd).toHaveLength(23);
    expect(out.signal).toHaveLength(15);
    expect(out.histogram).toHaveLength(15);
    expect(out.macd[0].time).toBe(bars[25].time);
    expect(out.signal[0].time).toBe(bars[33].time);
    expect(out.histogram.every(x=>x.value===0)).toBe(true);
  });
  it("seeds ATR from true ranges and maintains smoothing",()=>{
    const bars=make([10,10,10,10,10]);
    const result=atr(bars,3);
    expect(result.map(x=>x.value)).toEqual([4,4,4]);
    expect(result[0].time).toBe(bars[2].time);
  });
  it("rejects invalid windows and preserves only validated saved study toggles",()=>{
    expect(()=>movingAverage(make([1,2,3]),0)).toThrow(/period/);
    expect(()=>macd(make([1,2,3]),26,12,9)).toThrow(/shorter/);
    expect(()=>bollingerBands(make([1,2,3]),3,-1)).toThrow(/positive/);
    expect(parseStudies({ema20:true,rsi14:"yes",macd:true})).toEqual({
      ...defaultStudies,ema20:true,macd:true
    });
  });
});
