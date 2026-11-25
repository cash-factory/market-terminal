import {mkdir} from "node:fs/promises";
import assert from "node:assert/strict";
import {chromium} from "@playwright/test";

const browser=await chromium.launch(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{});
try {
 const page=await browser.newPage();
 const cryptoRequests=[];
 page.on("request",r=>{if (/binance\.vision/.test(r.url())) cryptoRequests.push(r.url())});
 await page.goto(process.env.TERMINAL_URL??"http://127.0.0.1:4173/market-terminal/",{waitUntil:"domcontentloaded"});
 const markets=page.getByRole("navigation",{name:"Chart instruments"});
 const ids=["XAUUSD","NAS100","GBPUSD","GBPJPY"];
 assert.deepEqual(await markets.getByRole("button").allTextContents(),ids);
 for(const id of ids){
   await markets.getByRole("button",{name:id,exact:true}).click();
   const ticker=id==="NAS100"?"NAS100USD":id;
   const chart=page.frameLocator(".provider-chart iframe");
   await chart.locator("body").filter({hasText:/O\s*[\d,.]+\s*H\s*[\d,.]+\s*L\s*[\d,.]+\s*C\s*[\d,.]+/}).waitFor({timeout:45000});
   assert.match(decodeURIComponent(await page.locator(".provider-chart iframe").getAttribute("src")),new RegExp("OANDA:"+ticker));
   await mkdir("test-results/production-real",{recursive:true});
   await page.screenshot({path:"test-results/production-real/"+id+".png"});
   console.log(id+" rendered provider OHLC");
 }
 assert.deepEqual(cryptoRequests,[]);
} finally {await browser.close()}
