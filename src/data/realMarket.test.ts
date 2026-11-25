import {describe,it,expect,vi,afterEach} from "vitest";
import {REAL_SPOT_SYMBOLS,isRealSpotSymbol} from "../market";
import {fetchBinanceSpotCandles,binanceSpotInstrument} from "./binance";
import {parseBinanceStreamCandle} from "./stream";
import {parseWorkspace} from "../workspace";

const sample=(start:number)=>[start,"103.20","105.50","101.10","104.35","18.9",start+3599999,"0",0,"0","0","0"];
afterEach(()=>vi.unstubAllGlobals());

describe("real instrument identity and strict OHLC provenance",()=>{
 it("uses only curated spot symbols, never aliasing gold/forex/index CFD quotes",()=>{
   expect(REAL_SPOT_SYMBOLS).toEqual(["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","BNBUSDT"]);
   for(const sym of REAL_SPOT_SYMBOLS){
     expect(isRealSpotSymbol(sym)).toBe(true);
     expect(binanceSpotInstrument(sym)).toMatchObject({providerSymbol:sym,assetClass:"crypto",venue:"Binance Spot",quoteCurrency:"USDT"});
     expect(binanceSpotInstrument(sym).tickSize).toBeNull();
   }
   expect(isRealSpotSymbol("EURUSD")).toBe(false);
   expect(isRealSpotSymbol("XAUUSD")).toBe(false);
   expect(isRealSpotSymbol("US100")).toBe(false);
 });
 it("fetches exactly the selected crypto asset's raw exchange klines",async()=>{
   const fetchMock=vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>[sample(60000)]});
   vi.stubGlobal("fetch",fetchMock);
   const result=await fetchBinanceSpotCandles({symbol:"ETHUSDT",interval:"1h",limit:48});
   const u=new URL(fetchMock.mock.calls[0][0]);
   expect(u.hostname).toBe("data-api.binance.vision");
   expect(u.searchParams.get("symbol")).toBe("ETHUSDT");
   expect(u.searchParams.get("interval")).toBe("1h");
   expect(u.searchParams.get("limit")).toBe("48");
   expect(result.instrument.providerSymbol).toBe("ETHUSDT");
   expect(result.candles[0]).toMatchObject({open:103.2,close:104.35});
 });
 it("refuses cross-symbol WebSocket payloads and mismatching UTC candle intervals",()=>{
  const eth={e:"kline",s:"ETHUSDT",k:{s:"ETHUSDT",i:"1m",t:60000,T:119999,x:false,o:"103",h:"105",l:"102",c:"104",v:"10"}};
  expect(parseBinanceStreamCandle(eth,"1m","ETHUSDT")).toMatchObject({openTimeMs:60000,close:104});
  expect(parseBinanceStreamCandle(eth,"1m","BTCUSDT")).toBeNull();
  expect(parseBinanceStreamCandle(eth,"5m","ETHUSDT")).toBeNull();
  expect(parseBinanceStreamCandle({...eth,s:"SOLUSDT"},"1m","ETHUSDT")).toBeNull();
 });
 it("rejects out-of-range history sizes before a network call",async()=>{
   const fetchMock=vi.fn();vi.stubGlobal("fetch",fetchMock);
   await expect(fetchBinanceSpotCandles({symbol:"SOLUSDT",interval:"1h",limit:1001}))
     .rejects.toMatchObject({code:"BAD_DATA"});
   expect(fetchMock).not.toHaveBeenCalled();
 });
 it("restores verified provider identity for every supported crypto symbol",()=>{
   expect(parseWorkspace({symbol:"SOLUSDT",priceSource:"binance"})).toMatchObject({symbol:"SOLUSDT",priceSource:"binance"});
   expect(parseWorkspace({symbol:"XAUUSD",priceSource:"binance"})).toMatchObject({symbol:"XAUUSD",priceSource:"demo"});
 });
});
