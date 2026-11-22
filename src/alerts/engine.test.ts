import {describe,expect,it} from "vitest";
import {createPriceAlert,crossedThreshold,evaluatePriceAlerts,isPriceAlert} from "./engine";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";

const created=()=>createPriceAlert("BTCUSDT","binance","above",100,"alert-1",1000);
describe("local price threshold engine",()=>{
  it("detects upward/downward crossings including exact threshold touches",()=>{
    expect(crossedThreshold("above",100,99,100)).toBe(true);
    expect(crossedThreshold("above",100,100,101)).toBe(false);
    expect(crossedThreshold("above",100,101,99)).toBe(false);
    expect(crossedThreshold("below",100,101,100)).toBe(true);
    expect(crossedThreshold("below",100,100,99)).toBe(false);
    expect(crossedThreshold("above",100,Number.NaN,101)).toBe(false);
  });
  it("matches instrument and provider and only fires once",()=>{
    const a=created();
    expect(evaluatePriceAlerts([a],"BTCUSDT","demo",99,101,2000).triggered).toHaveLength(0);
    expect(evaluatePriceAlerts([a],"EURUSD","binance",99,101,2000).triggered).toHaveLength(0);
    const fired=evaluatePriceAlerts([a],"BTCUSDT","binance",99,101,2000);
    expect(fired.triggered).toHaveLength(1);
    expect(fired.updated[0].triggeredAtMs).toBe(2000);
    expect(evaluatePriceAlerts(fired.updated,"BTCUSDT","binance",80,120,3000).triggered).toHaveLength(0);
    expect(a.triggeredAtMs).toBeNull();
  });
  it("validates saved alerts rather than accepting malformed source or time values",()=>{
    expect(isPriceAlert(created())).toBe(true);
    expect(isPriceAlert({...created(),source:"fake"})).toBe(false);
    expect(isPriceAlert({...created(),source:"binance",symbol:"AAPL"})).toBe(false);
    expect(isPriceAlert({...created(),price:-2})).toBe(false);
    expect(isPriceAlert({...created(),triggeredAtMs:500})).toBe(false);
    expect(()=>createPriceAlert("EURUSD","demo","below",0,"id",10)).toThrow(/positive/);
  });
  it("round trips alert status in the versioned workspace and migrates older state",()=>{
    const active=created(),triggered={...created(),id:"alert-2",triggeredAtMs:1500};
    const workspace={...defaultWorkspace,alerts:[active,triggered]};
    expect(parseWorkspace(JSON.parse(serializeWorkspace(workspace)))).toEqual(workspace);
    expect(parseWorkspace({}).alerts).toEqual([]);
    expect(parseWorkspace({alerts:[active,{price:-1}]}).alerts).toEqual([active]);
  });
});
