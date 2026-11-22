import {describe,expect,it} from "vitest";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "./workspace";
describe("multi-chart workspace persistence",()=>{
 it("starts with one chart and a separate comparison instrument",()=>{
   expect(defaultWorkspace.chartLayout).toBe("single");
   expect(defaultWorkspace.secondarySymbol).toBe("BTCUSDT");
 });
 it("roundtrips a dual layout and preserves independently sourced drawings",()=>{
   const w={...defaultWorkspace,chartLayout:"dual" as const,secondarySymbol:"US100" as const};
   expect(parseWorkspace(JSON.parse(serializeWorkspace(w)))).toEqual(w);
 });
 it("rejects invalid chart modes and symbol IDs in imported workspaces",()=>{
   expect(parseWorkspace({chartLayout:"fourty",secondarySymbol:"INVALID"})).toMatchObject({
     chartLayout:"single",secondarySymbol:"BTCUSDT"
   });
 });
});
