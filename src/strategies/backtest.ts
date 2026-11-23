import type {CandlestickData,UTCTimestamp} from "lightweight-charts";

export type BacktestConfig={
  fast:number;
  slow:number;
  startingCapital:number;
  allocationPct:number;
  commissionBps:number;
  slippageBps:number;
};
export const defaultBacktestConfig:BacktestConfig={
  fast:9,slow:21,startingCapital:10_000,
  allocationPct:100,commissionBps:10,slippageBps:2
};
export type EquityPoint={time:number;equity:number;inPosition:boolean};
export type SimTrade={
  entryTime:number;exitTime:number;
  entryPrice:number;exitPrice:number;quantity:number;
  grossPnL:number;entryFee:number;exitFee:number;netPnL:number;
  entryIndex:number;exitIndex:number;
};
export type OpenPosition={
  entryTime:number;entryPrice:number;quantity:number;entryFee:number;
  markedPrice:number;unrealizedNetPnL:number;
};
export type BacktestResult={
  config:BacktestConfig;
  bars:number;
  equity:number;
  returnPct:number;
  maxDrawdownPct:number;
  netRealizedPnL:number;
  totalFees:number;
  wins:number;
  losses:number;
  trades:SimTrade[];
  equityCurve:EquityPoint[];
  openPosition:OpenPosition|null;
  firstTime:number|null;
  lastTime:number|null;
  dataNote:string;
};
const valid=(n:number,min:number,max:number)=>Number.isFinite(n)&&n>=min&&n<=max;
export function validateBacktestConfig(value:BacktestConfig):string|null{
  if(!Number.isSafeInteger(value.fast)||!valid(value.fast,2,500))
    return "Fast moving average must be an integer between 2 and 500.";
  if(!Number.isSafeInteger(value.slow)||!valid(value.slow,3,1000)||value.fast>=value.slow)
    return "Slow moving average must exceed fast and be no greater than 1000.";
  if(!valid(value.startingCapital,1,1_000_000_000))
    return "Starting capital must be positive and finite.";
  if(!valid(value.allocationPct,0.01,100))
    return "Allocation must be between 0.01% and 100%.";
  if(!valid(value.commissionBps,0,2000)||!valid(value.slippageBps,0,2000))
    return "Cost assumptions must be between zero and 2,000 basis points.";
  return null;
}
/**
 * Single-asset, long-only illustration:
 *  - An SMA close crossover through the PREVIOUS completed bar signals an order.
 *  - Fill occurs at the NEXT bar's open with adverse slippage.
 *  - Entry/exit fees are deducted from cash, never assumed free.
 *  - An unclosed trade is marked at the current close but NOT forcibly liquidated.
 *  - The algorithm sees no bars after the candle it is evaluating.
 *  - No short selling, intra-bar stop execution, FX conversions or broker contract specs.
 */
export function runSmaCrossover(
  bars:readonly CandlestickData<UTCTimestamp>[],config:BacktestConfig
):BacktestResult {
  const error=validateBacktestConfig(config);
  if(error)throw new Error(error);
  if(bars.some((bar,i)=>!Number.isFinite(bar.open)||!Number.isFinite(bar.close)||
    bar.open<=0||bar.close<=0||(i>0&&Number(bar.time)<=Number(bars[i-1].time))))
    throw new Error("Simulation requires finite positive, strictly time-ordered observed OHLC bars.");
  const n=bars.length;
  const prefix=new Float64Array(n+1);
  for(let i=0;i<n;i++)prefix[i+1]=prefix[i]+bars[i].close;
  const sma=(lastIndex:number,period:number)=>
    lastIndex>=period-1?(prefix[lastIndex+1]-prefix[lastIndex+1-period])/period:null;
  const rate=config.commissionBps/10_000;
  const slippage=config.slippageBps/10_000;
  let cash=config.startingCapital;
  let position:{index:number;entryPrice:number;quantity:number;entryFee:number}|null=null;
  let fees=0,highWater=config.startingCapital,maxDrawdownPct=0;
  const trades:SimTrade[]=[],equityCurve:EquityPoint[]=[];
  for(let i=0;i<n;i++){
    // Both averages are computed only from closes of completed candles i-1 and i-2.
    const previousFast=sma(i-1,config.fast),previousSlow=sma(i-1,config.slow);
    const olderFast=sma(i-2,config.fast),olderSlow=sma(i-2,config.slow);
    if(previousFast!==null&&previousSlow!==null&&olderFast!==null&&olderSlow!==null){
      const crossUp=olderFast<=olderSlow&&previousFast>previousSlow;
      const crossDown=olderFast>=olderSlow&&previousFast<previousSlow;
      if(crossDown&&position){
        const exitPrice=bars[i].open*(1-slippage);
        const proceeds=position.quantity*exitPrice;
        const exitFee=proceeds*rate;
        cash+=proceeds-exitFee;fees+=exitFee;
        const grossPnL=position.quantity*(exitPrice-position.entryPrice);
        const netPnL=grossPnL-position.entryFee-exitFee;
        trades.push({
          entryTime:Number(bars[position.index].time),exitTime:Number(bars[i].time),
          entryPrice:position.entryPrice,exitPrice,quantity:position.quantity,
          grossPnL,entryFee:position.entryFee,exitFee,netPnL,
          entryIndex:position.index,exitIndex:i
        });
        position=null;
      }else if(crossUp&&!position){
        const entryPrice=bars[i].open*(1+slippage);
        const budget=cash*config.allocationPct/100;
        const notional=budget/(1+rate);
        const entryFee=notional*rate;
        const quantity=notional/entryPrice;
        cash-=notional+entryFee;fees+=entryFee;
        position={index:i,entryPrice,quantity,entryFee};
      }
    }
    const equity=cash+(position?position.quantity*bars[i].close:0);
    highWater=Math.max(highWater,equity);
    maxDrawdownPct=Math.max(maxDrawdownPct,highWater>0?100*(highWater-equity)/highWater:0);
    equityCurve.push({time:Number(bars[i].time),equity,inPosition:position!==null});
  }
  const equity=equityCurve.at(-1)?.equity??config.startingCapital;
  const openPosition:OpenPosition|null=position?{
    entryTime:Number(bars[position.index].time),
    entryPrice:position.entryPrice,
    quantity:position.quantity,entryFee:position.entryFee,
    markedPrice:bars[n-1].close,
    unrealizedNetPnL:position.quantity*(bars[n-1].close-position.entryPrice)-position.entryFee
  }:null;
  return {config,bars:n,equity,returnPct:100*(equity/config.startingCapital-1),
    maxDrawdownPct,netRealizedPnL:trades.reduce((s,t)=>s+t.netPnL,0),
    totalFees:fees,wins:trades.filter(t=>t.netPnL>0).length,
    losses:trades.filter(t=>t.netPnL<=0).length,trades,equityCurve,openPosition,
    firstTime:n?Number(bars[0].time):null,lastTime:n?Number(bars[n-1].time):null,
    dataNote:"This historical backtest is deterministic, long-only and illustrative. Simulated next-open fills are not executable market orders."};
}
