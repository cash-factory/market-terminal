import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import {chromium} from "@playwright/test";

const origin="http://127.0.0.1:4173/market-terminal/";
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const issues=[];
page.on("pageerror",e=>issues.push(String(e)));
try{
 await page.goto(origin,{waitUntil:"domcontentloaded",timeout:20000});
 await page.locator(".instrument-header").waitFor({timeout:20000});
 assert.match(await page.locator(".instrument-header h1").innerText(),/BTC\s*\/\s*USDT/);
 await page.waitForFunction(()=>{
   const chart=document.querySelector(".technical-chart-stack");
   return chart && Number(chart.getAttribute("data-visible-candles"))>=20;
 },null,{timeout:30000});
 assert.match(await page.locator(".terminal-center").innerText(),/BINANCE SPOT|Binance Spot/i);
 await mkdir("test-results/production-real",{recursive:true});
 await page.screenshot({path:"test-results/production-real/btc-spot.png",animations:"disabled"});
 const tabs=page.getByRole("navigation",{name:"Quick chart markets"});
 await tabs.getByRole("button",{name:/ETH/}).click();
 await page.waitForFunction(()=>{
   const header=document.querySelector(".instrument-header h1");
   const chart=document.querySelector(".technical-chart-stack");
   return header?.textContent?.includes("ETH")&&chart&&Number(chart.getAttribute("data-visible-candles"))>=20;
 },null,{timeout:30000});
 await page.screenshot({path:"test-results/production-real/eth-spot.png",animations:"disabled"});
 await page.keyboard.press("Control+k");
 const search=page.getByRole("combobox",{name:"Search instruments and tools"});
 const options=page.getByRole("listbox",{name:"Market instruments and commands"}).getByRole("option");
 for(const symbol of ["EURUSD","AAPL","XAUUSD","US100"]){
   await search.fill(symbol);
   assert.equal(await options.count(),0);
 }
 await page.keyboard.press("Escape");
 await page.locator(".market-source-links summary").click();
 assert.equal(await page.getByRole("navigation",{name:"External chart providers"}).getByRole("link").count(),9);
 assert.equal(issues.length,0,"Browser runtime errors: "+issues.join(" | "));
 console.log("PRODUCTION MARKET SMOKE PASSED: BTC/USDT and ETH/USDT actual market OHLC loaded; unsupported instruments hidden and gold providers available.");
}finally{await browser.close();}
