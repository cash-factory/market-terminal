import {describe,expect,it} from "vitest";
import {compileFormula,createCustomStudy,evaluateFormula,parseCustomStudies} from "./formula";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";
import type {CandlestickData,UTCTimestamp} from "lightweight-charts";

const bars:CandlestickData<UTCTimestamp>[]=[1,2,3,4,5,6,7].map((close,i)=>({
  time:(1800000000+i*60) as UTCTimestamp,
  open:close-1,high:close+2,low:close-2,close
}));
describe("safe analytical expression DSL",()=>{
  it("calculates close fields, arithmetic, offsets and nested SMA/EMA with warm-ups",()=>{
    expect(evaluateFormula("close - open",bars).map(x=>x.value)).toEqual([1,1,1,1,1,1,1]);
    expect(evaluateFormula("(high+low)/2",bars).map(x=>x.value)).toEqual([1,2,3,4,5,6,7]);
    expect(evaluateFormula("SMA(close,3)",bars).map(x=>x.value)).toEqual([2,3,4,5,6]);
    expect(evaluateFormula("EMA(close,3)",bars).map(x=>x.value)).toEqual([2,3,4,5,6]);
    expect(evaluateFormula("MAX(close,open)-MIN(close,open)",bars).map(x=>x.value))
      .toEqual([1,1,1,1,1,1,1]);
    expect(evaluateFormula("ABS(open-close)",bars).map(x=>x.value))
      .toEqual([1,1,1,1,1,1,1]);
    expect(evaluateFormula("SMA(EMA(close,2),3)",bars).length).toBe(4);
  });
  it("rejects any unknown tokens, script primitives, invalid periods and unsafe complexity",()=>{
    for(const expression of [
      "alert(1)","window.location","close;alert(1)",
      "close ** 2","new Function('return 1')","close[0]",
      "SMA(close,0)","SMA(close,501)","SMA(close,3.5)",
      "SMA(close,3","foo","close +"
    ]) expect(()=>compileFormula(expression)).toThrow();
    expect(()=>compileFormula("close+".repeat(100)+"1")).toThrow();
    expect(()=>evaluateFormula("1/0",bars)).not.toThrow();
    expect(evaluateFormula("1/0",bars)).toHaveLength(0);
  });
  it("validates named studies and imports only allowed source expressions",()=>{
    const study=createCustomStudy("custom:123","My EMA","EMA(hl2,21)","#abcdef",true);
    expect(study).toMatchObject({name:"My EMA",enabled:true});
    expect(()=>createCustomStudy("bad","name","close","#abcdef")).toThrow();
    expect(()=>createCustomStudy("custom:123","name","close","#abcdef00")).toThrow();
    const parsed=parseCustomStudies([
      study,{...study,id:"custom:again",expression:"window"},
      {...study,name:"Duplicate"},
      {...study,id:"custom:second",enabled:false},
      {...study,id:"custom:invalid",enabled:"yes"}
    ]);
    expect(parsed.map(s=>s.id)).toEqual(["custom:123","custom:second"]);
  });
  it("roundtrips formula state in local workspace files and ignores corrupted formulas",()=>{
    const study=createCustomStudy("custom:test","Spread","close - SMA(close,3)","#5fc3d5");
    const state={...defaultWorkspace,customStudies:[study]};
    expect(parseWorkspace(JSON.parse(serializeWorkspace(state)))).toEqual(state);
    expect(parseWorkspace({customStudies:[{...study,expression:"eval(close)"}]}).customStudies).toEqual([]);
  });
});
