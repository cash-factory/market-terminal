import {describe,expect,it} from "vitest";
import {
  BUILTIN_TEMPLATES,captureChartTemplate,parseChartTemplates,selectTemplate
} from "./templates";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";
import {defaultStudies} from "./studies";

describe("reusable chart configurations",()=>{
  it("provides five independent, validated technical study setups",()=>{
    expect(BUILTIN_TEMPLATES).toHaveLength(5);
    const trend=selectTemplate("builtin:trend",[]);
    expect(trend?.studies).toMatchObject({ema20:true,rsi14:false});
    const full=selectTemplate("builtin:full",[]);
    expect(full?.showSma).toBe(true);
    expect(full?.studies.macd).toBe(true);
  });
  it("captures current settings without keeping mutable references",()=>{
    const studies={...defaultStudies,rsi14:true};
    const saved=captureChartTemplate("custom:1"," My RSI ","15m",false,studies);
    studies.rsi14=false;
    expect(saved).toMatchObject({id:"custom:1",name:"My RSI",frame:"15m"});
    expect(saved.studies.rsi14).toBe(true);
    expect(()=>captureChartTemplate("builtin:bad","Name","1h",true,studies)).toThrow();
    expect(()=>captureChartTemplate("custom:2"," ","1h",true,studies)).toThrow();
  });
  it("filters malformed imported templates and deduplicates IDs",()=>{
    const good=captureChartTemplate("custom:1","Range Setup","4h",true,defaultStudies);
    expect(parseChartTemplates([
      good,{...good,name:"Same ID"},
      {...good,id:"builtin:clean"},
      {...good,id:"custom:3",name:""},
      {...good,id:"custom:4",frame:"7m"},
      {...good,id:"custom:5",studies:{macd:true}}
    ])).toEqual([
      good,{...good,id:"custom:5",studies:{...defaultStudies,macd:true}}
    ]);
  });
  it("restores custom templates across versioned workspace exports",()=>{
    const saved=captureChartTemplate("custom:abc","My Setup","1d",false,{
      ...defaultStudies,macd:true
    });
    const workspace={...defaultWorkspace,chartTemplates:[saved]};
    expect(parseWorkspace(JSON.parse(serializeWorkspace(workspace)))).toEqual(workspace);
    expect(parseWorkspace({}).chartTemplates).toEqual([]);
  });
});
