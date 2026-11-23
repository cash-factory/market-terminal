import {describe,expect,it} from "vitest";
import type {CandlestickData,UTCTimestamp} from "lightweight-charts";
import {beginReplay,seekReplay} from "./model";
import {archiveReplayStudy,createReplayScenario,evaluateReplayScenario,parseReplayStudies} from "./simulation";
const bars=Array.from({length:60},(_,i):CandlestickData<UTCTimestamp>=>({
 time:(1800000000+i*60) as UTCTimestamp,open:100,high:102,low:98,close:100
}));
const base=()=>seekReplay(beginReplay(bars,"EURUSD","1m","demo"),29);
const input={side:"long" as const,stop:95,target:105,equity:10000,riskPercent:1,contractMultiplier:1};
describe("causal candle-by-candle simulation",()=>{
 it("does not read future bars, fills on the next opening, and sizes from actual fill",()=>{
  const replay=base(),plan=createReplayScenario(replay,input,"run-1");
  expect(evaluateReplayScenario(replay,plan)).toMatchObject({status:"armed",entryPrice:null,pnl:null});
  const observed=evaluateReplayScenario(seekReplay(replay,30),plan);
  expect(observed).toMatchObject({status:"open",entryPrice:100,quantity:20,pnl:0,exitPrice:null});
  expect(evaluateReplayScenario(seekReplay(replay,29),plan).status).toBe("armed");
 });
 it("assumes stop first if the same bar touches both levels",()=>{
  const replay=base(),plan=createReplayScenario(replay,{...input,stop:99,target:101},"run-2");
  const result=evaluateReplayScenario(seekReplay(replay,30),plan);
  expect(result).toMatchObject({status:"stopped",exitPrice:99,ambiguous:true,rMultiple:-1,pnl:-100});
  const saved=archiveReplayStudy(replay,plan,result,1800000000000);
  expect(parseReplayStudies([saved,saved])).toHaveLength(1);
 });
 it("invalidates gaps that cross a planned stop before entry, and models exit gaps at open",()=>{
  const replay=base(),plan=createReplayScenario(replay,{...input,stop:99,target:105},"run-3");
  const modified=beginReplay(bars.map((c,i)=>i===30?{...c,open:97,low:95,high:99}:c),"EURUSD","1m","demo");
  const at=seekReplay(modified,30);
  expect(evaluateReplayScenario(at,plan)).toMatchObject({status:"invalidated",quantity:null});
  expect(()=>createReplayScenario(replay,{...input,target:90},"bad")).toThrow();
 });
 it("does not reward a trade whose target was passed before the first eligible entry",()=>{
  const replay=base(),plan=createReplayScenario(replay,{...input,stop:99,target:101},"gap-target");
  const modified=beginReplay(bars.map((c,i)=>i===30?{...c,open:103,high:105,low:102,close:104}:c),
    "EURUSD","1m","demo");
  expect(evaluateReplayScenario(seekReplay(modified,30),plan)).toMatchObject({
    status:"invalidated",pnl:null,quantity:null,exitCursor:30
  });
 });
 it("rejects source/history mismatch and refuses to archive unfinished studies",()=>{
  const replay=base(),plan=createReplayScenario(replay,input,"run-4");
  expect(()=>archiveReplayStudy(replay,plan,evaluateReplayScenario(replay,plan),Date.now())).toThrow();
  expect(()=>evaluateReplayScenario({...replay,symbol:"US100"},plan)).toThrow();
  expect(parseReplayStudies([{id:"bad"},42])).toEqual([]);
 });
});
