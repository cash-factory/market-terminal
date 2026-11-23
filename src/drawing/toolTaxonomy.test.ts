import {describe,expect,it} from "vitest";
import {TOOL_DEFINITIONS} from "./toolDefinitions";
import {TOOL_SECTIONS,TOOL_SECTION_BY_ID,taxonomicIntegrity} from "./toolTaxonomy";
describe("purposeful drawing-tool layers",()=>{
 it("assigns every actual tool to exactly one subfamily",()=>{
  const {missing,duplicates}=taxonomicIntegrity();
  expect(missing).toEqual([]);
  expect(duplicates).toEqual([]);
  for(const tool of TOOL_DEFINITIONS){
    const section=TOOL_SECTION_BY_ID.get(tool.id);
    expect(section,tool.label).toBeDefined();
    expect(TOOL_SECTIONS[tool.group]).toContain(section);
  }
 });
 it("groups observed regression and highlighter by their actual use",()=>{
  expect(TOOL_SECTION_BY_ID.get("regression-channel")?.name).toBe("Channels & pitchforks");
  expect(TOOL_SECTION_BY_ID.get("highlighter")?.name).toBe("Emphasis");
  expect(TOOL_SECTION_BY_ID.get("trend-angle")?.name).toBe("Lines & angles");
 });
});
