import {describe,expect,it} from "vitest";
import {isValidLevel,levelVisibleAtFrame,parseLevel} from "./model";
import type {Level} from "../workspace";
const a:Level={id:"v",symbol:"EURUSD",source:"demo",price:1.2345,color:"#aabbcc"};
describe("precise chart price-level properties",()=>{
  it("accepts old levels and validates independent new presentation fields",()=>{
    expect(parseLevel(a)).toEqual(a);
    expect(isValidLevel(a)).toBe(true);
    const edited:Level={...a,lineWidth:3,lineStyle:1,title:"London high",
      axisLabelVisible:false,visibleOnFrames:["1s","1m"]};
    expect(isValidLevel(edited)).toBe(true);
    expect(levelVisibleAtFrame(edited,"1s")).toBe(true);
    expect(levelVisibleAtFrame(edited,"5m")).toBe(false);
    expect(levelVisibleAtFrame({...edited,hidden:true},"1m")).toBe(false);
  });
  it("sanitizes imported invalid options without changing price or provider",()=>{
    const parsed=parseLevel({...a,lineWidth:7,lineStyle:15,title:"x".repeat(500),
      color:"bad",visibleOnFrames:["1m","1m"]});
    expect(parsed).toEqual({...a,color:"#8d94fa"});
    expect(isValidLevel({...a,price:-1})).toBe(false);
    expect(isValidLevel({...a,source:"unverified"})).toBe(false);
  });
});
