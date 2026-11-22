import {test,expect,type Page} from "@playwright/test";

async function drawOn(page:Page,index:number){
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  const svg=page.locator("svg.drawing-overlay").nth(index);
  const rect=await svg.boundingBox();
  if(!rect)throw new Error("Drawing surface missing in chart "+index);
  const a={x:rect.x+rect.width*.28,y:rect.y+rect.height*.4};
  const b={x:rect.x+rect.width*.58,y:rect.y+rect.height*.6};
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:10});await page.mouse.up();
}
test("dual chart layout draws independently and survives browser reload",async({page})=>{
  await page.goto("/market-terminal/");
  await expect(page.locator(".chart-grid-cell")).toHaveCount(1);
  await page.getByRole("button",{name:"Toggle dual-chart layout"}).click();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(2);
  await expect(page.locator("svg.drawing-overlay")).toHaveCount(2);
  await expect(page.getByRole("region",{name:"Secondary chart"})).toBeVisible();
  await page.getByRole("combobox",{name:"Secondary chart symbol"}).selectOption("AAPL");
  await drawOn(page,1);
  await expect(page.locator(".chart-grid-cell").nth(1).locator(".drawing-shape")).toHaveCount(1);
  await expect(page.locator(".chart-grid-cell").first().locator(".drawing-shape")).toHaveCount(0);
  await drawOn(page,0);
  await expect(page.locator(".chart-grid-cell").first().locator(".drawing-shape")).toHaveCount(1);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(stored.preferences.chartLayout).toBe("dual");
  expect(stored.preferences.secondarySymbol).toBe("AAPL");
  expect(stored.preferences.drawings.map((d:{symbol:string;source?:string})=>[d.symbol,d.source]))
    .toEqual([["AAPL","demo"],["EURUSD","demo"]]);
  await page.reload();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(2);
  await expect(page.locator(".drawing-shape")).toHaveCount(2);
  await page.getByRole("button",{name:"Toggle dual-chart layout"}).click();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(1);
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
});
test("comparison chart can become the primary instrument without pretending to be a live feed",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Toggle dual-chart layout"}).click();
  await page.getByRole("combobox",{name:"Secondary chart symbol"}).selectOption("US100");
  await page.getByRole("button",{name:"Make comparison chart primary"}).click();
  await expect(page.locator(".symbol-button")).toContainText("US100");
  await expect(page.locator(".chart-grid-cell").nth(1)).toContainText("SIMULATED · DEMO");
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences).toMatchObject({
    chartLayout:"dual",symbol:"US100",secondarySymbol:"EURUSD",priceSource:"demo"
  });
});
