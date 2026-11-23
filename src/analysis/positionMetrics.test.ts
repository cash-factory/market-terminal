import {describe,expect,it} from "vitest";
import {calculatePositionMetrics,defaultPositionSettings,isPositionSettings} from "./positionMetrics";
describe("long/short planning metrics",()=>{
 const base=defaultPositionSettings("AAPL");
 it("sizes a 2R long by risk budget and computes margin",()=>{
   const r=calculatePositionMetrics("long-position",100,95,110,base)!;
   expect(r.quantity).toBe(20);
   expect(r.estimatedLoss).toBe(100);
   expect(r.estimatedProfit).toBe(200);
   expect(r.netMultiple).toBe(2);
   expect(r.notional).toBe(2000);
   expect(r.margin).toBe(2000);
   expect(r.actualRiskPercent).toBe(1);
   expect(r.stopTicks).toBe(500);
 });
 it("supports short position and manually specified quantity",()=>{
   const r=calculatePositionMetrics("short-position",100,105,90,
     {...base,sizing:"quantity",quantity:3,leverage:5})!;
   expect(r.estimatedLoss).toBe(15);
   expect(r.estimatedProfit).toBe(30);
   expect(r.margin).toBe(60);
   expect(r.actualRiskPercent).toBeCloseTo(.15);
   expect(r.breakEvenPrice).toBe(100);
 });
 it("deducts fees and adverse slippage from net P&L and risk-based sizing",()=>{
   const r=calculatePositionMetrics("long-position",100,95,110,
     {...base,feeBps:10,slippageTicks:2,tickSize:.5})!;
   // Per-unit stop loss = 5 + .195 + 2; risk budget = 100
   expect(r.quantity).toBeCloseTo(100/7.195,8);
   expect(r.estimatedLoss).toBeCloseTo(100,8);
   expect(r.estimatedProfit).toBeCloseTo(r.quantity*(10-.21-2),8);
   expect(r.netMultiple).toBeCloseTo(7.79/7.195,8);
   expect(r.breakEvenPrice).toBeCloseTo((100*1.001+2)/.999,8);
 });
 it("uses explicit quote-to-account conversion and flags margin insufficiency",()=>{
   const r=calculatePositionMetrics("short-position",100,105,90,
     {...base,equity:100,riskPercent:10,quoteToAccountRate:1.2,leverage:1})!;
   expect(r.estimatedLoss).toBeCloseTo(10);
   expect(r.quantity).toBeCloseTo(10/6);
   expect(r.exceedsEquityMargin).toBe(true);
 });
 it("rejects invalid directions, nonfinite costs and malformed imported settings",()=>{
   expect(calculatePositionMetrics("long-position",100,105,110,base)).toBeNull();
   expect(calculatePositionMetrics("short-position",100,105,110,base)).toBeNull();
   expect(isPositionSettings({...base,feeBps:-1})).toBe(false);
   expect(isPositionSettings({...base,quantity:Infinity})).toBe(false);
   expect(isPositionSettings({...base,accountCurrency:"<script>"})).toBe(false);
 });
});
