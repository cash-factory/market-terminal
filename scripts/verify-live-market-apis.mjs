/**
 * Runs on GitHub CI network (not bundled into the user-facing application).
 * Checks whether official Binance REST candles can be fetched from the hosted
 * runner with browser CORS origin. Never report simulated data as success.
 */
import assert from "node:assert/strict";
const symbols=["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","BNBUSDT"];
const observed=Date.now();
for(const symbol of symbols){
 const url=new URL("https://data-api.binance.vision/api/v3/klines");
 url.searchParams.set("symbol",symbol);
 url.searchParams.set("interval","1h");
 url.searchParams.set("limit","3");
 const response=await fetch(url,{signal:AbortSignal.timeout(18000),
   headers:{Origin:"https://cash-factory.github.io"}});
 assert.equal(response.status,200,symbol+": provider returned HTTP "+response.status);
 const allow=response.headers.get("access-control-allow-origin");
 assert.ok(allow==="*"||allow==="https://cash-factory.github.io",
   symbol+": browser CORS not enabled for Market Terminal; got "+allow);
 const rows=await response.json();
 assert.ok(Array.isArray(rows)&&rows.length>=2,symbol+": insufficient valid exchange rows");
 let previous=-1;
 for(const row of rows){
   assert.ok(Array.isArray(row)&&row.length>=7,symbol+": invalid OHLC row");
   const [at,open,high,low,close]=row;
   assert.ok(Number.isSafeInteger(at)&&at>previous,symbol+": nonmonotonic UTC timestamp");
   const [o,h,l,c]=[open,high,low,close].map(Number);
   assert.ok([o,h,l,c].every(Number.isFinite)&&l>0&&h>=Math.max(o,c)&&l<=Math.min(o,c),
     symbol+": malformed exchange OHLC");
   previous=at;
 }
 const asOf=rows.at(-1)[0];
 assert.ok(asOf<=observed+3600000&&asOf>=observed-172800000,
   symbol+": feed appears stale or clock is inconsistent");
 console.log(symbol+" verified: "+rows.length+" exchange OHLC rows, CORS "+allow+
   ", last UTC "+new Date(asOf).toISOString());
}
console.log("All five direct browser-market endpoints returned genuine validated rows.");
