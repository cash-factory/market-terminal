import {describe,expect,it} from "vitest";
import type {CandlestickData,UTCTimestamp} from "lightweight-charts";
import {nearestCrosshairBar} from "./sync";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";

const bars=[1000,1060,1120,4000].map(t=>({
  time:t as UTCTimestamp,open:100,high:105,low:95,close:t/10
})) satisfies CandlestickData<UTCTimestamp>[];

describe("linked crosshair and independent chart source settings",()=>{
  it("links only to real observed candle times and handles long session gaps",()=>{
    expect(nearestCrosshairBar(bars,1070)?.time).toBe(1060);
    expect(nearestCrosshairBar(bars,1060)?.time).toBe(1060);
    expect(nearestCrosshairBar(bars,3500)?.time).toBe(4000);
    expect(nearestCrosshairBar(bars,500)).toBeNull();
    expect(nearestCrosshairBar(bars,6000)).toBeNull();
    expect(nearestCrosshairBar([],1060)).toBeNull();
  });
  it("persists independent comparison sources, frames and link preferences",()=>{
    const state={...defaultWorkspace,
      chartLayout:"quad" as const,
      secondarySymbol:"BTCUSDT" as const,secondarySource:"binance" as const,
      secondaryFrame:"5m" as const,tertiaryFrame:"1d" as const,
      quaternaryFrame:"15m" as const,linkCrosshairs:true,linkTimeRanges:true};
    expect(parseWorkspace(JSON.parse(serializeWorkspace(state)))).toEqual(state);
  });
  it("refuses incorrect venue mapping and invalid timeframes on imported settings",()=>{
    expect(parseWorkspace({
      secondarySymbol:"EURUSD",secondarySource:"binance",
      tertiarySymbol:"AAPL",tertiarySource:"binance",
      quaternarySymbol:"US100",quaternarySource:"binance",
      secondaryFrame:"never",tertiaryFrame:"1m",quaternaryFrame:"31m"
    })).toMatchObject({
      secondarySource:"demo",tertiarySource:"demo",quaternarySource:"demo",
      secondaryFrame:"1h",tertiaryFrame:"1m",quaternaryFrame:"1h"
    });
    expect(parseWorkspace({}).linkCrosshairs).toBe(false);
    expect(parseWorkspace({}).linkTimeRanges).toBe(false);
  });
});
