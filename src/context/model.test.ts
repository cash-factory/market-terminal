import {describe,it,expect} from "vitest";
import {nearestMarkedLevels} from "./model";
import type {Level} from "../workspace";
const level=(id:string,price:number):Level=>({id,symbol:"EURUSD",source:"demo",color:"#3366aa",price});
describe("Chart Context Lens nearest level readout",()=>{
  it("sorts marked levels above and below without inventing support/resistance",()=>{
    const rows=[level("far-above",110),level("near-below",99),level("near-above",101),
      level("far-below",80),level("at",100),level("mid-above",105)];
    expect(nearestMarkedLevels(rows,100,2).map(x=>[x.id,x.side])).toEqual([
      ["near-above","above"],["mid-above","above"],["at","at"],
      ["near-below","below"],["far-below","below"]
    ]);
    expect(nearestMarkedLevels(rows,100,2)[0].distancePercent).toBeCloseTo(1);
  });
  it("rejects missing quotes, duplicate ids and invalid measurements",()=>{
    expect(nearestMarkedLevels([level("a",100)],0)).toEqual([]);
    expect(nearestMarkedLevels([level("a",100)],Number.NaN)).toEqual([]);
    expect(nearestMarkedLevels([level("a",100),level("a",120),level("b",-1)],110))
      .toHaveLength(1);
  });
});
