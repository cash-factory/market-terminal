import {describe,expect,it} from "vitest";
import {PriceScaleMode} from "lightweight-charts";
import {parsePriceScalePreset,priceScaleMode,priceScaleOptions} from "./priceScale";
describe("price scale modes",()=>{
  it("maps chart transformations to supported modes",()=>{
    expect(priceScaleMode("normal")).toBe(PriceScaleMode.Normal);
    expect(priceScaleMode("log")).toBe(PriceScaleMode.Logarithmic);
    expect(priceScaleMode("percent")).toBe(PriceScaleMode.Percentage);
    expect(priceScaleMode("indexed")).toBe(PriceScaleMode.IndexedTo100);
  });
  it("rejects invalid workspace modes and toggles inversion independently",()=>{
    expect(parsePriceScalePreset("1+1")).toBe("normal");
    expect(priceScaleOptions("percent",true)).toEqual({
      mode:PriceScaleMode.Percentage,invertScale:true
    });
  });
});
