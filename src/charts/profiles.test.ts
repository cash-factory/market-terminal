import {describe,expect,it} from "vitest";
import {createChartProfile,parseChartProfiles,applyChartProfile,parseProfileSettings} from "./profiles";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";

describe("complete multi-chart profile persistence",()=>{
  it("captures every pane source/frame and customized indicators with no shared references",()=>{
    const state={...defaultWorkspace,chartLayout:"quad" as const,
      chartDisplayStyle:"heikin-ashi" as const,
      secondarySymbol:"BTCUSDT" as const,secondarySource:"binance" as const,
      secondaryFrame:"5m" as const,tertiaryFrame:"4h" as const,
      quaternaryFrame:"1d" as const,
      linkCrosshairs:true,linkTimeRanges:true,
      studies:{...defaultWorkspace.studies,macd:true},
      studyParameters:{...defaultWorkspace.studyParameters,rsiPeriod:21}};
    const profile=createChartProfile("profile:1"," Four-panel ",state,10);
    expect(profile.name).toBe("Four-panel");
    expect(profile.settings).toMatchObject({
      chartLayout:"quad",secondarySource:"binance",secondaryFrame:"5m",
      tertiaryFrame:"4h",quaternaryFrame:"1d",chartDisplayStyle:"heikin-ashi",
      linkCrosshairs:true,linkTimeRanges:true
    });
    state.studyParameters.rsiPeriod=19;
    expect(profile.settings.studyParameters.rsiPeriod).toBe(21);
  });
  it("restores chart configuration without deleting unrelated drawings or alarms",()=>{
    const layout={...defaultWorkspace,chartLayout:"dual" as const,frame:"15m" as const,
      secondarySymbol:"AAPL" as const,linkCrosshairs:true};
    const profile=createChartProfile("profile:saved","Focus",layout,100);
    const withUnrelated={...defaultWorkspace,chartProfiles:[profile],
      alerts:[],riskPlanner:{...defaultWorkspace.riskPlanner},
      rightPanelWidth:360};
    const applied=applyChartProfile(withUnrelated,profile);
    expect(applied).toMatchObject({frame:"15m",chartLayout:"dual",linkCrosshairs:true});
    expect(applied.chartProfiles).toEqual([profile]);
    expect(applied.rightPanelWidth).toBe(360);
    expect(applied.alerts).toBe(withUnrelated.alerts);
  });
  it("keeps only valid imported profiles and does not authorize unsupported data sources",()=>{
    const good=createChartProfile("profile:ok","Valid",defaultWorkspace,100);
    const raw={...good,settings:{...good.settings,secondarySymbol:"AAPL",secondarySource:"binance"}};
    const out=parseChartProfiles([raw,{...good,id:"profile:ok"},{...good,id:"evil"},{...good,id:"profile:bad",settings:{...good.settings,frame:"never"}}]);
    expect(out).toHaveLength(1);
    expect(out[0].settings.secondarySource).toBe("demo");
    expect(parseProfileSettings(null)).toBeNull();
    expect(parseProfileSettings({...good.settings,symbol:"NOPE"})).toBeNull();
  });
  it("round trips saved profiles in versioned workspace exports and migrates older data",()=>{
    const profile=createChartProfile("profile:ok","My Charts",defaultWorkspace,2);
    const state={...defaultWorkspace,chartProfiles:[profile]};
    expect(parseWorkspace(JSON.parse(serializeWorkspace(state)))).toEqual(state);
    expect(parseWorkspace({}).chartProfiles).toEqual([]);
  });
});
