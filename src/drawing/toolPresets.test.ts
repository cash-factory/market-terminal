import {describe,expect,it} from "vitest";
import {applyToolPreset,parseToolPresets,presetFromDrawing} from "./toolPresets";
import type {Drawing} from "./types";
const fib:Drawing={
  id:"a",symbol:"EURUSD",source:"demo",tool:"fibonacci",
  start:{time:1000,price:100},end:{time:1600,price:110},
  color:"#8899aa",locked:false
};
describe("safe per-tool defaults",()=>{
  it("reuses visual options without copying anchors, identity or source",()=>{
    const styled:Drawing={...fib,strokeWidth:4,dash:"dotted",fibLevels:[
      {ratio:.618,visible:true,color:"#556677"}],labelMode:"both"};
    const preset=presetFromDrawing(styled);
    expect(preset).not.toHaveProperty("start");
    expect(preset).not.toHaveProperty("source");
    const newDrawing:Drawing={...fib,id:"new",source:"binance",
      start:{time:4000,price:150},end:{time:4600,price:160}};
    expect(applyToolPreset(newDrawing,preset)).toMatchObject({
      id:"new",source:"binance",start:newDrawing.start,strokeWidth:4,
      fibLevels:[{ratio:.618,visible:true,color:"#556677"}],labelMode:"both"});
  });
  it("rejects invalid, incompatible and identity-mutating imported presets",()=>{
    expect(parseToolPresets({
      fibonacci:{strokeWidth:4,color:"#778899"},
      "gann-box":{fibLevels:[{ratio:.5,visible:true,color:"#ffffff"}]},
      trendline:{source:"binance",color:"#abcdef"},
      other:{color:"#000000"}
    })).toEqual({fibonacci:{strokeWidth:4,color:"#778899"}});
  });
  it("clones nested setting arrays so editing one instance never changes another",()=>{
    const stored=parseToolPresets({fibonacci:{color:"#778899",fibLevels:[
      {ratio:.618,visible:true,color:"#aabbcc"}]}});
    const a=applyToolPreset(fib,stored.fibonacci);
    const b=applyToolPreset({...fib,id:"b"},stored.fibonacci);
    a.fibLevels![0].color="#123456";
    expect(b.fibLevels![0].color).toBe("#aabbcc");
  });
});
