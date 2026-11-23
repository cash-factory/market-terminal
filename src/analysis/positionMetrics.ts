import type {SymbolId} from "../market";
import type {PositionDirection} from "./positionDrawing";

/** Linear, quote-currency planning model. It does not model broker orders or inverse contracts. */
export type PositionSettings={
 equity:number;riskPercent:number;sizing:"risk"|"quantity";quantity:number;
 contractMultiplier:number;tickSize:number;feeBps:number;slippageTicks:number;
 leverage:number;quoteToAccountRate:number;accountCurrency:string;
 showPnl:boolean;showPriceChange:boolean;showQuantity:boolean;
};
export type PositionMetrics={
 direction:"long"|"short";quantity:number;riskBudget:number;estimatedLoss:number;
 estimatedProfit:number;grossLoss:number;grossProfit:number;netMultiple:number;
 grossMultiple:number;notional:number;margin:number;actualRiskPercent:number;
 stopDistance:number;targetDistance:number;stopPercent:number;targetPercent:number;
 stopTicks:number;targetTicks:number;roundTripStopCosts:number;roundTripTargetCosts:number;
 breakEvenPrice:number;currency:string;exceedsEquityMargin:boolean;
};
export function defaultPositionSettings(symbol:SymbolId):PositionSettings{
 return {equity:10000,riskPercent:1,sizing:"risk",quantity:1,
   contractMultiplier:1,tickSize:symbol==="EURUSD"?.00001:.01,feeBps:0,
   slippageTicks:0,leverage:1,quoteToAccountRate:1,
   accountCurrency:symbol==="BTCUSDT"?"USDT":"USD",
   showPnl:true,showPriceChange:true,showQuantity:true};
}
export function effectivePositionSettings(settings:PositionSettings|undefined,symbol:SymbolId):PositionSettings{
 return settings??defaultPositionSettings(symbol);
}
const finite=(v:unknown,min:number,max:number)=>typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max;
export function isPositionSettings(value:unknown):value is PositionSettings{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const p=value as Record<string,unknown>;
 const fields=["equity","riskPercent","sizing","quantity","contractMultiplier","tickSize",
   "feeBps","slippageTicks","leverage","quoteToAccountRate","accountCurrency",
   "showPnl","showPriceChange","showQuantity"];
 if(Object.keys(p).some(key=>!fields.includes(key)))return false;
 return finite(p.equity,0.01,1e15)&&finite(p.riskPercent,.000001,100)&&
   (p.sizing==="risk"||p.sizing==="quantity")&&finite(p.quantity,.000000000001,1e12)&&
   finite(p.contractMultiplier,.000000000001,1e12)&&finite(p.tickSize,.000000000001,1e12)&&
   finite(p.feeBps,0,1000)&&finite(p.slippageTicks,0,1000)&&
   finite(p.leverage,1,1000)&&finite(p.quoteToAccountRate,.000000000001,1e9)&&
   typeof p.accountCurrency==="string"&&/^[A-Z]{3,8}$/.test(p.accountCurrency)&&
   typeof p.showPnl==="boolean"&&typeof p.showPriceChange==="boolean"&&typeof p.showQuantity==="boolean";
}
/** All P&L and margin outputs are denominated in the manually configured account currency. */
export function calculatePositionMetrics(
 direction:PositionDirection,entry:number,stop:number,target:number,settings:PositionSettings
):PositionMetrics|null{
 if(!isPositionSettings(settings)||![entry,stop,target].every(n=>Number.isFinite(n)&&n>0))return null;
 const sign=direction==="long-position"?1:-1;
 const stopDistance=(entry-stop)*sign,targetDistance=(target-entry)*sign;
 if(stopDistance<=0||targetDistance<=0)return null;
 const m=settings.contractMultiplier,fx=settings.quoteToAccountRate;
 const fee=settings.feeBps/10000;
 const slip=2*settings.slippageTicks*settings.tickSize*m;
 const stopCosts=((entry+stop)*fee*m+slip)*fx;
 const targetCosts=((entry+target)*fee*m+slip)*fx;
 const grossLoss=stopDistance*m*fx,grossProfit=targetDistance*m*fx;
 const lossPerUnit=grossLoss+stopCosts,profitPerUnit=grossProfit-targetCosts;
 if(!Number.isFinite(lossPerUnit)||lossPerUnit<=0)return null;
 const riskBudget=settings.equity*settings.riskPercent/100;
 const quantity=settings.sizing==="risk"?riskBudget/lossPerUnit:settings.quantity;
 const notional=quantity*entry*m*fx,margin=notional/settings.leverage;
 const estimatedLoss=quantity*lossPerUnit,estimatedProfit=quantity*profitPerUnit;
 const breakEvenPrice=sign===1?
   (entry*(1+fee)+2*settings.slippageTicks*settings.tickSize)/(1-fee):
   (entry*(1-fee)-2*settings.slippageTicks*settings.tickSize)/(1+fee);
 const values=[quantity,notional,margin,estimatedLoss,estimatedProfit,breakEvenPrice];
 if(!values.every(Number.isFinite)||quantity<=0)return null;
 return {direction:sign===1?"long":"short",quantity,riskBudget,estimatedLoss,estimatedProfit,
   grossLoss:quantity*grossLoss,grossProfit:quantity*grossProfit,
   netMultiple:profitPerUnit/lossPerUnit,grossMultiple:targetDistance/stopDistance,
   notional,margin,actualRiskPercent:estimatedLoss/settings.equity*100,
   stopDistance,targetDistance,stopPercent:stopDistance/entry*100,targetPercent:targetDistance/entry*100,
   stopTicks:stopDistance/settings.tickSize,targetTicks:targetDistance/settings.tickSize,
   roundTripStopCosts:quantity*stopCosts,roundTripTargetCosts:quantity*targetCosts,
   breakEvenPrice,currency:settings.accountCurrency,exceedsEquityMargin:margin>settings.equity};
}
export function formatPositionCash(value:number,currency:string):string{
 const digits=Math.abs(value)<.01&&value!==0?6:2;
 return (value<0?"−":value>0?"+":"")+Math.abs(value).toLocaleString(undefined,
   {minimumFractionDigits:2,maximumFractionDigits:digits})+" "+currency;
}
