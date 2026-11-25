import {test,expect} from "@playwright/test";

test("a verified non-BTC spot instrument renders provider OHLC, never a demo fallback",async({page})=>{
 const observed:string[]=[];
 await page.route("https://data-api.binance.vision/api/v3/klines?**",async route=>{
   const url=new URL(route.request().url());
   observed.push(url.searchParams.get("symbol")??"");
   const last=Math.floor(Date.now()/3600000)*3600000;
   const candles=Array.from({length:75},(_,i)=>{
     const at=last-(74-i)*3600000;
     const open=2000+i/2,close=open+.25;
     return [at,String(open),String(close+.3),String(open-.4),String(close),"12.5",at+3599999,"0",0,"0","0","0"];
   });
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(candles)});
 });
 await page.goto("/market-terminal/");
 await page.keyboard.press("Control+k");
 await page.getByRole("combobox",{name:"Search instruments and tools"}).fill("ETHUSDT");
 await page.getByRole("listbox",{name:"Market instruments and commands"}).getByRole("option",{name:/ETH \/ USDT/}).click();
 await page.getByRole("button",{name:"Chart setup"}).click();
 await page.getByRole("button",{name:"Binance Spot"}).click();
 await expect(page.locator(".instrument-header")).toContainText("ETH / USDT");
 await expect(page.locator(".technical-chart-stack").first()).toHaveAttribute("data-visible-candles","75");
 expect(observed).toContain("ETHUSDT");
 await expect(page.locator(".terminal-center")).toContainText("Binance Spot");
});
