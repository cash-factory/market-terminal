import {describe,expect,it} from "vitest";
import {drawingVisibleInReplay} from "./visibility";
import type {Drawing} from "../drawing/types";
const base={id:"drawing",tool:"trendline",symbol:"EURUSD",start:{time:100,price:100},
 end:{time:110,price:110},color:"#ffffff"} as Drawing;
describe("replay drawing visibility",()=>{
 it("hides annotations whose any anchor would reveal future knowledge",()=>{
  expect(drawingVisibleInReplay(base,110)).toBe(true);
  expect(drawingVisibleInReplay(base,109)).toBe(false);
  expect(drawingVisibleInReplay({...base,points:[{time:120,price:105}]},115)).toBe(false);
  expect(drawingVisibleInReplay({...base,control:{time:130,price:100}},120)).toBe(false);
  expect(drawingVisibleInReplay({...base,target:{time:140,price:101}},139)).toBe(false);
 });
});
