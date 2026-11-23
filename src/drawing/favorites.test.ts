import {describe,it,expect} from "vitest";
import {moveFavorite} from "./favorites";
import {parseFavoriteTools,TOOL_DEFINITIONS} from "./toolDefinitions";
import {defaultWorkspace,parseWorkspace,serializeWorkspace,type Workspace} from "../workspace";
describe("favorites persistence and order",()=>{
 it("reorders without changing membership",()=>{
   const list=["trendline","rectangle","fibonacci"] as const;
   expect(moveFavorite([...list],"trendline","fibonacci")).toEqual(["rectangle","fibonacci","trendline"]);
   expect(moveFavorite([...list],"rectangle","trendline")).toEqual(["rectangle","trendline","fibonacci"]);
   expect(moveFavorite([...list],"trendline","ray")).toEqual([...list]);
 });
 it("preserves all implemented favorites, order and deduplicates",()=>{
   const ids=TOOL_DEFINITIONS.map(t=>t.id);
   expect(parseFavoriteTools([...ids,...ids,"not-implemented"])).toEqual(ids);
 });
 it("roundtrips bar layout and sanitizes invalid coordinates",()=>{
   const favoriteBar={visible:false,orientation:"vertical" as const,collapsed:true,x:450,y:200};
   const ws:Workspace={...defaultWorkspace,favoriteBar,favoriteDrawingTools:["short-position","long-position"]};
   expect(parseWorkspace(JSON.parse(serializeWorkspace(ws))).favoriteBar).toEqual(favoriteBar);
   expect(parseWorkspace({favoriteBar:{visible:"bad",orientation:"wrong",collapsed:5,x:-99,y:Infinity}}).favoriteBar)
     .toEqual(defaultWorkspace.favoriteBar);
 });
});
