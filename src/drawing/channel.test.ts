import { describe, expect, it } from "vitest";
import {isDrawing,translateDrawing,type Drawing} from "./types";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";
const channel:Drawing={
  id:"channel-1",symbol:"BTCUSDT",source:"demo",tool:"channel",
  start:{time:1800000000,price:100},
  end:{time:1800000060,price:120},
  control:{time:1800000030,price:140},
  color:"#123456",locked:false
};
describe("parallel channel three-anchor schema",()=>{
  it("requires third anchor for persisted channels, without breaking legacy tools",()=>{
    expect(isDrawing(channel)).toBe(true);
    expect(isDrawing({...channel,control:undefined})).toBe(false);
    expect(isDrawing({...channel,control:{time:4,price:-1}})).toBe(false);
    expect(isDrawing({...channel,tool:"trendline",control:undefined})).toBe(true);
  });
  it("moves parallel control anchor with a translated base line",()=>{
    const moved=translateDrawing(channel,{time:1800000120,price:110},{time:1800000180,price:130});
    expect(moved.control).toEqual({time:1800000150,price:150});
    expect(moved.start.price).toBe(110);
    expect(channel.control?.price).toBe(140);
  });
  it("roundtrips the third point in the workspace without rewriting legacy shapes",()=>{
    const state={...defaultWorkspace,drawings:[channel]};
    expect(parseWorkspace(JSON.parse(serializeWorkspace(state)))).toEqual(state);
    expect(parseWorkspace({drawings:[{...channel,control:undefined}]}).drawings).toHaveLength(0);
  });
});
