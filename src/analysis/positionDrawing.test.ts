import {describe,expect,it} from "vitest";
import {calculatePosition,defaultPositionTarget,positionTargetAnchor} from "./positionDrawing";
import {translateDrawing,type Drawing,isDrawing} from "../drawing/types";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";

describe("visual position drawing profit targets",()=>{
  it("calculates default 2R long/short target without assuming broker contract values",()=>{
    expect(defaultPositionTarget("long-position",100,95)).toBe(110);
    expect(defaultPositionTarget("short-position",100,105)).toBe(90);
    expect(defaultPositionTarget("long-position",100,105)).toBeNull();
    expect(defaultPositionTarget("short-position",100,95)).toBeNull();
    expect(positionTargetAnchor("long-position",{time:1000,price:100},{time:1060,price:95}))
      .toEqual({time:1060,price:110});
  });
  it("supports editable 3R and checks stop/target directional validity",()=>{
    expect(calculatePosition("long-position",100,95,115))
      .toEqual({riskDistance:5,rewardDistance:15,multiple:3,targetIsValid:true});
    expect(calculatePosition("short-position",100,105,85)?.multiple).toBe(3);
    expect(calculatePosition("short-position",100,105,102)?.targetIsValid).toBe(false);
    expect(calculatePosition("long-position",100,105,120)).toBeNull();
  });
  it("moves and persists the independent third target anchor",()=>{
    const shape:Drawing={id:"position",symbol:"EURUSD",source:"demo",
      tool:"long-position",color:"#aabbcc",locked:false,
      start:{time:1000,price:100},end:{time:1060,price:95},
      target:{time:1060,price:115}};
    expect(isDrawing(shape)).toBe(true);
    expect(isDrawing({...shape,target:{time:1,price:-3}})).toBe(false);
    const moved=translateDrawing(shape,{time:1120,price:110},{time:1180,price:105});
    expect(moved.target).toEqual({time:1180,price:125});
    const workspace={...defaultWorkspace,drawings:[shape]};
    expect(parseWorkspace(JSON.parse(serializeWorkspace(workspace)))).toEqual(workspace);
    expect(parseWorkspace({drawings:[{...shape,target:undefined}]}).drawings).toHaveLength(1);
  });
});
