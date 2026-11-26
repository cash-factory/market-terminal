import {describe,it,expect} from "vitest";
import {demoScreen,screenRows,type ScreenCriteria} from "./model";
import {symbols} from "../market";

const base:ScreenCriteria={query:"",market:"all",minChange:null,maxChange:null,sort:"symbol",descending:false};
describe("synthetic research screener",()=>{
  it("returns only clearly demo-attributed known instruments",()=>{
    const rows=demoScreen("1h");
    expect(rows).toHaveLength(Object.keys(symbols).length);
    expect(rows.every(row=>row.source==="demo"&&Number.isFinite(row.rangePct)&&row.bars===24)).toBe(true);
  });
  it("filters and sorts deterministically, retaining source provenance",()=>{
    const rows=demoScreen("1h");
    expect(screenRows(rows,{...base,query:"BTC"}).map(row=>row.symbol)).toEqual(["BTCUSDT"]);
    expect(screenRows(rows,{...base,market:"FOREX"}).map(row=>row.symbol).sort()).toEqual(["EURUSD","GBPJPY","GBPUSD"]);
    const filtered=screenRows(rows,{...base,minChange:0,sort:"change",descending:true});
    expect(filtered.every(row=>row.changePct>=0&&row.source==="demo")).toBe(true);
    expect(filtered.map(row=>row.changePct)).toEqual(filtered.map(row=>row.changePct).sort((a,b)=>b-a));
  });
  it("does not invent data for unsupported instruments or unknown filters",()=>{
    const rows=demoScreen("1d");
    expect(screenRows(rows,{...base,query:"SPY"})).toEqual([]);
    expect(screenRows(rows,{...base,minChange:5000})).toEqual([]);
    expect(screenRows(rows,{...base,maxChange:-5000})).toEqual([]);
  });
});
