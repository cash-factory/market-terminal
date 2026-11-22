import {test,expect} from "@playwright/test";

test("each chart pane has its own timeframe and source with honest provenance",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Toggle four-chart layout"}).click();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(4);
  await page.getByRole("combobox",{name:"Chart 2 timeframe"}).selectOption("5m");
  await page.getByRole("combobox",{name:"Chart 3 timeframe"}).selectOption("1d");
  await page.getByRole("combobox",{name:"Chart 2 price source"}).selectOption("binance");
  await expect(page.locator(".chart-grid-cell").nth(1)).toContainText("Binance Spot");
  let data=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(data.preferences).toMatchObject({
    frame:"1h",secondaryFrame:"5m",tertiaryFrame:"1d",
    secondarySource:"binance",priceSource:"demo"
  });
  await page.getByRole("button",{name:"Make comparison chart primary"}).click();
  await expect(page.locator(".symbol-button")).toContainText("BTC / USDT");
  data=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(data.preferences).toMatchObject({
    symbol:"BTCUSDT",frame:"5m",priceSource:"binance",
    secondarySymbol:"EURUSD",secondaryFrame:"1h",secondarySource:"demo"
  });
  await page.reload();
  await expect(page.getByRole("combobox",{name:"Chart 2 timeframe"})).toHaveValue("1h");
  await expect(page.locator(".chart-grid-cell").nth(1)).toContainText("Synthetic demonstration candles");
});

test("linked crosshair and time-range controls remain interactive with real chart gestures",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Toggle dual-chart layout"}).click();
  await page.getByRole("button",{name:"Link chart crosshairs"}).click();
  await page.getByRole("button",{name:"Synchronize chart time ranges"}).click();
  await expect(page.getByRole("button",{name:"Link chart crosshairs"})).toHaveAttribute("aria-pressed","true");
  await expect(page.getByRole("button",{name:"Synchronize chart time ranges"})).toHaveAttribute("aria-pressed","true");
  const first=await page.locator(".chart-grid-cell").first().locator(".chart-canvas").boundingBox();
  if(!first)throw new Error("Price chart unavailable.");
  await page.mouse.move(first.x+first.width*.36,first.y+first.height*.4);
  await page.mouse.down();
  await page.mouse.move(first.x+first.width*.61,first.y+first.height*.4,{steps:8});
  await page.mouse.up();
  await page.mouse.wheel(0,-220);
  await page.reload();
  await expect(page.getByRole("button",{name:"Link chart crosshairs"})).toHaveAttribute("aria-pressed","true");
  await expect(page.getByRole("button",{name:"Synchronize chart time ranges"})).toHaveAttribute("aria-pressed","true");
  expect(errors).toEqual([]);
});

test("a comparison chart cannot select a live source for unsupported instruments",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Toggle dual-chart layout"}).click();
  await page.getByRole("combobox",{name:"Secondary chart symbol"}).selectOption("AAPL");
  await expect(page.getByRole("combobox",{name:"Chart 2 price source"}).locator('option[value="binance"]')).toBeDisabled();
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(data.preferences.secondarySource).toBe("demo");
});
