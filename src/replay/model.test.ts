import {describe,expect,it} from "vitest";
import type {CandlestickData,UTCTimestamp} from "lightweight-charts";
import {beginReplay,seekReplay,setReplaySpeed,stepReplay,toggleReplayPlayback,visibleReplayCandles} from "./model";

const bars=Array.from({length:120},(_,i):CandlestickData<UTCTimestamp>=>({
  time:(1800000000+i*60) as UTCTimestamp,open:100+i,high:101+i,low:99+i,close:100+i
}));
describe("historical candle replay model",()=>{
  it("freezes a copy of the input candles and withholds future bars",()=>{
    const replay=beginReplay(bars,"EURUSD","1m","demo");
    expect(replay.snapshot).not.toBe(bars);
    expect(replay.cursor).toBe(59);
    expect(visibleReplayCandles(replay)).toHaveLength(60);
    expect(visibleReplayCandles(replay).at(-1)?.close).toBe(159);
    expect(visibleReplayCandles(replay).some(c=>c.time===bars[119].time)).toBe(false);
    bars[0].close=999;
    expect(replay.snapshot[0].close).toBe(100);
  });
  it("steps, seeks and stops at history boundaries",()=>{
    const base=beginReplay(bars,"BTCUSDT","1h","binance");
    const moving=toggleReplayPlayback(base);
    expect(moving.playing).toBe(true);
    const next=stepReplay(moving,1);
    expect(next.cursor).toBe(60);
    const finished=stepReplay(moving,500);
    expect(finished.cursor).toBe(119);
    expect(finished.playing).toBe(false);
    expect(toggleReplayPlayback(finished).playing).toBe(false);
    expect(seekReplay(moving,0)).toMatchObject({cursor:0,playing:false});
    expect(seekReplay(moving,Infinity).cursor).toBe(59);
    expect(setReplaySpeed(base,4).speed).toBe(4);
  });
  it("refuses empty/short histories and does not fabricate bars",()=>{
    expect(()=>beginReplay(bars.slice(0,25),"EURUSD","1m","demo")).toThrow(/40/);
    expect(visibleReplayCandles(seekReplay(beginReplay(bars,"AAPL","1d","demo"),0))).toHaveLength(1);
  });
});
