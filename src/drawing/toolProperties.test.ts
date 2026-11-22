import {describe,expect,it} from "vitest";
import {effectiveLevels,effectiveForkRatios,formatFibLabel,measurementSegments} from "./toolProperties";
import {isDrawing,type Drawing} from "./types";
const d:Drawing={
  id:"test",symbol:"EURUSD",source:"demo",tool:"fibonacci",locked:false,color:"#aabbcc",
  start:{time:1000,price:100},end:{time:1500,price:120}
};
describe("standalone drawing controls",()=>{
  it("has independent editable Fibonacci levels and valid per-level colors",()=>{
    const levels=effectiveLevels(d);
    expect(levels).toHaveLength(7);
    const next={...d,fibLevels:[{ratio:.618,visible:true,color:"#abcdef"}]};
    expect(isDrawing(next)).toBe(true);
    expect(effectiveLevels(next)).toEqual(next.fibLevels);
    expect(isDrawing({...next,fibLevels:[{ratio:100,visible:true,color:"#abcdef"}]})).toBe(false);
    expect(isDrawing({...next,fibLevels:[{ratio:.5,visible:true,color:"red"}]})).toBe(false);
    expect(formatFibLabel(.618,101.45678,2,"both")).toBe("61.8% · 101.46");
  });
  it("validates independent pitchfork ratios and grid subdivisions",()=>{
    const fork={...d,tool:"pitchfork" as const,points:[d.start,d.end,{time:1800,price:114}]};
    expect(effectiveForkRatios(fork)).toEqual([1]);
    expect(isDrawing({...fork,forkLevels:[.5,1,2]})).toBe(true);
    expect(isDrawing({...fork,forkLevels:[1,1]})).toBe(false);
    expect(isDrawing({...d,tool:"gann-box",gridDivisions:13})).toBe(false);
    expect(isDrawing({...d,tool:"gann-box",gridDivisions:8})).toBe(true);
  });
  it("filters measurement labels to user-selected quantities",()=>{
    const m={...d,tool:"measure" as const,
      showMeasurements:{price:true,percent:false,bars:true,elapsed:false}};
    expect(measurementSegments(m,7,"5m",2)).toEqual([
      {kind:"price",label:"+20.00"},{kind:"bars",label:"7 observed bars"}]);
    expect(isDrawing(m)).toBe(true);
    expect(isDrawing({...m,showMeasurements:{...m.showMeasurements,price:"yes"}})).toBe(false);
  });
  it("allows tool-specific annotation typography and directional markers",()=>{
    expect(isDrawing({...d,tool:"text",fontSize:22})).toBe(true);
    expect(isDrawing({...d,tool:"fibonacci",fontSize:22})).toBe(false);
    expect(isDrawing({...d,tool:"arrow-marker",markerDirection:"left"})).toBe(true);
    expect(isDrawing({...d,tool:"arrow-marker",markerDirection:"diagonal"})).toBe(false);
  });
});
