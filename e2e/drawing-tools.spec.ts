import {test,expect,type Page} from "@playwright/test";

async function dragAcrossChart(page:Page,tool:string){
  await page.getByRole("button",{name:tool,exact:true}).click();
  const rect=await page.locator("svg.drawing-overlay").boundingBox();
  if(!rect)throw new Error("Missing drawing plot");
  const a={x:rect.x+rect.width*.29,y:rect.y+rect.height*.34};
  const b={x:rect.x+rect.width*.59,y:rect.y+rect.height*.61};
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:10});await page.mouse.up();
}
test("ray and price-range measurement draw and persist using the working chart input layer",async({page})=>{
  await page.goto("/market-terminal/");
  await dragAcrossChart(page,"Ray");
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await dragAcrossChart(page,"Measure");
  await expect(page.locator(".drawing-shape")).toHaveCount(2);
  await expect(page.locator(".drawing-shape").last().locator("text")).toContainText("%");
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(data.preferences.drawings.map((d:{tool:string})=>d.tool)).toEqual(["ray","measure"]);
  await page.reload();
  await expect(page.locator(".drawing-shape")).toHaveCount(2);
  await expect(page.locator(".drawing-object-row")).toHaveCount(2);
});
test("OHLC magnet is optional, persists and never disables other drawings",async({page})=>{
  await page.goto("/market-terminal/");
  const magnet=page.getByRole("button",{name:"Snap to candle OHLC"});
  await expect(magnet).toHaveAttribute("aria-pressed","false");
  await magnet.click();
  await expect(magnet).toHaveAttribute("aria-pressed","true");
  await dragAcrossChart(page,"Trendline");
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("button",{name:"Snap to candle OHLC"})).toHaveAttribute("aria-pressed","true");
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(state.preferences.magnetEnabled).toBe(true);
});
