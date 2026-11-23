import {describe,it,expect} from "vitest";
import type {CandlestickData,UTCTimestamp} from "lightweight-charts";
import {defaultBacktestConfig,runSmaCrossover,validateBacktestConfig} from "./backtest";
const fixture=(closes:number[]):CandlestickData<UTCTimestamp>[]=>
  closes.map((close,i)=>({time:(i*60) as UTCTimestamp,open:close,
    high:close+1,low:Math.max(0.1,close-1),close}));
const params={...defaultBacktestConfig,fast:2,slow:3,commissionBps:0,slippageBps:0};
describe("deterministic, next-open strategy simulation",()=>{
  it("validates execution economics and moving-average periods",()=>{
    expect(validateBacktestConfig({...params,fast:3})).not.toBeNull();
    expect(validateBacktestConfig({...params,startingCapital:-10})).not.toBeNull();
    expect(validateBacktestConfig({...params,commissionBps:Infinity})).not.toBeNull();
    expect(validateBacktestConfig(params)).toBeNull();
  });
  it("never sees future bars: every prefix has identical equity and fills",()=>{
    const closes=[10,9,8,10,12,13,10,8,6,7,11,13,12,7,6,13,15,18,2,1,30,60];
    const all=fixture(closes);
    const complete=runSmaCrossover(all,params);
    for(let cut=0;cut<=all.length;cut++){
      const prefix=runSmaCrossover(all.slice(0,cut),params);
      expect(prefix.equityCurve).toEqual(complete.equityCurve.slice(0,cut));
      expect(prefix.trades).toEqual(complete.trades.filter(t=>t.exitIndex<cut));
    }
  });
  it("fills on the bar AFTER the signal and accounts for nonzero fees/slippage",()=>{
    const data=fixture([10,9,8,10,12,13,10,8,6,7,11,13,12,7,6]);
    const free=runSmaCrossover(data,params);
    expect(free.trades.length).toBeGreaterThan(0);
    for(const trade of free.trades){
      expect(trade.exitIndex).toBeGreaterThan(trade.entryIndex);
      expect(trade.entryPrice).toBe(data[trade.entryIndex].open);
      expect(trade.exitPrice).toBe(data[trade.exitIndex].open);
      expect(trade.entryTime).toBe(Number(data[trade.entryIndex].time));
    }
    const costs=runSmaCrossover(data,{...params,commissionBps:10,slippageBps:5});
    expect(costs.totalFees).toBeGreaterThan(0);
    expect(costs.equity).toBeLessThan(free.equity);
  });
  it("does not mark an open position as closed or fabricate a last-bar fill",()=>{
    const data=fixture([10,9,8,10,12,13,14,15]);
    const result=runSmaCrossover(data,params);
    expect(result.openPosition).not.toBeNull();
    expect(result.trades).toHaveLength(0);
    expect(result.openPosition!.markedPrice).toBe(data.at(-1)!.close);
  });
  it("returns zero trades on insufficient data and rejects unordered invalid candles",()=>{
    expect(runSmaCrossover(fixture([10]),params).trades).toEqual([]);
    expect(runSmaCrossover([],params).equity).toBe(params.startingCapital);
    expect(()=>runSmaCrossover([fixture([10])[0],fixture([11])[0]],params)).toThrow(/time-ordered/);
  });
});
