import {describe,expect,it} from "vitest";
import type {CandlestickData,UTCTimestamp} from "lightweight-charts";
import {logicalFromTime,timeFromLogical} from "../drawing/geometry";
import {nearestCandleIndex} from "../drawing/snap";
import {evaluateFormula} from "../indicators/formula";

/** Records absolute measurements in unit logs; correctness and stable resource
 * limits are asserted. Hardware timings must be compared across the same runner. */
describe("Phase 1 large chart computational baselines",()=>{
  it("looks up anchors over 100,000 candles with DST-like irregular gaps",()=>{
    const candles=Array.from({length:100_000},(_,i):CandlestickData<UTCTimestamp>=>({
      time:(1_700_000_000+i*60+Math.floor(i/1800)*2*86400) as UTCTimestamp,
      open:100,high:101,low:99,close:100+i%200
    }));
    const started=performance.now();
    for(let i=0;i<10_000;i++){
      const index=i*10;
      const t=Number(candles[index].time);
      expect(logicalFromTime(t,candles,60)).toBe(index);
      expect(timeFromLogical(index,candles,60)).toBe(t);
      expect(nearestCandleIndex(candles,t)).toBe(index);
    }
    const elapsed=Math.round(performance.now()-started);
    console.log("PHASE1_BENCHMARK 100k_candles_30k_anchor_queries_ms="+elapsed);
    expect(candles).toHaveLength(100_000);
  });
  it("recomputes 100k-bar derived averages without silently trimming history",()=>{
    const candles=Array.from({length:100_000},(_,i)=>({
      time:(1_700_000_000+i*60) as UTCTimestamp,
      open:100+i%30,high:101+i%30,low:99+i%30,close:100+i%30
    }));
    const started=performance.now();
    const points=evaluateFormula("EMA(close,20)-SMA(close,50)",candles);
    const elapsed=Math.round(performance.now()-started);
    console.log("PHASE1_BENCHMARK 100k_candles_custom_study_ms="+elapsed);
    expect(points).toHaveLength(100_000-49);
    expect(points[0].time).toBe(candles[49].time);
    expect(points.at(-1)?.time).toBe(candles.at(-1)?.time);
  });
});
