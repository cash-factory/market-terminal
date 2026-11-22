import {test,expect} from "@playwright/test";

test("local price alerts can be created, persisted and managed",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Price Alerts"}).click();
  await expect(page.getByRole("heading",{name:"Price alerts, your way."})).toBeVisible();
  await expect(page.getByText("No price alerts yet")).toBeVisible();
  await page.getByRole("combobox",{name:"Trigger when price"}).selectOption("below");
  await page.getByRole("spinbutton",{name:"Threshold price"}).fill("1.075");
  await page.getByRole("button",{name:"Create local alert"}).click();
  await expect(page.getByText("EUR / USD · Crosses below 1.075")).toBeVisible();
  await expect(page.locator(".alert-row")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button",{name:"Price Alerts"}).click();
  await expect(page.locator(".alert-row")).toHaveCount(1);
  await expect(page.getByText("EUR / USD · Crosses below 1.075")).toBeVisible();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(state.preferences.alerts).toHaveLength(1);
  expect(state.preferences.alerts[0]).toMatchObject({
    symbol:"EURUSD",source:"demo",direction:"below",price:1.075,triggeredAtMs:null
  });
  await page.locator(".alert-remove").click();
  await expect(page.locator(".alert-row")).toHaveCount(0);
});

test("alerts reject invalid thresholds and keep instrument/source attribution",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Open price alerts"}).click();
  await page.getByRole("spinbutton",{name:"Threshold price"}).fill("-1");
  await page.getByRole("button",{name:"Create local alert"}).click();
  await expect(page.getByRole("alert")).toContainText("valid positive threshold");
  await expect(page.locator(".alert-row")).toHaveCount(0);
  await page.getByRole("button",{name:"Change market"}).click();
  await page.locator(".symbol-button").click();
  await page.getByRole("option",{name:/BTC \/ USDT/}).click();
  await page.getByRole("button",{name:"Price Alerts"}).click();
  await page.getByRole("spinbutton",{name:"Threshold price"}).fill("100000");
  await page.getByRole("button",{name:"Create local alert"}).click();
  await expect(page.getByText("BTC / USDT · Crosses above 100,000")).toBeVisible();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(state.preferences.alerts[0].source).toBe("demo");
});
