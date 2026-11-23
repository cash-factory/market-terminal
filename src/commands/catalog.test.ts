import {describe,expect,it} from "vitest";
import {TERMINAL_COMMANDS,filterTerminalCommands} from "./catalog";

describe("Tool Atlas discoverability",()=>{
  it("keeps identifiers unique and every command mapped to a real action namespace",()=>{
    expect(new Set(TERMINAL_COMMANDS.map(item=>item.id)).size).toBe(TERMINAL_COMMANDS.length);
    expect(TERMINAL_COMMANDS.every(item=>/^(page|chart|draw):/.test(item.id))).toBe(true);
  });
  it("finds drawing tools by natural trader vocabulary",()=>{
    expect(filterTerminalCommands("fib retracement").map(item=>item.id)).toContain("draw:fibonacci");
    expect(filterTerminalCommands("risk reward").map(item=>item.id)).toContain("draw:long-position");
    expect(filterTerminalCommands("seconds").map(item=>item.id)).toContain("chart:frame-1s");
    expect(filterTerminalCommands("Decision Desk")).toEqual([]);
    expect(filterTerminalCommands("Risk Planner")).toEqual([]);
    expect(filterTerminalCommands("Position Sizing").map(item=>item.id)).toContain("page:sizing");
    expect(filterTerminalCommands("broker execution")).toEqual([]);
  });
  it("filters case-insensitively and does not pretend non-existent commands exist",()=>{
    expect(filterTerminalCommands("RSI").map(item=>item.id)).toContain("chart:indicators");
    expect(filterTerminalCommands("connect broker account")).toEqual([]);
  });
});
