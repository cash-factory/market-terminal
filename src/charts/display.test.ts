import {describe,expect,it} from "vitest";
import type {CandlestickData,UTCTimestamp} from "lightweight-charts";
import {heikinAshi,closeLineData,parseChartDisplayStyle,chartStyles} from "./display";
import {defaultWorkspace,parseWorkspace,serializeWorkspace} from "../workspace";

const bars:CandlestickData<UTCTimestamp>[]=[
 {time:1000 as UTCTimestamp,open:10,high:15,low:9,close:14},
 {time:1060 as UTCTimestamp,open:14,high:16,low:12,close:13}
];
describe("market chart display styles",()=>{
 it("provides five real chart styles with honest derived/raw distinction",()=>{
   expect(chartStyles.map(s=>s.id)).toEqual([
     "candles","ohlc-bars","line","area","heikin-ashi"
   ]);
   expect(parseChartDisplayStyle("ohlc-bars")).toBe("ohlc-bars");
   expect(parseChartDisplayStyle("invalid")).toBe("candles");
 });
 it("calculates standard recursive Heikin Ashi without mutating observed OHLC",()=>{
   const ha=heikinAshi(bars);
   expect(ha[0]).toEqual({time:bars[0].time,open:12,close:12,high:15,low:9});
   expect(ha[1]).toEqual({time:bars[1].time,open:12,close:13.75,high:16,low:12});
   expect(bars[0].close).toBe(14);
   expect(heikinAshi([])).toEqual([]);
 });
 it("maps line/area series to exact source closing prices",()=>{
   expect(closeLineData(bars)).toEqual([
     {time:bars[0].time,value:14},{time:bars[1].time,value:13}
   ]);
 });
 it("saves chart display settings while tolerating unsupported imported style names",()=>{
   const w={...defaultWorkspace,chartDisplayStyle:"heikin-ashi" as const};
   expect(parseWorkspace(JSON.parse(serializeWorkspace(w)))).toEqual(w);
   expect(parseWorkspace({chartDisplayStyle:"vintage"}).chartDisplayStyle).toBe("candles");
 });
});
