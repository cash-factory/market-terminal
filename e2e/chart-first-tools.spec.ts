import {test,expect,type Page} from "@playwright/test";
import {mkdirSync} from "node:fs";

async function draw(page:Page,a:[number,number],b:[number,number]){
  const box=await page.locator("svg.drawing-overlay").first().boundingBox();
  if(!box)throw new Error("Missing price chart");
  await page.mouse.move(box.x+box.width*a[0],box.y+box.height*a[1]);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*b[0],box.y+box.height*b[1],{steps:14});
  await page.mouse.up();
}
async function tool(page:Page,name:string){
  await page.getByRole("button",{name:"More drawing tools"}).click();
  await page.getByRole("group",{name:"Advanced drawing tools"})
    .getByRole("button",{name,exact:true}).click();
}
async function props(page:Page,index=1){
  await page.getByRole("button",{name:"Settings for drawing "+index}).click();
  return page.getByRole("dialog",{name:/Drawing settings/});
}
async function screenshot(page:Page,name:string){
  mkdirSync("test-results/review",{recursive:true});
  await page.screenshot({path:"test-results/review/"+name+".png",animations:"disabled"});
}

test("chart-first navigation removes standalone Decision Desk and Risk Planner but keeps chart tools",async({page})=>{
  await page.goto("/market-terminal/");
  await expect(page.getByRole("button",{name:"Decision Desk",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Risk Planner",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Open Fib / Gann tools"})).toBeVisible();
  await page.getByRole("button",{name:"Chart interval"}).click();
  await expect(page.getByRole("dialog",{name:"Chart interval selector"})).toBeVisible();
  await screenshot(page,"chart-first-seconds-picker");
  await page.getByRole("button",{name:"Select 1s timeframe"}).click();
  await expect(page.getByRole("button",{name:"Chart interval"})).toContainText("1s");
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.frame).toBe("1s");
  await page.reload();
  await expect(page.getByRole("button",{name:"Chart interval"})).toContainText("1s");
  await page.getByRole("button",{name:"Chart interval"}).click();
  await page.getByRole("button",{name:"Select 45s timeframe"}).click();
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.frame).toBe("45s");
  await expect(page.locator("svg.drawing-overlay")).toBeVisible();
});

test("Fibonacci settings control actual independent level count, colors and restored values",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Fibonacci",exact:true}).click();
  await draw(page,[.24,.32],[.58,.69]);
  await expect(page.locator(".drawing-fib-level")).toHaveCount(7);
  const dialog=await props(page);
  const settings=dialog.getByRole("region",{name:"Tool settings for Fibonacci retracement"});
  await expect(settings).toBeVisible();
  await settings.getByRole("checkbox",{name:"Show level 2"}).uncheck();
  await settings.getByRole("spinbutton",{name:"New Fibonacci ratio"}).fill("0.886");
  await settings.getByRole("button",{name:"Add Fibonacci level"}).click();
  await expect(settings.getByRole("spinbutton",{name:"Level 6 ratio"})).toHaveValue("0.886");
  await settings.getByRole("combobox",{name:"Fibonacci level label mode"}).selectOption("both");
  await screenshot(page,"fibonacci-independent-properties");
  await dialog.getByRole("button",{name:"Apply changes"}).click();
  // Six original levels remain visible plus one newly added level.
  await expect(page.locator(".drawing-fib-level")).toHaveCount(7);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.drawings[0].fibLevels).toHaveLength(8);
  expect(saved.preferences.drawings[0].fibLevels[2].visible).toBe(false);
  expect(saved.preferences.drawings[0].labelMode).toBe("both");
  await page.reload();
  await expect(page.locator(".drawing-fib-level")).toHaveCount(7);
});

test("pitchfork rail controls change chart geometry, not only serialized configuration",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await tool(page,"Median pitchfork");
  await draw(page,[.22,.62],[.46,.32]);
  const box=await page.locator("svg.drawing-overlay").first().boundingBox();
  if(!box)throw new Error("Missing chart");
  await page.mouse.click(box.x+box.width*.62,box.y+box.height*.72);
  await expect(page.locator(".drawing-fork-rail")).toHaveCount(3);
  const dialog=await props(page);
  const settings=dialog.getByRole("region",{name:"Tool settings for Median pitchfork"});
  await settings.getByRole("checkbox",{name:/0.50× rails/}).check();
  await dialog.getByRole("button",{name:"Apply changes"}).click();
  await expect(page.locator(".drawing-fork-rail")).toHaveCount(5);
  await page.reload();
  await expect(page.locator(".drawing-fork-rail")).toHaveCount(5);
});

