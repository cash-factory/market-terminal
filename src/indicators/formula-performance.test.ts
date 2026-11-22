import {describe,expect,it} from "vitest";
import type {CandlestickData,UTCTimestamp} from "lightweight-charts";
import {
  compileFormula,evaluateFormula,formulaWorkUnits,MAX_FORMULA_WORK_UNITS
} from "./formula";

const candle:CandlestickData<UTCTimestamp>={
  time:1800000000 as UTCTimestamp,open:100,high:101,low:99,close:100
};
describe("safe study performance envelopes",()=>{
  it("prevents a pathological formula-history combination before allocating evaluator arrays",()=>{
    const expression=Array(24).fill("close").join("+");
    expect(compileFormula(expression)).toBeDefined();
    expect(formulaWorkUnits(expression,90_000)).toBeGreaterThan(MAX_FORMULA_WORK_UNITS);
    const history=Array(90_000).fill(candle) as CandlestickData<UTCTimestamp>[];
    expect(()=>evaluateFormula(expression,history)).toThrow(/safe chart budget/);
  });
  it("still handles 100k-bar simple expressions without future knowledge or truncation",()=>{
    const history=Array.from({length:100_000},(_,i)=>({
      ...candle,time:(1800000000+i*60) as UTCTimestamp,close:100+i%200
    }));
    const result=evaluateFormula("EMA(close,20)",history);
    expect(result).toHaveLength(history.length-19);
    expect(result[0].time).toBe(history[19].time);
    expect(result[result.length-1].time).toBe(history[history.length-1].time);
    expect(result.every(row=>Number.isFinite(row.value))).toBe(true);
  });
  it("caches parsed expressions without sharing evaluation buffers",()=>{
    const first=compileFormula("SMA(close,9)");
    const second=compileFormula("SMA(close,9)");
    expect(first).toBe(second);
    expect(evaluateFormula("close+1",[candle])[0].value).toBe(101);
    expect(()=>formulaWorkUnits("close",-1)).toThrow(/Invalid candle/);
  });
});
