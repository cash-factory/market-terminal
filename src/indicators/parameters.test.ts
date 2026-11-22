import {describe,expect,it} from "vitest";
import {
  defaultStudyParameters,parseStudyParameters,studyParameterKeys,updateStudyParameter
} from "./parameters";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";
import {captureChartTemplate,parseChartTemplates} from "./templates";
import {defaultStudies} from "./studies";

describe("configurable technical analysis periods",()=>{
  it("accepts independently configurable and valid study windows",()=>{
    const configured=updateStudyParameter(defaultStudyParameters,"emaPeriod",34);
    expect(configured.emaPeriod).toBe(34);
    expect(defaultStudyParameters.emaPeriod).toBe(20);
    expect(updateStudyParameter(configured,"bollingerDeviations",2.5).bollingerDeviations).toBe(2.5);
    expect(studyParameterKeys).toHaveLength(9);
  });
  it("rejects invalid values before a chart renders expensive indicators",()=>{
    expect(()=>updateStudyParameter(defaultStudyParameters,"rsiPeriod",0)).toThrow(/between/);
    expect(()=>updateStudyParameter(defaultStudyParameters,"smaPeriod",999999)).toThrow(/between/);
    expect(()=>updateStudyParameter(defaultStudyParameters,"atrPeriod",14.5)).toThrow(/between/);
    expect(()=>updateStudyParameter(defaultStudyParameters,"macdFast",26)).toThrow(/smaller/);
    expect(()=>updateStudyParameter(defaultStudyParameters,"macdSlow",12)).toThrow(/smaller/);
    expect(()=>updateStudyParameter(defaultStudyParameters,"macdSignal",Number.NaN)).toThrow(/between/);
  });
  it("migrates missing or malformed saved periods safely",()=>{
    expect(parseStudyParameters({emaPeriod:34,rsiPeriod:"12",macdSlow:20})).toMatchObject({
      emaPeriod:34,rsiPeriod:14,macdSlow:20
    });
    expect(parseStudyParameters({macdFast:50,macdSlow:20})).toMatchObject({
      macdFast:12,macdSlow:26
    });
    expect(parseStudyParameters(null)).toEqual(defaultStudyParameters);
  });
  it("roundtrips custom indicator periods in workspace and chart templates",()=>{
    const custom=updateStudyParameter(defaultStudyParameters,"rsiPeriod",21);
    const template=captureChartTemplate("custom:period","RSI 21","1h",true,{
      ...defaultStudies,rsi14:true
    },custom);
    const workspace={...defaultWorkspace,studyParameters:custom,chartTemplates:[template]};
    const restored=parseWorkspace(JSON.parse(serializeWorkspace(workspace)));
    expect(restored).toEqual(workspace);
    expect(parseChartTemplates([{...template,parameters:undefined}])[0].parameters).toEqual(defaultStudyParameters);
    expect(parseWorkspace({}).studyParameters).toEqual(defaultStudyParameters);
  });
});
