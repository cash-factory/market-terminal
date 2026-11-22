import {test,expect,type Page} from "@playwright/test";

async function drawOnChart(page:Page,chartIndex:number){
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  const surface=page.locator("svg.drawing-overlay").nth(chartIndex);
  await surface.scrollIntoViewIfNeeded();
  const box=await surface.boundingBox();
  if(!box)throw new Error("Drawing canvas "+chartIndex+" is missing");
  const a={x:box.x+box.width*.29,y:box.y+box.height*.35};
  const b={x:box.x+box.width*.6,y:box.y+box.height*.59};
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:10});await page.mouse.up();
}
test("four-chart workspace keeps every demo source and symbol drawing separate",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Toggle four-chart layout"}).click();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(4);
  await expect(page.locator("svg.drawing-overlay")).toHaveCount(4);
  await expect(page.locator(".chart-cell-label small")).toContainText([
    "Synthetic demonstration candles","SIMULATED · DEMO","SIMULATED · DEMO","SIMULATED · DEMO"
  ]);
  await drawOnChart(page,2);
  await expect(page.locator(".chart-grid-cell").nth(2).locator(".drawing-shape")).toHaveCount(1);
  await drawOnChart(page,3);
  await expect(page.locator(".chart-grid-cell").nth(3).locator(".drawing-shape")).toHaveCount(1);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.chartLayout).toBe("quad");
  expect(saved.preferences.drawings.map((d:{symbol:string;source?:string})=>[d.symbol,d.source]))
    .toEqual([["AAPL","demo"],["US100","demo"]]);
  await page.reload();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(4);
  await expect(page.locator(".drawing-shape")).toHaveCount(2);
  await page.getByRole("button",{name:"Make chart 4 primary"}).click();
  await expect(page.locator(".symbol-button")).toContainText("US100");
});
test("replay temporarily focuses one chart then restores four-pane layout",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Toggle four-chart layout"}).click();
  await page.getByRole("button",{name:"Start replay"}).click();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(1);
  await page.getByRole("button",{name:"Exit replay"}).first().click();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(4);
  await page.getByRole("button",{name:"Toggle four-chart layout"}).click();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(1);
});
