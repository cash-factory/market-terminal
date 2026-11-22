import {describe,expect,it} from "vitest";
import {clippedExtendedLine,formatElapsedDuration,horizontalReference,observedBarCount,verticalReference} from "./precision";
import {DEFAULT_FAVORITE_TOOLS,filterDrawingTools,ONE_ANCHOR_TOOLS,parseFavoriteTools,TOOL_BY_ID,TOOL_DEFINITIONS} from "./toolDefinitions";

describe("precision line geometry",()=>{
  const plot={width:400,height:200};
  it("clips infinite ascending, vertical and horizontal lines to the actual plot bounds",()=>{
    expect(clippedExtendedLine({x:100,y:50},{x:200,y:100},plot)).toEqual({
      start:{x:0,y:0},end:{x:400,y:200}
    });
    expect(clippedExtendedLine({x:70,y:30},{x:70,y:100},plot)).toEqual({
      start:{x:70,y:0},end:{x:70,y:200}
    });
    expect(clippedExtendedLine({x:70,y:60},{x:130,y:60},plot)).toEqual({
      start:{x:0,y:60},end:{x:400,y:60}
    });
  });
  it("handles invalid and nonintersecting infinite lines safely",()=>{
    expect(clippedExtendedLine({x:0,y:0},{x:0,y:0},plot)).toBeNull();
    expect(clippedExtendedLine({x:0,y:-5},{x:100,y:-5},plot)).toBeNull();
    expect(clippedExtendedLine({x:NaN,y:5},{x:100,y:25},plot)).toBeNull();
    expect(clippedExtendedLine({x:0,y:0},{x:50,y:50},{width:-1,height:100})).toBeNull();
  });
  it("projects right-only horizontal rays while clipping from an offscreen anchor",()=>{
    expect(horizontalReference({x:100,y:75},plot,true)).toEqual({
      start:{x:100,y:75},end:{x:400,y:75}
    });
    expect(horizontalReference({x:-50,y:75},plot,true)?.start.x).toBe(0);
    expect(horizontalReference({x:100,y:75},plot,false)?.start.x).toBe(0);
    expect(horizontalReference({x:450,y:75},plot,true)).toBeNull();
    expect(verticalReference({x:88,y:900},plot)).toEqual({
      start:{x:88,y:0},end:{x:88,y:200}
    });
    expect(verticalReference({x:-3,y:55},plot)).toBeNull();
  });
  it("counts observed candles, not inferred timestamps across market closures",()=>{
    expect(observedBarCount([60,120,300,600],120,600)).toBe(3);
    expect(observedBarCount([60,120,300,600],NaN,600)).toBe(0);
    expect(observedBarCount([60,120,300,600],600,120)).toBe(3);
    expect(formatElapsedDuration(3*86400+2*3600+60)).toBe("3d 2h 1m");
    expect(formatElapsedDuration(-10)).toBe("—");
  });
});

describe("professional tool library validity",()=>{
  it("has a unique definition for each available tool and bounded favorites",()=>{
    expect(new Set(TOOL_DEFINITIONS.map(t=>t.id)).size).toBe(TOOL_DEFINITIONS.length);
    expect(ONE_ANCHOR_TOOLS.has("horizontal-ray")).toBe(true);
    for(const tool of DEFAULT_FAVORITE_TOOLS)expect(TOOL_BY_ID.has(tool)).toBe(true);
    expect(parseFavoriteTools(["horizontal-ray","not-a-tool","horizontal-ray","price-range"]))
      .toEqual(["horizontal-ray","price-range"]);
    expect(parseFavoriteTools(null)).toEqual(DEFAULT_FAVORITE_TOOLS);
    expect(parseFavoriteTools([])).toEqual([]);
  });
  it("finds a particular tool by traders' language without inventing capabilities",()=>{
    expect(filterDrawingTools("support resistance").map(x=>x.id)).toContain("horizontal-ray");
    expect(filterDrawingTools("duration").map(x=>x.id)).toContain("date-range");
    expect(filterDrawingTools("psychic signal")).toEqual([]);
  });
});
