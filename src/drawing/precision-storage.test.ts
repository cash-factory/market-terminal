import {describe,it,expect} from "vitest";
import {isDrawing,type Drawing} from "./types";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";

const base:Drawing={
  id:"precision",symbol:"EURUSD",source:"demo",tool:"horizontal-ray",
  color:"#128a91",locked:false,
  start:{time:1710000000,price:1.1234},
  end:{time:1710000000,price:1.1234},
};
describe("precision tool storage",()=>{
  it("accepts all new professional drawing families without custom unsafe payloads",()=>{
    for(const tool of ["horizontal-ray","horizontal-line","vertical-line","cross-line",
      "extended-line","price-range","date-range"] as const)
      expect(isDrawing({...base,tool})).toBe(true);
    expect(isDrawing({...base,tool:"javascript:execute"})).toBe(false);
    expect(isDrawing({...base,color:"url(javascript:bad)"})).toBe(false);
  });
  it("roundtrips one-click drawings and favorite tools using workspace v26",()=>{
    const state={...defaultWorkspace,drawings:[base],
      favoriteDrawingTools:["vertical-line","cross-line"] as typeof defaultWorkspace.favoriteDrawingTools};
    const exported=JSON.parse(serializeWorkspace(state));
    expect(exported.version).toBe(26);
    expect(parseWorkspace(exported)).toEqual(state);
  });
  it("keeps older exports compatible and filters invalid or duplicate favorites",()=>{
    expect(parseWorkspace({symbol:"EURUSD"}).favoriteDrawingTools)
      .toEqual(defaultWorkspace.favoriteDrawingTools);
    expect(parseWorkspace({favoriteDrawingTools:["ray","ray","unknown","date-range"]})
      .favoriteDrawingTools).toEqual(["ray","date-range"]);
  });
});