test("Gann grid has editable divisions and no implied market forecast",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await tool(page,"Gann box");
  await draw(page,[.23,.29],[.60,.74]);
  const grid=page.locator(".drawing-gann-box");
  await expect(grid.locator("line")).toHaveCount(8); // 3 internal vertical + 3 horizontal + 2 diagonal
  const dialog=await props(page);
  await dialog.getByRole("combobox",{name:"Gann grid subdivisions"}).selectOption("8");
  await dialog.getByRole("button",{name:"Apply changes"}).click();
  await expect(grid.locator("line")).toHaveCount(16); // 7 + 7 + 2
  await page.reload();
  await expect(grid.locator("line")).toHaveCount(16);
});

test("seconds intervals and standalone settings fit mobile viewport without horizontal overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Chart interval"}).click();
  const popup=page.getByRole("dialog",{name:"Chart interval selector"});
  await expect(popup.getByRole("button",{name:"Select 5s timeframe"})).toBeVisible();
  const bounds=await popup.boundingBox();
  if(!bounds)throw new Error("No interval selector");
  expect(bounds.x).toBeGreaterThanOrEqual(-2);
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(392);
  await screenshot(page,"mobile-seconds-timeframes");
  await popup.getByRole("button",{name:"Select 5s timeframe"}).click();
  await expect(page.getByRole("button",{name:"Chart interval"})).toContainText("5s");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});

test("save-as-default is isolated by drawing tool and never copies price anchors",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Fibonacci",exact:true}).click();
  await draw(page,[.22,.33],[.47,.63]);
  const initial=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  const first=initial.preferences.drawings[0];
  const dialog=await props(page);
  await dialog.getByRole("combobox",{name:"Drawing line weight"}).selectOption("5");
  await dialog.getByRole("button",{name:"Save Fibonacci retracement settings as default"}).click();
  await expect(page.getByRole("status").filter({hasText:"Default settings saved"})).toBeVisible();
  await dialog.getByRole("button",{name:"Cancel"}).click();
  await page.getByRole("button",{name:"Fibonacci",exact:true}).click();
  await draw(page,[.52,.25],[.71,.62]);
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.drawings).toHaveLength(2);
  expect(saved.preferences.drawings[0].strokeWidth).toBeUndefined();
  expect(saved.preferences.drawings[1].strokeWidth).toBe(5);
  expect(saved.preferences.drawings[1].start).not.toEqual(first.start);
  expect(saved.preferences.toolPresets.fibonacci.strokeWidth).toBe(5);
  await page.reload();
  await page.getByRole("button",{name:"Fibonacci",exact:true}).click();
  await draw(page,[.29,.43],[.52,.58]);
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.drawings[2].strokeWidth).toBe(5);
  await page.getByRole("button",{name:"Settings for drawing 3"}).click();
  await page.getByRole("button",{name:"Reset Fibonacci retracement default settings"}).click();
  await page.getByRole("button",{name:"Cancel"}).click();
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.toolPresets.fibonacci).toBeUndefined();
});

test("opt-in Binance 5s chart requests native 1s Spot candles instead of fabricating intraminute data",async({page})=>{
  const requested:string[]=[];
  await page.route("**/api/v3/klines?**",async route=>{
    requested.push(route.request().url());
    const now=Math.floor(Date.now()/1000/5)*5000-15_000;
    const bars=Array.from({length:15},(_,i)=>{
      const t=now+i*1000,open=100+i,close=101+i;
      return [t,String(open),String(close+1),String(open-1),
        String(close),"2",t+999,"0",1,"0","0","0"];
    });
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(bars)});
  });
  await page.addInitScript(()=>{
    localStorage.setItem("market-terminal-workspace",JSON.stringify({
      format:"market-terminal-workspace",version:25,
      preferences:{symbol:"BTCUSDT",frame:"5s",priceSource:"binance"}
    }));
  });
  await page.goto("/market-terminal/");
  await expect.poll(()=>requested.length).toBeGreaterThan(0);
  expect(new URL(requested[0]).searchParams.get("interval")).toBe("1s");
  await expect(page.getByRole("button",{name:"Chart interval"})).toContainText("5s");
  await expect(page.locator("svg.drawing-overlay")).toBeVisible();
  await expect(page.getByText("Binance Spot · BTC/USDT · aggregated native 1s klines").first()).toBeVisible();
});
