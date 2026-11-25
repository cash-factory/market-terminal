import type { CandlestickData, UTCTimestamp, LineData } from "lightweight-charts";
export const REAL_SPOT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT"] as const;
export type RealSpotSymbol = typeof REAL_SPOT_SYMBOLS[number];
export type SymbolId = "EURUSD" | "AAPL" | "US100" | "XAUUSD" | "GBPUSD" | "GBPJPY" | RealSpotSymbol;
/** Synthetic candles exist solely for isolated test builds; production cannot enable them with a URL. */
export const ENABLE_TEST_FIXTURES = import.meta.env.MODE === "test" || import.meta.env.MODE === "e2e";
export const isRealSpotSymbol = (symbol:SymbolId):symbol is RealSpotSymbol =>
  REAL_SPOT_SYMBOLS.includes(symbol as RealSpotSymbol);
export const symbols: Record<SymbolId, {label:string; market:string; base:number; precision:number}> = {
 GBPUSD:{label:"GBPUSD",market:"FOREX · PROVIDER CHART",base:1.3,precision:5},
 GBPJPY:{label:"GBPJPY",market:"FOREX · PROVIDER CHART",base:190,precision:3},
 EURUSD:{label:"EUR / USD",market:"FOREX · PROVIDER REQUIRED",base:1.0842,precision:5},
 BTCUSDT:{label:"BTC / USDT",market:"CRYPTO · BINANCE SPOT",base:96250,precision:2},
 ETHUSDT:{label:"ETH / USDT",market:"CRYPTO · BINANCE SPOT",base:3520,precision:2},
 SOLUSDT:{label:"SOL / USDT",market:"CRYPTO · BINANCE SPOT",base:150,precision:3},
 XRPUSDT:{label:"XRP / USDT",market:"CRYPTO · BINANCE SPOT",base:2.35,precision:4},
 BNBUSDT:{label:"BNB / USDT",market:"CRYPTO · BINANCE SPOT",base:800,precision:2},
 AAPL:{label:"AAPL",market:"EQUITY · PROVIDER REQUIRED",base:252.4,precision:2},
 XAUUSD:{label:"XAUUSD",market:"GOLD · EXTERNAL CHARTS",base:3400,precision:2},
 US100:{label:"NAS100",market:"NASDAQ-100 · EXTERNAL CHARTS",base:21400,precision:2}
};
export const externalProviders: Partial<Record<SymbolId, [string, string][]>> = {
  GBPUSD: [["OANDA","OANDA:GBPUSD"],["FOREX.com","FOREXCOM:GBPUSD"]],
  GBPJPY: [["OANDA","OANDA:GBPJPY"],["FOREX.com","FOREXCOM:GBPJPY"]],
  XAUUSD: [
    ["OANDA · Gold / USD", "OANDA:XAUUSD"],
    ["Pepperstone · Gold / USD", "PEPPERSTONE:XAUUSD"],
    ["FOREX.com · Gold / USD", "FOREXCOM:XAUUSD"],
  ],
  US100: [
    ["OANDA · US Nas 100 CFD", "OANDA:NAS100USD"],
    ["FOREX.com · US 100 CFD", "FOREXCOM:NAS100"],
    ["Pepperstone · US 100 CFD", "PEPPERSTONE:NAS100"],
    ["Capital.com · US 100 CFD", "CAPITALCOM:NAS100"],
  ],
};
export const availableInstruments: SymbolId[] = ENABLE_TEST_FIXTURES
  ? Object.keys(symbols) as SymbolId[]
  : ["XAUUSD","US100","GBPUSD","GBPJPY"];
export const SECOND_FRAMES=["1s","5s","10s","15s","30s","45s"] as const;
export const MINUTE_FRAMES=["1m","5m","15m","1h","4h","1d"] as const;
export type Frame=typeof SECOND_FRAMES[number]|typeof MINUTE_FRAMES[number];
export const ALL_FRAMES:Frame[]=[...SECOND_FRAMES,...MINUTE_FRAMES];
export const isSecondsFrame=(frame:Frame):boolean=>SECOND_FRAMES.includes(frame as typeof SECOND_FRAMES[number]);
export const frameSeconds:Record<Frame,number>={"1s":1,"5s":5,"10s":10,"15s":15,"30s":30,"45s":45,"1m":60,"5m":300,"15m":900,"1h":3600,"4h":14400,"1d":86400};
function noise(i:number, seed:number) { return Math.sin(i*12.9898+seed*78.233)*43758.5453%1; }
export function demoCandles(symbol:SymbolId,frame:Frame):CandlestickData<UTCTimestamp>[] {
 const m=symbols[symbol], step=frameSeconds[frame], end=Math.floor(Date.now()/1000/step)*step;
 let price=m.base; const arr:CandlestickData<UTCTimestamp>[]=[];
 const seed=Object.keys(symbols).indexOf(symbol)+1;
 for(let i=360;i>0;i--) {
  const k=360-i, volatility=m.base*(symbol==="EURUSD"?.00035:.0017);
  const drift=(Math.sin(k/28)+Math.cos(k/49))*.25;
  const change=(noise(k,seed)+drift)*volatility*1.6;
  const open=price, close=Math.max(.000001,price+change);
  const wiggle=Math.abs(noise(k+999,seed))*volatility;
  arr.push({time:(end-i*step) as UTCTimestamp,open,high:Math.max(open,close)+wiggle,low:Math.min(open,close)-wiggle,close});
  price=close;
 }
 return arr;
}
export function sma(candles:CandlestickData<UTCTimestamp>[],period:number):LineData<UTCTimestamp>[] {
 const out:LineData<UTCTimestamp>[]=[];let total=0;
 for(let i=0;i<candles.length;i++){total+=candles[i].close;if(i>=period)total-=candles[i-period].close;if(i>=period-1)out.push({time:candles[i].time,value:total/period});}
 return out;
}
