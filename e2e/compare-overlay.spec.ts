import {test,expect} from "@playwright/test";

test("comparison overlays stay distinct from broker quotes and preserve drawing input",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("combobox",{name:"Comparison overlay symbol"}).selectOption("AAPL");
  await expect(page.locator(".chart-comparison-attribution")).toContainText("AAPL");
  await expect(page.locator(".chart-comparison-attribution")).toContainText("not the comparison instrument's executable quote");
  const chart=page.locator(".technical-chart-stack").first();
  await chart.getByRole("img").first().waitFor();
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  const box=await page.locator("svg.drawing-overlay").first().boundingBox();
  if(!box)throw new Error("Missing drawing chart");
  const a={x:box.x+box.width*.25,y:box.y+box.height*.30};
  const b={x:box.x+box.width*.53,y:box.y+box.height*.61};
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:10});await page.mouse.up();
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("combobox",{name:"Comparison overlay symbol"})).toHaveValue("AAPL");
  await expect(page.locator(".chart-comparison-attribution")).toContainText("AAPL");
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await page.getByRole("combobox",{name:"Comparison overlay symbol"}).selectOption("none");
  await expect(page.locator(".chart-comparison-attribution")).toHaveCount(0);
});

test("BTCUSDT comparison venue can be selected without a fabricated live fallback",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("combobox",{name:"Comparison overlay symbol"}).selectOption("BTCUSDT");
  await page.getByRole("combobox",{name:"Comparison overlay price source"}).selectOption("binance");
  await expect(page.locator(".chart-comparison-attribution")).toContainText("Binance Spot");
  const prefs=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}").preferences);
  expect(prefs).toMatchObject({comparisonOverlaySymbol:"BTCUSDT",comparisonOverlaySource:"binance"});
  await page.getByRole("combobox",{name:"Comparison overlay symbol"}).selectOption("US100");
  const changed=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}").preferences);
  expect(changed.comparisonOverlaySource).toBe("demo");
});
