import {describe,expect,it} from "vitest";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "./workspace";

describe("four chart workspace persistence",()=>{
 it("migrates previous single and dual workspaces without extra chart requirements",()=>{
   expect(parseWorkspace({}).chartLayout).toBe("single");
   expect(parseWorkspace({chartLayout:"dual"}).chartLayout).toBe("dual");
   expect(parseWorkspace({chartLayout:"invalid"}).chartLayout).toBe("single");
 });
 it("stores independent comparison instruments and rejects invalid imports",()=>{
   const state={...defaultWorkspace,chartLayout:"quad" as const,
     secondarySymbol:"BTCUSDT" as const,tertiarySymbol:"AAPL" as const,
     quaternarySymbol:"US100" as const};
   expect(parseWorkspace(JSON.parse(serializeWorkspace(state)))).toEqual(state);
   expect(parseWorkspace({chartLayout:"quad",tertiarySymbol:"INVALID",quaternarySymbol:35}))
     .toMatchObject({chartLayout:"quad",tertiarySymbol:"AAPL",quaternarySymbol:"US100"});
 });
});
